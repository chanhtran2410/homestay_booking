// Cầu nối tương thích với định dạng cũ của Google Sheet.
//
// Frontend hiện đọc `cell.value` — chuỗi tự do kiểu "Anh Minh - Đã đặt cọc - 500.000"
// — ở nhiều chỗ: cellLabel(), parseCell(), và thuộc tính title của ô trong lịch.
// API dựng lại chuỗi này từ các cột đã có kiểu, nhờ vậy phần lớn giao diện
// không phải sửa gì.
//
// ĐÂY LÀ NẠNG CHỐNG TẠM, KHÔNG PHẢI THIẾT KẾ. Nó thừa hưởng luôn lỗi cũ:
// tên khách chứa dấu "-" sẽ bị tách sai. Đợt sau nên chuyển giao diện sang
// đọc thẳng cell.guestName / cell.status / cell.deposit rồi bỏ hẳn `value`.

const STATUS_TEXT = {
    booked: 'Đã đặt cọc',
    wait: 'Đang đợi đặt cọc',
};

const vnd = (amount) => new Intl.NumberFormat('vi-VN').format(amount || 0);

const composeValue = ({ guestName, status, depositAmount }) => {
    if (!status) return '';
    const money =
        status === 'booked' && depositAmount > 0 ? ` - ${vnd(depositAmount)}` : '';
    return `${guestName} - ${STATUS_TEXT[status]}${money}`;
};

// Giao diện quản lý dùng nhãn dạng "1001 - Bungalow Bằng Lăng" và ở nhiều nơi
// tách lại bằng label.split(' - ')[1]. Ghép ở đây để giữ nguyên quy ước đó.
const roomLabel = (room) => `${room.code} - ${room.name}`;

// Hình dạng ROOM_OPTIONS cũ.
const roomOption = (room) => ({
    value: room.code,
    label: roomLabel(room),
    type: room.room_type,
});

// Dòng phụ ở màn "Phòng trống theo ngày": "4 khách · 45m²"
const roomMeta = (room) => {
    const parts = [];
    if (room.capacity) parts.push(`${room.capacity} khách`);
    if (room.size_label) parts.push(room.size_label);
    return parts.join(' · ') || (room.room_type === 'bungalow' ? 'Bungalow' : 'Phòng');
};

// Hình dạng một phần tử ROOM_DATA cũ — trang landing dùng y nguyên.
const roomPublic = (room) => ({
    id: room.code,
    name: room.name,
    type: room.room_type,
    bedType: room.bed_type,
    pricing: {
        weekday: Number(room.price_weekday),
        weekend: Number(room.price_weekend),
        holiday: Number(room.price_holiday),
    },
    extraPersonFee: Number(room.extra_person_fee),
    currency: room.currency,
    capacity: room.capacity,
    size: room.size_label,
    description: room.description,
    amenities: room.amenities || [],
    images: room.images || [],
    thumbnail: room.thumbnail,
});

module.exports = {
    STATUS_TEXT,
    composeValue,
    roomLabel,
    roomOption,
    roomMeta,
    roomPublic,
    vnd,
};
