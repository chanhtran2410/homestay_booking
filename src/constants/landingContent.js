// Nội dung tĩnh của trang landing "Bằng Lăng Hill" (theo design Parallax).
// Dữ liệu phòng vẫn lấy từ `roomData.js`; file này chỉ giữ phần trình bày.

export const LOCATION = {
    region: 'HÀM THUẬN NAM · BÌNH THUẬN · CHÂN NÚI TÀ CÚ',
    coords: '10.847°N · 108.042°E',
    mapUrl: 'https://maps.app.goo.gl/ZJ72QCtxyURvYL6f9',
};

export const HERO_IMAGE =
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=2000&q=80';

export const STORY_IMAGE =
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1400&q=80';

export const STORY = {
    eyebrow: 'RỪNG · SƯƠNG · CỎ ƯỚT',
    title: ['Sáu chỗ nghỉ,', 'một sườn đồi'],
    body: 'Ba bungalow gỗ nằm rải trên sườn, ba phòng trong nhà chính nhìn ra bãi cỏ. Bữa sáng dọn từ 6:30, lửa trại nhóm lúc 19:00 nếu trời khô.',
    caption: 'Bãi cỏ trước nhà chính · chỗ nhóm lửa trại',
};

export const MARQUEE_ITEMS = [
    'WIFI TOÀN KHU',
    'BẾP CHUNG',
    'LỬA TRẠI 19:00',
    'ĐƯA ĐÓN',
    'BỮA SÁNG 6:30',
    'LỐI ĐI BỘ LÊN ĐỒI',
    'NHẬN PHÒNG 14:00',
];

export const DIRECTIONS = [
    'Rẽ vào đường núi Tà Cú từ QL1A — 4 km đường nhựa.',
    '1,2 km đường đồi, gặp cổng gỗ có chùm hoa bằng lăng tím.',
    'Bãi đỗ xe ngay trước nhà chính. Gọi trước 30 phút để được dẫn đường.',
];

export const DIRECTIONS_INTRO =
    'Từ QL1A rẽ vào đường núi Tà Cú, 4 km đường nhựa rồi 1,2 km đường đồi. Cổng gỗ có chùm bằng lăng tím nằm bên phải.';

export const DAY_PLAN = [
    {
        time: '06:30',
        title: 'Sương và cà phê',
        body: 'Bữa sáng dọn ở hiên nhà chính, sương còn đọng trên bãi cỏ.',
    },
    {
        time: '10:00',
        title: 'Đi bộ lên đỉnh',
        body: 'Lối mòn 20 phút men theo vườn bằng lăng, nhìn được cả dãy Tà Cú.',
    },
    {
        time: '16:00',
        title: 'Nắng chiều ở hiên',
        body: 'Bungalow hướng tây đón nắng đẹp nhất trong khoảng một giờ.',
    },
    {
        time: '19:00',
        title: 'Lửa trại',
        body: 'Nhóm lửa ở bãi cỏ trước sân nếu trời khô, chủ nhà chuẩn bị củi.',
    },
];

export const FOOTER = {
    title: ['Giữ phòng cho', 'cuối tuần này'],
    policy: 'Nhận phòng 14:00 · Trả phòng 12:00 · Phụ thu 150.000₫/khách vượt sức chứa',
};

// Màu nền riêng cho từng phòng — dùng khi ảnh chưa tải xong và cho nền toàn khung.
export const ROOM_THEME = {
    1001: 'linear-gradient(150deg,#6E5A86 0%,#4A3F63 55%,#2A2438 100%)',
    1002: 'linear-gradient(150deg,#4E7A5C 0%,#375C46 55%,#1E3428 100%)',
    1003: 'linear-gradient(150deg,#C08A4E 0%,#96603A 55%,#4E301F 100%)',
    1004: 'linear-gradient(150deg,#9C5F63 0%,#6F4045 55%,#3A2226 100%)',
    1005: 'linear-gradient(150deg,#4B7F94 0%,#35606F 55%,#1D3540 100%)',
    1006: 'linear-gradient(150deg,#A8A05E 0%,#7C7440 55%,#3E3A20 100%)',
};

export const DEFAULT_ROOM_THEME =
    'linear-gradient(150deg,#4E7A5C 0%,#375C46 55%,#1E3428 100%)';
