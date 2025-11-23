# DGtech

DGtech là một nền tảng thương mại điện tử hiện đại được xây dựng với Next.js và Node.js.  
Dự án hỗ trợ các tính năng: duyệt sản phẩm, giỏ hàng, thanh toán trực tuyến, đăng nhập bằng Clerk, quản lý đơn hàng, đánh giá sản phẩm, và nhiều tính năng khác.

## Cấu trúc thư mục

```
dgtech/
│
├── backend/      # Source code server Node.js + Express + PostgreSQL
├── frontend/     # Source code client Next.js + TypeScript + Clerk
├── README.md     # Tài liệu dự án
```

## Yêu cầu hệ thống

- Node.js >= 18.x
- PostgreSQL (local hoặc cloud)
- Tài khoản Clerk (https://clerk.com/) để xác thực người dùng

## Hướng dẫn cài đặt

### 1. Clone dự án

```bash
git clone https://github.com/DHDuong2903/DGtech.git
cd dgtech
```

### 2. Cài đặt dependencies

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 3. Thiết lập biến môi trường

Tạo file `.env` trong thư mục `backend` với nội dung:

```
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/dgtech
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_webhook_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=development
```

Tạo file `.env.local` trong thư mục `frontend` với nội dung:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Khởi động dự án

Chạy backend:

```bash
npm run dev --prefix backend
```

Chạy frontend:

```bash
npm run dev --prefix frontend
```

Truy cập website tại [http://localhost:3000](http://localhost:3000)

## Tính năng chính

- Đăng nhập/Đăng ký bằng Clerk
- Duyệt và tìm kiếm sản phẩm theo tên, danh mục
- Thêm sản phẩm vào giỏ hàng
- Thanh toán trực tuyến an toàn
- Theo dõi đơn hàng
- Đánh giá và nhận xét sản phẩm
- Quản lý tài khoản cá nhân
- Quản lý sản phẩm, danh mục, đơn hàng, người dùng (Admin)
- Upload ảnh sản phẩm qua Cloudinary

## Công nghệ sử dụng

- **Frontend:** Next.js, TypeScript, Clerk, TailwindCSS, Radix UI, Zustand, Axios
- **Backend:** Node.js, Express, PostgreSQL, Sequelize, Cloudinary
- **Xác thực:** Clerk

## Deploy lên Render

### Tổng quan

- Frontend + Backend deploy chung trên 1 URL Render
- Database PostgreSQL trên Render

### Các bước deploy

1. **Tạo PostgreSQL Database trên Render**
2. **Deploy Web Service**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
3. **Thêm Environment Variables** (xem file `.env.example`)
4. **Setup Clerk Webhook**

📚 **Xem hướng dẫn chi tiết**: [DEPLOY.md](./DEPLOY.md)
