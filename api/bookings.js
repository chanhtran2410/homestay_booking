const {
    handler,
    HttpError,
    requireDate,
    requireRoom,
} = require('./_lib/http');
const { requireAdmin } = require('./_lib/auth');
const { rpc } = require('./_lib/supabase');
const { buildDayView } = require('./_lib/month');

const STATUSES = ['booked', 'wait'];

/* --------------------------------------------------------------- GET
 * ?room=1001&date=2026-09-10
 * Bước "Tìm booking" của màn hình Xoá đặt phòng.
 */
const find = async (req, res) => {
    const room = requireRoom(req.query.room);
    const date = requireDate(req.query.date);

    const rows = await buildDayView(date, room);
    if (rows.length === 0) {
        throw new HttpError(404, 'unknown_room', `Không tìm thấy phòng "${room}".`);
    }

    const row = rows[0];
    if (row.kind === 'free') {
        return res.status(200).json({ ok: true, found: false, reason: 'empty' });
    }

    return res.status(200).json({
        ok: true,
        found: true,
        room: row.room,
        date,
        value: row.value,
        booking: row.booking,
    });
};

/* -------------------------------------------------------------- POST
 * Tạo booking. Giao thức hai pha để xử lý ghi đè một cách nguyên tử —
 * xem hàm create_booking trong supabase/migrations/0002_functions.sql.
 *
 *   Lần 1: overwrite = false
 *          -> 409 { code:'conflict', conflicts:[...], conflictToken }
 *   Lần 2: overwrite = true + conflictToken của lần 1
 *          -> 201, hoặc 409 'conflict_changed' nếu dữ liệu vừa đổi.
 */
const create = async (req, res, admin) => {
    const body = req.body || {};
    const roomIds = Array.isArray(body.roomIds) ? body.roomIds.map(String) : [];

    if (roomIds.length === 0) {
        throw new HttpError(400, 'no_rooms', 'Vui lòng chọn ít nhất một phòng.');
    }
    roomIds.forEach((id) => requireRoom(id));

    const checkIn = requireDate(body.checkIn, 'checkIn');
    const nights = Number(body.nights);
    if (!Number.isInteger(nights) || nights < 1 || nights > 60) {
        throw new HttpError(400, 'invalid_nights', 'Số đêm phải từ 1 đến 60.');
    }

    const guestName = String(body.guestName || '').trim();
    if (!guestName) {
        throw new HttpError(
            400,
            'guest_name_required',
            'Vui lòng nhập tên khách hàng.'
        );
    }

    const status = String(body.status || '');
    if (!STATUSES.includes(status)) {
        throw new HttpError(400, 'bad_status', 'Trạng thái không hợp lệ.');
    }

    const deposit = Number(body.deposit || 0);
    if (!Number.isFinite(deposit) || deposit < 0) {
        throw new HttpError(400, 'bad_deposit', 'Tiền đặt cọc không hợp lệ.');
    }
    if (status === 'booked' && deposit <= 0) {
        throw new HttpError(
            400,
            'deposit_required',
            'Vui lòng nhập tiền đặt cọc.'
        );
    }

    const result = await rpc('create_booking', {
        p_room_codes: roomIds,
        p_check_in: checkIn,
        p_nights: nights,
        p_guest_name: guestName,
        p_status: status,
        p_deposit: Math.round(deposit),
        p_guest_phone: body.guestPhone ? String(body.guestPhone).trim() : null,
        p_note: body.note ? String(body.note).trim() : null,
        p_actor: admin.email,
        p_overwrite: body.overwrite === true,
        p_conflict_token: body.conflictToken || null,
    });

    if (!result || result.ok !== true) {
        // Xung đột không phải lỗi hệ thống — trả 409 kèm dữ liệu để client
        // dựng lại hộp xác nhận.
        return res.status(409).json(result);
    }

    return res.status(201).json(result);
};

/* ------------------------------------------------------------ DELETE
 * ?room=1001&date=2026-09-10  -> xoá đúng một đêm (hành vi cũ)
 * ?bookingId=<uuid>           -> xoá cả kỳ lưu trú
 */
const remove = async (req, res, admin) => {
    const bookingId = req.query.bookingId;

    if (bookingId) {
        if (!/^[0-9a-f-]{36}$/i.test(String(bookingId))) {
            throw new HttpError(400, 'bad_id', 'Mã booking không hợp lệ.');
        }
        const result = await rpc('delete_booking', {
            p_booking_id: bookingId,
            p_actor: admin.email,
        });
        if (!result || result.ok !== true) {
            throw new HttpError(404, 'not_found', 'Không tìm thấy booking.');
        }
        return res.status(200).json(result);
    }

    const room = requireRoom(req.query.room);
    const date = requireDate(req.query.date);

    const result = await rpc('delete_booking_night', {
        p_room: room,
        p_date: date,
        p_actor: admin.email,
    });

    if (!result || result.ok !== true) {
        throw new HttpError(
            404,
            'not_found',
            'Không tìm thấy booking ở phòng và ngày đã chọn.'
        );
    }

    return res.status(200).json(result);
};

module.exports = handler(['GET', 'POST', 'DELETE'], async (req, res) => {
    const admin = await requireAdmin(req);

    if (req.method === 'GET') return find(req, res);
    if (req.method === 'POST') return create(req, res, admin);
    return remove(req, res, admin);
});
