import { Op } from "sequelize";
import { Order, OrderItem, Payment, Product, ShippingMethod, ShippingProvinceZone, ShippingZone, Voucher } from "../models/associationsModel.js";
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

function buildCapabilitiesBlock() {
  return [
    "Storefront capabilities from codebase:",
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
      "Shipping configuration from DB:",
      `- displayMode=${settings.displayMode === "included" ? "included_in_price" : "separate_fee"}`,
      `- freeShippingEnabled=${settings.freeShippingEnabled ? "true" : "false"}`,
      `- freeShippingMinSubtotal=${formatPrice(settings.freeShippingMinSubtotal ?? 0)}`,
      `- freeShippingStandardOnly=${settings.freeShippingStandardOnly !== false ? "true" : "false"}`,
      `- fallbackShippingAmount=${formatPrice(settings.fallbackShippingAmount ?? 0)}`,
      `- shippingZones=${zoneCount}, provinceMappings=${provinceMappingCount}, enabledMethods=${enabledMethodCount}`,
      "- Phi ship thuc te phu thuoc tinh/thanh, zone, subtotal va phuong thuc giao hang.",
      "- He thong co support quote theo phuong thuc standard/express neu da duoc cau hinh cho zone.",
    ];
  } catch (error) {
    return [
      "Shipping configuration from DB:",
      `- Shipping config is currently unavailable to AI context: ${error instanceof Error ? error.message : "unknown error"}`,
      "- AI khong duoc doan phi ship cu the neu khong co du lieu shipping config hop le.",
    ];
  }
}

async function buildMembershipBlock() {
  try {
    const settings = serializeRankSettings(await getRankSettings());
    return [
      "Membership and rank rules from codebase:",
      "- membershipTiers=bronze,silver,gold",
      `- bronzeThresholdLessThan=${formatPrice(settings.bronzeMax)}`,
      `- silverThresholdFrom=${formatPrice(settings.bronzeMax)}`,
      `- goldThresholdFrom=${formatPrice(settings.silverMax)}`,
      `- cancelPenaltyPerOrder=${formatPrice(settings.cancelPenaltyUnit)}`,
      "- Rank score duoc tinh bang tong gia tri don hang thanh cong (DELIVERED, COMPLETED) tru di muc phat cho moi don CANCELLED.",
      "- score < bronzeThresholdLessThan => Bronze",
      "- bronzeThresholdLessThan <= score < goldThresholdFrom => Silver",
      "- score >= goldThresholdFrom => Gold",
      "- Navbar co hien badge rank va website co trang /membership de xem tien do len hang.",
      "- Membership UI hien co mo ta: Silver mo rong kha nang duoc ap dung member discount campaigns, cai thien voucher privilege va tang kha nang mo free shipping theo dieu kien; Gold co uu dai giam gia/voucher tot hon Silver va uu tien tiep can mot so campaign.",
    ];
  } catch (error) {
    return [
      "Membership and rank rules from codebase:",
      `- Membership config is currently unavailable to AI context: ${error instanceof Error ? error.message : "unknown error"}`,
    ];
  }
}

async function buildAuthenticatedUserBlock(userId: string, intent: AiIntent) {
  const blocks: string[] = ["Authenticated customer context from DB/session:"];

  try {
    const rank = await getMyRank(userId);
    blocks.push(`- currentRank=${String(rank.currentRank || "").toUpperCase()}`);
    blocks.push(`- nextRank=${rank.nextRank ? String(rank.nextRank).toUpperCase() : "NONE"}`);
    blocks.push(`- rankScore=${Number(rank.score || 0)}`);
    blocks.push(`- successfulOrderValue=${formatPrice(rank.successValue || 0)}`);
    blocks.push(`- cancelOrderCount=${Number(rank.cancelOrderCount || 0)}`);
    blocks.push(`- cancelPenaltyValue=${formatPrice(rank.penaltyValue || 0)}`);
    blocks.push(`- remainingToNext=${formatPrice(rank.remainingToNext || 0)}`);
    blocks.push(`- progressPercent=${Number(rank.progressPercent || 0)}%`);
  } catch (error) {
    blocks.push(`- rankContextUnavailable=${error instanceof Error ? error.message : "unknown error"}`);
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
        blocks.push("- recentOrders=none");
      } else {
        blocks.push("- recentOrdersSummary:");
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
              `  ${index + 1}. orderId=${order.orderId}`,
              `status=${order.status}`,
              `total=${formatPrice(order.totalPrice || 0)}`,
              `createdAt=${formatDate(order.createdAt)}`,
              `paymentStatus=${order.payment?.status || "NONE"}`,
              `paymentMethod=${order.payment?.paymentMethod || "NONE"}`,
              `shippingMethod=${order.shippingMethodName || "NONE"}`,
              `trackingNumber=${order.trackingNumber || "NONE"}`,
              `carrierName=${order.carrierName || "NONE"}`,
              `items=${productPreview || "NONE"}`,
            ].join(" | "),
          );
        }
      }
    } catch (error) {
      blocks.push(`- recentOrdersUnavailable=${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  blocks.push("- Day la private user context da duoc xac thuc qua session/Bearer token.");
  blocks.push("- Chi duoc su dung de tra loi cho chinh user hien tai, khong duoc noi ve tai khoan nguoi khac.");

  return blocks;
}

async function buildPaymentBlock() {
  return [
    "Payment capabilities from codebase:",
    "- paymentMethodsSupported=COD,BANK_TRANSFER",
    "- Don BANK_TRANSFER tao QR thanh toan va ban ghi payment trang thai PENDING/PAID/FAILED/REFUNDED.",
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
    "Voucher and promotion snapshot from DB:",
    `- activeVoucherCount=${activeVouchers.length}`,
    `- voucherTypes=${types.length > 0 ? types.join(",") : "none"}`,
    "- Voucher audience co the la ALL_USERS hoac TIER_USERS tuy theo voucher.",
    "- Gia tri giam co the theo percent, fixed amount hoac free shipping.",
    "- AI chi nen noi theo tong quan tru khi co voucher cu the trong DB context hoac nguoi dung dua ma/ten ro rang.",
  ];
}

async function buildTaxBlock() {
  try {
    const settings = serializeTaxSettings(await getTaxSettings());
    return [
      "Tax configuration from DB:",
      `- enableTax=${settings.enableTax ? "true" : "false"}`,
      `- taxRate=${Math.round(settings.taxRate * 10000) / 100}%`,
      `- taxIncluded=${settings.taxIncluded ? "true" : "false"}`,
      "- Tax ap dung cho line items; shipping khong bi tinh tax.",
    ];
  } catch (error) {
    return [
      "Tax configuration from DB:",
      `- Tax config is currently unavailable to AI context: ${error instanceof Error ? error.message : "unknown error"}`,
    ];
  }
}

async function buildOrderBlock() {
  const totalOrders = await Order.count().catch(() => 0);
  return [
    "Order support rules from codebase:",
    `- totalOrdersInSystem=${totalOrders}`,
    "- orderStatuses=PENDING,PROCESSING,SHIPPED,DELIVERED,COMPLETED,CANCELLED",
    "- Khach co the huy don khi don dang o PENDING hoac PROCESSING.",
    "- BANK_TRANSFER chua duoc xac nhan thanh toan thi khong duoc day sang processing/shipping.",
    "- AI co the giai thich luong trang thai don hang, nhung khong duoc noi tinh trang don cu the neu khong co tra cuu xac thuc.",
  ];
}

function buildResponseRules(intent: AiIntent) {
  const baseRules = [
    "AI response rules:",
    "- Luon uu tien du lieu website context trong turn nay hon kien thuc nen chung cua model.",
    "- Neu khong thay du lieu trong context, phai noi ro chua co thong tin thay vi suy doan.",
    "- Neu cau hoi can du lieu ca nhan cua user (don hang, thanh toan, voucher da dung), phai noi ro AI chat cong khai hien chua co quyen tra cuu truc tiep.",
  ];

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
  const blocks: string[] = [];
  const sourceTypes = ["codebase_capabilities"];

  blocks.push(...buildCapabilitiesBlock());

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
    blocks.push("", ...(await buildVoucherBlock()));
    sourceTypes.push("voucher_rules");
  }

  if (intent === "order_support" || intent === "general_support") {
    blocks.push("", ...(await buildOrderBlock()));
    sourceTypes.push("order_rules");
  }

  if (intent === "store_capability") {
    blocks.push(
      "",
      "Store guidance rules:",
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
