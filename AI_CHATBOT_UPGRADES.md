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
