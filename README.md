# PackPrint Manager - Phần mềm Quản lý Công ty In ấn Bao bì 📦🖨️

Chào mừng bạn đến với **PackPrint Manager**, giải pháp ERP tinh gọn, hiện đại và chuyên sâu được thiết kế dành riêng cho các doanh nghiệp, xưởng sản xuất in ấn bao bì giấy, thùng carton tại Việt Nam.

Hệ thống được phát triển theo mô hình phân quyền chặt chẽ, tối ưu hóa quy trình làm việc giữa các phòng ban: **Chủ doanh nghiệp (Admin), Nhân viên Kinh doanh (Sale), Nhân viên Thiết kế (Designer), Xưởng Sản xuất (Production) và Kế toán tài chính (Accountant)**.

---

## 🌟 Tính năng Nổi bật & Nguyên tắc Nghiệp vụ

Hệ thống bám sát **8 nguyên tắc nghiệp vụ in ấn cốt lõi** và trực quan hóa chúng trên một giao diện duy nhất:
1. **Khách hàng là ai:** Theo dõi hồ sơ doanh nghiệp, thông tin liên lạc và hạn mức tín dụng khách hàng.
2. **Báo giá bao nhiêu:** Dự toán giá giấy, ca máy in và gia công để đưa ra báo giá tối ưu nhất.
3. **File nào là file final:** Lưu trữ, tải nhanh và kiểm soát lịch sử duyệt file kỹ thuật (CMYK, DPI, Bleed...) trước khi in.
4. **Đơn ở công đoạn nào:** Quản lý quy trình sản xuất khép kín gồm 4 bước: **In ấn ➡️ Bế hộp ➡️ Dán cạnh ➡️ Đóng gói**.
5. **Khi nào cần giao:** Cảnh báo trực quan nếu đơn hàng cận ngày giao hoặc quá hạn giao hàng.
6. **Đã thanh toán bao nhiêu:** Ghi nhận lịch sử nộp tiền mặt, chuyển khoản đặt cọc của khách hàng.
7. **Dư nợ công nợ bao nhiêu:** Tự động tính toán công nợ còn lại hoặc số tiền trả trước của khách hàng.
8. **Đơn lời hay lỗ:** Chỉ số sinh lời gộp ước tính và tỷ suất lợi nhuận (%) trên từng đơn hàng giúp chủ doanh nghiệp nhận diện sức khỏe tài chính tức thời.

---

## 🛠️ Tech Stack & Kiến trúc

- **Frontend & Backend:** Next.js 15+ (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS + Lucide Icons (Giao diện Glassmorphism hiện đại, responsive mượt mà)
- **Database ORM:** Prisma ORM
- **Database Engine:** SQLite (dành cho phát triển local, khởi động ngay lập tức) và hỗ trợ PostgreSQL (dành cho môi trường production).
- **Authentication:** Custom Cookie-based Auth an toàn, gọn nhẹ với Server Actions & Next.js Edge Middleware.
- **Đặc quyền DEMO:** Tích hợp bộ **Role Switcher** thông minh ngay trên Header giúp chuyển đổi nhanh giữa 5 vai trò nghiệp vụ chỉ bằng 1 cú click chuột để trải nghiệm tính năng phân quyền mà không cần logout đăng nhập lại!

---

## 🚀 Hướng dẫn Cài đặt & Chạy Local

Chỉ với vài bước đơn giản, bạn có thể khởi động dự án chạy ngay trên máy tính của mình:

### 1. Yêu cầu Hệ thống
- Đã cài đặt **Node.js** (Khuyên dùng v18 hoặc v20+).
- Đã cài đặt **NPM** (đi kèm khi cài Node.js).

### 2. Cài đặt các thư viện (Dependencies)
Mở Terminal trong thư mục dự án và chạy lệnh sau:
```bash
npm install
```

### 3. Đồng bộ Database SQLite
Khởi tạo và tạo cấu trúc bảng dữ liệu SQLite nhanh chóng từ file schema:
```bash
npx prisma db push
```

### 4. Đổ dữ liệu mẫu phong phú (Seeding)
Nạp dữ liệu mẫu chất lượng cao bao gồm đầy đủ tài khoản nhân viên, khách hàng lớn, báo giá và đơn hàng in bao bì thực tế:
```bash
npx tsx prisma/seed.ts
```

### 5. Chạy ứng dụng local
Khởi động máy chủ phát triển local:
```bash
npm run dev
```
Ứng dụng sẽ được chạy tại đường dẫn: **http://localhost:3000**

---

## 👤 Tài khoản Đăng nhập Mẫu (Demo Credentials)

Tại màn hình Đăng nhập (`/login`), hệ thống đã tích hợp sẵn **bảng click chọn nhanh tài khoản mẫu** cực kỳ tiện lợi. Hoặc bạn có thể tự nhập thủ công:

| Vai trò nghiệp vụ | Email nhân viên | Mật khẩu | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Admin / Chủ doanh nghiệp** | `admin@inbaobi.com` | `admin123` | Xem toàn bộ báo cáo doanh thu, nợ, lợi nhuận gộp, cấu hình bảng giá. |
| **Nhân viên Sale (Kinh doanh)** | `sale@inbaobi.com` | `sale123` | Quản lý khách hàng, lập báo giá in, theo dõi tiến độ đơn hàng bán ra. |
| **Nhân viên Thiết kế (Designer)** | `design@inbaobi.com` | `design123` | Tải lên file final, kiểm tra marquette và bấm Duyệt File in kỹ thuật. |
| **Xưởng Sản xuất (Production)** | `production@inbaobi.com` | `production123` | Nhận lệnh in, cập nhật ca máy, bế dán thành phẩm, báo cáo hoàn thành. |
| **Kế toán tài chính** | `accountant@inbaobi.com` | `accountant123` | Theo dõi dòng tiền, ghi nhận thu cọc khách hàng, thu nợ, điều chỉnh bảng giá giấy. |

---

## ☁️ Hướng dẫn Triển khai (Deploy) lên Vercel / Railway

Dự án đã được cấu hình chuẩn hóa, sẵn sàng 100% để chuyển sang PostgreSQL và deploy lên các dịch vụ đám mây chỉ trong 5 phút:

### 1. Thay đổi Database sang PostgreSQL
Trong tệp `prisma/schema.prisma`, hãy sửa đổi khối `datasource db` như sau:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Cấu hình Biến môi trường (Environment Variables)
Khi tạo ứng dụng trên **Vercel** hoặc các máy chủ khác, hãy thêm các biến môi trường sau trong phần cấu hình (Environment Variables):
- `DATABASE_URL`: Đường dẫn kết nối database PostgreSQL (ví dụ từ Railway, Supabase hoặc Neon DB).
  *Cú pháp ví dụ:* `postgresql://user:password@host:port/database?sslmode=require`

### 3. Build & Deploy
Chạy lệnh tự động cập nhật Prisma Client khi deploy lên Vercel bằng cách cấu hình lệnh build trong `package.json`:
```json
"scripts": {
  "build": "prisma generate && next build"
}
```
Lệnh này đã được cấu hình sẵn trong dự án! Khi bạn deploy lên Vercel, Vercel sẽ tự động generate Client và build dự án chính xác.

---

## 📂 Cấu trúc Thư mục Nguồn (`src/`)

```text
src/
├── app/
│   ├── layout.tsx         # Root layout, tích hợp Font chữ, CSS
│   ├── page.tsx           # Tự động redirect về dashboard
│   ├── login/             # Màn hình đăng nhập bóng bẩy
│   └── dashboard/         # Khu vực làm việc nội bộ (Có phân quyền)
│       ├── layout.tsx     # Khung làm việc (Sidebar + Header + Session control)
│       ├── page.tsx       # Bảng điều khiển (Cards thống kê + Biểu đồ SVG + Bảng theo dõi 8 chỉ số)
│       ├── customers/     # Quản lý Khách hàng (kết nối DB)
│       ├── quotes/        # Báo giá & Dự toán chi phí (kết nối DB)
│       ├── orders/        # Quản lý Đơn hàng sản xuất (kết nối DB)
│       ├── design-approval/ # Duyệt file thiết kế (kết nối DB)
│       ├── production/    # Tiến độ xưởng in (kết nối DB)
│       ├── debt/          # Tài chính & Công nợ (kết nối DB)
│       └── pricing-config/ # Bảng giá vật tư giấy/gia công (kết nối DB)
├── components/            # React Components dùng chung
│   ├── sidebar.tsx        # Thanh menu trái hiển thị động theo quyền
│   └── header.tsx         # Thanh công cụ trên với bộ chọn vai DEMO tức thời
└── lib/                   # Utilities & Services
    ├── db.ts              # Khởi tạo Prisma Client Singleton
    ├── auth.ts            # Xử lý an toàn Session Cookie & Server Actions
    └── utils.ts           # Định dạng VND, Ngày Việt Nam, Trạng thái đơn
```

Chúc bạn có những trải nghiệm tuyệt vời cùng **PackPrint Manager**! 🚀📦
