// Tiện ích chung cho Vercel Function.
//
// LƯU Ý: package.json không có "type": "module" nên mọi file trong /api là
// CommonJS. Dùng require/module.exports, không dùng import.
//
// Thư mục bắt đầu bằng "_" được Vercel bỏ qua khi build function, nên file
// này không tốn slot nào trong hạn mức function.

class HttpError extends Error {
    constructor(status, code, message) {
        super(message || code);
        this.status = status;
        this.code = code;
    }
}

// Bọc handler: chặn method, bắt lỗi, luôn trả JSON.
// Nhờ vậy `message.error(error.message)` ở frontend luôn đọc được câu tiếng Việt.
const handler = (methods, fn) => async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    try {
        if (!methods.includes(req.method)) {
            res.setHeader('Allow', methods.join(', '));
            return res.status(405).json({
                ok: false,
                code: 'method_not_allowed',
                message: `Phương thức ${req.method} không được hỗ trợ.`,
            });
        }
        return await fn(req, res);
    } catch (error) {
        const status = error.status || 500;
        if (status >= 500) console.error('[api]', error);
        return res.status(status).json({
            ok: false,
            code: error.code || 'server_error',
            message:
                status >= 500
                    ? 'Lỗi máy chủ. Vui lòng thử lại.'
                    : error.message,
        });
    }
};

/* ------------------------------------------------------------------ *
 * Kiểm tra tham số
 *
 * Quy tắc bắt buộc: server KHÔNG BAO GIỜ tự suy ra "hôm nay".
 * Vercel Function chạy ở UTC còn Việt Nam là UTC+7, nên trong khoảng
 * 00:00–07:00 giờ Việt Nam, dayjs() phía server sẽ trả về ngày hôm trước.
 * Client luôn phải gửi ngày dạng chuỗi YYYY-MM-DD tường minh.
 * ------------------------------------------------------------------ */

const requireDate = (value, field = 'date') => {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw new HttpError(
            400,
            'bad_date',
            `Tham số "${field}" phải có dạng YYYY-MM-DD.`
        );
    }
    return text;
};

const requireMonth = (value) => {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}$/.test(text)) {
        throw new HttpError(
            400,
            'bad_month',
            'Tham số "month" phải có dạng YYYY-MM.'
        );
    }
    return text;
};

const requireRoom = (value) => {
    const text = String(value || '');
    if (!/^\d{4}$/.test(text)) {
        throw new HttpError(400, 'bad_room', 'Mã phòng phải gồm 4 chữ số.');
    }
    return text;
};

/* ------------------------------------------------------------------ *
 * Ngày tháng — tính toàn bộ ở UTC để không lệch múi giờ
 * ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, '0');

const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// Số ngày trong tháng: ngày 0 của tháng kế tiếp.
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// Danh sách ngày của tháng dạng ['2026-09-01', ...]
const monthDates = (monthText) => {
    const [year, month] = monthText.split('-').map(Number);
    const total = daysInMonth(year, month);
    const out = [];
    for (let day = 1; day <= total; day += 1) out.push(ymd(year, month, day));
    return out;
};

// 0 = Chủ nhật … 6 = Thứ bảy (khớp dayjs .day())
const weekday = (dateText) => {
    const [y, m, d] = dateText.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

const addDays = (dateText, count) => {
    const [y, m, d] = dateText.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + count));
    return ymd(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
};

module.exports = {
    HttpError,
    handler,
    requireDate,
    requireMonth,
    requireRoom,
    monthDates,
    weekday,
    addDays,
    ymd,
    daysInMonth,
};
