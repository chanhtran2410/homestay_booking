import { createClient } from '@supabase/supabase-js';

// CHỈ khoá publishable được đặt ở đây. react-scripts nhúng mọi biến REACT_APP_*
// thẳng vào bundle gửi tới trình duyệt, nên khoá secret tuyệt đối không được
// đi qua đường này — nó chỉ sống trong biến môi trường của Vercel Function.
const url = process.env.REACT_APP_SUPABASE_URL;
const publishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

export const isConfigured = Boolean(url && publishableKey);

if (!isConfigured) {
    console.error(
        'Thiếu REACT_APP_SUPABASE_URL hoặc REACT_APP_SUPABASE_PUBLISHABLE_KEY. ' +
            'Sao chép .env.example thành .env.local và điền giá trị.'
    );
}

// Client này CHỈ dùng để đăng nhập. Mọi truy cập dữ liệu đi qua /api.
// supabase-js tự lưu phiên và tự gia hạn token, nên không cần đoạn quản lý
// localStorage và hạn 1 giờ viết tay như bản cũ (nó luôn bị lệch).
export const supabase = isConfigured
    ? createClient(url, publishableKey, {
          auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
          },
      })
    : null;

export default supabase;
