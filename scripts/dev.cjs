#!/usr/bin/env node
/**
 * `npm start` — chạy đồng thời server API cục bộ và webpack-dev-server của CRA.
 * Không thêm thư viện nào, chỉ dùng child_process.
 */
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WEB_PORT = Number(process.env.PORT || 3000);
const API_PORT = Number(process.env.DEV_API_PORT || 3001);
const children = [];

// Cổng phải đúng 3000: uri_allow_list bên Supabase chỉ cho phép redirect về
// localhost:3000, nên nếu CRA âm thầm nhảy sang cổng khác thì đăng nhập Google
// sẽ hỏng mà không rõ vì sao. Thà dừng hẳn và nói rõ còn hơn.
const portFree = (port) =>
    new Promise((resolve) => {
        const socket = net
            .createConnection({ port, host: '127.0.0.1' })
            .on('connect', () => {
                socket.destroy();
                resolve(false);
            })
            .on('error', () => resolve(true));
        setTimeout(() => {
            socket.destroy();
            resolve(true);
        }, 1500);
    });

const ensurePortsFree = async () => {
    const busy = [];
    for (const [port, label] of [
        [WEB_PORT, 'giao diện'],
        [API_PORT, 'API'],
    ]) {
        if (!(await portFree(port))) busy.push(`${port} (${label})`);
    }
    if (busy.length === 0) return;

    console.error(`\n  Cổng đang bị chiếm: ${busy.join(', ')}`);
    console.error('  Nhiều khả năng là một phiên `npm start` cũ chưa tắt.\n');
    console.error('  Tìm và dừng nó:');
    console.error(`    netstat -ano | findstr :${WEB_PORT}`);
    console.error('    taskkill /F /PID <pid>\n');
    console.error(
        '  Không tự đổi sang cổng khác vì Supabase chỉ cho phép đăng nhập\n' +
            `  Google redirect về http://localhost:${WEB_PORT}.\n`
    );
    process.exit(1);
};

const run = (label, command, args, { env = {}, shell = false } = {}) => {
    // shell: true chỉ dùng cho react-scripts (là file .cmd trên Windows).
    // Không dùng cho node.exe: đường dẫn "C:\Program Files\..." có dấu cách,
    // mà shell nối chuỗi chứ không escape nên sẽ đứt ở "C:\Program".
    const child = spawn(command, args, {
        cwd: ROOT,
        stdio: 'inherit',
        shell,
        env: { ...process.env, ...env },
    });
    child.on('exit', (code) => {
        if (code) console.error(`\n[${label}] dừng với mã ${code}`);
        stopAll();
        process.exit(code || 0);
    });
    children.push(child);
    return child;
};

const stopAll = () => {
    children.forEach((child) => {
        if (!child.killed) child.kill();
    });
};

process.on('SIGINT', () => {
    stopAll();
    process.exit(0);
});
process.on('SIGTERM', stopAll);

ensurePortsFree().then(() => {
    run('api', process.execPath, [path.join(__dirname, 'dev-api.cjs')], {
        env: { DEV_API_PORT: String(API_PORT) },
    });
    // PORT cố định để CRA không hỏi "đổi cổng khác?" rồi tự nhảy sang cổng lạ.
    run('web', 'react-scripts', ['start'], {
        shell: true,
        env: { PORT: String(WEB_PORT) },
    });
});
