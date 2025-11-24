# DGtech

DGtech là nền tảng thương mại điện tử hiện đại, phát triển với Next.js (frontend) và Node.js/Express (backend), sử dụng PostgreSQL, Clerk, Cloudinary. Dự án hướng tới trải nghiệm người dùng tối ưu, bảo mật, dễ mở rộng và quản trị.

## Kiến trúc dự án

- Monorepo gồm hai phần:
  - `frontend`: Next.js, TypeScript
  - `backend`: Node.js, Express, Sequelize
- Xác thực người dùng với Clerk
- Lưu trữ ảnh sản phẩm qua Cloudinary
- Quản lý trạng thái frontend bằng Zustand
- Giao tiếp API qua Axios, RESTful

## Tính năng chính

- Đăng nhập/đăng ký bảo mật
- Duyệt, tìm kiếm, lọc sản phẩm
- Quản lý giỏ hàng, đặt hàng, thanh toán
- Theo dõi đơn hàng, đánh giá sản phẩm
- Trang quản trị cho admin: sản phẩm, đơn hàng, người dùng, danh mục

## Cài đặt nhanh

### Yêu cầu hệ thống

- Node.js >= 18.x
- PostgreSQL
- Tài khoản Clerk, Cloudinary

### Các bước cài đặt

```bash
git clone https://github.com/DHDuong2903/DGtech.git
cd dgtech
npm install --prefix backend
npm install --prefix frontend
```

Tạo file `.env` cho backend và `.env.local` cho frontend theo mẫu.

### Khởi động

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

Truy cập: [http://localhost:3000](http://localhost:3000)

## Công nghệ sử dụng

- Frontend: Next.js, TypeScript, Clerk, TailwindCSS, Radix UI, Zustand, Axios
- Backend: Node.js, Express, PostgreSQL, Sequelize, Cloudinary

