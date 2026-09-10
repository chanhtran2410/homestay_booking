# Triển khai — Supabase + Vercel

> **Trạng thái: database đã dựng xong và kiểm chứng.**
> Schema, dữ liệu 6 phòng, tài khoản quản trị đều đã có trên project
> `wlcaedkbrbaiqqjyxyph`. Mục 1–3 dưới đây ghi lại những gì đã chạy, giữ để
> dựng lại từ đầu khi cần. Việc còn phải làm: **mục 4 (biến môi trường Vercel)**
> và **mục 5 (deploy)**.

Kiến trúc: trình duyệt → Vercel Serverless Function (`/api`) → Supabase Postgres.
Trình duyệt **không bao giờ** nối thẳng vào database.

```
Trình duyệt (CRA, static)
   │  supabase-js CHỈ để đăng nhập → JWT
   │  fetch('/api/...', { Authorization: Bearer <JWT> })
   ▼
/api/*.js  (đây là "server", chạy trên Vercel)
   │  xác thực JWT · tra bảng admin_users · giữ SECRET KEY
   ▼
Supabase Postgres  (RLS bật, không policy nào cho anon)
```

---

## 0. Xoay khoá trước đã

Khoá `secret` và `access_token` đã từng bị dán vào chat. Vào
**Supabase Dashboard → Settings → API → Rotate** cho cả hai **trước khi deploy**.

---

## 1. Tạo schema

Vào **Supabase Dashboard → SQL Editor**, chạy lần lượt:

| Thứ tự | File | Nội dung |
|---|---|---|
| 1 | `supabase/migrations/0001_init.sql` | bảng, chỉ mục, ràng buộc, RLS |
| 2 | `supabase/migrations/0002_functions.sql` | trigger, hàm tính giá, RPC ghi dữ liệu |
| 3 | `supabase/migrations/0003_seed_rooms.sql` | dữ liệu 6 phòng |
| 4 | `supabase/migrations/0004_lockdown_anon.sql` | siết quyền `anon` xuống 0 |

Hoặc chạy cả bốn bằng một lệnh:

```bash
SUPABASE_ACCESS_TOKEN=sbp_... node scripts/run-sql.cjs \
    supabase/migrations/0001_init.sql \
    supabase/migrations/0002_functions.sql \
    supabase/migrations/0003_seed_rooms.sql \
    supabase/migrations/0004_lockdown_anon.sql
```

> **Vì sao cần file 0004:** Supabase tự cấp quyền cho `anon` và `authenticated`
> trên **mọi object mới** trong schema `public`. Lệnh `revoke` nào chạy *trước*
> khi tạo object đều vô tác dụng. File 0004 thu hồi sau cùng, đồng thời đổi
> `default privileges` để bảng thêm về sau không hở ra nữa.

File số 3 được sinh tự động từ code cũ — chạy lại bằng `npm run seed:rooms` nếu cần.

**Kiểm tra ràng buộc chống đặt trùng đã hoạt động:**

```sql
-- Lệnh thứ hai PHẢI báo lỗi duplicate key
insert into bookings (room_code, guest_name, status, deposit_amount, check_in, nights)
values ('1001', 'Test A', 'booked', 500000, '2030-01-01', 1) returning id;
-- lấy id ở trên rồi:
insert into booking_nights (booking_id, room_code, stay_date) values ('<id>', '1001', '2030-01-01');
insert into booking_nights (booking_id, room_code, stay_date) values ('<id>', '1001', '2030-01-01');
-- => ERROR: duplicate key value violates unique constraint "booking_nights_no_double_booking"
```

Nhớ xoá dữ liệu test sau khi thử.

---

## 2. Thêm người được quyền quản trị

Không có bước này thì **không ai đăng nhập được** — kể cả bạn. Đây là chủ ý:
hệ thống cũ cho bất kỳ tài khoản Google nào vào thẳng.

```sql
insert into admin_users (email, full_name, role) values
    ('email-cua-ban@gmail.com', 'Bảo', 'owner');
```

---

## 3. Bật đăng nhập — ĐÃ XONG

Cả hai cách đăng nhập đã bật và kiểm chứng:

- **Google**: đã bật với OAuth client `311093634768-b34q0qln...`.
  Authorized redirect URI đã khai bên Google Cloud:
  `https://wlcaedkbrbaiqqjyxyph.supabase.co/auth/v1/callback`
- **Email + mật khẩu**: đã bật.

Không cần tắt "Allow new users to sign up": trigger `enforce_admin_allowlist`
chặn ở tầng database, nên email không có trong `admin_users` thì không tạo
được tài khoản dù đăng ký bằng đường nào.

**Khi deploy lên Vercel** phải thêm domain vào danh sách redirect, nếu không
Google sẽ trả về rồi bị chặn:

```bash
SUPABASE_ACCESS_TOKEN=sbp_... node -e "
fetch('https://api.supabase.com/v1/projects/wlcaedkbrbaiqqjyxyph/config/auth',{
  method:'PATCH',
  headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},
  body:JSON.stringify({
    site_url:'https://<domain-cua-ban>.vercel.app',
    uri_allow_list:'https://<domain-cua-ban>.vercel.app/**,http://localhost:3000/**'
  })
}).then(r=>console.log(r.status))"
```

---

## 4. Biến môi trường trên Vercel

**Project Settings → Environment Variables:**

| Tên | Phạm vi | Giá trị |
|---|---|---|
| `REACT_APP_SUPABASE_URL` | client (nhúng vào bundle) | `https://wlcaedkbrbaiqqjyxyph.supabase.co` |
| `REACT_APP_SUPABASE_PUBLISHABLE_KEY` | client (nhúng vào bundle) | khoá `sb_publishable_...` |
| `SUPABASE_URL` | server | cùng URL |
| `SUPABASE_SECRET_KEY` | server | khoá `sb_secret_...` |

> **Không bao giờ** đặt khoá secret dưới tên bắt đầu bằng `REACT_APP_`.
> react-scripts nhúng thẳng mọi biến `REACT_APP_*` vào file JS gửi tới trình
> duyệt — làm vậy là phát khoá bỏ qua RLS cho mọi khách vào trang.

---

## 5. Deploy

Nối repo với Vercel rồi push. Vercel tự nhận:

- `vercel.json` → framework CRA, build ra `build/`, region `hnd1` (Tokyo).
  Project Supabase nằm ở `ap-northeast-1` nên function phải đặt cùng nơi;
  để mặc định (`iad1`, Virginia) thì mỗi truy vấn mất thêm khoảng 230 ms, mà
  `create_booking` gọi database vài lần.
- 6 file trong `api/` → 6 Serverless Function. Thư mục `api/_lib/` bắt đầu bằng
  `_` nên Vercel bỏ qua, không tốn slot.
- `engines.node = 22.x` trong `package.json` → chọn Node 22.

### Chạy ở máy

```bash
cp .env.example .env.local   # rồi điền khoá thật
npm start
```

`npm start` chạy **hai** tiến trình cùng lúc (`scripts/dev.cjs`):

| Cổng | Chạy gì |
|---|---|
| 3000 | webpack-dev-server của CRA |
| 3001 | `scripts/dev-api.cjs` — gắn đúng các handler trong `/api` |

Trường `"proxy": "http://localhost:3001"` trong `package.json` khiến CRA chuyển
tiếp mọi lời gọi `/api/...` sang cổng 3001.

> **Vì sao cần bước này:** `react-scripts start` không hề biết đến thư mục
> `/api` — mọi đường dẫn lạ đều rơi vào SPA fallback và trả về `index.html`.
> Client gọi `res.json()` trên HTML rồi báo *"Máy chủ trả về dữ liệu không hợp lệ"*.
> Server ở cổng 3001 xoá cache `require` mỗi lần gọi, nên sửa file trong `/api`
> là có hiệu lực ngay, không phải khởi động lại.

Muốn giống môi trường thật hơn thì dùng `npm run dev:vercel` (cần cài Vercel
CLI, đăng nhập và link project). Không bắt buộc.

---

## 6. Chuyển dữ liệu cũ

```bash
# 1. Trong Google Sheets: File → Download → CSV, lưu vào scripts/data/sheet.csv
npm run import:dry          # chỉ báo cáo, không ghi gì

# 2. Mở scripts/out/import-report.csv, sửa các dòng lỗi trong Sheet, lặp lại
# 3. Khi báo cáo chỉ còn cảnh báo vô hại:
npm run import:commit
```

Script tự đoán định dạng ngày trong hàng tiêu đề bằng cách chọn cách đọc nào
cho ra chuỗi ngày liên tiếp — vì bảng tính vốn là cuốn lịch. Nếu tiêu đề thiếu
năm thì thêm `--year=2026`.

Các đêm liên tiếp cùng phòng, cùng khách, cùng trạng thái được gom lại thành
một kỳ lưu trú. **Tiền cọc không bị cộng dồn** — Sheet chép lại một con số trên
từng đêm, cộng vào là nhân lên đúng bằng số đêm. Kiểm thử phần logic này:

```bash
npm run test:import
```

**Đối chiếu trước khi bỏ Sheet:** mở màn hình Báo cáo cho 3 tháng, so doanh thu
và số đêm với số liệu cũ. Giữ Sheet ở chế độ chỉ đọc thêm một tháng để phòng hờ.

---

## Kiểm tra bảo mật sau khi deploy

| Việc thử | Kết quả đúng |
|---|---|
| `curl https://<domain>/api/month?month=2026-09` (không kèm token) | `401 no_token` |
| Đăng nhập bằng email không có trong `admin_users` | `403 not_allowlisted` |
| Dùng khoá publishable gọi thẳng REST của Supabase (bảng bất kỳ) | `42501 insufficient_privilege` — `anon` không đọc được gì, kể cả `rooms` |
| `grep -oE "sb_secret_[A-Za-z0-9_-]{20,}" build/static/js/*.js` | không có kết quả |

> Đừng chỉ tìm `sb_secret` trơn — bản thân thư viện `supabase-js` có chuỗi
> `"sb_secret_"` trong hàm nhận dạng định dạng khoá, nên sẽ báo động giả.
> Phải tìm khoá **có giá trị** đi kèm như lệnh trên.

---

## Ghi chú

- **Gói Hobby của Vercel dành cho mục đích phi thương mại.** Đây là ứng dụng
  quản lý kinh doanh, nên về lý thuyết thuộc diện cần gói Pro. Rủi ro là bị đình
  chỉ deployment, mà như vậy thì mất luôn hệ thống đặt phòng — cân nhắc.
- **Giá ngày lễ**: bảng `holidays` để trống lúc chuyển đổi để số liệu khớp hệ
  thống cũ. Thêm ngày lễ vào bảng đó là mức giá `price_holiday` bắt đầu có hiệu lực.
- **Giá được chốt tại thời điểm đặt** (`booking_nights.nightly_rate`), nên sửa
  bảng giá về sau không làm thay đổi doanh thu các tháng đã qua — điều hệ thống
  cũ làm sai.
- **Mọi thao tác xoá đều được ghi vào `booking_audit`**, kèm nguyên trạng JSON,
  nên xoá nhầm vẫn khôi phục được bằng tay.
