#!/usr/bin/env node
/**
 * Nhập dữ liệu đặt phòng từ Google Sheet cũ vào Supabase.
 *
 *   1. Trong Google Sheets: File → Download → Comma-separated values (.csv)
 *   2. Lưu vào scripts/data/sheet.csv
 *   3. node scripts/import-sheet.cjs --dry-run        (chỉ báo cáo, không ghi)
 *   4. Sửa các dòng lỗi trong Sheet rồi lặp lại bước 3
 *   5. node scripts/import-sheet.cjs --commit         (ghi thật)
 *
 * Cần biến môi trường SUPABASE_URL và SUPABASE_SECRET_KEY (đọc từ .env.local).
 *
 * Chạy tại máy chứ không làm endpoint: không tốn slot function của Vercel,
 * không dính giới hạn thời gian, và chạy lại bao nhiêu lần cũng được.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { classify, isRecognised, parseCell, parseAmount } = require('./lib/legacy.cjs');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'scripts/data/sheet.csv');
const REPORT_PATH = path.join(ROOT, 'scripts/out/import-report.csv');

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const YEAR = (() => {
    const hit = args.find((a) => a.startsWith('--year='));
    return hit ? parseInt(hit.split('=')[1], 10) : null;
})();

/* ------------------------------------------------------------------ *
 * Nạp .env.local (không thêm dependency)
 * ------------------------------------------------------------------ */
const loadEnv = () => {
    for (const name of ['.env.local', '.env']) {
        const file = path.join(ROOT, name);
        if (!fs.existsSync(file)) continue;
        fs.readFileSync(file, 'utf8')
            .split('\n')
            .forEach((line) => {
                const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
                if (match && !process.env[match[1]]) {
                    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
                }
            });
    }
};
loadEnv();

/* ------------------------------------------------------------------ *
 * CSV — tự phân tích, có xử lý ô trong ngoặc kép
 * ------------------------------------------------------------------ */
const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 1;
                } else quoted = false;
            } else field += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else if (ch !== '\r') field += ch;
    }
    if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
    }
    return rows;
};

/* ------------------------------------------------------------------ *
 * Nhận dạng tiêu đề ngày
 *
 * Chỗ dễ sai nhất. "01/02" vừa là 1/2 vừa là 2/1. Không đoán theo từng ô mà
 * chọn định dạng nào khiến CẢ HÀNG tiêu đề tăng đều mỗi ngày một bước —
 * bảng tính vốn là một cuốn lịch.
 * ------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

const CANDIDATES = [
    { name: 'DD/MM/YYYY', re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: 'dmy' },
    { name: 'MM/DD/YYYY', re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: 'mdy' },
    { name: 'YYYY-MM-DD', re: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, order: 'ymd' },
    { name: 'DD/MM', re: /^(\d{1,2})\/(\d{1,2})$/, order: 'dm' },
    { name: 'MM/DD', re: /^(\d{1,2})\/(\d{1,2})$/, order: 'md' },
];

const applyFormat = (text, fmt, year) => {
    const m = String(text).trim().match(fmt.re);
    if (!m) return null;
    let y;
    let mo;
    let d;
    if (fmt.order === 'dmy') [, d, mo, y] = m;
    else if (fmt.order === 'mdy') [, mo, d, y] = m;
    else if (fmt.order === 'ymd') [, y, mo, d] = m;
    else if (fmt.order === 'dm') {
        [, d, mo] = m;
        y = year;
    } else {
        [, mo, d] = m;
        y = year;
    }
    if (!y) return null;
    const date = new Date(Date.UTC(+y, +mo - 1, +d));
    // Ngày không tồn tại (31/02) sẽ bị Date tự cuộn sang tháng sau -> loại.
    if (
        date.getUTCFullYear() !== +y ||
        date.getUTCMonth() !== +mo - 1 ||
        date.getUTCDate() !== +d
    ) {
        return null;
    }
    return iso(+y, +mo, +d);
};

const dayDiff = (a, b) =>
    Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/**
 * Chọn định dạng cho cả hàng tiêu đề: định dạng nào cho ra chuỗi ngày liên
 * tiếp nhiều nhất thì thắng.
 */
const resolveHeaders = (headers, year, errors) => {
    const cells = headers.slice(2);
    let best = { format: null, dates: [], score: -1 };

    for (const fmt of CANDIDATES) {
        const dates = cells.map((c) => applyFormat(c, fmt, year));
        const parsed = dates.filter(Boolean).length;
        if (parsed === 0) continue;

        let consecutive = 0;
        let previous = null;
        dates.forEach((d) => {
            if (d && previous && dayDiff(previous, d) === 1) consecutive += 1;
            if (d) previous = d;
        });

        const score = parsed * 100 + consecutive;
        if (score > best.score) best = { format: fmt.name, dates, score, parsed, consecutive };
    }

    if (!best.format) {
        throw new Error(
            'Không nhận dạng được bất kỳ cột ngày nào. Kiểm tra lại file CSV, ' +
                'hoặc truyền --year=2026 nếu tiêu đề thiếu năm.'
        );
    }

    best.dates.forEach((d, i) => {
        if (!d && String(cells[i]).trim() !== '') {
            errors.push({
                raw_date: cells[i],
                reason: 'unparseable_date_header',
                detail: { column: i + 2, chosenFormat: best.format },
            });
        }
    });

    return best;
};

/* ------------------------------------------------------------------ *
 * Gom các đêm liên tiếp thành kỳ lưu trú
 * ------------------------------------------------------------------ */

// Khoá gom nhóm CỐ Ý bỏ tiền cọc: trong Sheet, số cọc được chép lại trên
// từng đêm và hay bị gõ lệch ("500.000" vs "500000"). Gom theo khách +
// trạng thái, rồi lấy số cọc đầu tiên không rỗng.
const groupKey = (raw) => {
    const p = parseCell(raw);
    return [p.kind, p.customerName.toLowerCase().replace(/\s+/g, ' ').trim()].join('|');
};

const buildStays = (roomCode, nights, errors) => {
    const stays = [];
    let current = null;

    nights.forEach((night) => {
        const key = groupKey(night.raw);
        const continues =
            current &&
            current.key === key &&
            dayDiff(current.nights[current.nights.length - 1].date, night.date) === 1;

        if (!continues) {
            current = { key, roomCode, nights: [] };
            stays.push(current);
        }
        current.nights.push(night);
    });

    return stays.map((stay) => {
        const first = parseCell(stay.nights[0].raw);

        // Ghi nhận mọi số cọc khác nhau trong cùng một kỳ để người kiểm tra.
        const deposits = [
            ...new Set(
                stay.nights
                    .map((n) => parseCell(n.raw).deposit)
                    .filter((d) => d && d.trim() !== '')
            ),
        ];
        if (deposits.length > 1) {
            errors.push({
                room_code: roomCode,
                stay_date: stay.nights[0].date,
                raw_cell: stay.nights.map((n) => n.raw).join(' || '),
                reason: 'deposit_mismatch',
                detail: { deposits },
            });
        }

        const guestName = first.customerName.trim();
        if (!guestName) {
            errors.push({
                room_code: roomCode,
                stay_date: stay.nights[0].date,
                raw_cell: stay.nights[0].raw,
                reason: 'empty_guest_name',
            });
        }

        // TUYỆT ĐỐI không cộng dồn tiền cọc qua các đêm — Sheet lặp lại một
        // con số cho cả kỳ, cộng vào là nhân lên đúng bằng số đêm.
        const deposit = parseAmount(deposits[0] || '');

        if (first.kind === 'booked' && deposit === 0) {
            errors.push({
                room_code: roomCode,
                stay_date: stay.nights[0].date,
                raw_cell: stay.nights[0].raw,
                reason: 'deposit_missing_for_booked',
            });
        }

        return {
            room_code: roomCode,
            guest_name: guestName || '(không rõ tên)',
            status: first.kind,
            deposit_amount: deposit,
            check_in: stay.nights[0].date,
            nights: stay.nights.length,
            legacy_raw: stay.nights.map((n) => n.raw).join(' || '),
            nightDates: stay.nights.map((n) => n.date),
        };
    });
};

/* ------------------------------------------------------------------ *
 * Chạy
 * ------------------------------------------------------------------ */
const main = async () => {
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`Không tìm thấy ${CSV_PATH}`);
        console.error('Trong Google Sheets: File → Download → CSV, lưu vào đường dẫn trên.');
        process.exit(1);
    }

    const url = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secret) {
        console.error('Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY (đặt trong .env.local).');
        process.exit(1);
    }
    const db = createClient(url, secret, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const errors = [];
    const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
    if (rows.length < 2) {
        console.error('File CSV không có dữ liệu.');
        process.exit(1);
    }

    const headers = rows[0];
    const resolved = resolveHeaders(headers, YEAR, errors);
    console.log(
        `Định dạng ngày: ${resolved.format} — đọc được ${resolved.parsed}/${
            headers.length - 2
        } cột, ${resolved.consecutive} cột liên tiếp\n`
    );

    // Phòng có thật trong CSDL
    const { data: roomRows, error: roomErr } = await db.from('rooms').select('code');
    if (roomErr) throw roomErr;
    const known = new Set(roomRows.map((r) => r.code));

    // Gom theo phòng
    const seen = new Set();
    const stays = [];

    for (let r = 1; r < rows.length; r += 1) {
        const roomCode = String(rows[r][1] || '').trim();
        if (!roomCode) continue;

        if (seen.has(roomCode)) {
            // Hệ thống cũ chỉ lấy hàng ĐẦU TIÊN khớp, nên dòng trùng hoàn toàn vô hình.
            errors.push({
                room_code: roomCode,
                reason: 'duplicate_room_row',
                detail: { sheetRow: r + 1 },
            });
            continue;
        }
        seen.add(roomCode);

        if (!known.has(roomCode)) {
            errors.push({
                room_code: roomCode,
                reason: 'unknown_room',
                detail: { sheetRow: r + 1 },
            });
            continue;
        }

        const nights = [];
        resolved.dates.forEach((date, i) => {
            if (!date) return;
            const raw = String(rows[r][i + 2] || '').trim();
            if (raw === '') return;

            if (!isRecognised(raw)) {
                errors.push({
                    room_code: roomCode,
                    stay_date: date,
                    raw_cell: raw,
                    reason: 'unclassifiable_cell',
                    detail: { treatedAs: classify(raw) },
                });
            }
            nights.push({ date, raw });
        });

        stays.push(...buildStays(roomCode, nights, errors));
    }

    const totalNights = stays.reduce((sum, s) => sum + s.nights, 0);
    console.log(`Đọc được ${stays.length} kỳ lưu trú · ${totalNights} đêm`);
    console.log(`Cảnh báo/lỗi: ${errors.length}`);

    // Ghi báo cáo
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    const esc = (v) => `"${String(v === undefined || v === null ? '' : v).replace(/"/g, '""')}"`;
    fs.writeFileSync(
        REPORT_PATH,
        '﻿' +
            ['room_code,raw_date,stay_date,raw_cell,reason,detail']
                .concat(
                    errors.map((e) =>
                        [
                            e.room_code,
                            e.raw_date,
                            e.stay_date,
                            e.raw_cell,
                            e.reason,
                            e.detail ? JSON.stringify(e.detail) : '',
                        ]
                            .map(esc)
                            .join(',')
                    )
                )
                .join('\n')
    );
    console.log(`Báo cáo: ${REPORT_PATH}`);

    const byReason = {};
    errors.forEach((e) => {
        byReason[e.reason] = (byReason[e.reason] || 0) + 1;
    });
    Object.entries(byReason).forEach(([reason, n]) => console.log(`   ${reason}: ${n}`));

    if (!COMMIT) {
        console.log('\n[--dry-run] Chưa ghi gì vào cơ sở dữ liệu.');
        console.log('Sửa các dòng trong báo cáo rồi chạy lại. Khi đã sạch: --commit');
        return;
    }

    // Ghi thật
    const { data: batch, error: batchErr } = await db
        .from('import_batches')
        .insert({ dry_run: false, actor: 'import-sheet.cjs' })
        .select()
        .single();
    if (batchErr) throw batchErr;

    let created = 0;
    const failures = [];

    for (const stay of stays) {
        const { data, error } = await db.rpc('import_stay', {
            p_payload: {
                room_code: stay.room_code,
                guest_name: stay.guest_name,
                status: stay.status,
                deposit_amount: stay.deposit_amount,
                check_in: stay.check_in,
                nights: stay.nights, // SỐ đêm
                night_list: stay.nightDates.map((d) => ({ stay_date: d })), // DANH SÁCH đêm
                legacy_raw: stay.legacy_raw,
                import_batch_id: batch.id,
            },
        });

        if (error || (data && data.ok === false)) {
            failures.push({
                room_code: stay.room_code,
                stay_date: stay.check_in,
                raw_cell: stay.legacy_raw,
                reason: (data && data.code) || 'rpc_error',
                detail: error ? error.message : data && data.detail,
            });
        } else created += 1;
    }

    await db
        .from('import_batches')
        .update({
            finished_at: new Date().toISOString(),
            stats: {
                stays_read: stays.length,
                stays_created: created,
                nights_read: totalNights,
                failures: failures.length,
            },
        })
        .eq('id', batch.id);

    if (errors.length || failures.length) {
        await db.from('import_errors').insert(
            [...errors, ...failures].map((e) => ({
                batch_id: batch.id,
                room_code: e.room_code || null,
                raw_date: e.raw_date || null,
                stay_date: e.stay_date || null,
                raw_cell: e.raw_cell || null,
                reason: e.reason,
                detail: e.detail ? { value: e.detail } : null,
            }))
        );
    }

    console.log(`\nĐã tạo ${created}/${stays.length} kỳ lưu trú. Thất bại: ${failures.length}`);
    console.log(`Mã lô nhập: ${batch.id}`);
};

// Chỉ chạy khi gọi trực tiếp, để phần logic thuần còn kiểm thử được.
if (require.main === module) {
    main().catch((error) => {
        console.error('\nLỗi:', error.message);
        process.exit(1);
    });
}

module.exports = { parseCsv, resolveHeaders, buildStays, applyFormat, dayDiff };
