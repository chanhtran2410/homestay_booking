import dayjs from 'dayjs';
import { supabase } from '../lib/supabaseClient';

// Tầng dữ liệu phía client. Thay cho sheets.js cũ.
//
// Trình duyệt KHÔNG nói chuyện trực tiếp với Postgres. Mọi thứ đi qua /api,
// nơi giữ khoá secret và kiểm tra quyền quản trị.

export const DATA_SOURCE = {
    label: 'Supabase · Postgres',
    url: process.env.REACT_APP_SUPABASE_URL
        ? `${process.env.REACT_APP_SUPABASE_URL.replace(
              '.supabase.co',
              ''
          ).replace('https://', 'https://supabase.com/dashboard/project/')}/editor`
        : 'https://supabase.com/dashboard',
};

// Thời điểm đọc dữ liệu gần nhất — sidebar hiển thị "Đồng bộ N phút trước".
let lastSync = null;
export const getLastSync = () => lastSync;

// App.js đăng ký hàm này để tự đăng xuất khi token hết hạn.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
    onUnauthorized = fn;
};

const authHeader = async () => {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Gọi API. Ném Error với thông điệp tiếng Việt lấy từ server, nhờ vậy các
 * lời gọi `message.error(error.message)` sẵn có ở màn hình vẫn đọc được.
 */
export const apiFetch = async (path, { method = 'GET', body } = {}) => {
    const response = await fetch(path, {
        method,
        headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(await authHeader()),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (parseError) {
        throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
    }

    if (response.status === 401 && onUnauthorized) onUnauthorized();

    // 409 là xung đột đặt phòng — không phải lỗi, người gọi tự xử lý.
    if (!response.ok && response.status !== 409) {
        const error = new Error(payload?.message || 'Có lỗi xảy ra.');
        error.code = payload?.code;
        error.status = response.status;
        throw error;
    }

    lastSync = Date.now();
    return payload;
};

/* ------------------------------------------------------------------ *
 * Ngày tháng
 *
 * Client LUÔN gửi ngày dạng chuỗi YYYY-MM-DD. Server chạy ở UTC còn người
 * dùng ở UTC+7, nên nếu để server tự tính "hôm nay" thì từ 00:00 đến 07:00
 * giờ Việt Nam nó sẽ trả về ngày hôm trước.
 * ------------------------------------------------------------------ */

export const toApiDate = (value) => dayjs(value).format('YYYY-MM-DD');
export const toApiMonth = (value) => dayjs(value).format('YYYY-MM');

// Đổi chuỗi ngày trong phản hồi thành đối tượng dayjs để giao diện dùng như cũ.
export const hydrateMonth = (view) => ({
    ...view,
    columns: view.columns.map((column) => ({
        ...column,
        date: dayjs(column.date),
    })),
    rows: view.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({ ...cell, date: dayjs(cell.date) })),
    })),
});

/* ------------------------------------------------------------------ *
 * Các lời gọi
 * ------------------------------------------------------------------ */

export const getMe = () => apiFetch('/api/me');

export const getPublicRooms = async () => {
    const data = await apiFetch('/api/rooms?scope=public');
    return data.rooms;
};

export const getRooms = () => apiFetch('/api/rooms');

export const getDashboard = (date, month) =>
    apiFetch(
        `/api/dashboard?date=${toApiDate(date)}&month=${toApiMonth(month || date)}`
    );

export const getMonth = async (month) =>
    hydrateMonth(await apiFetch(`/api/month?month=${toApiMonth(month)}`));

export const getAvailability = (date, room) =>
    apiFetch(
        `/api/availability?date=${toApiDate(date)}${room ? `&room=${room}` : ''}`
    );

export const findBooking = (room, date) =>
    apiFetch(`/api/bookings?room=${room}&date=${toApiDate(date)}`);

export const createBooking = (payload) =>
    apiFetch('/api/bookings', { method: 'POST', body: payload });

export const deleteNight = (room, date) =>
    apiFetch(`/api/bookings?room=${room}&date=${toApiDate(date)}`, {
        method: 'DELETE',
    });

export const deleteBooking = (bookingId) =>
    apiFetch(`/api/bookings?bookingId=${bookingId}`, { method: 'DELETE' });

/* ------------------------------------------------------------------ *
 * Hàm thuần — giữ nguyên từ sheets.js vì giao diện vẫn dùng
 *
 * Đã bỏ: classify, parseCell, cellLabel, columnLetter, findDateColumn,
 * dateFormats, findRoomRow, cellAt, availableDates. Chúng chỉ tồn tại vì dữ
 * liệu từng là chuỗi văn bản tự do; giờ trạng thái đã là một cột enum.
 * ------------------------------------------------------------------ */

export const STATUS_LABEL = {
    free: 'Trống',
    wait: 'Đang đợi cọc',
    booked: 'Đã đặt cọc',
    unknown: 'Không rõ',
};

// "500.000" / "500000" / "500" -> 500000 (số nhỏ được hiểu là đơn vị nghìn)
export const parseAmount = (text) => {
    if (!text) return 0;
    const digits = String(text).replace(/[^\d]/g, '');
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
        return `${(amount / 1000000).toFixed(1).replace('.', ',')}tr`;
    }
    return `${Math.round(amount / 1000)}k`;
};

// Tên hiển thị ngắn: "1001 - Bungalow Bằng Lăng" -> "Bungalow Bằng Lăng"
export const shortRoomName = (label) =>
    (label || '').split(' - ')[1] || label || '';
