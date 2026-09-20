#!/usr/bin/env node
/**
 * Sinh supabase/migrations/0003_seed_rooms.sql từ hai file hằng số hiện có.
 *
 * Gộp:
 *   roomOptions.js  -> mã phòng, TÊN THẬT, loại phòng, thứ tự hiển thị
 *   roomData.js     -> giá, sức chứa, diện tích, mô tả, tiện nghi, ảnh
 *
 * Chạy lại được nhiều lần; file sinh ra dùng ON CONFLICT DO UPDATE nên
 * nạp lại không tạo trùng.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');

// Hai file nguồn là ESM trong một package CommonJS -> không require() thẳng được.
// Đổi `export const` thành `const` rồi nạp qua file tạm.
function loadEsm(relPath, names) {
    const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    const body = src.replace(/^export\s+const\s/gm, 'const ');
    const tmp = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'seed-')),
        'mod.cjs'
    );
    fs.writeFileSync(tmp, `${body}\nmodule.exports = { ${names.join(', ')} };\n`);
    const mod = require(tmp);
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
    return mod;
}

const { ROOM_OPTIONS } = loadEsm('src/constants/roomOptions.js', ['ROOM_OPTIONS']);
const { ROOM_DATA } = loadEsm('src/constants/roomData.js', ['ROOM_DATA']);

const q = (v) =>
    v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`;

const arr = (list) =>
    !list || !list.length
        ? `'{}'`
        : `ARRAY[${list.map((x) => q(x)).join(', ')}]::text[]`;

const rows = ROOM_OPTIONS.map((option, index) => {
    const detail = ROOM_DATA.find((r) => r.id === option.value);
    if (!detail) {
        throw new Error(
            `Phòng ${option.value} có trong roomOptions.js nhưng thiếu trong roomData.js`
        );
    }

    // Tên thật nằm sau ' - ' trong label, ví dụ '1001 - Bungalow Bằng Lăng'.
    const name = option.label.split(' - ')[1] || option.label;

    if (detail.type !== option.type) {
        throw new Error(
            `Phòng ${option.value}: loại phòng lệch nhau (${option.type} vs ${detail.type})`
        );
    }

    return `    (${q(option.value)}, ${q(name)}, ${q(option.type)}, ${index},
     ${detail.pricing.weekday}, ${detail.pricing.weekend}, ${detail.pricing.holiday},
     ${detail.extraPersonFee}, ${detail.capacity}, ${q(detail.size)}, ${q(detail.bedType)},
     ${q(detail.description)},
     ${arr(detail.amenities)},
     ${arr(detail.images)},
     ${q(detail.thumbnail)})`;
});

const sql = `-- ============================================================================
-- Bằng Lăng Hill — dữ liệu 6 phòng
--
-- SINH TỰ ĐỘNG bởi scripts/gen-rooms-seed.cjs — đừng sửa tay.
-- Nguồn: src/constants/roomOptions.js (tên thật) + src/constants/roomData.js (giá, ảnh)
--
-- Tên phòng lấy theo roomOptions.js vì đó là tên thật đang dùng ở trang quản lý;
-- roomData.js tự ghi ở dòng đầu là "Mock data".
-- Cột features cũ bị bỏ: cả 6 phòng đều là ['Cozy','Queen Bed','Intimate'] —
-- dấu vết copy-paste, không nơi nào hiển thị.
-- ============================================================================

insert into public.rooms (
    code, name, room_type, sort_order,
    price_weekday, price_weekend, price_holiday,
    extra_person_fee, capacity, size_label, bed_type,
    description, amenities, images, thumbnail
) values
${rows.join(',\n')}
on conflict (code) do update set
    name             = excluded.name,
    room_type        = excluded.room_type,
    sort_order       = excluded.sort_order,
    price_weekday    = excluded.price_weekday,
    price_weekend    = excluded.price_weekend,
    price_holiday    = excluded.price_holiday,
    extra_person_fee = excluded.extra_person_fee,
    capacity         = excluded.capacity,
    size_label       = excluded.size_label,
    bed_type         = excluded.bed_type,
    description      = excluded.description,
    amenities        = excluded.amenities,
    images           = excluded.images,
    thumbnail        = excluded.thumbnail,
    updated_at       = now();
`;

const out = path.join(ROOT, 'supabase/migrations/0003_seed_rooms.sql');
fs.writeFileSync(out, sql);
console.log(`Đã ghi ${out}`);
console.log(`${rows.length} phòng:`);
ROOM_OPTIONS.forEach((o, i) =>
    console.log(`  ${i}. ${o.value}  ${o.label.split(' - ')[1]}  (${o.type})`)
);
