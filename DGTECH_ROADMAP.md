# DGtech — Roadmap đóng gap

Ưu tiên các lỗ hổng đã nêu trong `TONG_HOP_CODE_DGTECH.md`: đồng bộ loyalty, trải nghiệm 3D/AR, AI, và vận hành deploy.

---

## P0 — Loyalty & consistency (tier sync) — DONE (Option A)

**Đã làm:** Voucher + campaign storefront dùng `getStorefrontUserTier` → `getMyRank` (cache `userTier:v2:`). Invalidate cache khi đơn → DELIVERED / COMPLETED / CANCELLED. Cột `users.tier` vẫn tồn tại (webhook set bronze) nhưng **không còn** quyết định quyền lợi storefront.

**Vấn đề cũ:** Rank **computed** dùng cho showroom Gold; voucher/campaign đọc cột `User.tier` tĩnh → lệch.

~~Việc làm còn lại (Option B, tuỳ chọn):~~ sync ghi `users.tier` + backfill nếu muốn DB column khớp admin SQL.

---

## P1 — Showroom / AR

**Vấn đề:** Hiện chỉ room template + slot (admin dựng sẵn); chưa ướm vào phòng thật của khách.

**Việc làm (theo mức effort):**

| Bước | Mô tả | Effort |
|------|--------|--------|
| 1 | Tối ưu GLB (compress Draco/meshopt), loading skeleton, mobile FPS budget | Thấp |
| 2 | CTA “Thêm vào giỏ từ showroom” từ slot đã chọn → giảm ma sát mua | Thấp–TB |
| 3 | WebAR View-in-Room (model-viewer / Scene Viewer / Quick Look) trên PDP | TB |
| 4 | (Dài hạn) Scan/room scale hoặc tích hợp partner AR | Cao |

**Done khi (P1 tối thiểu):** PDP có xem 3D/AR trên thiết bị thật + từ showroom add-to-cart được.

---

## P2 — AI cứng hơn

**Vấn đề:** RAG/pgvector đã gỡ; guest conversation / route auth chưa thống nhất.

**Việc làm:**

1. Thống nhất guest vs auth: hoặc mở persistence guest theo `guestSessionId`, hoặc document rõ chỉ auth.
2. Eval harness định kỳ (`AI_CHATBOT_EVALUATION.md`) — chặn regression hallucination domain.
3. (Tuỳ chọn) Đưa lại semantic retrieval nếu catalog lớn; hoặc giữ structured retrieval + mở rộng intent rules / policy tools.
4. Rate limit + quota UX đã có — bổ sung logging intent/confidence cho analytics.

**Done khi:** luồng guest/auth rõ; bộ eval pass trên bộ case sản phẩm + policy + membership/showroom.

---

## P3 — Ops & DX

**Vấn đề:** Không Docker / `.env.example`; deploy thủ công.

**Việc làm:**

1. Thêm `backend/.env.example` + `frontend/.env.example` (chỉ tên biến, không secret).
2. `docker-compose.yml`: Postgres (+ optional Redis) cho local.
3. README: bước migrate, seed, chạy hai app; sửa đoạn còn nhắc RAG nếu còn sót.
4. Health check `/api/health` (DB + optional Redis) cho Render.
5. CI tối thiểu: `tsc` / lint backend + frontend trên PR.

**Done khi:** contributor mới clone → copy env → compose up → migrate → `npm run dev` hai phía trong <30 phút.

---

## P4 — Đo lường sản phẩm (để chứng minh giá trị)

Không có A/B nội bộ thì khó nói ROI như Wayfair.

**Metrics đề xuất:**

- Showroom: sessions, save-setup rate, add-to-cart từ showroom, conversion so với non-showroom
- 3D/AR trên PDP: view rate, conversion, (nếu có) return reason “sai màu/size”
- AI: intent distribution, clarify rate, handoff/negative reply
- Loyalty: % user đạt Gold, usage showroom theo cohort

**Done khi:** dashboard đơn giản (admin hoặc analytics) có ít nhất funnel showroom → cart → paid.

---

## Thứ tự đề xuất

```text
P0 tier sync  →  P3 env/Docker (song song được)
     ↓
P1 showroom CTA + GLB optimize → WebAR PDP
     ↓
P2 AI guest/auth + eval
     ↓
P4 metrics
```

Chi tiết kiến trúc hiện tại: `TONG_HOP_CODE_DGTECH.md`. Highlight CV: `DGTECH_CV_HIGHLIGHT.md`.
