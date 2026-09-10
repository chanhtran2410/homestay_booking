const { handler, requireDate, requireMonth } = require('./_lib/http');
const { requireAdmin } = require('./_lib/auth');
const { buildDayView, buildMonthView } = require('./_lib/month');

// Trang Tổng quan trước đây tải cả Sheet rồi tự tính. Giờ một lần gọi là đủ.
// Ngày và tháng do CLIENT gửi lên — server không tự suy ra "hôm nay" vì nó
// chạy ở UTC còn người dùng ở UTC+7.
module.exports = handler(['GET'], async (req, res) => {
    await requireAdmin(req);
    const date = requireDate(req.query.date);
    const month = requireMonth(req.query.month || date.slice(0, 7));

    const [today, summary] = await Promise.all([
        buildDayView(date),
        buildMonthView(month),
    ]);

    return res.status(200).json({ ok: true, date, month, today, summary });
});
