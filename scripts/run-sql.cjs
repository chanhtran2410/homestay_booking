#!/usr/bin/env node
/**
 * Chạy file .sql lên Supabase qua Management API.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/run-sql.cjs supabase/migrations/0001_init.sql
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/run-sql.cjs --query "select 1"
 *
 * Access token lấy ở: Supabase Dashboard → Account → Access Tokens.
 * Token này có quyền rất rộng (tạo/xoá cả project) — đừng bao giờ commit nó.
 */
const fs = require('fs');
const path = require('path');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'wlcaedkbrbaiqqjyxyph';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
    console.error('Thiếu biến môi trường SUPABASE_ACCESS_TOKEN.');
    process.exit(1);
}

const runSql = async (sql) => {
    const response = await fetch(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: sql }),
        }
    );

    const text = await response.text();
    let payload;
    try {
        payload = JSON.parse(text);
    } catch (error) {
        payload = text;
    }

    if (!response.ok) {
        const err = new Error(
            typeof payload === 'string'
                ? payload
                : payload.message || JSON.stringify(payload)
        );
        err.status = response.status;
        throw err;
    }
    return payload;
};

const main = async () => {
    const args = process.argv.slice(2);
    const queryIndex = args.indexOf('--query');

    if (queryIndex !== -1) {
        const result = await runSql(args[queryIndex + 1]);
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    if (args.length === 0) {
        console.error('Cách dùng: node scripts/run-sql.cjs <file.sql> [file2.sql ...]');
        process.exit(1);
    }

    for (const file of args) {
        const full = path.resolve(file);
        if (!fs.existsSync(full)) {
            console.error(`Không tìm thấy ${file}`);
            process.exit(1);
        }
        process.stdout.write(`→ ${path.basename(file)} ... `);
        try {
            await runSql(fs.readFileSync(full, 'utf8'));
            console.log('xong');
        } catch (error) {
            console.log('LỖI');
            console.error(`\n${error.message}\n`);
            process.exit(1);
        }
    }
};

// Chỉ chạy khi gọi trực tiếp, để file còn require() được từ script khác.
if (require.main === module) {
    main().catch((error) => {
        console.error('Lỗi:', error.message);
        process.exit(1);
    });
}

module.exports = { runSql };
