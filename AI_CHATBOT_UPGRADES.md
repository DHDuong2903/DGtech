# AI Chatbot Upgrades

## 2026-05-24

### UI
- Simplified chat loading states in `FloatingAIWidget` to a pure 3-dot animated indicator.
- Removed loading text for both:
  - answer generation
  - message history loading

### Backend upgrade: Catalog Retrieval V2
- Added cached catalog summary snapshot in `backend/src/services/aiCatalogContextService.ts`.
- Added cached lightweight product index for AI retrieval:
  - normalized product name
  - description
  - category name
  - variant attributes / SKU terms
- Switched product matching from SQL-only text lookup to:
  - in-memory relevance scoring from cached catalog index
  - then DB fetch only for top matched product IDs
- Kept category expansion as a secondary fallback when product matches are thin.

### Performance impact
- Reduced repeated DB work for AI catalog questions.
- Reduced the chance that large catalog size degrades AI response flow.
- Improved matching for natural product questions involving:
  - category names
  - variant attributes
  - loosely phrased product queries

### Backend upgrade: Conversation list efficiency
- Removed N+1 query pattern in `backend/src/services/aiConversationService.ts` when listing conversations.
- Latest message for conversation history sidebar is now loaded in batch.

### Current AI maturity
- Previous state: intent-routed business assistant with grounded catalog + policy context.
- Current state: same foundation, but with stronger retrieval architecture and better scalability on larger catalogs.
- Practical summary:
  - more stable on large product sets
  - better product/category/variant matching
  - cheaper per chat turn

### Suggested next upgrade
- Add explicit tool-style retrieval layer:
  - `search_products`
  - `get_product_detail`
  - `get_category_summary`
  - `get_user_membership_context`
- Then let the model answer from structured tool results instead of large free-text context blocks.

### Backend upgrade: Structured Tool Context V1
- Added `backend/src/services/aiStructuredContextService.ts`.
- The AI pipeline now builds a compact internal tool-style context before calling Gemini:
  - `store_policy_router`
  - `search_catalog`
- Added answer mode routing:
  - `clarify`
  - `catalog_direct`
  - `policy_direct`
  - `general`
- Added retrieval confidence levels:
  - `high`
  - `medium`
  - `low`
  - `none`
- Added clarification-first behavior for ambiguous catalog questions:
  - no strong product match
  - too many near-matches for a variant question
  - broad or underspecified query

### Practical effect
- The chatbot is less likely to over-claim when product matching is weak.
- Product answers are now shaped from a smaller structured context block instead of a large raw catalog dump.
- On large catalogs, this reduces prompt noise and makes follow-up behavior more controlled.

### Current AI maturity
- Previous state: grounded assistant with stronger retrieval and caching.
- Current state: grounded assistant with retrieval confidence and clarification strategy.
- Practical summary:
  - better at saying "I need one more detail" instead of guessing
  - safer on broad product questions
  - cleaner prompt composition for large product sets

### Suggested next upgrade
- Split policy knowledge into smaller structured tools:
  - `get_shipping_policy`
  - `get_payment_policy`
  - `get_membership_policy`
  - `get_active_promotions`
- Then add a lightweight evaluation harness that replays standard questions and stores pass/fail results over time.

### Backend upgrade: Structured Policy Tools V1
- Added `backend/src/services/aiPolicyStructuredContextService.ts`.
- The AI pipeline now builds compact policy tool blocks for:
  - `get_shipping_policy`
  - `get_payment_policy`
  - `get_membership_policy`
  - `get_active_promotions`
- If the user is signed in and the question touches membership, the tool layer can also attach current-user membership progress.

### Prompt composition change
- For direct policy intents:
  - `shipping_policy`
  - `payment_policy`
  - `membership_policy`
  - `voucher_policy`
- The chatbot now prefers compact structured policy tools and suppresses the older verbose website knowledge block when it is not needed.
- It also suppresses catalog retrieval context for these policy-only intents, so shipping/payment answers do not drift into unrelated product suggestions.
- The older verbose knowledge context is still kept for:
  - admin blocking
  - authenticated/private context
  - general support
  - order support
  - store capability questions

### Practical effect
- Lower prompt noise on policy-only questions.
- Better grounding on shipping, payment, membership and promotion answers.
- Lower chance that a short policy question gets buried under unrelated website context.

### Current AI maturity
- Previous state: structured catalog retrieval assistant with clarification strategy.
- Current state: structured retrieval assistant with compact policy tools.
- Practical summary:
  - stronger policy answers
  - cleaner prompt routing
  - better separation between catalog knowledge and policy knowledge

### Suggested next upgrade
- Add a lightweight evaluation harness:
  - replay a fixed question set
  - store outputs to JSON/Markdown
  - support manual scoring over time
- After that:
  - add category aliases / synonym dictionaries
  - improve multi-turn topic tracking

### Evaluation harness V1
- Added a fixed starter suite in `backend/scripts/ai-eval-cases.json`.
- Added a runner in `backend/scripts/evaluate-ai-chatbot.mjs`.
- Added `npm run eval:ai` in `backend/package.json`.
- The harness:
  - builds backend
  - calls `generateChatReply` directly
  - supports multi-turn cases
  - writes JSON and Markdown reports
  - computes basic auto-signals for manual review

### Practical effect
- You now have a repeatable way to compare AI quality between upgrades.
- Testing is no longer purely intuition-driven.
- Regressions in admin blocking, ambiguity handling, or policy grounding are easier to catch early.

### Suggested next upgrade
- Add category aliases and synonym dictionaries for retrieval.
- Add deeper multi-turn topic tracking so short follow-up questions stay on the right entity more reliably.

## 2026-06-26

### New feature context: 3D Showroom (Gold members only)

The website now has a new interactive 3D showroom feature exclusive to Gold members. The chatbot should be aware of this feature to answer user questions about it.

### What is the 3D Showroom?

- **Access**: Gold membership exclusive feature at `/showroom-3d`
- **Purpose**: Interactive 3D room where Gold members can virtually arrange furniture products before purchasing
- **Technology**: Real-time 3D visualization using uploaded GLB/GLTF room models and product 3D models

### Core capabilities

1. **Scene selection**
   - Multiple room scenes available (e.g., living room, bedroom, office)
   - Each scene has a unique 3D model of a room
   - Admin configures which scenes are available

2. **Product placement**
   - Only products with uploaded 3D models are eligible for the showroom
   - Each scene has designated "positions" or "slots" where products can be placed
   - Each position is restricted to a specific product category (e.g., "Desk" position only accepts desk products)
   - Products can be:
     - Selected from the sidebar product list
     - Placed into compatible positions
     - Removed from positions
     - Viewed from different camera angles

3. **Interactive 3D viewer**
   - Orbit controls (drag to rotate, scroll to zoom)
   - Automatic camera focus when selecting a position
   - Named positions with labels (e.g., "Main Desk", "Side Chair")
   - Overview camera for full room view
   - Reset view button to return to default camera

4. **Save and restore setups**
   - Gold members can save their room arrangements
   - Saved setups persist across sessions
   - One saved setup per scene per user

### How it works

1. User must be signed in with Gold membership
2. Navigate to the showroom page
3. Select a room scene from dropdown
4. Browse products grouped by category
5. Select products and assign them to compatible positions
6. View the 3D arrangement in real-time
7. Save the setup for later

### Product eligibility

- Only products with `model3dUrl` (uploaded 3D model) appear in showroom
- Products must be ACTIVE status
- Products must match the category allowed for each position
- Example: if position "Main Desk" allows category "Desks", only desk products with 3D models appear as options for that position

### User experience flow

- **Product selection**: Click "Select" on products, then choose which position to place them
- **Multiple positions**: If a product category has multiple positions, user chooses the specific one
- **Visual feedback**: Selected products highlighted, placed products show "Remove" button
- **Camera control**: Click position labels to focus camera on that area
- **Save changes**: "Save setup" button becomes active when changes are made

### Common user questions the chatbot should handle

1. **Access questions**
   - "How do I access the showroom?" → Must be Gold member, go to showroom page
   - "Why can't I see the showroom?" → Need Gold membership
   - "Is showroom free?" → Included with Gold membership

2. **Feature questions**
   - "What is the 3D showroom?" → Explain it's a virtual room where they can arrange furniture
   - "How does the showroom work?" → Explain selection, placement, and save features
   - "Can I save my room setup?" → Yes, one setup per scene

3. **Product questions**
   - "Why don't I see all products in showroom?" → Only products with 3D models
   - "How do I add products to the room?" → Select product, choose position, confirm placement
   - "Can I put any product anywhere?" → No, positions have category restrictions

4. **Technical questions**
   - "What file format for 3D models?" → GLB/GLTF format
   - "Can I download my room design?" → No, but can save setup to view later
   - "Does it work on mobile?" → Yes, but desktop recommended for better experience

### What the chatbot should NOT claim

- Cannot help users upload 3D models (admin-only feature)
- Cannot help configure scenes or positions (admin-only)
- Cannot access user's specific saved setups or private data
- Cannot generate or create 3D models for products
- Cannot modify room models or camera positions

### Boundaries

- If user asks about upgrading to Gold: refer to membership page
- If user asks about admin showroom configuration: explain it's admin-only, cannot provide guidance in customer chatbot mode
- If user asks about missing products: explain that products need 3D models uploaded by admin

### Integration with existing chatbot knowledge

- Showroom is a **membership benefit** (specifically Gold tier)
- Related to **product catalog** (uses same products, but filtered by 3D model availability)
- Related to **membership policy** (Gold exclusive feature)
- Does NOT affect shipping, payment, or checkout (it's a visualization tool, not a shopping cart)

### Practical chatbot behavior

When user asks about showroom:
1. Confirm if they are asking about the 3D virtual showroom
2. Verify they understand it requires Gold membership
3. Explain the core feature: virtual room arrangement with 3D product models
4. If they ask how to use it, give clear steps
5. If they ask why products are missing, explain 3D model requirement
6. If they ask technical details, stay grounded in what the feature actually supports

### Example responses

**User: "Shop có tính năng showroom 3D không?"**
Good response: "Có, shop có tính năng Showroom 3D dành riêng cho hội viên Gold. Đây là không gian phòng 3D ảo nơi bạn có thể bố trí sắp xếp các sản phẩm nội thất trước khi mua. Bạn cần thành viên Gold để sử dụng tính năng này."

**User: "Làm sao dùng showroom?"**
Good response: "Để sử dụng Showroom 3D (dành cho Gold members):
1. Chọn không gian phòng từ danh sách
2. Chọn sản phẩm từ danh mục bên trái (chỉ sản phẩm có mô hình 3D)
3. Đặt sản phẩm vào vị trí phù hợp trong phòng
4. Xem trước bố cục 3D real-time
5. Lưu thiết lập để xem lại sau
Lưu ý: chỉ sản phẩm đã có mô hình 3D mới xuất hiện trong showroom."

**User: "Tại sao không thấy hết sản phẩm trong showroom?"**
Good response: "Showroom 3D chỉ hiển thị các sản phẩm đã có mô hình 3D được upload. Nếu sản phẩm chưa có mô hình 3D, nó sẽ không xuất hiện trong danh sách showroom, nhưng vẫn mua được bình thường trên trang shop."

**User: "Có thể tải thiết kế phòng về không?"**
Good response: "Hiện tại bạn có thể lưu thiết lập bố trí phòng trên hệ thống để xem lại sau, nhưng chưa hỗ trợ tải file thiết kế về máy."
