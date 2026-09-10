const { getDb } = require('./supabase');
const { HttpError } = require('./http');

/**
 * Xác thực người gọi và kiểm tra quyền quản trị.
 *
 * Đây là hàng rào thay cho lỗ hổng cũ: trước đây bất kỳ ai đăng nhập Google
 * thành công đều có toàn quyền, không hề có danh sách cho phép.
 *
 * Hai bước:
 *   1. getUser(token) — Supabase kiểm chữ ký và hạn của JWT rồi trả về user.
 *      Truyền token làm tham số nghĩa là kiểm ĐÚNG token đó, không phải phiên
 *      của client. Đây là cách Supabase khuyến nghị để xác thực phía server.
 *   2. Tra bảng admin_users. Đăng nhập được không đồng nghĩa với có quyền.
 *
 * Cả hai đường đăng nhập (Google OAuth và email + mật khẩu) đều sinh ra cùng
 * một loại JWT, nên phía server không cần phân biệt.
 */
const requireAdmin = async (req) => {
    const raw = req.headers.authorization || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';

    if (!token) {
        throw new HttpError(401, 'no_token', 'Chưa đăng nhập.');
    }

    const db = getDb();
    const { data, error } = await db.auth.getUser(token);

    if (error || !data || !data.user || !data.user.email) {
        throw new HttpError(
            401,
            'invalid_token',
            'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        );
    }

    const email = data.user.email.toLowerCase();

    // Cột email kiểu citext nên so sánh không phân biệt hoa thường.
    const { data: row, error: dbError } = await db
        .from('admin_users')
        .select('email, role, is_active, full_name')
        .eq('email', email)
        .maybeSingle();

    if (dbError) {
        console.error('[api] không đọc được admin_users:', dbError);
        throw new HttpError(500, 'db_error', 'Lỗi máy chủ.');
    }

    if (!row || !row.is_active) {
        throw new HttpError(
            403,
            'not_allowlisted',
            'Tài khoản này không có quyền truy cập trang quản lý.'
        );
    }

    return {
        email,
        role: row.role,
        fullName: row.full_name || null,
        userId: data.user.id,
    };
};

module.exports = { requireAdmin };
