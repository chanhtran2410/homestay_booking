const { getDb } = require('./supabase');
const { monthDates, addDays } = require('./http');
const { composeValue, roomOption, roomMeta } = require('./legacy');

// Đọc danh sách phòng theo đúng thứ tự hiển thị cũ (1001, 1002, 1003, 1005, 1006, 1004).
const listRooms = async ({ includeInactive = true } = {}) => {
    let query = getDb()
        .from('rooms')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true });

    if (!includeInactive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

// Các đêm đã đặt trong khoảng [from, to] — kèm thông tin booking cha.
const listNights = async (from, to) => {
    const { data, error } = await getDb()
        .from('booking_nights')
        .select(
            `id, room_code, stay_date, nightly_rate,
             booking:bookings ( id, guest_name, guest_phone, status,
                                deposit_amount, note, check_in, nights )`
        )
        .gte('stay_date', from)
        .lte('stay_date', to);

    if (error) throw error;
    return data || [];
};

// Chuyển một đêm thành ô của lưới, kèm `value` tương thích định dạng cũ.
const toCell = (date, night) => {
    if (!night) {
        return { date, value: '', kind: 'free' };
    }
    const b = night.booking || {};
    return {
        date,
        kind: b.status || 'booked',
        value: composeValue({
            guestName: b.guest_name,
            status: b.status,
            depositAmount: Number(b.deposit_amount || 0),
        }),
        bookingId: b.id,
        nightId: night.id,
        guestName: b.guest_name,
        guestPhone: b.guest_phone || null,
        note: b.note || null,
        deposit: Number(b.deposit_amount || 0),
        nightlyRate: Number(night.nightly_rate || 0),
        checkIn: b.check_in,
        nights: b.nights,
    };
};

/**
 * Dựng lại đúng hình dạng mà readMonth() cũ trả về, chỉ khác là các đối tượng
 * dayjs được thay bằng chuỗi 'YYYY-MM-DD'. Nhờ vậy MonthChecker.js và
 * Reports.js gần như không phải sửa gì ngoài chỗ gọi dữ liệu.
 *
 * Khác biệt so với bản cũ:
 *   - 'free' là SỰ VẮNG MẶT của dòng trong booking_nights, không lưu thành dòng.
 *   - 'unknown' giờ nghĩa là phòng đã ngừng khai thác (is_active = false).
 *     Vẫn luôn trả về khoá này (thường bằng 0) vì giao diện có 4 mục chú giải.
 *   - Doanh thu dùng giá đã CHỐT lúc đặt (nightly_rate), nên đổi bảng giá
 *     sau này không làm thay đổi số liệu các tháng đã qua.
 */
const buildMonthView = async (monthText) => {
    const dates = monthDates(monthText);
    const from = dates[0];
    const to = dates[dates.length - 1];

    const [rooms, nights] = await Promise.all([listRooms(), listNights(from, to)]);

    // Tra cứu nhanh theo "mã phòng|ngày"
    const byKey = new Map();
    nights.forEach((n) => byKey.set(`${n.room_code}|${n.stay_date}`, n));

    const counts = { free: 0, wait: 0, booked: 0, unknown: 0 };
    let revenue = 0;
    const perRoom = [];

    const rows = rooms.map((room) => {
        const retired = !room.is_active;
        let roomRevenue = 0;

        const cells = dates.map((date) => {
            if (retired) {
                const night = byKey.get(`${room.code}|${date}`);
                return night
                    ? { ...toCell(date, night), kind: 'unknown' }
                    : { date, value: '', kind: 'unknown' };
            }
            const cell = toCell(date, byKey.get(`${room.code}|${date}`));
            if (cell.kind === 'booked') roomRevenue += cell.nightlyRate;
            return cell;
        });

        cells.forEach((cell) => {
            counts[cell.kind] = (counts[cell.kind] || 0) + 1;
        });

        revenue += roomRevenue;
        perRoom.push({ room: roomOption(room), revenue: roomRevenue });

        return { room: roomOption(room), missing: retired, cells };
    });

    const total = rows.length * dates.length;

    return {
        month: monthText,
        columns: dates.map((date, index) => ({ date, index })),
        rows,
        counts,
        total,
        revenue,
        perRoom: perRoom.sort((a, b) => b.revenue - a.revenue),
        nightsSold: counts.booked,
        occupancy: total ? Math.round((counts.booked / total) * 100) : 0,
    };
};

/**
 * Tình trạng của mọi phòng trong đúng một ngày.
 * Phục vụ cả /api/availability và phần "Tình trạng hôm nay" của trang Tổng quan.
 */
const buildDayView = async (date, roomCode = null) => {
    const [rooms, nights] = await Promise.all([
        listRooms(),
        listNights(date, date),
    ]);

    const byRoom = new Map();
    nights.forEach((n) => byRoom.set(n.room_code, n));

    const picked = roomCode ? rooms.filter((r) => r.code === roomCode) : rooms;

    return picked.map((room) => {
        if (!room.is_active) {
            return {
                room: roomOption(room),
                kind: 'unknown',
                value: '',
                detail: 'Phòng đã ngừng khai thác',
                meta: roomMeta(room),
                booking: null,
            };
        }

        const night = byRoom.get(room.code);
        const cell = toCell(date, night);

        return {
            room: roomOption(room),
            kind: cell.kind,
            value: cell.value,
            // Phòng trống thì hiện thông tin phòng, phòng bận thì hiện nội dung đặt.
            detail: cell.kind === 'free' ? roomMeta(room) : cell.value,
            meta: roomMeta(room),
            booking: night
                ? {
                      id: cell.bookingId,
                      nightId: cell.nightId,
                      guestName: cell.guestName,
                      guestPhone: cell.guestPhone,
                      note: cell.note,
                      status: cell.kind,
                      deposit: cell.deposit,
                      checkIn: cell.checkIn,
                      nights: cell.nights,
                  }
                : null,
        };
    });
};

module.exports = { listRooms, listNights, buildMonthView, buildDayView, addDays };
