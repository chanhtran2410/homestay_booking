#!/usr/bin/env node
/**
 * Máy chủ API cho môi trường phát triển.
 *
 * `npm start` chỉ chạy webpack-dev-server của CRA — nó KHÔNG phục vụ thư mục
 * /api, nên mọi lời gọi tới /api/... rơi vào SPA fallback và trả về index.html.
 * Client gọi res.json() trên HTML rồi báo "Máy chủ trả về dữ liệu không hợp lệ".
 *
 * File này gắn đúng các handler trong /api lên một cổng riêng, mô phỏng đối
 * tượng req/res mà Vercel cung cấp. Trường "proxy" trong package.json khiến
 * CRA chuyển tiếp /api sang đây, nên `npm start` là đủ dùng.
 *
 * Vẫn dùng `vercel dev` được nếu muốn giống môi trường thật hơn — nhưng phải
 * cài Vercel CLI, đăng nhập và link project.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const API_DIR = path.join(ROOT, 'api');
const PORT = Number(process.env.DEV_API_PORT || 3001);

// Nạp .env.local rồi .env (file đầu tiên định nghĩa biến nào thì giữ biến đó).
for (const name of ['.env.local', '.env']) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line) => {
            const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
            if (match && !process.env[match[1]]) {
                process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
            }
        });
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.error(
        '\n  Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY.\n' +
            '  Sao chép .env.example thành .env.local rồi điền khoá thật.\n'
    );
    process.exit(1);
}

const readBody = (req) =>
    new Promise((resolve) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += chunk;
        });
        req.on('end', () => {
            if (!raw) return resolve(undefined);
            try {
                resolve(JSON.parse(raw));
            } catch (error) {
                resolve(raw);
            }
        });
    });

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (!url.pathname.startsWith('/api/')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(
            JSON.stringify({ ok: false, code: 'not_found', message: 'Không có đường dẫn này.' })
        );
    }

    // /api/me -> api/me.js   ·  chặn ../ và các thư mục _ nội bộ
    const name = url.pathname.slice(5).replace(/\/+$/, '');
    const file = path.join(API_DIR, `${name}.js`);
    if (!file.startsWith(API_DIR) || name.startsWith('_') || !fs.existsSync(file)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(
            JSON.stringify({ ok: false, code: 'not_found', message: `Không có /api/${name}.` })
        );
    }

    // Xoá cache để sửa file trong /api là có hiệu lực ngay, không cần khởi động lại.
    Object.keys(require.cache)
        .filter((key) => key.startsWith(API_DIR))
        .forEach((key) => delete require.cache[key]);

    const started = Date.now();
    let statusCode = 200;

    // Mô phỏng res của Vercel (Node runtime)
    const shim = {
        setHeader: (key, value) => res.setHeader(key, value),
        status(code) {
            statusCode = code;
            return shim;
        },
        json(payload) {
            const body = JSON.stringify(payload);
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(body);
            console.log(
                `  ${String(statusCode).padEnd(4)}${req.method.padEnd(7)}${url.pathname}${
                    url.search
                }  ${Date.now() - started}ms`
            );
            return shim;
        },
        end(body) {
            res.writeHead(statusCode);
            res.end(body);
            return shim;
        },
    };

    try {
        const handler = require(file);
        await handler(
            {
                method: req.method,
                query: Object.fromEntries(url.searchParams),
                body: await readBody(req),
                headers: req.headers,
                url: req.url,
            },
            shim
        );
    } catch (error) {
        console.error(`  500  ${req.method} ${url.pathname}`, error);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(
                JSON.stringify({ ok: false, code: 'server_error', message: 'Lỗi máy chủ.' })
            );
        }
    }
});

server.listen(PORT, () => {
    const count = fs.readdirSync(API_DIR).filter((f) => f.endsWith('.js')).length;
    console.log(`\n  API cục bộ: http://localhost:${PORT}  (${count} endpoint)`);
    console.log(`  CRA sẽ chuyển tiếp /api sang đây qua "proxy" trong package.json\n`);
});
