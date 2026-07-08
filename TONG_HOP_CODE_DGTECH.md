# Tổng hợp source code DGtech (DGTech)

## 1) Công nghệ website sử dụng (Backend / Frontend / DB / AI / 3D)

### Backend

- **Node.js + Express** (EJS routes REST API dưới `/api/*`).
- **TypeScript** (một số file có `// @ts-nocheck`).
- **Sequelize** ORM + **PostgreSQL** database.
- **Cloudinary**: lưu/serve media sản phẩm (file upload helper/libs).
- **Clerk**: xác thực user (ở backend có `requireAuth/optionalAuth`).
- **Cache**: dùng Redis-like hoặc cache layer nội bộ qua `backend/src/libs/cache.ts` (các service AI policy dùng TTL).
- **Job/setup**: có các script seed, embed knowledge, evaluate AI.

### Frontend

- **Next.js (App Router)** + **TypeScript**.
- **Clerk** (auth UI/hook `useUser`).
- **Zustand**: quản lý state store (cart/product/rooms/showroom...).
- **TailwindCSS** + **Radix UI** component (shadcn/ui style).
- **Axios** client + interceptors.

### DB schema (gợi ý từ migrations + models)

- Dữ liệu e-commerce: users, addresses, categories, products, product variants, reviews, cart, orders, payments, vouchers/discount campaigns, shipping zones/methods, inventory/stock receipts.
- Phần AI:
  - `ai_conversations` và `ai_conversation_messages`.
  - `ai_knowledge_embeddings` (model `aiKnowledgeEmbeddingModel.ts`), và có migration “setup pgvector for ai”.
- Phần Showroom 3D:
  - `showroom_scenes`, `showroom_scene_slots`, `showroom_saved_setups` (từ migration).

### AI

- **Gemini API** (dùng `GEMINI_API_KEY`, `GEMINI_MODEL`), request tới endpoint Google Generative Language.
- Kiến trúc “AI e-commerce assistant”:
  - Nhận message + history.
  - Detect intent (keyword rules) từ `aiWebsiteKnowledgeService`.
  - Lấy “catalog grounded context” bằng `aiCatalogContextService`.
  - Lấy “policy context” (shipping/payment/membership/voucher/orders) bằng:
    - Legacy: `buildWebsiteKnowledgeContext` (text blocks).
    - Structured Tool Context: `aiPolicyStructuredContextService` (tool blocks + toolNames).
  - Lựa chọn retrieval mode:
    - Có flag `USE_RAG_RETRIEVAL=true` để dùng **RAG semantic search**.
    - Nếu RAG fail sẽ fallback về legacy.
- **RAG/pgvector**:
  - Có service `aiEmbeddingService` và model `aiKnowledgeEmbeddingModel`.
  - Migration `setup-pgvector-for-ai` cho index vector.

### 3D

- Dùng **react-three-fiber** + **drei** + **three**.
- Component chính: `ShowroomCanvas` hiển thị room GLTF/GLB và các product GLTF/GLB.
- Có parse “camera markers” nằm trong scene node name `CAM_*` để điều khiển camera.

---

## 2) Các feature website có & cách thức hoạt động

### 2.1 E-commerce core

Nhìn theo routes/controllers (tên file):

- `/api/products` + `/api/categories` + `/api/reviews`
- `/api/cart` (giỏ hàng)
- `/api/orders` + `/api/payments` + `/api/payment/*` webhook
- `/api/shipping` (shipping zones/rates/methods)
- `/api/discount-campaigns`, `/api/vouchers`, `/api/bundles`
- `/api/users`, `/api/addresses`, `/api/taxs`
- `/api/stock-receipts` và inventory movements
- Admin routes: controller có `optionalAuth/requireAdmin` cho phần admin.

**Luồng chung frontend**:

- Next.js gọi REST API bằng Axios.
- Cart/order flow: chọn sản phẩm -> giỏ -> checkout -> payment -> webhook/payment completion.

### 2.2 AI Chatbot (DGTech AI)

#### Backend API

- Route: `backend/src/routes/aiChatRoute.ts`
  - `POST /api/ai/chat` (optionalAuth) → `chatWithAi`
  - Conversation APIs (requireAuth):
    - `GET /api/ai/conversations`
    - `POST /api/ai/conversations`
    - `GET /api/ai/conversations/:conversationId`
    - `DELETE /api/ai/conversations/:conversationId`
    - `POST /api/ai/conversations/:conversationId/messages`
    - `POST /api/ai/messages`

- Controller: `backend/src/controllers/aiChatController.ts`
  - Lấy `req.body.message`, `req.body.history`.
  - Gọi `generateChatReply(message, history, { userId })`.
  - Trả JSON `{ ...payload }` gồm `reply`, `intent`, `catalogEnabled`, `productLinks`.

#### Frontend UI

- Floating widget: `frontend/src/components/public/FloatingAIWidget.tsx`
  - Ẩn trên mọi trang admin (`/admin*`).
  - Có **guest session** dùng localStorage key `dgtech_ai_guest_session_id`.
  - Có sidebar history khi signed-in.
  - Khi gửi message:
    - Nếu guest: gọi `aiChatApi.sendGuestMessage(trimmedInput, historyPayload)`.
    - Nếu signed-in: gọi conversation message endpoint.
  - Parse `metadata.productLinks` để link trực tiếp trong câu trả lời (dựa `productLinks[].name` match trong text).

#### Conversation & storage

- Model:
  - `AiConversation` (ai_conversations): clerkId/guestSessionId/title/status.
  - `AiConversationMessage` (ai_conversation_messages): role, content, intent/model/metadata JSONB.

- Service: `backend/src/services/aiConversationService.ts`
  - Actor (userId hoặc guestSessionId) để “ownerWhere”.
  - Listing conversations: load conversations + batch fetch latest message.
  - Send message:
    1. Load recent history (role user/assistant, limit 12).
    2. Insert user message row.
    3. Generate reply via `generateChatReply`.
    4. Insert assistant message row (intent/model/metadata).
    5. Update conversation updatedAt.

#### AI pipeline chi tiết (generateChatReply)

- File: `backend/src/services/aiChatService.ts`

**Các bước chính**

1. Validate message (string, trim) → 400 nếu rỗng.
2. Normalize history:
   - chỉ giữ các item có `{sender: 'user'|'ai', text: string}`
   - slice cuối tối đa **12**.
3. Build website knowledge context:
   - Nếu `USE_RAG_RETRIEVAL=true`:
     - `retrieveRelevantKnowledge()` → RAG static knowledge (semanticSearch/pgvector) + dynamicContext (shipping/payment/membership/promotions) nếu doc metadata gợi ý.
     - `detectAiIntent()` để lấy intent từ keyword rules.
     - `formatRagContextForLLM()` để đóng gói text context.
     - Nếu RAG fail → fallback `buildWebsiteKnowledgeContext` + `buildStructuredPolicyContext`.
   - Nếu legacy (default):
     - `buildWebsiteKnowledgeContext(message, { recentUserMessages, userId })`
     - `buildStructuredPolicyContext(websiteKnowledgeContext, ...)`

4. Build catalog context:
   - `buildCatalogContext()` (aiCatalogContextService.ts)
   - Có caching snapshot catalog summary (2 phút) + fallback featured products.
   - Extract search terms + detect variant intent.
   - Nếu không “looksLikeCatalogQuery” → catalogContext disabled.
   - Nếu có match:
     - match bằng **catalog index score** (normalizedName/description/category/variant attrs, stock ưu tiên) để chọn top IDs.
     - sau đó fetch details từ DB.
     - apply discount pricing for variants qua `discountCampaignResolveService`.

5. Structured AI context:
   - `buildStructuredAiContext()` (aiStructuredContextService.ts)
   - Xác định:
     - retrievalConfidence: high/medium/low/none.
     - answerMode: clarify | catalog_direct | policy_direct | general.
     - Nếu cần clarification → tạo question 1 câu.
   - Tạo blocks:
     - `AI tool result: store_policy_router ...`
     - `AI tool result: search_catalog ...` (kèm answer_mode/retrieval_confidence/clarification_question + danh sách top sản phẩm & rule contract)

6. Build Gemini request:
   - systemInstruction gồm:
     - rules về định dạng trả lời (không markdown bold \*\*, dùng bullet dashes),
     - ưu tiên context cung cấp,
     - không lộ internal field/db/schema,
     - rule rõ về clarify/low confidence.
   - contents gồm:
     - optional context block (website context + tool blocks + rag context nếu có),
     - lịch sử hội thoại (history items mapped role user/model),
     - message user hiện tại.

7. Parse response:
   - Lấy `payload.candidates[0].content.parts[].text` join.
   - Normalize formatting (strip **bold**, collapse whitespace, đảm bảo newline hợp lý).

8. Trả về:
   - `reply`
   - `intent` (websiteKnowledgeContext.intent)
   - `sourceTypes`
   - `catalogEnabled`
   - `productLinks` (tạo link `/shop/<productId>` từ matchedProducts max 5)

#### AI intent routing & policy blocks (đặc biệt)

- Intent detection: `backend/src/services/aiWebsiteKnowledgeService.ts`
  - Quy tắc keyword rules → intent:
    - membership_policy (bronze/silver/gold, rank, membership, showroom, 3d, phòng ảo, mô hình 3d)
    - shipping_policy (giao hàng, ship, phi ship...)
    - payment_policy (thanh toán, cod, bank transfer...)
    - voucher_policy (voucher, mã giảm giá, khuyến mãi...)
    - order_support (đơn hàng, tracking, hủy đơn...)
    - product_catalog (san phẩm, danh mục, biến thể, tồn kho, giá, màu, kích thước...)
    - store_capability (website/shop/có gì/tính năng...)
  - Admin blocking:
    - `looksLikeAdminQuestion()` dựa blocklist regex (admin panel, backend, setting, shipping setup, inventory management, showroom config...)
    - Nếu match admin question: trả context “general_support” + rules từ chối trợ giúp admin.

- Policy structured tools:
  - `aiPolicyStructuredContextService.ts`
    - build các tool blocks:
      - get_shipping_policy
      - get_payment_policy
      - get_membership_policy (+ current user membership progress nếu có userId)
      - get_active_promotions
    - tool blocks được đóng gói theo format “AI tool result: <tool_name>”.

---

### 2.3 Feature AI liên quan Showroom 3D (Gold-only)

#### Tích hợp AI showroom vào knowledge

- Tài liệu cập nhật: `SHOWROOM_AI_INTEGRATION_SUMMARY.md` cho thấy AI chatbot đã được:
  - Update membership block: mô tả showroom 3D, access `/showroom-3d`, yêu cầu Gold, yêu cầu sản phẩm có mô hình 3D GLB/GLTF, có slots/positions, có save setup, không phải giỏ hàng.
  - Update membership_policy intent rules: detect từ keyword `showroom`, `3d`, `phòng ảo`, `mô hình 3d`.
  - Update admin question patterns: block các câu hỏi kiểu upload 3D, tạo scene, cấu hình showroom, thiết lập showroom, upload glb/gltf, tạo vị trí.

#### Hệ quả trong runtime AI

- Khi user hỏi showroom:
  - detectAiIntent → membership_policy.
  - buildMembershipBlock() chèn text showroom 3D.
  - structured policy context có tool block membership_policy.
  - Gemini system rules yêu cầu trả lời theo context + không hướng dẫn admin.
- Khi user hỏi kỹ thuật admin:
  - looksLikeAdminQuestion() match regex → admin question blocker.
  - AI bị ép từ chối và điều hướng liên hệ admin/support.

---

### 2.4 3D Showroom (Gold members only)

#### Frontend route & access control

- Page: `frontend/src/app/showroom-3d/page.tsx`
  - Dùng hook `useUserRank()` để lấy rank.
  - Nếu không gold → `router.replace('/membership')`.
  - Login yêu cầu: nếu isLoaded & !isSignedIn → redirect `/`.

#### Load dữ liệu showroom

- Dùng `showroomApi`:
  - `getScenes()` để lấy danh sách scene.
  - `getSceneByKey(activeSceneKey)` để lấy:
    - roomModelUrl
    - slots (các vị trí trong phòng)
    - eligibleProducts (sản phẩm đủ điều kiện showroom)
    - savedSetup nếu có.

#### UX logic placement products

- State chính:
  - `selectedBySlot: { [slotId]: productId }` (setup bố trí hiện tại)
  - `pendingPlacementByProduct: { [productId]: slotId|null }` (chờ xác nhận placement)
  - `selectedProductIds[]` (checkbox/select nhiều sản phẩm)
  - `focusedSlotId` (tập trung camera vào vị trí)
  - `savedSetup` để so sánh thay đổi.

- Eligibility & rules:
  - Chỉ product có `model3dUrl` mới xuất hiện trong showroom.
  - Slot có `allowedCategoryId` → slot chỉ nhận sản phẩm cùng category.
  - Khi chọn product:
    - nếu chỉ match 1 slot → auto assign.
    - nếu match nhiều slot → yêu cầu user chọn chính xác vị trí.

- Confirm placement:
  - `handleConfirmPlacement()`:
    - cập nhật `selectedBySlot` bằng cách map product→slot từ pending.
    - xóa các map slot trùng để tránh 2 product vào 1 slot.

- Save setup:
  - `showroomApi.saveSceneSetup(activeSceneKey, { selectedBySlot })`.

#### Rendering 3D (core)

- Component: `frontend/src/components/public/showroom/ShowroomCanvas.tsx`

**Các thành phần**

- `RoomModel`:
  - load GLB/GLTF room model via `useGLTF(roomModelUrl)`
  - traverse mesh node name bắt đầu `CAM_` để build `cameraMarkers`:
    - mỗi marker có position + target + keywords.
    - markerOverview: keywords chỉ gồm `overview`.

- `SlotMarker`:
  - đặt HTML label lên position của slot (anchorPosition) để user click focus camera.

- `AnimatedProductModel`:
  - load product model glTF/GLB
  - clone scene và thêm shadow flags
  - animate đặt model vào `anchorPosition` + `anchorRotation` của slot.
  - offset/sceneOffset: tính bounding box để canh model.

- Camera rig:
  - `CameraRig` dùng `OrbitControls`.
  - Khi chọn slot:
    - findBestCameraForSlot(slotTarget, cameraMarkers)
      - có override mapping từ `ROOM_CAMERA_SLOT_OVERRIDES` theo marker name.
      - nếu không có override: score dựa overlap keywords và khoảng cách.
    - CameraRig interpolate camera position & target theo 2 pha (mid & end).

- Reset view:
  - button “Default view” gọi `onSelectSlot(null)` để tắt focused slot và tăng `resetVersion`.

---

## 3) Tóm tắt chi tiết cách AI chatbot & 3D showroom “liên quan” nhau

- **3D showroom là một lợi ích membership (Gold)**.
- AI membership_policy intent rule đã được mở rộng để nhận diện câu hỏi về showroom bằng keyword `showroom/3d/phòng ảo/mô hình 3d`.
- AI khi trả lời showroom:
  - chỉ dựa context showroom đã được nhúng trong `buildMembershipBlock()`.
  - không claim có thể upload/config showroom.
- AI admin blocking:
  - các câu kiểu “upload glb/gltf”, “create showroom scene”, “set up showroom”, “upload 3D model”, “quản lý showroom” bị chặn và trả lời từ chối.

---

## 4) File/directory tiêu biểu cần xem thêm (nếu muốn mở rộng bản tổng hợp)

### AI

- `backend/src/services/aiChatService.ts`
- `backend/src/services/aiWebsiteKnowledgeService.ts`
- `backend/src/services/aiCatalogContextService.ts`
- `backend/src/services/aiStructuredContextService.ts`
- `backend/src/services/aiPolicyStructuredContextService.ts`
- `backend/src/services/aiRagRetrievalService.ts`
- `backend/src/services/aiConversationService.ts`
- `backend/src/routes/aiChatRoute.ts`

### 3D Showroom

- `frontend/src/app/showroom-3d/page.tsx`
- `frontend/src/components/public/showroom/ShowroomCanvas.tsx`
- (thường sẽ có trong `frontend/src/apis/showroomApi.ts` và component showroom khác như `ShowroomProductPreview`, nhưng ở phần này mình đã trích trực tiếp logic từ file page + canvas).

### Auth & UX

- `frontend/src/components/public/FloatingAIWidget.tsx` (AI UI)

---

## 5) Ghi chú về phạm vi

- Tài liệu này được tổng hợp từ các file đã đọc trực tiếp trong quá trình phân tích + các tài liệu Markdown có sẵn ở repo.
- Vì giới hạn truy xuất toàn bộ source trong một lượt, một số file khác có thể chưa được đọc trực tiếp (ví dụ: showroomApi, ShowroomProductPreview, showroom models/controllers). Tuy nhiên phần AI & 3D core đã được nắm rõ qua các file trọng yếu ở trên.
