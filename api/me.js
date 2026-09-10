const { handler } = require('./_lib/http');
const { requireAdmin } = require('./_lib/auth');

// Client gọi ngay sau khi đăng nhập. Trả 403 nghĩa là "đăng nhập được nhưng
// không có quyền quản trị" — thông báo mà hệ thống cũ không thể đưa ra vì
// nó vốn không có danh sách cho phép.
module.exports = handler(['GET'], async (req, res) => {
    const admin = await requireAdmin(req);
    return res.status(200).json({ ok: true, ...admin });
});
