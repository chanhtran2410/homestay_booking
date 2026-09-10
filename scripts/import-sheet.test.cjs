#!/usr/bin/env node
/**
 * Kiểm thử phần logic thuần của script nhập dữ liệu — chạy độc lập, không
 * cần Supabase:  node scripts/import-sheet.test.cjs
 *
 * Hai thứ được kiểm kỹ nhất vì sai là hỏng dữ liệu âm thầm:
 *   1. Đoán định dạng ngày ("01/02" là 1 tháng 2 hay 2 tháng 1?)
 *   2. Không cộng dồn tiền cọc khi gom các đêm thành một kỳ lưu trú
 */
const assert = require('assert');
const { parseCsv, resolveHeaders, buildStays } = require('./import-sheet.cjs');

let passed = 0;
const test = (name, fn) => {
    try {
        fn();
        console.log(`  ok   ${name}`);
        passed += 1;
    } catch (error) {
        console.error(`  LỖI  ${name}`);
        console.error(`       ${error.message}`);
        process.exitCode = 1;
    }
};

console.log('\nĐọc CSV');

test('xử lý ô có ngoặc kép và dấu phẩy', () => {
    const rows = parseCsv('a,b\n"x,1","say ""hi"""\n');
    assert.deepStrictEqual(rows[0], ['a', 'b']);
    assert.deepStrictEqual(rows[1], ['x,1', 'say "hi"']);
});

console.log('\nĐoán định dạng ngày');

test('chọn DD/MM/YYYY khi chuỗi ngày tăng đều', () => {
    const headers = ['Tên', 'Mã', '01/09/2026', '02/09/2026', '03/09/2026'];
    const result = resolveHeaders(headers, null, []);
    assert.strictEqual(result.format, 'DD/MM/YYYY');
    assert.deepStrictEqual(result.dates, ['2026-09-01', '2026-09-02', '2026-09-03']);
});

test('chọn MM/DD/YYYY khi CHỈ cách đọc đó cho ra chuỗi liên tiếp', () => {
    // 09/01, 09/02, 09/03 — đọc kiểu DD/MM thì thành 9/1, 9/2, 9/3 (cách nhau
    // cả tháng), đọc kiểu MM/DD mới ra ba ngày liền nhau.
    const headers = ['Tên', 'Mã', '09/01/2026', '09/02/2026', '09/03/2026'];
    const result = resolveHeaders(headers, null, []);
    assert.strictEqual(result.format, 'MM/DD/YYYY');
    assert.deepStrictEqual(result.dates, ['2026-09-01', '2026-09-02', '2026-09-03']);
});

test('suy ra năm từ tham số --year khi tiêu đề thiếu năm', () => {
    const headers = ['Tên', 'Mã', '01/09', '02/09', '03/09'];
    const result = resolveHeaders(headers, 2026, []);
    assert.deepStrictEqual(result.dates, ['2026-09-01', '2026-09-02', '2026-09-03']);
});

test('ngày không tồn tại bị ghi vào báo cáo lỗi', () => {
    const errors = [];
    const headers = ['Tên', 'Mã', '01/09/2026', '31/02/2026', '03/09/2026'];
    const result = resolveHeaders(headers, null, errors);
    assert.strictEqual(result.dates[1], null);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].reason, 'unparseable_date_header');
});

console.log('\nGom đêm thành kỳ lưu trú');

const nights = (list) => list.map(([date, raw]) => ({ date, raw }));

test('ba đêm liên tiếp cùng khách gộp thành MỘT kỳ', () => {
    const stays = buildStays(
        '1001',
        nights([
            ['2026-09-10', 'Anh Minh - Đã đặt cọc - 500.000'],
            ['2026-09-11', 'Anh Minh - Đã đặt cọc - 500.000'],
            ['2026-09-12', 'Anh Minh - Đã đặt cọc - 500.000'],
        ]),
        []
    );
    assert.strictEqual(stays.length, 1);
    assert.strictEqual(stays[0].nights, 3);
    assert.strictEqual(stays[0].check_in, '2026-09-10');
    assert.strictEqual(stays[0].guest_name, 'Anh Minh');
});

test('TIỀN CỌC KHÔNG BỊ CỘNG DỒN qua các đêm', () => {
    // Đây là cách dễ nhất làm hỏng dữ liệu: Sheet chép lại số cọc trên từng
    // đêm, cộng vào là nhân lên đúng bằng số đêm (500k -> 1,5tr).
    const stays = buildStays(
        '1001',
        nights([
            ['2026-09-10', 'Anh Minh - Đã đặt cọc - 500.000'],
            ['2026-09-11', 'Anh Minh - Đã đặt cọc - 500.000'],
            ['2026-09-12', 'Anh Minh - Đã đặt cọc - 500.000'],
        ]),
        []
    );
    assert.strictEqual(stays[0].deposit_amount, 500000);
});

test('ngắt quãng ngày tạo kỳ mới', () => {
    const stays = buildStays(
        '1001',
        nights([
            ['2026-09-10', 'Anh Minh - Đã đặt cọc - 500.000'],
            ['2026-09-12', 'Anh Minh - Đã đặt cọc - 500.000'],
        ]),
        []
    );
    assert.strictEqual(stays.length, 2);
});

test('đổi khách tạo kỳ mới dù ngày liền nhau', () => {
    const stays = buildStays(
        '1001',
        nights([
            ['2026-09-10', 'Anh Minh - Đã đặt cọc - 500.000'],
            ['2026-09-11', 'Chị Hằng - Đã đặt cọc - 500.000'],
        ]),
        []
    );
    assert.strictEqual(stays.length, 2);
    assert.strictEqual(stays[1].guest_name, 'Chị Hằng');
});

test('số cọc gõ lệch vẫn là một kỳ, nhưng bị ghi cảnh báo', () => {
    const errors = [];
    const stays = buildStays(
        '1001',
        nights([
            ['2026-09-10', 'Anh Minh - Đã đặt cọc - 500.000'],
            ['2026-09-11', 'Anh Minh - Đã đặt cọc - 500000'],
        ]),
        errors
    );
    assert.strictEqual(stays.length, 1, 'phải gộp thành một kỳ');
    assert.strictEqual(stays[0].deposit_amount, 500000);
    assert.ok(errors.some((e) => e.reason === 'deposit_mismatch'));
});

test('trạng thái chờ cọc được nhận đúng', () => {
    const stays = buildStays(
        '1002',
        nights([['2026-09-10', 'Chị Hằng - Đang đợi đặt cọc']]),
        []
    );
    assert.strictEqual(stays[0].status, 'wait');
    assert.strictEqual(stays[0].deposit_amount, 0);
});

test('đã cọc nhưng thiếu số tiền thì bị cảnh báo', () => {
    const errors = [];
    buildStays('1001', nights([['2026-09-10', 'Anh Minh - Đã đặt cọc']]), errors);
    assert.ok(errors.some((e) => e.reason === 'deposit_missing_for_booked'));
});

console.log(`\n${passed} test đạt${process.exitCode ? ' — CÓ LỖI' : ''}\n`);
