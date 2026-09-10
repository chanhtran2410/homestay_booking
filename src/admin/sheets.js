// Lớp dùng chung cho Google Sheets — trước đây được copy ở 5 màn hình.
// Bảng tính: cột A/B là thông tin phòng (B = mã phòng), các cột sau là ngày.

export const SPREADSHEET_ID =
    process.env.REACT_APP_SPREADSHEET_ID ||
    '1re26jyCc2_gebIn5BRW7DTHAR6QmFTB7k5iSC3UhRrc';

export const SHEET_NAME = 'Sheet1';

export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;

// Các định dạng ngày có thể xuất hiện ở hàng tiêu đề.
export const dateFormats = (date) => [
    date.format('DD/MM/YYYY'),
    date.format('D/M/YYYY'),
    date.format('DD/MM'),
    date.format('D/M'),
    date.format('MM/DD/YYYY'),
    date.format('M/D/YYYY'),
    date.format('YYYY-MM-DD'),
];

// 0 -> A, 25 -> Z, 26 -> AA
export const columnLetter = (columnIndex) => {
    let result = '';
    let index = columnIndex;
    while (index >= 0) {
        result = String.fromCharCode(65 + (index % 26)) + result;
        index = Math.floor(index / 26) - 1;
    }
    return result;
};

// Thời điểm đọc bảng tính gần nhất — sidebar hiển thị "Đồng bộ N phút trước".
let lastSync = null;
export const getLastSync = () => lastSync;

export const readSheet = async (makeApiCall) => {
    const res = await makeApiCall(() =>
        window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: SHEET_NAME,
        })
    );
    const data = res.result.values;
    if (!data || data.length === 0) {
        throw new Error('Không có dữ liệu trong bảng tính');
    }
    lastSync = Date.now();
    return { data, headers: data[0] };
};

// Tìm cột ngày, thử lần lượt các định dạng. Trả về { index, format }.
export const findDateColumn = (headers, date) => {
    for (const format of dateFormats(date)) {
        const index = headers.indexOf(format);
        if (index !== -1) return { index, format };
    }
    return { index: -1, format: '' };
};

export const findRoomRow = (data, roomId) =>
    data.findIndex((row) => row && row[1] === roomId);

export const cellAt = (data, rowIndex, colIndex) =>
    (rowIndex >= 0 && colIndex >= 0 && data?.[rowIndex]?.[colIndex]) || '';

// Danh sách ngày trong tiêu đề, dùng cho thông báo lỗi.
export const availableDates = (headers) =>
    headers.slice(2).filter((header) => header && header.trim() !== '');

/* --------------------------------------------------------------------------
   Phân loại nội dung ô
   -------------------------------------------------------------------------- */

const DEPOSIT_WORDS = ['đã đặt cọc', 'đã nhận cọc', 'đã cọc'];
const PENDING_WORDS = [
    'đang đợi',
    'chờ',
    'pending',
    'đợi cọc',
    'chờ cọc',
];

// 'free' | 'wait' | 'booked'  ('unknown' dành cho phòng không có trong bảng tính)
export const classify = (value) => {
    if (!value || value.trim() === '') return 'free';
    const lower = value.toLowerCase();
    if (DEPOSIT_WORDS.some((word) => lower.includes(word))) return 'booked';
    if (PENDING_WORDS.some((word) => lower.includes(word))) return 'wait';
    return 'booked';
};

export const STATUS_LABEL = {
    free: 'Trống',
    wait: 'Đang đợi cọc',
    booked: 'Đã đặt cọc',
    unknown: 'Không rõ',
};

// Nhãn ngắn hiển thị trong ô ma trận.
export const cellLabel = (value) => {
    const kind = classify(value);
    if (kind === 'free') return 'Trống';
    const name = value.split('-')[0].trim();
    return name || value;
};

// Tách "Tên khách - Trạng thái - Tiền cọc" thành các phần.
export const parseCell = (value) => {
    const kind = classify(value);
    if (kind === 'free') {
        return {
            kind,
            status: STATUS_LABEL.free,
            customerName: '',
            deposit: '',
            raw: '',
        };
    }
    const parts = value.split('-').map((part) => part.trim());
    const lower = value.toLowerCase();
    const isDeposit = DEPOSIT_WORDS.some((word) => lower.includes(word));
    return {
        kind,
        status: isDeposit ? STATUS_LABEL.booked : STATUS_LABEL.wait,
        customerName: parts[0] || '',
        deposit: parts.length > 2 ? parts[2] : '',
        raw: value,
    };
};

// "500.000" / "500000" / "500" -> 500000 (số nhỏ được hiểu là đơn vị nghìn)
export const parseAmount = (text) => {
    if (!text) return 0;
    const digits = text.replace(/[^\d]/g, '');
    if (!digits) return 0;
    const amount = parseInt(digits, 10);
    return amount < 10000 ? amount * 1000 : amount;
};

export const formatVnd = (amount) =>
    new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0)) + '₫';

// 24600000 -> "24,6tr"
export const compactVnd = (amount) => {
    if (!amount) return '0';
    if (amount >= 1000000) {
        const millions = amount / 1000000;
        return `${millions.toFixed(millions >= 10 ? 1 : 1).replace('.', ',')}tr`;
    }
    return `${Math.round(amount / 1000)}k`;
};
