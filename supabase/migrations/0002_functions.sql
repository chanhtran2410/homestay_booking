-- ============================================================================
-- Bằng Lăng Hill — trigger, hàm tính giá và RPC ghi dữ liệu
--
-- Mọi thao tác GHI đều đi qua các hàm SECURITY DEFINER ở đây, không bao giờ
-- ghép chuỗi SQL ở tầng Node. Mỗi hàm là một transaction.
-- ============================================================================

-- ─────────────────────────────────────────────────────── updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end $$;

create trigger rooms_touch    before update on public.rooms
    for each row execute function public.touch_updated_at();

create trigger bookings_touch before update on public.bookings
    for each row execute function public.touch_updated_at();

-- ────────────────────────────────── đồng bộ dấu chân thực tế của booking
-- `nights` là ý định lúc đặt và không đổi. Khi xoá lẻ một đêm giữa kỳ,
-- first_night/last_night/nights_count mới là sự thật. Báo cáo đọc
-- booking_nights nên số liệu vẫn đúng dù kỳ lưu trú bị ngắt quãng.
create or replace function public.sync_booking_footprint()
returns trigger language plpgsql as $$
declare
    v_id uuid;
begin
    v_id := coalesce(new.booking_id, old.booking_id);

    update public.bookings b
       set first_night  = s.mn,
           last_night   = s.mx,
           nights_count = s.ct,
           updated_at   = now()
      from (select min(stay_date) as mn, max(stay_date) as mx, count(*)::int as ct
              from public.booking_nights
             where booking_id = v_id) s
     where b.id = v_id;

    return null;
end $$;

create trigger booking_nights_footprint
    after insert or delete or update of stay_date on public.booking_nights
    for each row execute function public.sync_booking_footprint();

-- ─────────────────────────────────────────────────────── giá một đêm
-- Khớp đúng logic nightPrice() cũ trong revenue.js:
--   dayjs day() 0 = Chủ nhật, 6 = Thứ bảy  ==  isodow 7 và 6.
-- Bổ sung mức giá lễ mà Sheet không thể diễn đạt (bảng holidays để trống
-- lúc chuyển đổi nên kết quả khớp y hệt hệ thống cũ).
create or replace function public.night_rate(p_room text, p_day date)
returns bigint language sql stable set search_path = public as $$
    select case
             when exists (select 1 from holidays h where h.day = p_day)
                  then r.price_holiday
             when extract(isodow from p_day) in (6, 7)
                  then r.price_weekend
             else r.price_weekday
           end
      from rooms r
     where r.code = p_room
$$;

-- ────────────────────────────────── chặn tài khoản lạ ngay từ lúc tạo
-- Supabase không cho giới hạn Google OAuth theo tên miền. Nếu không có
-- trigger này thì bất kỳ ai bấm đồng ý Google cũng tạo được auth user —
-- đúng lỗ hổng của hệ thống cũ, chỉ sâu hơn một tầng.
create or replace function public.enforce_admin_allowlist()
returns trigger language plpgsql security definer
set search_path = public, auth as $$
begin
    if not exists (
        select 1 from public.admin_users a
         where a.email = new.email and a.is_active
    ) then
        raise exception 'Email % không nằm trong danh sách quản trị', new.email
            using errcode = '42501';
    end if;
    return new;
end $$;

create trigger on_auth_user_created_check_allowlist
    before insert on auth.users
    for each row execute function public.enforce_admin_allowlist();

-- ============================================================================
-- create_booking — tạo booking, xử lý xung đột nguyên tử
--
-- Thay cho luồng cũ của Booking.js (đọc Sheet → thấy ô có dữ liệu → hỏi
-- "ghi đè?" → ghi mù). Ở đây kiểm tra và ghi nằm trong CÙNG một transaction.
--
-- Giao thức hai pha:
--   Pha 1  p_overwrite = false  → trả danh sách xung đột + conflictToken,
--                                 KHÔNG ghi gì.
--   Pha 2  p_overwrite = true   → gửi kèm token của pha 1. Nếu trong lúc
--                                 người dùng đang xem hộp xác nhận mà dữ
--                                 liệu đổi, token lệch → từ chối, không
--                                 xoá nhầm booking mà người dùng chưa thấy.
-- ============================================================================
create or replace function public.create_booking(
    p_room_codes     text[],
    p_check_in       date,
    p_nights         int,
    p_guest_name     text,
    p_status         public.booking_status,
    p_deposit        bigint,
    p_guest_phone    text    default null,
    p_note           text    default null,
    p_actor          citext  default null,
    p_overwrite      boolean default false,
    p_conflict_token text    default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_dates     date[];
    v_conflicts jsonb;
    v_token     text;
    v_room      text;
    v_id        uuid;
    v_ids       uuid[] := '{}';
    v_orphans   uuid[];
begin
    -- ① Kiểm tra đầu vào
    if p_nights is null or p_nights < 1 or p_nights > 60 then
        raise exception 'invalid_nights' using errcode = '22023';
    end if;
    if coalesce(array_length(p_room_codes, 1), 0) = 0 then
        raise exception 'no_rooms' using errcode = '22023';
    end if;
    if p_guest_name is null or length(btrim(p_guest_name)) = 0 then
        raise exception 'guest_name_required' using errcode = '22023';
    end if;
    if p_status = 'booked' and coalesce(p_deposit, 0) <= 0 then
        raise exception 'deposit_required' using errcode = '22023';
    end if;

    -- ② Xếp hàng mọi lệnh ghi booking. Một khoá duy nhất: với 6 phòng thì
    --    không có gì để tối ưu, và một khoá thì không thể deadlock.
    --    Tự nhả khi commit hoặc rollback.
    perform pg_advisory_xact_lock(hashtext('banglanghill:bookings'));

    v_dates := array(select (p_check_in + i)::date
                       from generate_series(0, p_nights - 1) i);

    -- ③ Từ chối phòng không tồn tại hoặc đã ngừng khai thác
    if exists (
        select 1
          from unnest(p_room_codes) c(code)
          left join rooms r on r.code = c.code
         where r.code is null or not r.is_active
    ) then
        raise exception 'unknown_room' using errcode = '23503';
    end if;

    -- ④ Chụp lại đúng tập xung đột
    select coalesce(jsonb_agg(x order by x ->> 'roomCode', x ->> 'date'), '[]'::jsonb)
      into v_conflicts
      from (
        select jsonb_build_object(
                 'roomCode',  bn.room_code,
                 'date',      bn.stay_date,
                 'nightId',   bn.id,
                 'bookingId', b.id,
                 'guestName', b.guest_name,
                 'status',    b.status,
                 'deposit',   b.deposit_amount,
                 'updatedAt', b.updated_at
               ) as x
          from booking_nights bn
          join bookings b on b.id = bn.booking_id
         where bn.room_code = any(p_room_codes)
           and bn.stay_date = any(v_dates)
      ) s;

    -- Token bao gồm cả updated_at của booking cha, nên mọi thay đổi đều đổi token.
    v_token := md5(v_conflicts::text);

    -- ⑤ Pha 1 — báo xung đột, không ghi gì
    if jsonb_array_length(v_conflicts) > 0 and not p_overwrite then
        return jsonb_build_object('ok', false, 'code', 'conflict',
                                  'conflicts', v_conflicts,
                                  'conflictToken', v_token);
    end if;

    -- ⑥ Pha 2 — dữ liệu đã đổi kể từ lúc người dùng xem danh sách xung đột
    if p_overwrite and p_conflict_token is not null and p_conflict_token <> v_token then
        return jsonb_build_object('ok', false, 'code', 'conflict_changed',
                                  'conflicts', v_conflicts,
                                  'conflictToken', v_token);
    end if;

    -- ⑦ Lưu vết rồi mới xoá các đêm bị ghi đè
    insert into booking_audit (actor, action, booking_id, room_code, stay_date, payload)
    select p_actor, 'overwrite_night', bn.booking_id, bn.room_code, bn.stay_date,
           jsonb_build_object('night', to_jsonb(bn), 'booking', to_jsonb(b))
      from booking_nights bn
      join bookings b on b.id = bn.booking_id
     where bn.room_code = any(p_room_codes)
       and bn.stay_date = any(v_dates);

    select coalesce(array_agg(distinct booking_id), '{}')
      into v_orphans
      from booking_nights
     where room_code = any(p_room_codes) and stay_date = any(v_dates);

    delete from booking_nights
     where room_code = any(p_room_codes) and stay_date = any(v_dates);

    -- Chỉ dọn những booking cha vừa mất sạch đêm — không quét toàn bảng.
    delete from bookings b
     where b.id = any(v_orphans)
       and not exists (select 1 from booking_nights n where n.booking_id = b.id);

    -- ⑧ Mỗi phòng một kỳ lưu trú, kèm giá chốt từng đêm
    foreach v_room in array p_room_codes loop
        insert into bookings (room_code, guest_name, guest_phone, status,
                              deposit_amount, check_in, nights, note,
                              source, created_by)
        values (v_room, btrim(p_guest_name), nullif(btrim(coalesce(p_guest_phone, '')), ''),
                p_status, coalesce(p_deposit, 0), p_check_in, p_nights,
                nullif(btrim(coalesce(p_note, '')), ''), 'app', p_actor)
        returning id into v_id;

        insert into booking_nights (booking_id, room_code, stay_date, nightly_rate)
        select v_id, v_room, d, night_rate(v_room, d)
          from unnest(v_dates) d;

        v_ids := v_ids || v_id;
    end loop;

    insert into booking_audit (actor, action, payload)
    values (p_actor, 'create_booking',
            jsonb_build_object('bookingIds', to_jsonb(v_ids),
                               'rooms', to_jsonb(p_room_codes),
                               'checkIn', p_check_in,
                               'nights', p_nights,
                               'overwrote', v_conflicts));

    return jsonb_build_object('ok', true,
                              'bookingIds',    to_jsonb(v_ids),
                              'nightsWritten', array_length(p_room_codes, 1) * p_nights,
                              'overwritten',   v_conflicts);

exception
    -- ⑨ Chốt chặn cuối: có ai đó chen vào mà không lấy advisory lock
    --    (ví dụ một phiên psql thủ công). Ràng buộc UNIQUE vẫn giữ được.
    when unique_violation then
        return jsonb_build_object('ok', false, 'code', 'conflict_race');
end $$;

-- ============================================================================
-- delete_booking_night — xoá đúng một đêm (giữ hành vi của RemoveBooking.js)
-- ============================================================================
create or replace function public.delete_booking_night(
    p_room  text,
    p_date  date,
    p_actor citext default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_night   booking_nights;
    v_booking bookings;
    v_left    int;
begin
    perform pg_advisory_xact_lock(hashtext('banglanghill:bookings'));

    select * into v_night
      from booking_nights
     where room_code = p_room and stay_date = p_date
       for update;

    if not found then
        return jsonb_build_object('ok', false, 'code', 'not_found');
    end if;

    select * into v_booking from bookings where id = v_night.booking_id for update;

    insert into booking_audit (actor, action, booking_id, room_code, stay_date, payload)
    values (p_actor, 'delete_night', v_night.booking_id, p_room, p_date,
            jsonb_build_object('night', to_jsonb(v_night), 'booking', to_jsonb(v_booking)));

    delete from booking_nights where id = v_night.id;   -- trigger tính lại dấu chân

    select count(*) into v_left from booking_nights where booking_id = v_booking.id;

    if v_left = 0 then
        delete from bookings where id = v_booking.id;
    end if;

    return jsonb_build_object('ok', true,
                              'bookingDeleted', v_left = 0,
                              'nightsLeft', v_left);
end $$;

-- ============================================================================
-- delete_booking — xoá cả kỳ lưu trú
-- ============================================================================
create or replace function public.delete_booking(
    p_booking_id uuid,
    p_actor      citext default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_booking bookings;
    v_nights  int;
begin
    perform pg_advisory_xact_lock(hashtext('banglanghill:bookings'));

    select * into v_booking from bookings where id = p_booking_id for update;
    if not found then
        return jsonb_build_object('ok', false, 'code', 'not_found');
    end if;

    select count(*) into v_nights from booking_nights where booking_id = p_booking_id;

    insert into booking_audit (actor, action, booking_id, room_code, payload)
    values (p_actor, 'delete_booking', p_booking_id, v_booking.room_code,
            jsonb_build_object(
                'booking', to_jsonb(v_booking),
                'nights', (select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb)
                             from booking_nights n where n.booking_id = p_booking_id)));

    delete from bookings where id = p_booking_id;   -- cascade sang booking_nights

    return jsonb_build_object('ok', true, 'nightsDeleted', v_nights);
end $$;

-- ============================================================================
-- import_stay — dùng riêng cho script nhập dữ liệu cũ.
-- KHÔNG dùng create_booking cho việc này: nó lấy advisory lock và ghi đè dữ
-- liệu, hai thứ đều sai khi nạp hàng loạt. Ở đây gặp trùng là báo lỗi và bỏ
-- qua, để bản nhập dở còn soi được thay vì hỏng cả mẻ.
-- ============================================================================
create or replace function public.import_stay(p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_id uuid;
begin
    insert into bookings (room_code, guest_name, status, deposit_amount,
                          check_in, nights, source, legacy_raw, import_batch_id)
    values (p_payload ->> 'room_code',
            p_payload ->> 'guest_name',
            (p_payload ->> 'status')::public.booking_status,
            coalesce((p_payload ->> 'deposit_amount')::bigint, 0),
            (p_payload ->> 'check_in')::date,
            (p_payload ->> 'nights')::int,
            'sheet-import',
            p_payload ->> 'legacy_raw',
            (p_payload ->> 'import_batch_id')::uuid)
    returning id into v_id;

    -- Danh sách đêm nằm ở khoá 'night_list' (không phải 'nights', vốn là SỐ đêm).
    -- Giá từng đêm tính bằng đúng luật cũ để báo cáo sau khi chuyển khớp với trước.
    insert into booking_nights (booking_id, room_code, stay_date, nightly_rate)
    select v_id,
           p_payload ->> 'room_code',
           (n ->> 'stay_date')::date,
           night_rate(p_payload ->> 'room_code', (n ->> 'stay_date')::date)
      from jsonb_array_elements(p_payload -> 'night_list') n;

    return jsonb_build_object('ok', true, 'bookingId', v_id);

exception
    when unique_violation then
        return jsonb_build_object('ok', false, 'code', 'duplicate_night',
                                  'detail', sqlerrm);
    when foreign_key_violation then
        return jsonb_build_object('ok', false, 'code', 'unknown_room',
                                  'detail', sqlerrm);
end $$;

-- ─────────────────────────────── không ai ngoài service_role được gọi
revoke all on function public.create_booking(text[], date, int, text,
        public.booking_status, bigint, text, text, citext, boolean, text)
    from public, anon, authenticated;
revoke all on function public.delete_booking_night(text, date, citext)
    from public, anon, authenticated;
revoke all on function public.delete_booking(uuid, citext)
    from public, anon, authenticated;
revoke all on function public.import_stay(jsonb)
    from public, anon, authenticated;
