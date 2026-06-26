import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract knowledge base from existing AI services and documentation
 * Output: backend/data/knowledge-base.json
 */

const knowledgeDocuments = [];

// ============================================
// FEATURE KNOWLEDGE
// ============================================

knowledgeDocuments.push({
  id: "feature-showroom-3d-overview",
  content: `Showroom 3D là tính năng dành riêng cho thành viên Gold. Đây là không gian phòng 3D ảo nơi bạn có thể bố trí sắp xếp các sản phẩm nội thất trước khi mua. Tính năng này cho phép xem trước bố cục phòng với các sản phẩm thật từ catalog.`,
  contentType: "feature",
  metadata: {
    feature: "showroom",
    membershipRequired: "gold",
    keywords: ["showroom", "3d", "phòng ảo", "bố trí", "gold"],
  },
});

knowledgeDocuments.push({
  id: "feature-showroom-3d-usage",
  content: `Để sử dụng Showroom 3D: (1) Chọn không gian phòng từ danh sách, (2) Chọn sản phẩm từ danh mục bên trái - chỉ sản phẩm có mô hình 3D mới xuất hiện, (3) Đặt sản phẩm vào vị trí phù hợp trong phòng, (4) Xem trước bố cục 3D real-time, (5) Lưu thiết lập để xem lại sau. Truy cập tại /showroom-3d khi đã đăng nhập với tài khoản Gold.`,
  contentType: "feature",
  metadata: {
    feature: "showroom",
    type: "usage-guide",
    keywords: ["cách dùng showroom", "sử dụng 3d", "hướng dẫn"],
  },
});

knowledgeDocuments.push({
  id: "feature-showroom-3d-product-eligibility",
  content: `Showroom 3D chỉ hiển thị các sản phẩm đã có mô hình 3D được upload (định dạng GLB/GLTF). Nếu sản phẩm chưa có mô hình 3D, nó sẽ không xuất hiện trong danh sách showroom, nhưng vẫn mua được bình thường trên trang shop. Mỗi vị trí trong phòng chỉ chấp nhận sản phẩm thuộc category cụ thể.`,
  contentType: "feature",
  metadata: {
    feature: "showroom",
    type: "requirements",
    keywords: ["sản phẩm 3d", "mô hình 3d", "glb", "gltf"],
  },
});

knowledgeDocuments.push({
  id: "feature-showroom-3d-boundaries",
  content: `Showroom 3D là công cụ xem trước trực quan, không phải giỏ hàng. Việc đặt sản phẩm vào showroom không ảnh hưởng đến đơn hàng, checkout, hoặc giỏ hàng. Để mua sản phẩm, bạn vẫn cần thêm vào giỏ hàng từ trang catalog thông thường. Tính năng này không hỗ trợ tải file thiết kế về máy, nhưng có thể lưu bố cục để xem lại sau.`,
  contentType: "feature",
  metadata: {
    feature: "showroom",
    type: "boundaries",
    keywords: ["giới hạn showroom", "không phải giỏ hàng"],
  },
});

knowledgeDocuments.push({
  id: "feature-website-capabilities",
  content: `Website DGTech có các tính năng: catalog sản phẩm với variants, categories, reviews, giỏ hàng, checkout, địa chỉ giao hàng, voucher, bundle deals, theo dõi đơn hàng, và Showroom 3D (dành cho Gold members). Website hỗ trợ nhiều phương thức thanh toán và vận chuyển.`,
  contentType: "feature",
  metadata: {
    type: "capabilities",
    keywords: ["tính năng", "website", "shop có gì"],
  },
});

// ============================================
// MEMBERSHIP POLICY
// ============================================

knowledgeDocuments.push({
  id: "policy-membership-tiers",
  content: `Hệ thống có 3 hạng thành viên: Bronze, Silver, và Gold. Hạng được tính dựa trên điểm tích lũy từ đơn hàng thành công (DELIVERED, COMPLETED) trừ đi mức phạt khi đơn bị hủy (CANCELLED). Silver có ưu đãi member discount campaigns tốt hơn Bronze. Gold có ưu đãi voucher và điều kiện free shipping tốt nhất, đồng thời được truy cập Showroom 3D.`,
  contentType: "policy",
  metadata: {
    policyArea: "membership",
    type: "tiers",
    keywords: ["rank", "hạng", "bronze", "silver", "gold", "thành viên"],
  },
});

knowledgeDocuments.push({
  id: "policy-membership-rank-calculation",
  content: `Điểm rank = tổng giá trị đơn hàng thành công - (số đơn bị hủy × mức phạt mỗi đơn). Để lên Silver cần đạt ngưỡng điểm nhất định. Để lên Gold cần đạt ngưỡng cao hơn. Tiến độ lên hạng được hiển thị trên trang /membership.`,
  contentType: "policy",
  metadata: {
    policyArea: "membership",
    type: "calculation",
    keywords: ["tính điểm rank", "lên hạng", "cách lên silver", "cách lên gold"],
  },
});

knowledgeDocuments.push({
  id: "policy-membership-benefits",
  content: `Bronze: thành viên cơ bản. Silver: mở rộng khả năng được áp dụng member discount campaigns, cải thiện voucher privilege, tăng khả năng mở free shipping theo điều kiện. Gold: ưu đãi giảm giá/voucher tốt nhất, ưu tiên tiếp cận một số campaign đặc biệt, và truy cập độc quyền vào tính năng Showroom 3D.`,
  contentType: "policy",
  metadata: {
    policyArea: "membership",
    type: "benefits",
    keywords: ["ưu đãi", "lợi ích", "membership benefits"],
  },
});

// ============================================
// SHIPPING POLICY
// ============================================

knowledgeDocuments.push({
  id: "policy-shipping-general",
  content: `Website hỗ trợ nhiều phương thức giao hàng. Phí ship có thể đã bao gồm trong giá sản phẩm hoặc tính riêng lúc checkout tùy cấu hình. Phí ship thực tế phụ thuộc vào tỉnh/thành, zone vận chuyển, tổng giá trị đơn hàng (subtotal), và phương thức giao hàng được chọn.`,
  contentType: "policy",
  metadata: {
    policyArea: "shipping",
    type: "general",
    keywords: ["giao hàng", "vận chuyển", "ship", "phí ship"],
  },
});

knowledgeDocuments.push({
  id: "policy-shipping-free-shipping",
  content: `Miễn phí vận chuyển (free shipping) được áp dụng khi đơn hàng đạt mức tối thiểu nhất định. Free shipping có thể chỉ áp dụng cho phương thức giao hàng tiêu chuẩn. Điều kiện free ship có thể tốt hơn cho thành viên Silver và Gold.`,
  contentType: "policy",
  metadata: {
    policyArea: "shipping",
    type: "free-shipping",
    keywords: ["free ship", "miễn phí vận chuyển", "mốc free ship"],
  },
});

knowledgeDocuments.push({
  id: "policy-shipping-methods",
  content: `Hệ thống hỗ trợ nhiều phương thức vận chuyển như giao hàng tiêu chuẩn và express. Phương thức cụ thể tùy thuộc vào cấu hình zone và địa điểm giao hàng. Thời gian giao hàng và phí ship khác nhau giữa các phương thức.`,
  contentType: "policy",
  metadata: {
    policyArea: "shipping",
    type: "methods",
    keywords: ["phương thức giao hàng", "tiêu chuẩn", "express", "nhanh"],
  },
});

// ============================================
// PAYMENT POLICY
// ============================================

knowledgeDocuments.push({
  id: "policy-payment-methods",
  content: `Website hỗ trợ các hình thức thanh toán: COD (thanh toán khi nhận hàng) và Chuyển khoản ngân hàng. Đơn COD không yêu cầu xác nhận chuyển khoản trước khi tạo đơn. Đơn chuyển khoản có thể tạo QR thanh toán và được theo dõi qua các trạng thái: chờ xác nhận, đã thanh toán, thất bại, hoặc hoàn tiền.`,
  contentType: "policy",
  metadata: {
    policyArea: "payment",
    type: "methods",
    keywords: ["thanh toán", "payment", "cod", "chuyển khoản", "qr"],
  },
});

knowledgeDocuments.push({
  id: "policy-payment-bank-transfer-flow",
  content: `Khi thanh toán bằng chuyển khoản ngân hàng: (1) Khách hàng tạo đơn và chọn phương thức chuyển khoản, (2) Hệ thống tạo QR code thanh toán, (3) Khách chuyển khoản theo thông tin, (4) Đơn chờ xác nhận thanh toán từ shop, (5) Sau khi xác nhận, đơn được xử lý và giao hàng. Đơn chuyển khoản chưa được xác nhận thanh toán thì không được đẩy sang giai đoạn xử lý/giao hàng.`,
  contentType: "policy",
  metadata: {
    policyArea: "payment",
    type: "bank-transfer-flow",
    keywords: ["quy trình chuyển khoản", "xác nhận thanh toán"],
  },
});

knowledgeDocuments.push({
  id: "policy-payment-tax",
  content: `Hệ thống có thể áp dụng thuế cho đơn hàng. Thuế được tính trên line items (sản phẩm), không tính trên phí ship. Giá hiển thị có thể đã bao gồm thuế hoặc chưa tùy cấu hình.`,
  contentType: "policy",
  metadata: {
    policyArea: "payment",
    type: "tax",
    keywords: ["thuế", "tax", "vat"],
  },
});

// ============================================
// VOUCHER & PROMOTION POLICY
// ============================================

knowledgeDocuments.push({
  id: "policy-voucher-general",
  content: `Website hỗ trợ voucher và mã giảm giá. Một số voucher dùng cho tất cả khách hàng, một số khác chỉ dành cho nhóm khách đủ điều kiện (Silver, Gold). Giá trị giảm có thể theo phần trăm, số tiền cố định, hoặc free shipping. Voucher có thể có hạn sử dụng và điều kiện áp dụng.`,
  contentType: "policy",
  metadata: {
    policyArea: "voucher",
    type: "general",
    keywords: ["voucher", "mã giảm giá", "khuyến mãi", "ưu đãi"],
  },
});

knowledgeDocuments.push({
  id: "policy-discount-campaigns",
  content: `Discount campaigns (chiến dịch giảm giá) có thể áp dụng cho toàn shop hoặc chỉ một số sản phẩm/danh mục cụ thể. Campaign có thể dành cho tất cả khách hàng hoặc chỉ thành viên Silver/Gold. Mỗi campaign có thời gian bắt đầu và kết thúc. Loại giảm giá bao gồm: phần trăm, số tiền cố định, free shipping, hoặc giá đặc biệt.`,
  contentType: "policy",
  metadata: {
    policyArea: "voucher",
    type: "campaigns",
    keywords: ["campaign", "chiến dịch", "sale", "giảm giá", "khuyến mại"],
  },
});

// ============================================
// ORDER SUPPORT RULES
// ============================================

knowledgeDocuments.push({
  id: "policy-order-statuses",
  content: `Các trạng thái đơn hàng chính: Chờ xử lý (PENDING), Đang xử lý (PROCESSING), Đang giao (SHIPPED), Đã giao (DELIVERED), Hoàn tất (COMPLETED), và Đã hủy (CANCELLED). Khách hàng có thể hủy đơn khi đơn đang ở giai đoạn chờ xử lý hoặc đang xử lý.`,
  contentType: "policy",
  metadata: {
    policyArea: "order",
    type: "statuses",
    keywords: ["trạng thái đơn", "order status", "đơn hàng"],
  },
});

knowledgeDocuments.push({
  id: "policy-order-cancellation",
  content: `Khách hàng có thể hủy đơn hàng khi đơn đang ở giai đoạn chờ xử lý hoặc đang xử lý. Đơn đã chuyển sang giao hàng thì không thể tự hủy. Việc hủy đơn có thể ảnh hưởng đến điểm rank (bị trừ điểm phạt). Số lần hủy đơn được ghi nhận trong hệ thống tính rank.`,
  contentType: "policy",
  metadata: {
    policyArea: "order",
    type: "cancellation",
    keywords: ["hủy đơn", "cancel order", "hủy đơn hàng"],
  },
});

knowledgeDocuments.push({
  id: "policy-order-tracking",
  content: `Khách hàng có thể theo dõi đơn hàng trên website. Đơn có mã vận đơn (tracking number) và tên đơn vị vận chuyển khi được giao. Để xem chi tiết đơn hàng cá nhân, cần đăng nhập và có quyền truy cập đơn hàng đó.`,
  contentType: "policy",
  metadata: {
    policyArea: "order",
    type: "tracking",
    keywords: ["theo dõi đơn", "tracking", "mã vận đơn"],
  },
});

// ============================================
// RESPONSE RULES & BOUNDARIES
// ============================================

knowledgeDocuments.push({
  id: "rule-ai-boundaries-admin",
  content: `AI chatbot này là trợ lý hỗ trợ khách hàng, không phải hệ thống admin. Không thể hỗ trợ các câu hỏi về: quản lý shop, cài đặt admin, quản lý tồn kho, cấu hình thanh toán, thiết lập vận chuyển, quản lý user, analytics, hoặc bất kỳ thao tác backend nào. Những câu hỏi này cần đăng nhập vào admin panel trực tiếp.`,
  contentType: "rule",
  metadata: {
    type: "boundaries",
    keywords: ["admin", "quản lý", "cấu hình", "backend"],
  },
});

knowledgeDocuments.push({
  id: "rule-ai-boundaries-private-data",
  content: `AI chatbot không thể truy cập trực tiếp thông tin riêng tư của từng user như: đơn hàng cụ thể, lịch sử thanh toán, voucher đã dùng, địa chỉ giao hàng, số điện thoại, email, trừ khi có xác thực hợp lệ. Nếu cần tra cứu thông tin cá nhân, AI sẽ yêu cầu user cung cấp hoặc đăng nhập.`,
  contentType: "rule",
  metadata: {
    type: "boundaries",
    keywords: ["dữ liệu cá nhân", "private", "riêng tư"],
  },
});

knowledgeDocuments.push({
  id: "rule-response-grounding",
  content: `AI phải luôn ưu tiên dữ liệu website context trong turn này hơn kiến thức nền chung của model. Nếu không thấy dữ liệu trong context, phải nói rõ chưa có thông tin thay vì suy đoán. Không được nói những từ kỹ thuật như tên biến, tên field, tên bảng DB, schema, API payload, hoặc ID nội bộ cho khách hàng.`,
  contentType: "rule",
  metadata: {
    type: "response-quality",
    keywords: ["quy tắc trả lời", "grounding"],
  },
});

knowledgeDocuments.push({
  id: "rule-stock-privacy",
  content: `Không được tiết lộ số lượng tồn kho cụ thể cho khách hàng. Khi cần, chỉ nói sản phẩm còn hàng hoặc tạm hết hàng. Thông tin số lượng chính xác là dữ liệu nội bộ không công khai.`,
  contentType: "rule",
  metadata: {
    type: "privacy",
    keywords: ["tồn kho", "stock", "số lượng"],
  },
});

// ============================================
// FAQ & COMMON QUESTIONS
// ============================================

knowledgeDocuments.push({
  id: "faq-showroom-access-gold-only",
  content: `Câu hỏi: "Tại sao tôi không vào được showroom?" - Trả lời: Showroom 3D là tính năng dành riêng cho thành viên Gold. Bạn cần nâng cấp lên Gold membership để sử dụng. Để lên Gold, cần tích lũy đủ điểm từ đơn hàng thành công.`,
  contentType: "faq",
  metadata: {
    topic: "showroom-access",
    keywords: ["không vào được showroom", "cần gold"],
  },
});

knowledgeDocuments.push({
  id: "faq-showroom-missing-products",
  content: `Câu hỏi: "Tại sao không thấy hết sản phẩm trong showroom?" - Trả lời: Showroom 3D chỉ hiển thị các sản phẩm đã có mô hình 3D được upload. Nếu sản phẩm chưa có mô hình 3D, nó sẽ không xuất hiện trong danh sách showroom, nhưng vẫn mua được bình thường trên trang shop.`,
  contentType: "faq",
  metadata: {
    topic: "showroom-products",
    keywords: ["sản phẩm không có trong showroom", "thiếu sản phẩm"],
  },
});

knowledgeDocuments.push({
  id: "faq-rank-upgrade",
  content: `Câu hỏi: "Làm sao để lên Silver/Gold?" - Trả lời: Để lên hạng cao hơn, cần tích lũy điểm từ các đơn hàng thành công (đã giao, hoàn tất). Điểm = tổng giá trị đơn thành công - điểm phạt từ đơn bị hủy. Xem tiến độ lên hạng tại trang /membership.`,
  contentType: "faq",
  metadata: {
    topic: "rank-upgrade",
    keywords: ["lên silver", "lên gold", "thăng hạng"],
  },
});

// ============================================
// WRITE OUTPUT
// ============================================

const knowledgeBase = {
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  documentCount: knowledgeDocuments.length,
  documents: knowledgeDocuments,
};

const dataDir = path.join(__dirname, "..", "data");
const outputPath = path.join(dataDir, "knowledge-base.json");

try {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(knowledgeBase, null, 2), "utf-8");
  console.log(`✅ Knowledge base extracted successfully!`);
  console.log(`📄 Total documents: ${knowledgeDocuments.length}`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(``);
  console.log(`Document breakdown:`);
  const typeCount = {};
  for (const doc of knowledgeDocuments) {
    typeCount[doc.contentType] = (typeCount[doc.contentType] || 0) + 1;
  }
  for (const [type, count] of Object.entries(typeCount)) {
    console.log(`  - ${type}: ${count}`);
  }
} catch (error) {
  console.error("❌ Failed to write knowledge base:", error);
  process.exit(1);
}
