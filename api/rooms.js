const { handler } = require('./_lib/http');
const { requireAdmin } = require('./_lib/auth');
const { listRooms } = require('./_lib/month');
const { roomOption, roomPublic } = require('./_lib/legacy');

/**
 * GET /api/rooms?scope=public
 *   Không cần đăng nhập. Phục vụ trang landing /rooms.
 *   Trả về đúng hình dạng phần tử ROOM_DATA cũ, nên RoomGallery.js chỉ cần
 *   đổi từ `import { ROOM_DATA }` sang một lần fetch.
 *
 * GET /api/rooms
 *   Cần quyền quản trị. Trả thêm mảng `options` theo hình dạng ROOM_OPTIONS cũ.
 */
module.exports = handler(['GET'], async (req, res) => {
    const isPublic = req.query.scope === 'public';

    if (!isPublic) {
        await requireAdmin(req);
        const rooms = await listRooms();
        return res.status(200).json({
            ok: true,
            rooms: rooms.map((room) => ({
                ...roomPublic(room),
                isActive: room.is_active,
                isPublic: room.is_public,
                sortOrder: room.sort_order,
            })),
            options: rooms.filter((r) => r.is_active).map(roomOption),
        });
    }

    const rooms = await listRooms({ includeInactive: false });
    const visible = rooms.filter((room) => room.is_public);

    // Dữ liệu phòng công khai gần như không đổi — cho CDN của Vercel giữ cache.
    res.setHeader(
        'Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=86400'
    );

    return res.status(200).json({
        ok: true,
        rooms: visible.map(roomPublic),
    });
});
