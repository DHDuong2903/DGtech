# DGtech — Project Highlight (1 trang)

**DGtech** — nền tảng e-commerce nội thất Việt Nam: mua sắm online + showroom 3D + AI tư vấn grounded + vận hành shop đầy đủ.

---

## Vấn đề

Mua nội thất online thiếu niềm tin hình ảnh (sai size/màu/style) → return ngành thường 15–30%+. Thị trường nội thất online VN ~**1,85 tỷ USD (2025)** đang tăng, trong khi visualization 3D/AR đã được IKEA/Wayfair chứng minh giảm return ~20–43%.

## Giải pháp (đã build)

| Trụ | Nội dung |
|-----|----------|
| **Commerce VN** | Catalog, cart, checkout, COD + VietQR/SePay, shipping theo vùng, voucher/campaign/bundle, kho nhập |
| **Showroom 3D** | React Three Fiber: phòng GLB + slot sản phẩm + tint màu + lưu layout — **Gold member** |
| **AI Concierge** | Gemini Stage 5: intent → catalog/policy retrieval → guardrails → trả lời + product links |
| **Admin** | CRUD sản phẩm/đơn/kho/showroom scenes, campaign, bundle, shipping, rank |

## Tech stack

Next.js 16 · React 19 · Tailwind 4 / shadcn · Zustand · Express 5 · Sequelize · PostgreSQL · Clerk · Cloudinary · Three.js/R3F · Gemini · Redis (optional) · SePay

## Điểm kỹ thuật đáng kể

- Intent-routed AI (không chat generic); cache fresh + stale-while-error; lazy GLB + `useGLTF.preload`
- Stock hold đến khi CK thành công; webhook SePay idempotent
- Membership rank từ lịch sử đơn → unlock trải nghiệm 3D

## Kết quả / định vị

Prototype thương mại **đúng pain ngành**, đủ chiều sâu cho portfolio/capstone và mở rộng. Chưa AR-in-room, chưa A/B ROI nội bộ — xem `DGTECH_ROADMAP.md`.

**Chi tiết:** `TONG_HOP_CODE_DGTECH.md` · Repo: https://github.com/DHDuong2903/DGtech
