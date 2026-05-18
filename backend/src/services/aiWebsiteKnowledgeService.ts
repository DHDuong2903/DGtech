import { Op } from "sequelize";
import {
  Order,
  OrderItem,
  Payment,
  Product,
  Category,
  ShippingMethod,
  ShippingProvinceZone,
  ShippingZone,
  Voucher,
  DiscountCampaign,
} from "../models/associationsModel.js";
import { getRankSettings, serializeRankSettings } from "./rankSettingService.js";
import { getShippingSettings } from "./shippingService.js";
import { getTaxSettings, serializeTaxSettings } from "./taxService.js";
import { getMyRank } from "./userService.js";

export type AiIntent =
  | "product_catalog"
  | "membership_policy"
  | "shipping_policy"
  | "payment_policy"
  | "voucher_policy"
  | "order_support"
  | "store_capability"
  | "general_support";

export type WebsiteKnowledgeContextResult = {
  intent: AiIntent;
  sourceTypes: string[];
  contextText: string;
};

type BuildWebsiteKnowledgeContextOptions = {
  recentUserMessages?: string[];
  userId?: string | null;
};

const INTENT_RULES: Array<{ intent: AiIntent; patterns: RegExp[] }> = [
  {
    intent: "membership_policy",
    patterns: [
      /\brank\b/i,
      /\btier\b/i,
      /\bmembership\b/i,
      /\bmember\b/i,
      /\bbronze\b/i,
      /\bsilver\b/i,
      /\bgold\b/i,
      /\bkhach hang than thiet\b/i,
      /\blen rank\b/i,
      /\bthang hang\b/i,
    ],
  },
  {
    intent: "shipping_policy",
    patterns: [
      /\bgiao hang\b/i,
      /\bvan chuyen\b/i,
      /\bship\b/i,
      /\bphi ship\b/i,
      /\bshipping\b/i,
      /\bexpress\b/i,
      /\btieu chuan\b/i,
      /\bfree ship\b/i,
    ],
  },
  {
    intent: "payment_policy",
    patterns: [
      /\bthanh toan\b/i,
      /\bpayment\b/i,
      /\bcod\b/i,
      /\bchuyen khoan\b/i,
      /\bbank transfer\b/i,
      /\bsepay\b/i,
      /\bqr\b/i,
    ],
  },
  {
    intent: "voucher_policy",
    patterns: [
      /\bvoucher\b/i,
      /\bma giam gia\b/i,
      /\bkhuyen mai\b/i,
      /\buu dai\b/i,
      /\bgiam gia\b/i,
      /\bdiscount\b/i,
      /\bcampaign\b/i,
      /\bbundle\b/i,
    ],
  },
  {
    intent: "order_support",
    patterns: [
      /\bdon hang\b/i,
      /\border\b/i,
      /\btrang thai\b/i,
      /\bhuy don\b/i,
      /\btracking\b/i,
      /\bvan don\b/i,
      /\bgiao toi dau\b/i,
    ],
  },
  {
    intent: "product_catalog",
    patterns: [
      /\bsan pham\b/i,
      /\bproduct\b/i,
      /\bdanh muc\b/i,
      /\bcategory\b/i,
      /\bvariant\b/i,
      /\bbien the\b/i,
      /\bton kho\b/i,
      /\bcon hang\b/i,
      /\bgia\b/i,
      /\bmau\b/i,
      /\bkich thuoc\b/i,
    ],
  },
  {
    intent: "store_capability",
    patterns: [
      /\bwebsite\b/i,
      /\bshop\b/i,
      /\bcua hang\b/i,
      /\bco gi\b/i,
      /\bho tro gi\b/i,
      /\btinh nang\b/i,
    ],
  },
];

// Admin keywords blocklist - detect admin-related questions
const ADMIN_QUESTION_PATTERNS = [
  // Admin panel & interface
  /\badmin\b/i,
  /\badmin page\b/i,
  /\badmin panel\b/i,
  /\bquan ly\b/i,
  /\bquan tri vien\b/i,
  /\bbackend\b/i,
  /\bdashboard\b/i,
  // Inventory & stock management
  /\bquang ly ton kho\b/i,
  /\bquang ly hang ton\b/i,
  /\bsetting stock\b/i,
  /\bchinh sua ton kho\b/i,
  /\bnhap hang\b/i,
  /\bxuat hang\b/i,
  /\bquang ly kho\b/i,
  // Settings & configuration
  /\bsetting\b/i,
  /\bcau hinh\b/i,
  /\bcau dat\b/i,
  /\bshop settings\b/i,
  /\bcai dat cua hang\b/i,
  // Discount campaign creation/management
  /\btao khuyen mai\b/i,
  /\bchinh sua khuyen mai\b/i,
  /\bquang ly khuyen mai\b/i,
  /\bset up discount\b/i,
  /\bcreate campaign\b/i,
  /\bedit campaign\b/i,
  // Shipping zone/method setup
  /\bset up shipping\b/i,
  /\bcau hinh van chuyen\b/i,
  /\btao vung van chuyen\b/i,
  /\bquang ly vung ship\b/i,
  /\bphuong thuc giao hang\b/i,
  // User/customer management
  /\bquang ly khach hang\b/i,
  /\bquang ly user\b/i,
  /\bquang ly tai khoan\b/i,
  /\bxoa khach hang\b/i,
  // Payment & transaction management
  /\bquang ly thanh toan\b/i,
  /\bquang ly giao dich\b/i,
  /\brefund management\b/i,
  /\bcau hinh thanh toan\b/i,
  // Analytics & reports
  /\bthong ke ban hang\b/i,
  /\bdoanh so\b/i,
  /\breport\b/i,
  /\banalytics\b/i,
  // Database & system
  /\bsystem\b/i,
  /\bdatabase\b/i,
  /\bserver\b/i,
  /\bkho du lieu\b/i,
];

function looksLikeAdminQuestion(message: string): boolean {
  const normalizedMessage = normalizeText(message);
  return ADMIN_QUESTION_PATTERNS.some((pattern) => pattern.test(normalizedMessage));
}

function normalizeText(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function scoreIntent(intent: AiIntent, text: string) {
  const normalizedText = normalizeText(text);
  const rule = INTENT_RULES.find((item) => item.intent === intent);
  if (!rule) return 0;
  return rule.patterns.reduce((total, pattern) => total + (pattern.test(normalizedText) ? 1 : 0), 0);
}

export function detectAiIntent(message: string, options?: BuildWebsiteKnowledgeContextOptions): AiIntent {
  const recentMessages = options?.recentUserMessages || [];
  const scores = new Map<AiIntent, number>();

  for (const rule of INTENT_RULES) {
    scores.set(rule.intent, scoreIntent(rule.intent, message));
  }

  for (const historyMessage of recentMessages.slice(-3)) {
    for (const rule of INTENT_RULES) {
      scores.set(rule.intent, (scores.get(rule.intent) || 0) + scoreIntent(rule.intent, historyMessage) * 0.35);
    }
  }

  let bestIntent: AiIntent = "general_support";
  let bestScore = 0;

  for (const [intent, rawScore] of scores.entries()) {
    const score = Number(rawScore || 0);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  return bestScore > 0 ? bestIntent : "general_support";
}

function formatPrice(price: number | string) {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return String(price);
  return `${numeric.toLocaleString("vi-VN")} VND`;
}

function formatDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toISOString().slice(0, 10);
}

function formatList(items: Array<string | number | null | undefined>) {
  const cleaned = items
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(", ") : "khong co";
}

function buildCapabilitiesBlock() {
  return [
    "Thong tin tong quan ve website:",
    "- Website co catalog san pham, category, product variants, reviews, cart, checkout, dia chi giao hang, voucher, bundle va theo doi don hang.",
    "- Widget chat AI hien la tro ly tu van, khong phai he thong thao tac truc tiep tren tai khoan khach hang.",
    "- Neu can xem chi tiet don hang ca nhan, thanh toan da tra hay voucher cua rieng tung user, AI phai noi ro rang can du lieu/xac thuc bo sung.",
  ];
}

async function buildShippingBlock() {
  try {
    const [settingsRow, zoneCount, provinceMappingCount, enabledMethodCount] = await Promise.all([
      getShippingSettings(),
      ShippingZone.count(),
      ShippingProvinceZone.count(),
      ShippingMethod.count({ where: { enabled: true } }),
    ]);
    const settings = settingsRow as any;

    return [
      "Thong tin van chuyen hien tai:",
      `- Cach hien phi ship: ${settings.displayMode === "included" ? "Da gom trong gia san pham" : "Tinh rieng luc checkout"}`,
      `- Mien phi van chuyen: ${settings.freeShippingEnabled ? "Dang bat" : "Khong bat"}`,
      `- Moc don hang de xet free ship: ${formatPrice(settings.freeShippingMinSubtotal ?? 0)}`,
      `- Free ship chi ap dung cho giao hang tieu chuan: ${settings.freeShippingStandardOnly !== false ? "Co" : "Khong"}`,
      `- Muc phi du phong khi thieu cau hinh: ${formatPrice(settings.fallbackShippingAmount ?? 0)}`,
      `- So vung giao hang da cau hinh: ${zoneCount}; so mapping tinh/thanh: ${provinceMappingCount}; so phuong thuc dang bat: ${enabledMethodCount}`,
      "- Phi ship thuc te phu thuoc tinh/thanh, zone, subtotal va phuong thuc giao hang.",
      "- He thong co support quote theo phuong thuc standard/express neu da duoc cau hinh cho zone.",
    ];
  } catch (error) {
    return [
      "Thong tin van chuyen hien tai:",
      `- Tam thoi khong tai duoc cau hinh van chuyen cho AI: ${error instanceof Error ? error.message : "unknown error"}`,
      "- AI khong duoc doan phi ship cu the neu khong co du lieu shipping config hop le.",
    ];
  }
}

async function buildMembershipBlock() {
  try {
    const settings = serializeRankSettings(await getRankSettings());
    return [
      "Quy tac hang thanh vien:",
      `- Cac hang thanh vien hien co: ${formatList(["Bronze", "Silver", "Gold"])}`,
      `- Muc de len Silver bat dau tu: ${formatPrice(settings.bronzeMax)}`,
      `- Muc de len Gold bat dau tu: ${formatPrice(settings.silverMax)}`,
      `- Muc tru cho moi don bi huy: ${formatPrice(settings.cancelPenaltyUnit)}`,
      "- Rank score duoc tinh bang tong gia tri don hang thanh cong (DELIVERED, COMPLETED) tru di muc phat cho moi don CANCELLED.",
      `- Neu tong diem tich luy thap hon ${formatPrice(settings.bronzeMax)} thi user o hang Bronze.`,
      `- Neu tong diem tich luy tu ${formatPrice(settings.bronzeMax)} den duoi ${formatPrice(settings.silverMax)} thi user o hang Silver.`,
      `- Neu tong diem tich luy tu ${formatPrice(settings.silverMax)} tro len thi user o hang Gold.`,
      "- Navbar co hien badge rank va website co trang /membership de xem tien do len hang.",
      "- Membership UI hien co mo ta: Silver mo rong kha nang duoc ap dung member discount campaigns, cai thien voucher privilege va tang kha nang mo free shipping theo dieu kien; Gold co uu dai giam gia/voucher tot hon Silver va uu tien tiep can mot so campaign.",
    ];
  } catch (error) {
    return [
      "Quy tac hang thanh vien:",
      `- Tam thoi khong tai duoc cau hinh hang thanh vien cho AI: ${error instanceof Error ? error.message : "unknown error"}`,
    ];
  }
}

async function buildAuthenticatedUserBlock(userId: string, intent: AiIntent) {
  const blocks: string[] = ["Thong tin da xac thuc cua khach hang hien tai:"];

  try {
    const rank = await getMyRank(userId);
    blocks.push(`- Hang hien tai: ${String(rank.currentRank || "").toUpperCase() || "Khong ro"}`);
    blocks.push(`- Hang tiep theo: ${rank.nextRank ? String(rank.nextRank).toUpperCase() : "Khong co"}`);
    blocks.push(`- Diem tich luy hien tai: ${Number(rank.score || 0)}`);
    blocks.push(`- Gia tri don thanh cong da tich luy: ${formatPrice(rank.successValue || 0)}`);
    blocks.push(`- So don da huy: ${Number(rank.cancelOrderCount || 0)}`);
    blocks.push(`- Tong muc tru vi huy don: ${formatPrice(rank.penaltyValue || 0)}`);
    blocks.push(`- So tien con thieu de len hang tiep theo: ${formatPrice(rank.remainingToNext || 0)}`);
    blocks.push(`- Tien do len hang: ${Number(rank.progressPercent || 0)}%`);
  } catch (error) {
    blocks.push(`- Tam thoi khong tai duoc thong tin hang thanh vien cua khach: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  if (intent === "order_support" || intent === "general_support") {
    try {
      const recentOrders = await Order.findAll({
        where: { clerkId: userId },
        include: [
          { model: Payment, as: "payment", attributes: ["status", "paymentMethod", "paidAt"], required: false },
          {
            model: OrderItem,
            as: "items",
            attributes: ["quantity"],
            include: [{ model: Product, as: "product", attributes: ["name"] }],
          },
        ],
        attributes: [
          "orderId",
          "status",
          "totalPrice",
          "createdAt",
          "shippingMethodName",
          "shippingMethodEtaNote",
          "trackingNumber",
          "carrierName",
        ],
        order: [["createdAt", "DESC"]],
        limit: 3,
      });

      if (recentOrders.length === 0) {
        blocks.push("- Khach hien chua co don gan day de AI tham khao.");
      } else {
        blocks.push("- Tom tat toi da 3 don gan day:");
        for (const [index, row] of recentOrders.entries()) {
          const order = row.get({ plain: true }) as any;
          const items = Array.isArray(order.items) ? order.items : [];
          const productPreview = items
            .slice(0, 2)
            .map((item: any) => item?.product?.name)
            .filter(Boolean)
            .join(", ");
          blocks.push(
            [
              `${index + 1}. Don hang gan day`,
              `- Ngay tao: ${formatDate(order.createdAt)}`,
              `- Trang thai don: ${order.status || "Khong ro"}`,
              `- Tong tien: ${formatPrice(order.totalPrice || 0)}`,
              `- Trang thai thanh toan: ${order.payment?.status || "Khong ro"}`,
              `- Hinh thuc thanh toan: ${order.payment?.paymentMethod || "Khong ro"}`,
              `- Cach giao hang: ${order.shippingMethodName || "Khong ro"}`,
              `- Ma van don: ${order.trackingNumber || "Chua co"}`,
              `- Don vi van chuyen: ${order.carrierName || "Chua co"}`,
              `- San pham tieu bieu: ${productPreview || "Khong co"}`,
            ].join("\n"),
          );
        }
      }
    } catch (error) {
      blocks.push(`- Tam thoi khong tai duoc don gan day cua khach: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  blocks.push("- Day la thong tin rieng cua dung user dang dang nhap.");
  blocks.push("- Chi duoc dung de tra loi cho chinh user hien tai, khong duoc noi ve tai khoan nguoi khac.");

  return blocks;
}

async function buildPaymentBlock() {
  return [
    "Thong tin thanh toan hien tai:",
    `- Cac hinh thuc thanh toan dang ho tro: ${formatList(["COD", "Chuyen khoan ngan hang"])}`,
    "- Don chuyen khoan ngan hang co the tao QR thanh toan va duoc theo doi theo tien trinh cho xac nhan, da thanh toan, that bai hoac hoan tien.",
    "- COD khong yeu cau xac nhan chuyen khoan truoc khi tao don.",
    "- AI khong duoc xac nhan mot giao dich da thanh toan neu khong co du lieu payment/order cu the.",
  ];
}

async function buildVoucherBlock() {
  const now = new Date();
  const activeVouchers = await Voucher.findAll({
    where: {
      isActive: true,
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gte]: now } }],
    },
    attributes: ["voucherType", "audience", "tierTargets", "name", "expiresAt"],
    order: [["createdAt", "DESC"]],
    limit: 6,
  });

  const types = Array.from(new Set(activeVouchers.map((voucher: any) => String(voucher.voucherType || "")))).filter(Boolean);

  return [
    "Thong tin voucher va uu dai hien tai:",
    `- So voucher dang kich hoat ma AI nhin thay: ${activeVouchers.length}`,
    `- Nhom voucher dang co: ${types.length > 0 ? types.join(", ") : "Khong co"}`,
    "- Mot so voucher co the dung cho tat ca khach, mot so khac chi danh cho nhom khach du dieu kien.",
    "- Gia tri giam co the theo percent, fixed amount hoac free shipping.",
    "- AI chi nen noi theo tong quan tru khi co voucher cu the trong DB context hoac nguoi dung dua ma/ten ro rang.",
  ];
}

async function buildDiscountCampaignsBlock() {
  try {
    const now = new Date();
    const activeCampaigns = await DiscountCampaign.findAll({
      where: {
        startsAt: { [Op.lte]: now },
        endsAt: { [Op.gte]: now },
        isEnabled: true,
      },
      include: [
        { model: Product, as: "products", attributes: ["productId", "name"], through: { attributes: [] } },
        { model: Category, as: "categories", attributes: ["categoryId", "name"], through: { attributes: [] } },
      ],
      order: [["priority", "ASC"], ["createdAt", "DESC"]],
      limit: 10,
    });

    if (activeCampaigns.length === 0) {
      return [
        "Thong tin chuong trinh giam gia dang dien ra:",
        "- Hien tai AI khong thay campaign giam gia nao dang active.",
      ];
    }

    const campaignSummaries = activeCampaigns.map((campaign: any) => {
      const discountKind = campaign.pricingMode === "price_rule" ? campaign.discountKind : "price_list_override";
      const discountDesc =
        discountKind === "PERCENT"
          ? `${campaign.discountValue}% off`
          : discountKind === "FIXED_AMOUNT"
            ? `${campaign.discountValue} VND off`
            : discountKind === "FREE_SHIPPING"
              ? "Free shipping"
              : "Custom pricing";

      const tierInfo =
        campaign.targetTiers && campaign.targetTiers.length > 0
          ? `Ap dung cho cac nhom khach: ${campaign.targetTiers.join(", ")}`
          : "Ap dung cho tat ca khach hang";

      const endDate = new Date(campaign.endsAt).toLocaleDateString("vi-VN");

      // Determine scope: all products, specific products, or specific categories
      let scopeInfo = "";
      if (campaign.appliesToAllProducts) {
        scopeInfo = "Ap dung cho toan bo san pham trong cua hang.";
      } else {
        const scopeParts = [];
        
        // Get product names
        if (Array.isArray(campaign.products) && campaign.products.length > 0) {
          const productNames = campaign.products
            .map((p: any) => p.name || "Unknown")
            .slice(0, 3);
          scopeParts.push(`San pham: ${productNames.join(", ")}${campaign.products.length > 3 ? ` va ${campaign.products.length - 3} san pham khac` : ""}`);
        }
        
        // Get category names
        if (Array.isArray(campaign.categories) && campaign.categories.length > 0) {
          const categoryNames = campaign.categories
            .map((c: any) => c.name || "Unknown")
            .slice(0, 3);
          scopeParts.push(`Danh muc: ${categoryNames.join(", ")}${campaign.categories.length > 3 ? ` va ${campaign.categories.length - 3} danh muc khac` : ""}`);
        }

        scopeInfo =
          scopeParts.length > 0 ? `Pham vi ap dung: ${scopeParts.join("; ")}.` : "Pham vi ap dung: AI chua the tom tat ro hon.";
      }

      return `- "${campaign.name}": ${discountDesc}. ${tierInfo}. Ket thuc vao ${endDate}. ${scopeInfo}`;
    });

    return [
      "Thong tin chuong trinh giam gia dang dien ra:",
      `- Tong so campaign dang active: ${activeCampaigns.length}`,
      "- Tom tat campaign:",
      ...campaignSummaries,
      "",
      "- Khi khach hoi ve giam gia, sale hoac uu dai, hay doi chieu voi danh sach campaign nay.",
      "- Neu campaign ap dung toan shop, co the gioi thieu nhu uu dai chung cua cua hang.",
      "- Neu campaign chi ap dung cho mot so san pham hoac danh muc, chi nen nhac khi dung san pham thuoc pham vi do.",
      "- Nen nhac moc ket thuc campaign neu co trong context.",
    ];
  } catch (error) {
    console.error("Error building discount campaigns block:", error);
    return [
      "Thong tin chuong trinh giam gia dang dien ra:",
      `- Tam thoi khong tai duoc campaign cho AI: ${error instanceof Error ? error.message : "unknown error"}`,
    ];
  }
}

async function buildTaxBlock() {
  try {
    const settings = serializeTaxSettings(await getTaxSettings());
    return [
      "Thong tin thue hien tai:",
      `- Co ap dung thue: ${settings.enableTax ? "Co" : "Khong"}`,
      `- Muc thue: ${Math.round(settings.taxRate * 10000) / 100}%`,
      `- Gia dang hien thi da bao gom thue: ${settings.taxIncluded ? "Co" : "Khong"}`,
      "- Tax ap dung cho line items; shipping khong bi tinh tax.",
    ];
  } catch (error) {
    return [
      "Thong tin thue hien tai:",
      `- Tam thoi khong tai duoc cau hinh thue cho AI: ${error instanceof Error ? error.message : "unknown error"}`,
    ];
  }
}

async function buildOrderBlock() {
  const totalOrders = await Order.count().catch(() => 0);
  return [
    "Quy tac ho tro don hang:",
    `- Tong so don he thong hien co ma AI tham khao duoc: ${totalOrders}`,
    "- Cac trang thai don hang chinh gom: cho xu ly, dang xu ly, dang giao, da giao, hoan tat va da huy.",
    "- Khach co the huy don khi don dang o giai doan cho xu ly hoac dang xu ly.",
    "- Don chuyen khoan chua duoc xac nhan thanh toan thi khong duoc day sang giai doan xu ly/giao hang.",
    "- AI co the giai thich luong trang thai don hang, nhung khong duoc noi tinh trang don cu the neu khong co tra cuu xac thuc.",
  ];
}

function buildResponseRules(intent: AiIntent, isAdminQuestion?: boolean) {
  const baseRules = [
    "AI response rules:",
    "- Luon uu tien du lieu website context trong turn nay hon kien thuc nen chung cua model.",
    "- Neu khong thay du lieu trong context, phai noi ro chua co thong tin thay vi suy doan.",
    "- Neu cau hoi can du lieu ca nhan cua user (don hang, thanh toan, voucher da dung), phai noi ro AI chat cong khai hien chua co quyen tra cuu truc tiep.",
    "- Khong duoc noi ra ten bien, ten field, ten bang DB, schema, API payload, id noi bo, hay thuat ngu ky thuat trong cau tra loi cho khach hang.",
    "- Neu context ben trong co dang key=value hoac chua thong tin ky thuat, AI phai tu dien dat lai thanh ngon ngu tu nhien, huong toi khach hang.",
    "- Khong duoc noi nhung cum tu nhu compareAtPrice, catalogPrice, targetTiers, pricingMode, productId, variantId, metadata, database, table, enum cho khach hang.",
    "- Khong duoc tiet lo so luong ton kho cu the cho khach. Khi can, chi noi san pham con hang hoac tam het hang.",
  ];

  // Admin question blocking rules
  if (isAdminQuestion) {
    baseRules.push("");
    baseRules.push("ADMIN QUESTION DETECTED:");
    baseRules.push("- This is a customer support chatbot and cannot assist with admin tasks.");
    baseRules.push("- Do not answer questions about: admin panel, shop settings, inventory management, payment configuration, shipping setup, user management, analytics, or any backend operations.");
    baseRules.push("- Politely decline and redirect the user with message in Vietnamese: 'Xin loi, day la chatbot ho tro khach hang. Nhung cau hoi ve quan ly shop, cai dat admin khong duoc ho tro. Vui long dang nhap vao admin panel truc tiep hoac lien he support.'");
    return baseRules;
  }

  if (intent === "shipping_policy") {
    baseRules.push("- Khi hoi phi ship cu the, hay xin them province hoac noi rang phi ship phu thuoc zone/subtotal/phuong thuc.");
  } else if (intent === "membership_policy") {
    baseRules.push("- Khi user hoi Bronze/Silver/Gold la gi hoac len rank nhu the nao, phai tra loi bang membership rules trong context nay, khong duoc suy doan.");
    baseRules.push("- Neu user hoi rank ca nhan hien tai cua ho, AI khong duoc tu nhan da biet neu khong co user-specific rank payload trong context.");
  } else if (intent === "payment_policy") {
    baseRules.push("- Khi hoi da thanh toan chua, khong duoc xac nhan neu khong co payment record cu the.");
  } else if (intent === "voucher_policy") {
    baseRules.push("- Khong duoc hua co voucher phu hop cho moi user; eligibility con phu thuoc tier, usage va expiry.");
  } else if (intent === "order_support") {
    baseRules.push("- Neu user muon biet don cu the, hay yeu cau ma don hang va noi rang can endpoint tra cuu/xac thuc phu hop.");
  }

  return baseRules;
}

export async function buildWebsiteKnowledgeContext(
  message: string,
  options?: BuildWebsiteKnowledgeContextOptions,
): Promise<WebsiteKnowledgeContextResult> {
  const intent = detectAiIntent(message, options);
  const isAdminQuestion = looksLikeAdminQuestion(message);
  const blocks: string[] = [];
  const sourceTypes = ["codebase_capabilities"];

  blocks.push(...buildCapabilitiesBlock());

  // If this is an admin question, just add the blocking rules and return
  if (isAdminQuestion) {
    blocks.push("", ...buildResponseRules(intent, true));
    return {
      intent: "general_support",
      sourceTypes: ["admin_question_blocker"],
      contextText: blocks.join("\n"),
    };
  }

  if (intent === "membership_policy" || intent === "general_support") {
    blocks.push("", ...(await buildMembershipBlock()));
    sourceTypes.push("membership_rules");
  }

  if (intent === "shipping_policy" || intent === "general_support") {
    blocks.push("", ...(await buildShippingBlock()));
    sourceTypes.push("shipping_settings");
  }

  if (intent === "payment_policy" || intent === "general_support") {
    blocks.push("", ...(await buildPaymentBlock()), "", ...(await buildTaxBlock()));
    sourceTypes.push("payment_rules", "tax_settings");
  }

  if (intent === "voucher_policy" || intent === "general_support") {
    blocks.push("", ...(await buildVoucherBlock()), "", ...(await buildDiscountCampaignsBlock()));
    sourceTypes.push("voucher_rules", "discount_campaigns");
  }

  if (intent === "order_support" || intent === "general_support") {
    blocks.push("", ...(await buildOrderBlock()));
    sourceTypes.push("order_rules");
  }

  if (intent === "store_capability") {
    blocks.push(
      "",
      "Quy tac mo ta website:",
      "- Neu user hoi website ban gi, hay tom tat nhom san pham/dich vu dua tren catalog va tinh nang storefront.",
      "- Neu user hoi website co ho tro gi, hay neu ro cac capability duoc liet ke trong context nay.",
    );
  }

  if (options?.userId) {
    blocks.push("", ...(await buildAuthenticatedUserBlock(options.userId, intent)));
    sourceTypes.push("authenticated_user_context");
  }

  blocks.push("", ...buildResponseRules(intent));

  return {
    intent,
    sourceTypes,
    contextText: blocks.join("\n"),
  };
}
