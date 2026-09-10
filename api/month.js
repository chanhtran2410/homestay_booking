const { handler, requireMonth } = require('./_lib/http');
const { requireAdmin } = require('./_lib/auth');
const { buildMonthView } = require('./_lib/month');

// Phục vụ cả MonthChecker.js lẫn Reports.js — cùng một hình dạng dữ liệu
// mà readMonth() cũ trả về.
module.exports = handler(['GET'], async (req, res) => {
    await requireAdmin(req);
    const month = requireMonth(req.query.month);
    return res.status(200).json(await buildMonthView(month));
});
