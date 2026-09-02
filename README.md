# DGtech

DGtech là nền tảng thương mại điện tử nội thất / trang trí nhà, phát triển với Next.js (frontend) và Node.js/Express (backend), sử dụng PostgreSQL, Clerk, Cloudinary. Dự án hướng tới trải nghiệm người dùng tối ưu, bảo mật, dễ mở rộng và quản trị — kèm showroom 3D, AI concierge grounded, thanh toán VietQR/SePay.

**Tài liệu dự án:**

- [Tổng hợp chi tiết](./TONG_HOP_CODE_DGTECH.md) — kiến trúc, feature, tối ưu, giá trị thị trường
- [Highlight 1 trang (CV/bảo vệ)](./DGTECH_CV_HIGHLIGHT.md)
- [Roadmap đóng gap](./DGTECH_ROADMAP.md)

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

STAGE 0 — Generic LLM Chatbot

Flow:

User
↓
Gemini
↓
Response
Đặc điểm:
nói tự nhiên
generic
hallucinate mạnh
không biết business thật
Ví dụ:
"DGTech chủ yếu bán điện tử..."

dù DB không confirm.

STAGE 1 — Conversation-aware AI

Bạn thêm:

history
context continuity
AI bắt đầu:
nhớ câu trước
refer entity
giữ mạch hội thoại
STAGE 2 — Catalog-grounded AI

Bạn thêm:

DB retrieval
product/category grounding
structured catalog context
Đây là bước:
AI có “mắt”
Flow:
Question
↓
catalog retrieval
↓
context injection
↓
Gemini
AI bắt đầu:
biết sản phẩm thật
biết stock thật
biết giá thật
STAGE 3 — Relational thinking

Bạn bắt đầu xử lý:

variants
product relations
entity references
Đây là lúc:
"Cái sofa kia..."

bắt đầu meaningful.

STAGE 4 — Multi-domain retrieval

Bạn thêm:

shipping
payment
voucher
order workflow
Đây là bước:
AI không còn product-only.
STAGE 5 — Intent-routed business assistant

Bạn thêm:

intent classification
domain routing
membership grounding
policy context
guardrails
Đây là level hiện tại.
Kiến trúc hiện tại thực chất là:
User message
↓
Intent classifier
↓
Domain router
↓
Context retrieval
↓
Guardrails
↓
LLM generation
Đây là architecture AI production thật sự.