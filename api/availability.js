const { handler, requireDate, requireRoom } = require('./_lib/http');
const { requireAdmin } = require('./_lib/auth');
const { buildDayView } = require('./_lib/month');

// ?date=YYYY-MM-DD          -> quét cả 6 phòng  (DateRoomChecker.js)
// ?date=...&room=1001       -> tra đúng một phòng (RoomAvailability.js)
module.exports = handler(['GET'], async (req, res) => {
    await requireAdmin(req);
    const date = requireDate(req.query.date);
    const room = req.query.room ? requireRoom(req.query.room) : null;
    const rooms = await buildDayView(date, room);

    if (room && rooms.length === 0) {
        return res.status(404).json({
            ok: false,
            code: 'unknown_room',
            message: `Không tìm thấy phòng "${room}".`,
        });
    }
    return res.status(200).json({ ok: true, date, rooms });
});
