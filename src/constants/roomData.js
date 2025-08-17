// Mock data for homestay rooms
export const ROOM_DATA = [
    {
        id: '1001',
        name: 'Bungalow Lớn',
        type: 'bungalow',
        bedType: '2 giường',
        pricing: {
            weekday: 800000, // Ngày thường
            weekend: 1000000, // Thứ 7, CN
            holiday: 1500000, // Ngày lễ
        },
        extraPersonFee: 150000,
        currency: 'VND',
        capacity: 4,
        size: '45m²',
        description:
            'Một không gian rộng rãi và thoải mái với thiết kế bungalow truyền thống. Phòng được trang bị đầy đủ tiện nghi hiện đại trong không gian ấm cúng, gần gũi với thiên nhiên.',
        amenities: [
            'Giường đôi king size',
            'Phòng tắm riêng với vòi sen',
            'Điều hòa không khí',
            'TV màn hình phẳng',
            'Tủ lạnh mini',
            'Ấm đun nước',
            'Ban công riêng với view vườn',
            'WiFi miễn phí',
        ],
        images: [
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
            'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
        ],
        thumbnail:
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
        features: ['Cozy', 'Queen Bed', 'Intimate'],
    },
    {
        id: '1002',
        name: 'Bungalow Nhỏ 1',
        type: 'bungalow',
        bedType: '1 giường',
        pricing: {
            weekday: 600000, // Ngày thường
            weekend: 800000, // Thứ 7, CN
            holiday: 1200000, // Ngày lễ
        },
        extraPersonFee: 150000,
        currency: 'VND',
        capacity: 2,
        size: '30m²',
        description:
            'Bungalow nhỏ xinh với không gian ấm cúng, thích hợp cho cặp đôi hoặc khách du lịch một mình. Thiết kế tối giản nhưng đầy đủ tiện nghi cần thiết.',
        amenities: [
            'Giường đôi queen size',
            'Phòng tắm riêng',
            'Điều hòa không khí',
            'TV LCD',
            'Tủ lạnh mini',
            'Ấm đun nước',
            'Hiên nhỏ',
            'WiFi miễn phí',
        ],
        images: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
            'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800',
        ],
        thumbnail:
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
        features: ['Cozy', 'Queen Bed', 'Intimate'],
    },
    {
        id: '1003',
        name: 'Bungalow Nhỏ 2',
        type: 'bungalow',
        bedType: '1 giường',
        pricing: {
            weekday: 600000, // Ngày thường
            weekend: 800000, // Thứ 7, CN
            holiday: 1200000, // Ngày lễ
        },
        extraPersonFee: 150000,
        currency: 'VND',
        capacity: 2,
        size: '32m²',
        description:
            'Bungalow nhỏ với view hồ nước, tạo cảm giác thư giãn và bình yên. Không gian được thiết kế theo phong cách nhiệt đới với nhiều cây xanh xung quanh.',
        amenities: [
            'Giường đôi queen size',
            'Phòng tắm riêng với bồn tắm',
            'Điều hòa không khí',
            'TV màn hình phẳng',
            'Tủ lạnh mini',
            'Máy pha cà phê',
            'Hiên với view hồ',
            'WiFi miễn phí',
        ],
        images: [
            'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
            'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
        ],
        thumbnail:
            'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
        features: ['Cozy', 'Queen Bed', 'Intimate'],
    },
    {
        id: '1004',
        name: 'Phòng Nhỏ',
        type: 'room',
        bedType: '1 giường',
        pricing: {
            weekday: 600000, // Ngày thường
            weekend: 800000, // Thứ 7, CN
            holiday: 1200000, // Ngày lễ
        },
        extraPersonFee: 150000,
        currency: 'VND',
        capacity: 2,
        size: '25m²',
        description:
            'Phòng nhỏ gọn và tiện nghi, thích hợp cho khách có ngân sách hạn chế nhưng vẫn muốn trải nghiệm không gian thoải mái và sạch sẽ.',
        amenities: [
            'Giường đôi',
            'Phòng tắm chung',
            'Quạt trần',
            'TV nhỏ',
            'Tủ đựng đồ',
            'Bàn làm việc nhỏ',
            'WiFi miễn phí',
        ],
        images: [
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
            'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800',
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
        ],
        thumbnail:
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
        features: ['Cozy', 'Queen Bed', 'Intimate'],
    },
    {
        id: '1005',
        name: 'Phòng Lớn 1',
        type: 'room',
        bedType: '2 giường',
        pricing: {
            weekday: 800000, // Ngày thường
            weekend: 1000000, // Thứ 7, CN
            holiday: 1500000, // Ngày lễ
        },
        extraPersonFee: 150000,
        currency: 'VND',
        capacity: 3,
        size: '35m²',
        description:
            'Phòng rộng rãi với thiết kế hiện đại, có thể chứa tới 3 người. Không gian thoáng mát với cửa sổ lớn và ánh sáng tự nhiên.',
        amenities: [
            'Giường đôi + giường đơn',
            'Phòng tắm riêng',
            'Điều hòa không khí',
            'TV màn hình lớn',
            'Tủ lạnh',
            'Bàn làm việc',
            'Sofa nhỏ',
            'WiFi miễn phí',
        ],
        images: [
            'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800',
            'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
            'https://images.unsplash.com/photo-1549294413-26f195200c16?w=800',
        ],
        thumbnail:
            'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400',
        features: ['Cozy', 'Queen Bed', 'Intimate'],
    },
    {
        id: '1006',
        name: 'Phòng Lớn 2',
        type: 'room',
        bedType: '2 giường',
        pricing: {
            weekday: 800000, // Ngày thường
            weekend: 1000000, // Thứ 7, CN
            holiday: 1500000, // Ngày lễ
        },
        extraPersonFee: 150000,
        currency: 'VND',
        capacity: 4,
        size: '40m²',
        description:
            'Phòng lớn nhất trong loại phòng thường với thiết kế sang trọng. Có ban công riêng và view đẹp, thích hợp cho gia đình nhỏ hoặc nhóm bạn.',
        amenities: [
            'Giường đôi + 2 giường đơn',
            'Phòng tắm riêng với vòi sen mưa',
            'Điều hòa không khí 2 chiều',
            'TV smart 50 inch',
            'Tủ lạnh lớn',
            'Bàn làm việc rộng',
            'Khu vực tiếp khách',
            'Ban công riêng',
            'WiFi miễn phí',
        ],
        images: [
            'https://images.unsplash.com/photo-1562790351-d273a961e0e9?w=800',
            'https://images.unsplash.com/photo-1595154103014-923b47d7e7b0?w=800',
            'https://images.unsplash.com/photo-1540518614846-7eded47c9fb3?w=800',
        ],
        thumbnail:
            'https://images.unsplash.com/photo-1562790351-d273a961e0e9?w=400',
        features: ['Cozy', 'Queen Bed', 'Intimate'],
    },
];

// Contact information
export const CONTACT_INFO = {
    phone: '0903664474',
    facebook: 'https://www.facebook.com/profile.php?id=61566636483300',
    extraPersonFee: 150000,
};

// Helper function to format price
export const formatPrice = (price, currency = 'VND') => {
    if (currency === 'VND') {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
        }).format(price);
    }
    return `${price.toLocaleString()} ${currency}`;
};

// Helper function to get room price based on day type
export const getRoomPrice = (room, dayType = 'weekday') => {
    return room.pricing[dayType] || room.pricing.weekday;
};

// Helper function to format pricing display
export const formatPricing = (room) => {
    const weekday = formatPrice(room.pricing.weekday);
    const weekend = formatPrice(room.pricing.weekend);
    const holiday = formatPrice(room.pricing.holiday);

    return {
        weekday,
        weekend,
        holiday,
        extraPersonFee: formatPrice(room.extraPersonFee),
    };
};

// Helper function to get room by ID
export const getRoomById = (id) => {
    return ROOM_DATA.find((room) => room.id === id);
};

// Helper function to get rooms by type
export const getRoomsByType = (type) => {
    return ROOM_DATA.filter((room) => room.type === type);
};

// Helper function to get bed type category
export const getBedTypeCategory = (bedType) => {
    return bedType === '1 giường' ? 'single' : 'double';
};
