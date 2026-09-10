-- ============================================================================
-- Bằng Lăng Hill — schema khởi tạo
-- Thay thế Google Sheet bằng Postgres.
--
-- Chạy: dán vào Supabase SQL Editor, hoặc `supabase db push`.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- Giá trị enum giữ đúng chuỗi mà classify() cũ trả về ('booked' | 'wait'),
-- nhờ vậy mọi class CSS `is-${kind}` và mảng LEGEND/GROUPS ở frontend không phải sửa.
-- Nhãn tiếng Việt nằm ở STATUS_LABEL phía client, KHÔNG lưu trong CSDL.
create type public.booking_status as enum ('booked', 'wait');

-- ─────────────────────────────────────────────────────────── rooms
-- Gộp roomOptions.js (tên thật, dùng cho trang quản lý) và roomData.js
-- (giá, ảnh, tiện nghi, dùng cho trang landing) thành MỘT nguồn sự thật.
-- Tên chuẩn = tên thật. Nhãn "1001 - Bungalow Bằng Lăng" được ghép ở tầng API.
create table public.rooms (
    code             text primary key check (code ~ '^[0-9]{4}$'),
    name             text    not null,
    room_type        text    not null check (room_type in ('bungalow', 'room')),
    sort_order       int     not null default 0,
    is_active        boolean not null default true,  -- false = phòng đã ngừng khai thác
    is_public        boolean not null default true,  -- có hiện trên trang /rooms không

    price_weekday    bigint  not null check (price_weekday >= 0),
    price_weekend    bigint  not null check (price_weekend >= 0),
    price_holiday    bigint  not null check (price_holiday >= 0),
    extra_person_fee bigint  not null default 150000,
    currency         text    not null default 'VND',

    capacity         int,
    size_label       text,          -- '45m²'
    bed_type         text,
    description      text,
    amenities        text[]  not null default '{}',
    images           text[]  not null default '{}',
    thumbnail        text,
    features         text[]  not null default '{}',

    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index rooms_active_idx on public.rooms (sort_order, code) where is_active;

-- ─────────────────────────────────────────────── admin_users (allowlist)
-- Vá lỗ hổng cũ: trước đây bất kỳ tài khoản Google nào cũng thành admin.
create table public.admin_users (
    email      citext primary key,
    full_name  text,
    role       text    not null default 'staff'
                       check (role in ('owner', 'staff', 'viewer')),
    is_active  boolean not null default true,
    created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────── holidays
-- Bảng giá đã có mức 'ngày lễ' nhưng Google Sheet không thể diễn đạt.
-- Để TRỐNG lúc chuyển đổi để doanh thu khớp y hệt hệ thống cũ; thêm sau.
create table public.holidays (
    day  date primary key,
    name text not null
);

-- ─────────────────────────────────────────────── theo dõi việc nhập dữ liệu
create table public.import_batches (
    id          uuid primary key default gen_random_uuid(),
    started_at  timestamptz not null default now(),
    finished_at timestamptz,
    source      text    not null default 'google-sheet-csv',
    dry_run     boolean not null default true,
    stats       jsonb   not null default '{}'::jsonb,
    actor       citext
);

create table public.import_errors (
    id        bigserial primary key,
    batch_id  uuid not null references public.import_batches(id) on delete cascade,
    room_code text,
    raw_date  text,
    stay_date date,
    raw_cell  text,
    reason    text not null,
    detail    jsonb
);

create index import_errors_batch_idx on public.import_errors (batch_id);

-- ─────────────────────────────────────────────── bookings (kỳ lưu trú)
create table public.bookings (
    id             uuid primary key default gen_random_uuid(),
    room_code      text not null references public.rooms(code)
                        on update cascade on delete restrict,

    guest_name     text   not null check (length(btrim(guest_name)) > 0),
    guest_phone    text,
    status         public.booking_status not null,
    deposit_amount bigint not null default 0 check (deposit_amount >= 0),
    note           text,

    -- Ý ĐỊNH đặt phòng lúc tạo — không đổi về sau.
    check_in       date not null,
    nights         int  not null check (nights between 1 and 60),

    -- DẤU CHÂN THỰC TẾ — do trigger tính lại từ booking_nights.
    -- Cần riêng vì xoá lẻ một đêm giữa kỳ khiến `nights` ở trên không còn đúng.
    first_night    date,
    last_night     date,
    nights_count   int not null default 0,

    source          text not null default 'app'
                         check (source in ('app', 'sheet-import', 'api')),
    legacy_raw      text,   -- nguyên văn ô Sheet, chỉ để đối chiếu
    import_batch_id uuid references public.import_batches(id) on delete set null,
    created_by      citext,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    -- Giữ đúng luật của Booking.js: đã đặt cọc thì bắt buộc có số tiền.
    -- Dữ liệu nhập từ Sheet được miễn vì nhiều ô cũ không ghi tiền.
    constraint bookings_deposit_when_booked
        check (status <> 'booked' or deposit_amount > 0 or source = 'sheet-import'),

    -- Cho phép booking_nights tham chiếu kèm room_code bằng khoá ngoại ghép.
    constraint bookings_id_room_key unique (id, room_code)
);

create index bookings_room_checkin_idx on public.bookings (room_code, check_in);
create index bookings_guest_idx        on public.bookings (lower(guest_name));

-- ─────────────────────────────────── booking_nights (mỗi phòng-đêm một dòng)
create table public.booking_nights (
    id           uuid   primary key default gen_random_uuid(),
    booking_id   uuid   not null,
    room_code    text   not null,
    stay_date    date   not null,

    -- Giá CHỐT tại thời điểm đặt. Nhờ vậy đổi bảng giá sau này không làm
    -- thay đổi doanh thu các tháng đã qua — điều hệ thống cũ làm sai.
    nightly_rate bigint not null default 0,
    created_at   timestamptz not null default now(),

    -- ══════════════════════════════════════════════════════════════════
    --  Ràng buộc khiến ĐẶT TRÙNG PHÒNG trở thành bất khả thi.
    --  Google Sheet không bao giờ làm được việc này.
    -- ══════════════════════════════════════════════════════════════════
    constraint booking_nights_no_double_booking unique (room_code, stay_date),

    -- Khoá ngoại ghép: bảo đảm room_code của đêm luôn khớp room_code của
    -- booking cha, không cần trigger kiểm tra.
    constraint booking_nights_parent_fk
        foreign key (booking_id, room_code)
        references public.bookings (id, room_code)
        on update cascade on delete cascade
);

create index booking_nights_date_idx    on public.booking_nights (stay_date);
create index booking_nights_booking_idx on public.booking_nights (booking_id);
create index booking_nights_month_idx   on public.booking_nights (stay_date, room_code);

-- ─────────────────────────────────────────────────────── booking_audit
-- Hệ thống cũ xoá là mất trắng ("Hành động này không thể hoàn tác").
-- Ghi lại nguyên trạng để còn khôi phục được bằng tay.
create table public.booking_audit (
    id         bigserial primary key,
    at         timestamptz not null default now(),
    actor      citext,
    action     text not null,   -- create_booking | overwrite_night | delete_night | delete_booking
    booking_id uuid,
    room_code  text,
    stay_date  date,
    payload    jsonb
);

create index booking_audit_at_idx on public.booking_audit (at desc);

-- ============================================================================
-- Row Level Security
--
-- Mọi truy cập dữ liệu đi qua Vercel Function dùng service_role (có BYPASSRLS).
-- RLS ở đây KHÔNG phải cơ chế phân quyền — nó là hàng rào giới hạn thiệt hại:
-- nếu khoá publishable bị lộ, kẻ cầm khoá đọc được ĐÚNG 0 dòng.
-- ============================================================================

alter table public.rooms          enable row level security;
alter table public.bookings       enable row level security;
alter table public.booking_nights enable row level security;
alter table public.admin_users    enable row level security;
alter table public.holidays       enable row level security;
alter table public.booking_audit  enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_errors  enable row level security;

-- Supabase mặc định cấp quyền cho anon/authenticated trên bảng mới trong public.
-- RLS không policy đã chặn rồi, nhưng thu hồi luôn cho chắc.
revoke all on all tables in schema public from anon, authenticated;

-- Ngoại lệ DUY NHẤT: dữ liệu phòng công khai (tên, giá, ảnh) cho trang landing.
-- Trang landing vẫn đọc qua /api/rooms?scope=public — đây chỉ là lớp khoá thứ hai.
create view public.rooms_public with (security_invoker = on) as
    select code, name, room_type, sort_order,
           price_weekday, price_weekend, price_holiday,
           extra_person_fee, currency, capacity, size_label, bed_type,
           description, amenities, images, thumbnail, features
      from public.rooms
     where is_active and is_public;

create policy rooms_anon_read on public.rooms
    for select to anon, authenticated
    using (is_active and is_public);

grant select on public.rooms_public to anon, authenticated;
grant select (code, name, room_type, sort_order, price_weekday, price_weekend,
              price_holiday, extra_person_fee, currency, capacity, size_label,
              bed_type, description, amenities, images, thumbnail, features)
    on public.rooms to anon, authenticated;
