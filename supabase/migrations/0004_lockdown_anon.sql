-- ============================================================================
-- Siết quyền của anon / authenticated xuống 0
--
-- BÀI HỌC: Supabase tự động cấp quyền cho anon và authenticated trên MỌI
-- object mới tạo trong schema public. Lệnh `revoke` nào chạy TRƯỚC khi tạo
-- object đều vô tác dụng — đó là lý do view rooms_public trong 0001 vẫn còn
-- nguyên quyền mặc định (kể cả INSERT/UPDATE/DELETE) dù đã revoke phía trên.
--
-- Vì mọi truy cập dữ liệu đều đi qua /api bằng khoá service-role, hai vai trò
-- này không cần quyền gì cả. Không cấp gì là trạng thái an toàn nhất và cũng
-- dễ lập luận nhất: khoá publishable lộ ra ngoài thì đọc được đúng 0 dòng.
--
-- Migration này chạy lại được nhiều lần.
-- ============================================================================

-- View rooms_public không còn cần thiết: trang landing đọc qua
-- /api/rooms?scope=public, vốn dùng service-role.
drop view if exists public.rooms_public;

-- Bỏ ngoại lệ cho phép anon đọc bảng rooms.
drop policy if exists rooms_anon_read on public.rooms;

-- Thu hồi mọi quyền hiện có.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Và chặn luôn quyền mặc định cho các object tạo về sau, nếu không thì
-- bảng nào thêm mới cũng lại hở ra đúng như trên.
alter default privileges in schema public
    revoke all on tables    from anon, authenticated;
alter default privileges in schema public
    revoke all on sequences from anon, authenticated;
alter default privileges in schema public
    revoke all on functions from anon, authenticated;
