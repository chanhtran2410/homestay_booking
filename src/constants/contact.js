// Thông tin liên hệ hiển thị trên trang landing.
// Dữ liệu phòng đã chuyển sang bảng `rooms` trong Supabase; file này chỉ
// giữ lại phần không thuộc về phòng.
export const CONTACT_INFO = {
    phone: '0903664474',
    facebook: 'https://www.facebook.com/profile.php?id=61566636483300',
    extraPersonFee: 150000,
};

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
