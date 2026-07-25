import { Op } from "sequelize";
import { cacheGetJson, cacheSetJson } from "../libs/cache.js";
import { isTransientDbError, withDbRetry } from "../helpers/dbResilience.js";
import {
  Bundle,
  BundleItem,
  ShippingMethod,
  ShippingProvinceZone,
  ShippingZone,
  Voucher,
  DiscountCampaign,
  Product,
  ProductVariant,
  Category,
} from "../models/associationsModel.js";
import { getShippingSettings } from "./shippingService.js";
import { getRankSettings, serializeRankSettings } from "./rankSettingService.js";
import { getTaxSettings, serializeTaxSettings } from "./taxService.js";
import { getMyRank } from "./userService.js";
import {
  discountedTotalFromOrigin,
  originTotalFromBundleItems,
} from "./bundlePricingService.js";
import type { AiIntent, WebsiteKnowledgeContextResult } from "./aiWebsiteKnowledgeService.js";

type BuildStructuredPolicyContextOptions = {
  userId?: string | null;
  sourceTypes?: string[];
};

export type StructuredPolicyContextResult = {
  contextText: string;
  toolNames: string[];
};

export type ShippingPolicySnapshot = {
  displayMode: "included" | "separate";
  freeShippingEnabled: boolean;
  freeShippingMinSubtotal: number;
  freeShippingStandardOnly: boolean;
  fallbackShippingAmount: number;
  zoneCount: number;
  provinceMappingCount: number;
  enabledMethods: Array<{ code: string; name: string }>;
};

export type PaymentPolicySnapshot = {
  supportedMethods: string[];
  enableTax: boolean;
  taxRate: number;
  taxIncluded: boolean;
};

export type MembershipPolicySnapshot = {
  bronzeMax: number;
  silverMax: number;
  cancelPenaltyUnit: number;
};

export type PromotionsSnapshot = {
  activeVoucherCount: number;
  voucherTypes: string[];
  campaignSummaries: Array<{
    name: string;
    description: string;
    scope: string;
    endsAt: string;
  }>;
  bundleSummaries: Array<{
    name: string;
    discountLabel: string;
    discountedTotal: number;
    productNames: string[];
  }>;
};

export type AuthenticatedMembershipSnapshot = {
  currentRank: string;
  nextRank: string | null;
  progressPercent: number;
  remainingToNext: number;
};

const SHIPPING_POLICY_CACHE_KEY = "ai-policy:shipping:v1";
const SHIPPING_POLICY_STALE_CACHE_KEY = "ai-policy:shipping:stale:v1";
const PAYMENT_POLICY_CACHE_KEY = "ai-policy:payment:v1";
const PAYMENT_POLICY_STALE_CACHE_KEY = "ai-policy:payment:stale:v1";
const MEMBERSHIP_POLICY_CACHE_KEY = "ai-policy:membership:v1";
const MEMBERSHIP_POLICY_STALE_CACHE_KEY = "ai-policy:membership:stale:v1";
const PROMOTIONS_POLICY_CACHE_KEY = "ai-policy:promotions:v2";
const PROMOTIONS_POLICY_STALE_CACHE_KEY = "ai-policy:promotions:stale:v2";
const POLICY_CACHE_TTL_MS = 2 * 60 * 1000;
const POLICY_STALE_TTL_MS = 15 * 60 * 1000;

function formatPrice(price: number | string) {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return String(price);
  return `${numeric.toLocaleString("vi-VN")} VND`;
}

function formatPercent(value: number) {
  return `${Math.round(Number(value || 0) * 10000) / 100}%`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Khong ro";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Khong ro";
  return date.toLocaleDateString("vi-VN");
}

async function loadCachedSnapshot<T>(params: {
  cacheKey: string;
  staleCacheKey: string;
  label: string;
  loader: () => Promise<T>;
}) {
  const cached = await cacheGetJson<T>(params.cacheKey);
  if (cached) return cached;

  try {
    const snapshot = await params.loader();
    await Promise.all([
      cacheSetJson(params.cacheKey, snapshot, POLICY_CACHE_TTL_MS),
      cacheSetJson(params.staleCacheKey, snapshot, POLICY_STALE_TTL_MS),
    ]);
    return snapshot;
  } catch (error) {
    if (isTransientDbError(error)) {
      const stale = await cacheGetJson<T>(params.staleCacheKey);
      if (stale) {
        console.warn(`${params.label}: serving stale cache after DB error`);
        return stale;
      }
    }
    throw error;
  }
}

export async function loadShippingPolicySnapshot(): Promise<ShippingPolicySnapshot> {
  return loadCachedSnapshot({
    cacheKey: SHIPPING_POLICY_CACHE_KEY,
    staleCacheKey: SHIPPING_POLICY_STALE_CACHE_KEY,
    label: "aiPolicy.shipping",
    loader: async () => {
      const [settingsRow, zoneCount, provinceMappingCount, enabledMethodsRows] = await Promise.all([
        withDbRetry(() => getShippingSettings(), { label: "aiPolicy.shipping.settings" }),
        withDbRetry(() => ShippingZone.count(), { label: "aiPolicy.shipping.zoneCount" }),
        withDbRetry(() => ShippingProvinceZone.count(), { label: "aiPolicy.shipping.provinceMappingCount" }),
        withDbRetry(
          () =>
            ShippingMethod.findAll({
              where: { enabled: true },
              attributes: ["code", "name"],
              order: [["sortOrder", "ASC"], ["name", "ASC"]],
            }),
          { label: "aiPolicy.shipping.enabledMethods" },
        ),
      ]);

      const settings = settingsRow as any;
      return {
        displayMode: settings.displayMode === "included" ? "included" : "separate",
        freeShippingEnabled: Boolean(settings.freeShippingEnabled),
        freeShippingMinSubtotal: Number(settings.freeShippingMinSubtotal || 0),
        freeShippingStandardOnly: settings.freeShippingStandardOnly !== false,
        fallbackShippingAmount: Number(settings.fallbackShippingAmount || 0),
        zoneCount: Number(zoneCount || 0),
        provinceMappingCount: Number(provinceMappingCount || 0),
        enabledMethods: enabledMethodsRows.map((row: any) => ({
          code: String(row.code || ""),
          name: String(row.name || ""),
        })),
      };
    },
  });
}

export async function loadPaymentPolicySnapshot(): Promise<PaymentPolicySnapshot> {
  return loadCachedSnapshot({
    cacheKey: PAYMENT_POLICY_CACHE_KEY,
    staleCacheKey: PAYMENT_POLICY_STALE_CACHE_KEY,
    label: "aiPolicy.payment",
    loader: async () => {
      const taxSettings = serializeTaxSettings(await withDbRetry(() => getTaxSettings(), { label: "aiPolicy.payment.tax" }));
      return {
        supportedMethods: ["COD", "Chuyen khoan ngan hang"],
        enableTax: Boolean(taxSettings.enableTax),
        taxRate: Number(taxSettings.taxRate || 0),
        taxIncluded: Boolean(taxSettings.taxIncluded),
      };
    },
  });
}

export async function loadMembershipPolicySnapshot(): Promise<MembershipPolicySnapshot> {
  return loadCachedSnapshot({
    cacheKey: MEMBERSHIP_POLICY_CACHE_KEY,
    staleCacheKey: MEMBERSHIP_POLICY_STALE_CACHE_KEY,
    label: "aiPolicy.membership",
    loader: async () => {
      const settings = serializeRankSettings(await withDbRetry(() => getRankSettings(), { label: "aiPolicy.membership.settings" }));
      return {
        bronzeMax: Number(settings.bronzeMax || 0),
        silverMax: Number(settings.silverMax || 0),
        cancelPenaltyUnit: Number(settings.cancelPenaltyUnit || 0),
      };
    },
  });
}

export async function loadPromotionsSnapshot(): Promise<PromotionsSnapshot> {
  return loadCachedSnapshot({
    cacheKey: PROMOTIONS_POLICY_CACHE_KEY,
    staleCacheKey: PROMOTIONS_POLICY_STALE_CACHE_KEY,
    label: "aiPolicy.promotions",
    loader: async () => {
      const now = new Date();
      const [activeVoucherRows, activeCampaignRows, activeBundleRows] = await Promise.all([
        withDbRetry(
          () =>
            Voucher.findAll({
              where: {
                isActive: true,
                [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gte]: now } }],
              },
              attributes: ["voucherType"],
              order: [["createdAt", "DESC"]],
              limit: 10,
            }),
          { label: "aiPolicy.promotions.vouchers" },
        ),
        withDbRetry(
          () =>
            DiscountCampaign.findAll({
              where: {
                startsAt: { [Op.lte]: now },
                endsAt: { [Op.gte]: now },
                isEnabled: true,
              },
              include: [
                { model: Product, as: "products", attributes: ["name"], through: { attributes: [] } },
                { model: Category, as: "categories", attributes: ["name"], through: { attributes: [] } },
              ],
              order: [["priority", "ASC"], ["createdAt", "DESC"]],
              limit: 5,
            }),
          { label: "aiPolicy.promotions.campaigns" },
        ),
        withDbRetry(
          () =>
            Bundle.findAll({
              where: { isEnabled: true },
              include: [
                {
                  model: BundleItem,
                  as: "items",
                  attributes: ["quantity"],
                  include: [
                    {
                      model: ProductVariant,
                      as: "variant",
                      attributes: ["price"],
                      include: [{ model: Product, as: "product", attributes: ["name"] }],
                    },
                  ],
                },
              ],
              order: [["updatedAt", "DESC"]],
              limit: 5,
            }),
          { label: "aiPolicy.promotions.bundles" },
        ),
      ]);

      const voucherTypes = Array.from(
        new Set(activeVoucherRows.map((row: any) => String(row.voucherType || "")).filter(Boolean)),
      ) as string[];

      const campaignSummaries = activeCampaignRows.map((row: any) => {
        const products = Array.isArray(row.products) ? row.products.map((item: any) => item.name).filter(Boolean) : [];
        const categories = Array.isArray(row.categories) ? row.categories.map((item: any) => item.name).filter(Boolean) : [];
        const discountKind = row.pricingMode === "price_rule" ? row.discountKind : "PRICE_OVERRIDE";
        const description =
          discountKind === "PERCENT"
            ? `Giam ${row.discountValue}%`
            : discountKind === "FIXED_AMOUNT"
              ? `Giam ${formatPrice(row.discountValue)}`
              : discountKind === "FREE_SHIPPING"
                ? "Mien phi van chuyen"
                : "Dieu chinh gia storefront";
        const scope = row.appliesToAllProducts
          ? "Toan shop"
          : [
              products.length > 0 ? `San pham: ${products.slice(0, 5).join(", ")}` : "",
              categories.length > 0 ? `Danh muc: ${categories.slice(0, 3).join(", ")}` : "",
            ]
              .filter(Boolean)
              .join("; ") || "Pham vi hep";

        return {
          name: String(row.name || "Campaign"),
          description,
          scope,
          endsAt: formatDate(row.endsAt),
        };
      });

      const bundleSummaries = activeBundleRows
        .map((row: any) => {
          const plain = row.get ? row.get({ plain: true }) : row;
          const items = Array.isArray(plain.items) ? plain.items : [];
          const originTotal = originTotalFromBundleItems(items);
          const discountedTotal = discountedTotalFromOrigin(originTotal, plain.discountKind, plain.discountValue);
          const discountLabel =
            String(plain.discountKind || "").toUpperCase() === "PERCENT"
              ? `Giam ${plain.discountValue}%`
              : `Giam ${formatPrice(plain.discountValue)}`;
          const productNames: string[] = [];
          const seenNames = new Set<string>();
          for (const item of items) {
            const name = String((item as any)?.variant?.product?.name || "").trim();
            if (!name || seenNames.has(name)) continue;
            seenNames.add(name);
            productNames.push(name);
            if (productNames.length >= 4) break;
          }

          return {
            name: String(plain.name || "Bundle"),
            discountLabel,
            discountedTotal: Number(discountedTotal) || 0,
            productNames,
          };
        })
        .filter((bundle: { discountedTotal: number }) => Number(bundle.discountedTotal) > 0);

      return {
        activeVoucherCount: Number(activeVoucherRows.length || 0),
        voucherTypes,
        campaignSummaries,
        bundleSummaries,
      };
    },
  });
}

export async function loadAuthenticatedMembershipSnapshot(userId: string): Promise<AuthenticatedMembershipSnapshot | null> {
  try {
    const rank = await withDbRetry(() => getMyRank(userId), { label: "aiPolicy.membership.userRank" });
    return {
      currentRank: String(rank.currentRank || "").toUpperCase() || "Khong ro",
      nextRank: rank.nextRank ? String(rank.nextRank).toUpperCase() : null,
      progressPercent: Number(rank.progressPercent || 0),
      remainingToNext: Number(rank.remainingToNext || 0),
    };
  } catch (error) {
    if (isTransientDbError(error)) {
      return null;
    }
    return null;
  }
}

function buildShippingToolBlock(snapshot: ShippingPolicySnapshot) {
  const methodsLabel =
    snapshot.enabledMethods.length > 0
      ? snapshot.enabledMethods.map((item) => `${item.name} (${item.code})`).join(", ")
      : "Khong co";

  return [
    "AI tool result: get_shipping_policy",
    `- display_mode: ${snapshot.displayMode === "included" ? "phi ship da nam trong gia" : "phi ship tinh rieng luc checkout"}`,
    `- free_shipping_enabled: ${snapshot.freeShippingEnabled ? "co" : "khong"}`,
    `- free_shipping_threshold: ${formatPrice(snapshot.freeShippingMinSubtotal)}`,
    `- free_shipping_standard_only: ${snapshot.freeShippingStandardOnly ? "co" : "khong"}`,
    `- fallback_shipping_amount: ${formatPrice(snapshot.fallbackShippingAmount)}`,
    `- enabled_methods: ${methodsLabel}`,
    `- configured_zones: ${snapshot.zoneCount}; mapped_provinces: ${snapshot.provinceMappingCount}`,
    "- rule: phi ship cu the phu thuoc tinh/thanh, zone, subtotal va phuong thuc giao hang.",
  ].join("\n");
}

function buildPaymentToolBlock(snapshot: PaymentPolicySnapshot) {
  return [
    "AI tool result: get_payment_policy",
    `- supported_methods: ${snapshot.supportedMethods.join(", ")}`,
    "- bank_transfer_flow: co QR/chuyen khoan va can xac nhan thanh toan.",
    "- cod_flow: co the dat don ma khong can chuyen khoan truoc.",
    `- tax_enabled: ${snapshot.enableTax ? "co" : "khong"}`,
    `- tax_rate: ${formatPercent(snapshot.taxRate)}`,
    `- tax_included_in_price: ${snapshot.taxIncluded ? "co" : "khong"}`,
    "- rule: khong duoc xac nhan mot giao dich da thanh toan neu khong co du lieu don/payments cu the.",
  ].join("\n");
}

function buildMembershipToolBlock(
  snapshot: MembershipPolicySnapshot,
  authenticatedUserSnapshot: AuthenticatedMembershipSnapshot | null,
) {
  const lines = [
    "AI tool result: get_membership_policy",
    `- tiers: Bronze, Silver, Gold`,
    `- silver_threshold: ${formatPrice(snapshot.bronzeMax)}`,
    `- gold_threshold: ${formatPrice(snapshot.silverMax)}`,
    `- cancel_penalty_unit: ${formatPrice(snapshot.cancelPenaltyUnit)}`,
    "- rule: diem rank duoc tinh tu don thanh cong va bi tru khi don bi huy.",
    "- benefit_hint: Silver/Gold co the nhan uu dai member campaign, voucher va dieu kien free ship tot hon.",
  ];

  if (authenticatedUserSnapshot) {
    lines.push(
      `- current_user_rank: ${authenticatedUserSnapshot.currentRank}`,
      `- next_rank: ${authenticatedUserSnapshot.nextRank || "Khong co"}`,
      `- rank_progress_percent: ${authenticatedUserSnapshot.progressPercent}%`,
      `- remaining_to_next_rank: ${formatPrice(authenticatedUserSnapshot.remainingToNext)}`,
    );
  }

  return lines.join("\n");
}

function buildPromotionsToolBlock(snapshot: PromotionsSnapshot) {
  const campaignLines =
    snapshot.campaignSummaries.length > 0
      ? snapshot.campaignSummaries.map(
          (item, index) => `${index + 1}. ${item.name} | ${item.description} | ${item.scope} | Het han: ${item.endsAt}`,
        )
      : ["Khong thay campaign active ro rang."];

  const bundleLines =
    snapshot.bundleSummaries.length > 0
      ? snapshot.bundleSummaries.map((item, index) => {
          const productsLabel = item.productNames.length > 0 ? item.productNames.join(", ") : "Khong ro";
          return `${index + 1}. ${item.name} | ${item.discountLabel} | Gia bundle: ${formatPrice(item.discountedTotal)} | SP: ${productsLabel}`;
        })
      : ["Khong thay bundle dang bat."];

  return [
    "AI tool result: get_active_promotions",
    `- active_voucher_count: ${snapshot.activeVoucherCount}`,
    `- voucher_types: ${snapshot.voucherTypes.length > 0 ? snapshot.voucherTypes.join(", ") : "Khong co"}`,
    "- active_campaigns:",
    ...campaignLines,
    "- active_bundles:",
    ...bundleLines,
    "- rule: neu user hoi uu dai/voucher theo policy, chi neu campaign/voucher/bundle neu tool block xac nhan duoc.",
    "- rule: neu user hoi san pham giam gia noi bat, uu tien doi chieu voi catalog context (san pham dang giam gia) thay vi chi bao xem tren shop.",
  ].join("\n");
}

function shouldIncludePolicyTool(intent: AiIntent, targetIntent: AiIntent) {
  if (targetIntent === "voucher_policy" && intent === "promotion_products") return true;
  return intent === targetIntent || intent === "general_support";
}

function shouldUseCompactPolicyOnly(result: WebsiteKnowledgeContextResult) {
  if (result.sourceTypes.includes("admin_question_blocker")) return false;
  if (result.sourceTypes.includes("authenticated_user_context")) return false;
  // Keep verbose campaign product lists for sale-product discovery.
  if (result.intent === "promotion_products") return false;
  return ["shipping_policy", "payment_policy", "membership_policy", "voucher_policy"].includes(result.intent);
}

export async function buildStructuredPolicyContext(
  websiteKnowledgeContext: WebsiteKnowledgeContextResult,
  options?: BuildStructuredPolicyContextOptions,
): Promise<StructuredPolicyContextResult> {
  const blocks: string[] = [];
  const toolNames: string[] = [];

  if (shouldIncludePolicyTool(websiteKnowledgeContext.intent, "shipping_policy")) {
    const shippingSnapshot = await loadShippingPolicySnapshot();
    blocks.push(buildShippingToolBlock(shippingSnapshot));
    toolNames.push("get_shipping_policy");
  }

  if (shouldIncludePolicyTool(websiteKnowledgeContext.intent, "payment_policy")) {
    const paymentSnapshot = await loadPaymentPolicySnapshot();
    blocks.push(buildPaymentToolBlock(paymentSnapshot));
    toolNames.push("get_payment_policy");
  }

  if (shouldIncludePolicyTool(websiteKnowledgeContext.intent, "membership_policy")) {
    const membershipSnapshot = await loadMembershipPolicySnapshot();
    const authenticatedMembershipSnapshot = options?.userId
      ? await loadAuthenticatedMembershipSnapshot(options.userId)
      : null;
    blocks.push(buildMembershipToolBlock(membershipSnapshot, authenticatedMembershipSnapshot));
    toolNames.push("get_membership_policy");
    if (authenticatedMembershipSnapshot) {
      toolNames.push("get_current_user_membership");
    }
  }

  if (shouldIncludePolicyTool(websiteKnowledgeContext.intent, "voucher_policy")) {
    const promotionsSnapshot = await loadPromotionsSnapshot();
    blocks.push(buildPromotionsToolBlock(promotionsSnapshot));
    toolNames.push("get_active_promotions");
  }

  if (shouldUsePolicyTool(websiteKnowledgeContext.intent) && blocks.length > 0) {
    blocks.unshift(
      [
        "AI tool result: policy_tool_router",
        `- detected_intent: ${websiteKnowledgeContext.intent}`,
        `- selected_tools: ${toolNames.join(", ")}`,
        "- uu tien tool block phu hop nhat voi intent thay vi trich dan context dai dong.",
      ].join("\n"),
    );
  }

  return {
    contextText: blocks.join("\n\n"),
    toolNames,
  };
}

export function shouldUseCompactPolicyContextOnly(websiteKnowledgeContext: WebsiteKnowledgeContextResult) {
  return shouldUseCompactPolicyOnly(websiteKnowledgeContext);
}

function shouldUsePolicyTool(intent: AiIntent) {
  return [
    "shipping_policy",
    "payment_policy",
    "membership_policy",
    "voucher_policy",
    "promotion_products",
    "general_support",
  ].includes(intent);
}
