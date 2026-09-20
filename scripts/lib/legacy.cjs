// Bản sao ĐÔNG CỨNG của các hàm phân tích chuỗi từ src/admin/sheets.js (đã xoá).
//
// Cố ý nhân bản thay vì import: đây là ngữ nghĩa của dữ liệu CŨ. Chúng phải
// đứng yên mãi mãi, kể cả khi src/ được dọn dẹp tiếp.

const DEPOSIT_WORDS = ['đã đặt cọc', 'đã nhận cọc', 'đã cọc'];
const PENDING_WORDS = ['đang đợi', 'chờ', 'pending', 'đợi cọc', 'chờ cọc'];

/**
 * 'free' | 'wait' | 'booked'
 *
 * CẢNH BÁO về hành vi cũ: bất kỳ văn bản nào không nhận dạng được đều rơi
 * vào 'booked' và ĐƯỢC TÍNH DOANH THU. Nghĩa là một ô gõ nhầm đang âm thầm
 * cộng tiền vào báo cáo. Script nhập liệu đánh dấu những ô này là
 * 'unclassifiable_cell' để còn kiểm lại — đây là dữ liệu bẩn mà Sheet giấu đi.
 */
const classify = (value) => {
    if (!value || value.trim() === '') return 'free';
    const lower = value.toLowerCase();
    if (DEPOSIT_WORDS.some((w) => lower.includes(w))) return 'booked';
    if (PENDING_WORDS.some((w) => lower.includes(w))) return 'wait';
    return 'booked';
};

// Có nhận ra được trạng thái không, hay chỉ rơi vào nhánh mặc định?
const isRecognised = (value) => {
    if (!value || value.trim() === '') return true;
    const lower = value.toLowerCase();
    return (
        DEPOSIT_WORDS.some((w) => lower.includes(w)) ||
        PENDING_WORDS.some((w) => lower.includes(w))
    );
};

// Tách "Tên - Trạng thái - Tiền cọc".
// Tên khách chứa dấu '-' sẽ bị tách sai — lỗi này đã tồn tại từ hệ thống cũ.
const parseCell = (value) => {
    const kind = classify(value);
    if (kind === 'free') {
        return { kind, customerName: '', deposit: '', raw: '' };
    }
    const parts = value.split('-').map((p) => p.trim());
    return {
        kind,
        customerName: parts[0] || '',
        deposit: parts.length > 2 ? parts[2] : '',
        raw: value,
    };
};

// "500.000" / "500000" / "500" -> 500000
const parseAmount = (text) => {
    if (!text) return 0;
    const digits = String(text).replace(/[^\d]/g, '');
    if (!digits) return 0;
    const amount = parseInt(digits, 10);
    return amount < 10000 ? amount * 1000 : amount;
};

module.exports = { classify, isRecognised, parseCell, parseAmount };
