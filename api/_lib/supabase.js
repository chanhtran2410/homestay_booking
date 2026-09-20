const { createClient } = require('@supabase/supabase-js');
const { HttpError } = require('./http');

// Client dùng khoá SECRET (service role). Khoá này BỎ QUA mọi Row Level
// Security, nên nó chỉ được tồn tại ở đây — trong biến môi trường runtime
// của Vercel Function. TUYỆT ĐỐI không đặt tên biến bắt đầu bằng REACT_APP_,
// vì react-scripts sẽ nhúng thẳng vào bundle gửi tới trình duyệt.
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
    // Ném lúc gọi chứ không lúc nạp module, để lỗi hiện ra dưới dạng JSON
    // thay vì làm sập function khi khởi động.
    console.error(
        '[api] Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SECRET_KEY'
    );
}

// Tạo ở phạm vi module để tái dùng giữa các lần gọi khi function còn "ấm".
const db =
    url && secret
        ? createClient(url, secret, {
              auth: { persistSession: false, autoRefreshToken: false },
          })
        : null;

const getDb = () => {
    if (!db) {
        throw new HttpError(
            500,
            'not_configured',
            'Máy chủ chưa được cấu hình kết nối cơ sở dữ liệu.'
        );
    }
    return db;
};

// Gọi RPC và chuyển lỗi Postgres thành HttpError có câu tiếng Việt.
const rpc = async (name, args) => {
    const { data, error } = await getDb().rpc(name, args);
    if (error) {
        const known = {
            invalid_nights: 'Số đêm phải từ 1 đến 60.',
            no_rooms: 'Vui lòng chọn ít nhất một phòng.',
            guest_name_required: 'Vui lòng nhập tên khách hàng.',
            deposit_required: 'Vui lòng nhập tiền đặt cọc.',
            unknown_room: 'Phòng không tồn tại hoặc đã ngừng khai thác.',
        };
        const hit = Object.keys(known).find((key) =>
            (error.message || '').includes(key)
        );
        if (hit) throw new HttpError(400, hit, known[hit]);
        console.error(`[api] rpc ${name} lỗi:`, error);
        throw new HttpError(500, 'db_error', 'Lỗi cơ sở dữ liệu.');
    }
    return data;
};

module.exports = { getDb, rpc };
