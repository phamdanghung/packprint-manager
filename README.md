# PackPrint Manager - Phần mềm Quản lý Công ty In ấn Bao bì 📦🖨️

Chào mừng bạn đến với **PackPrint Manager**, giải pháp ERP tinh gọn, hiện đại và chuyên sâu được thiết kế dành riêng cho các doanh nghiệp, xưởng sản xuất in ấn bao bì giấy, thùng carton tại Việt Nam.

Hệ thống được phát triển theo mô hình phân quyền chặt chẽ, tối ưu hóa quy trình làm việc giữa các phòng ban: **Chủ doanh nghiệp (Admin), Quản lý (Manager), Nhân viên Kinh doanh (Sales), Nhân viên Thiết kế (Designer), Xưởng Sản xuất (Production), Kế toán (Accountant) và Giao hàng (Delivery)**.

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
- **Authentication:** Custom Server-side Database-Backed Sessions cực kỳ bảo mật. Khi đăng nhập, sinh ra `sessionToken` ngẫu nhiên lưu trong cookie, băm SHA-256 lưu làm `tokenHash` trong database. Mỗi request hệ thống băm đối chiếu DB và query thông tin user thời gian thực. Không lưu thông tin nhạy cảm, vai trò hay email ở cookie.
- **Đặc quyền DEMO:** Tích hợp bộ **Role Switcher** thông minh ngay trên Header (chỉ hiển thị ở chế độ Development) giúp chuyển đổi nhanh giữa 7 vai trò nghiệp vụ chỉ bằng 1 cú click chuột để trải nghiệm tính năng phân quyền mà không cần logout đăng nhập lại!

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
npx prisma db push --force-reset
```

### 4. Đổ dữ liệu mẫu phong phú (Seeding)
Nạp dữ liệu mẫu chất lượng cao bao gồm đầy đủ tài khoản nhân viên có mật khẩu đã được băm bảo mật, khách hàng lớn, báo giá và đơn hàng in bao bì thực tế:
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

Tại màn hình Đăng nhập (`/login`), hệ thống đã tích hợp sẵn **bảng click chọn nhanh tài khoản mẫu** cực kỳ tiện lợi. Hoặc bạn có thể tự nhập thủ công (Mật khẩu của tất cả tài khoản đều là `123456`):

| Vai trò nghiệp vụ | Email nhân viên | Mật khẩu | Chức năng chính / Phân quyền Menu |
| :--- | :--- | :--- | :--- |
| **Admin / Chủ doanh nghiệp** | `admin@packprint.vn` | `123456` | Toàn quyền kiểm soát hệ thống, xem mọi menu và thống kê báo cáo. |
| **Quản lý (Manager)** | `manager@packprint.vn` | `123456` | Xem hầu hết mọi dữ liệu, phê duyệt file thiết kế, xem sản xuất, công nợ, cấu hình bảng giá. |
| **Nhân viên Sale (Kinh doanh)** | `sale@packprint.vn` | `123456` | Quản lý khách hàng, lập báo giá in, theo dõi tiến độ đơn hàng bán ra và xem file thiết kế. |
| **Nhân viên Thiết kế (Designer)** | `design@packprint.vn` | `123456` | Tải lên file final, kiểm tra marquette và bấm Duyệt File in kỹ thuật của đơn hàng liên quan. |
| **Xưởng Sản xuất (Production)** | `production@packprint.vn` | `123456` | Nhận lệnh in, cập nhật ca máy, bế dán thành phẩm, báo cáo tiến độ các công đoạn. |
| **Kế toán (Accountant)** | `accountant@packprint.vn` | `123456` | Quản lý công nợ, thu tiền cọc khách hàng, duyệt thanh toán nợ, lập báo giá & điều chỉnh bảng giá giấy. |
| **Giao hàng (Delivery)** | `delivery@packprint.vn` | `123456` | Xem danh sách đơn hàng cần giao vận, cập nhật tiến trình vận chuyển/giao hàng. |

---

## 📂 Cấu trúc Thư mục Nguồn (`src/`)

```text
src/
├── app/
│   ├── layout.tsx         # Root layout, tích hợp Font chữ, CSS
│   ├── page.tsx           # Tự động redirect về dashboard
│   ├── login/             # Màn hình đăng nhập bóng bẩy
│   └── dashboard/         # Khu vực làm việc nội bộ (Có phân quyền Server-side)
│       ├── layout.tsx     # Khung làm việc (Sidebar + Header + Session control)
│       ├── page.tsx       # Bảng điều khiển (Cards thống kê + Biểu đồ SVG + Bảng theo dõi 8 chỉ số)
│       ├── customers/     # Quản lý Khách hàng (ADMIN, MANAGER, SALES)
│       ├── quotes/        # Báo giá & Dự toán chi phí (ADMIN, MANAGER, SALES, ACCOUNTANT)
│       ├── orders/        # Quản lý Đơn hàng sản xuất (Tất cả vai trò)
│       ├── design-approval/ # Duyệt file thiết kế (ADMIN, MANAGER, DESIGNER, SALES)
│       ├── production/    # Tiến độ xưởng in (ADMIN, MANAGER, PRODUCTION, DELIVERY)
│       ├── payments/      # Tài chính & Công nợ (ADMIN, MANAGER, ACCOUNTANT)
│       └── pricing-config/ # Bảng giá vật tư giấy/gia công (ADMIN, MANAGER, ACCOUNTANT)
├── components/            # React Components dùng chung
│   ├── sidebar.tsx        # Thanh menu trái hiển thị động theo quyền
│   ├── header.tsx         # Thanh công cụ trên với thông tin user & switcher (Dev)
│   └── unauthorized.tsx   # Trang báo lỗi Không có quyền truy cập cực đẹp khi URL bypass
└── lib/                   # Utilities & Services
    ├── db.ts              # Khởi tạo Prisma Client Singleton (SQLite / PostgreSQL)
    ├── auth.ts            # Xử lý bảo mật Database-Backed Session, băm SHA-256, crypto & bcryptjs
    └── utils.ts           # Định dạng VND, Ngày Việt Nam, Trạng thái đơn, Map role tiếng Việt
```

Chúc bạn có những trải nghiệm tuyệt vời cùng **PackPrint Manager**! 🚀📦
