# Showroom AI Chatbot Integration Summary

## Overview

The AI chatbot has been updated with comprehensive information about the new 3D Showroom feature to help users understand and use this Gold membership exclusive capability.

## Files Updated

### 1. AI_CHATBOT_UPGRADES.md
**Location**: `AI_CHATBOT_UPGRADES.md`

**Added**: Comprehensive documentation section dated 2026-06-26 covering:
- What the 3D Showroom is (Gold exclusive, interactive 3D room arrangement)
- Core capabilities (scene selection, product placement, 3D viewer, save/restore)
- How it works (step-by-step user flow)
- Product eligibility requirements (must have 3D models)
- User experience flow details
- Common user questions the chatbot should handle
- Boundaries (what the chatbot should NOT claim)
- Example Vietnamese responses for typical questions

### 2. AI_CHATBOT_EVALUATION.md
**Location**: `AI_CHATBOT_EVALUATION.md`

**Added**: New test case category "11. Showroom 3D feature (Gold membership)" with 10 test cases:
- Test case 41: Feature existence confirmation
- Test case 42: Usage instructions
- Test case 43: Why products are missing in showroom
- Test case 44: Pricing/cost questions
- Test case 45: Download capabilities
- Test case 46: Admin upload operations (should refuse)
- Test case 47: Admin configuration (should refuse)
- Test case 48: Non-Gold member access
- Test case 49: Impact on orders/checkout
- Test case 50: Mobile support

### 3. aiWebsiteKnowledgeService.ts
**Location**: `backend/src/services/aiWebsiteKnowledgeService.ts`

**Changes made**:

#### a) Updated `buildCapabilitiesBlock()`
Added mention of Showroom 3D feature in the general website capabilities overview.

#### b) Updated `buildMembershipBlock()`
Added comprehensive Showroom 3D feature documentation in Vietnamese:
- Feature is Gold exclusive
- Allows virtual furniture arrangement in 3D rooms
- Only shows products with 3D models (GLB/GLTF format)
- Multiple room scenes available
- Position-based placement with category restrictions
- Save functionality for room layouts
- Access at `/showroom-3d` (requires Gold login)
- Clarification that it's a visualization tool, not a shopping cart

#### c) Updated `INTENT_RULES` for membership_policy
Added new pattern matching keywords:
- `/\bshowroom\b/i` - matches "showroom"
- `/\b3d\b/i` - matches "3d"
- `/\bphong ao\b/i` - matches "phòng ảo" (virtual room)
- `/\bmo hinh 3d\b/i` - matches "mô hình 3d" (3D model)

This ensures questions about showroom are routed to the membership_policy intent where the feature information is provided.

#### d) Updated `ADMIN_QUESTION_PATTERNS`
Added admin-related showroom patterns to block list:
- `/\bupload mo hinh 3d\b/i` - upload 3D model
- `/\btao showroom scene\b/i` - create showroom scene
- `/\bcau hinh showroom\b/i` - configure showroom
- `/\bquang ly showroom\b/i` - manage showroom
- `/\bthiet lap showroom\b/i` - setup showroom
- `/\bupload glb\b/i` - upload GLB
- `/\bupload gltf\b/i` - upload GLTF
- `/\btao vi tri showroom\b/i` - create showroom position
- `/\bset up showroom\b/i` - set up showroom

This ensures the chatbot refuses admin configuration questions politely.

## How the AI Chatbot Will Respond

### When User Asks About Showroom (General)
The chatbot will:
1. Confirm the feature exists
2. Explain it's Gold membership exclusive
3. Describe it as a virtual 3D room for furniture arrangement
4. Mention it requires products with 3D models

### When User Asks How to Use Showroom
The chatbot will provide:
1. Step-by-step usage instructions
2. Requirements (Gold membership, 3D models)
3. Key features (select scene, choose products, place in positions, save setup)

### When User Asks Why Products Are Missing
The chatbot will:
1. Explain only products with uploaded 3D models appear
2. Clarify products without 3D models can still be purchased normally on the catalog

### When User Asks Admin Questions
The chatbot will:
1. Politely refuse to provide admin guidance
2. Explain it's a customer support chatbot
3. Suggest contacting admin support directly

### When Non-Gold Members Ask About Access
The chatbot will:
1. Explain the feature requires Gold membership
2. May suggest upgrading to Gold (context-appropriate)

## Intent Routing

Questions containing keywords like:
- "showroom", "3D", "3d"
- "phòng ảo" (virtual room)
- "mô hình 3D" (3D model)
- "Gold", "membership"

Will be routed to **membership_policy** intent, where the showroom information is included in the context.

## Knowledge Boundaries

The chatbot is instructed to:
- ✅ Explain what the showroom feature is
- ✅ Describe how to use it
- ✅ Explain eligibility requirements
- ✅ Clarify it's Gold exclusive
- ✅ Explain product requirements (3D models)
- ❌ NOT provide admin upload instructions
- ❌ NOT configure showroom scenes
- ❌ NOT access user's saved setups
- ❌ NOT create or modify 3D models

## Testing Recommendations

Run the evaluation harness with the new test cases:
```bash
cd backend
npm run eval:ai
```

Or test specific showroom cases:
```bash
node scripts/evaluate-ai-chatbot.mjs --category=showroom_3d
```

## Next Steps

1. **Test the chatbot** with real showroom-related questions
2. **Monitor user conversations** for showroom inquiries
3. **Refine responses** based on actual user feedback
4. **Add more test cases** if new question patterns emerge
5. **Update documentation** as the feature evolves

## Example Vietnamese Interactions

**Q: "Shop có showroom 3D không?"**
**A**: "Có, shop có tính năng Showroom 3D dành riêng cho hội viên Gold. Đây là không gian phòng 3D ảo nơi bạn có thể bố trí sắp xếp các sản phẩm nội thất trước khi mua. Bạn cần thành viên Gold để sử dụng tính năng này."

**Q: "Làm sao dùng showroom?"**
**A**: "Để sử dụng Showroom 3D (dành cho Gold members):
1. Chọn không gian phòng từ danh sách
2. Chọn sản phẩm từ danh mục bên trái (chỉ sản phẩm có mô hình 3D)
3. Đặt sản phẩm vào vị trí phù hợp trong phòng
4. Xem trước bố cục 3D real-time
5. Lưu thiết lập để xem lại sau

Lưu ý: chỉ sản phẩm đã có mô hình 3D mới xuất hiện trong showroom."

**Q: "Tại sao không thấy hết sản phẩm trong showroom?"**
**A**: "Showroom 3D chỉ hiển thị các sản phẩm đã có mô hình 3D được upload. Nếu sản phẩm chưa có mô hình 3D, nó sẽ không xuất hiện trong danh sách showroom, nhưng vẫn mua được bình thường trên trang shop."

## Summary

The AI chatbot now has complete context about the 3D Showroom feature and can:
- Answer questions about what it is
- Explain how to use it
- Clarify Gold membership requirement
- Explain product eligibility
- Refuse admin-related configuration questions
- Provide helpful, grounded responses in Vietnamese

All changes are production-ready and follow the existing AI chatbot architecture patterns.
