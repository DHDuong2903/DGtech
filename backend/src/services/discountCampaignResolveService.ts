// @ts-nocheck
/**
 * Storefront: resolve winning discount campaign per variant (priority ASC = higher priority).
 * Catalog DB prices unchanged; callers overlay effective price + compareAtPrice on API payloads.
 */
import { Op } from "sequelize";
import {
  Category,
  DiscountCampaign,
  DiscountCampaignVariantPrice,
  Product,
  ProductVariant,
  User,
} from "../models/associationsModel.js";

function roundMoney(n: number) {
  return Math.round(Number(n) * 100) / 100;
}

export type VariantPricingContext = {
  variantId: string;
  productId: string;
  categoryId: number;
  catalogUnitPrice: number;
};

export type ResolvedVariantPricing = {
  effectivePrice: number;
  catalogPrice: number;
  campaignId: string | null;
  campaignName: string | null;
};

function tierMatchesCampaign(campaign: any, userTier: string): boolean {
  const tiers = campaign.targetTiers;
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) return true;
  return tiers.map((t: string) => String(t).toLowerCase()).includes(String(userTier).toLowerCase());
}

function readRuleVariantIds(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const raw = (metadata as Record<string, unknown>).ruleVariantIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

/** All ruleVariantIds across active campaigns (for resolving partial scope per product). */
function collectPartialRuleVariantIds(campaigns: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of campaigns) {
    for (const vid of readRuleVariantIds(c.metadata)) {
      if (seen.has(vid)) continue;
      seen.add(vid);
      out.push(vid);
    }
  }
  return out;
}

async function loadVariantIdToProductIdMap(variantIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!variantIds.length) return map;
  const rows = await ProductVariant.findAll({
    where: { variantId: { [Op.in]: variantIds } },
    attributes: ["variantId", "productId"],
  });
  for (const r of rows) {
    const id = r.variantId ?? r.get?.("variantId");
    const pid = r.productId ?? r.get?.("productId");
    if (id && pid) map.set(String(id), String(pid));
  }
  return map;
}

function variantInPriceList(campaign: any, variantId: string): { price: number } | null {
  const rows = campaign.variantPrices || [];
  for (const r of rows) {
    const vid = r.variantId ?? r.get?.("variantId");
    if (vid === variantId) {
      const p = r.price != null ? parseFloat(String(r.price)) : NaN;
      if (Number.isFinite(p) && p > 0) return { price: roundMoney(p) };
    }
  }
  return null;
}

/**
 * price_rule + specific products: metadata.ruleVariantIds may list only some variants (e.g. one SKU of a
 * multi-variant product). Variants of *other* selected products (e.g. simple products with only a default
 * variant) must still resolve — they are in scope when no id in ruleVariantIds belongs to that product.
 */
function inScopePriceRule(
  campaign: any,
  ctx: VariantPricingContext,
  variantIdToProductId: Map<string, string>
): boolean {
  if (campaign.appliesToAllProducts) return true;
  const cats = (campaign.categories || []).map((c: any) => c.categoryId ?? c.category_id).filter(Boolean);
  if (cats.length && cats.includes(ctx.categoryId)) return true;
  const prods = (campaign.products || []).map((p: any) => p.productId ?? p.product_id).filter(Boolean);
  if (!prods.length) return false;
  if (!prods.includes(ctx.productId)) return false;
  const partial = readRuleVariantIds(campaign.metadata);
  if (!partial.length) return true;
  if (partial.includes(ctx.variantId)) return true;
  const partialTouchesThisProduct = partial.some((vid) => variantIdToProductId.get(vid) === ctx.productId);
  if (!partialTouchesThisProduct) return true;
  return false;
}

function applyRuleDiscount(campaign: any, base: number): number {
  const kind = campaign.discountKind;
  if (!kind) return roundMoney(base);
  const dv = Number(campaign.discountValue);
  if (kind === "PERCENT" && Number.isFinite(dv)) {
    const pct = Math.min(100, Math.max(0, dv));
    return roundMoney(base * (1 - pct / 100));
  }
  if (kind === "FIXED_AMOUNT" && Number.isFinite(dv)) {
    return roundMoney(Math.max(0, base - dv));
  }
  return roundMoney(base);
}

function pricingModeOf(campaign: any): "price_list" | "price_rule" {
  if (campaign.pricingMode === "price_list") return "price_list";
  return "price_rule";
}

let cachedCampaignsAt = 0;
let cachedCampaigns: any[] = [];
const CACHE_TTL_MS = 5000;

async function loadActiveCampaignsOrdered(at: Date): Promise<any[]> {
  const t = at.getTime();
  if (cachedCampaigns.length && Math.abs(t - cachedCampaignsAt) < CACHE_TTL_MS) {
    return cachedCampaigns;
  }
  const rows = await DiscountCampaign.findAll({
    where: {
      isEnabled: true,
      startsAt: { [Op.lte]: at },
      [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: at } }],
    },
    include: [
      {
        model: Product,
        as: "products",
        attributes: ["productId"],
        through: { attributes: [] },
        required: false,
      },
      {
        model: Category,
        as: "categories",
        attributes: ["categoryId"],
        through: { attributes: [] },
        required: false,
      },
      {
        model: DiscountCampaignVariantPrice,
        as: "variantPrices",
        attributes: ["variantId", "price"],
        required: false,
      },
    ],
    order: [
      ["priority", "ASC"],
      ["updatedAt", "DESC"],
    ],
  });
  cachedCampaigns = rows.map((r) => r.get({ plain: true }));
  cachedCampaignsAt = t;
  return cachedCampaigns;
}

/** Invalidate in-process campaign cache (e.g. after admin mutates campaigns). */
export function invalidateDiscountCampaignCache() {
  cachedCampaigns = [];
  cachedCampaignsAt = 0;
}

export async function getStorefrontUserTier(clerkId: string | null | undefined): Promise<"bronze" | "silver" | "gold"> {
  if (!clerkId) return "bronze";
  const u = await User.findByPk(clerkId, { attributes: ["tier"] });
  const t = u?.tier;
  if (t === "silver" || t === "gold" || t === "bronze") return t;
  return "bronze";
}

export function resolveVariantAgainstCampaigns(
  campaigns: any[],
  ctx: VariantPricingContext,
  userTier: string,
  variantIdToProductId: Map<string, string> = new Map()
): ResolvedVariantPricing {
  const catalog = roundMoney(ctx.catalogUnitPrice);
  for (const c of campaigns) {
    if (!tierMatchesCampaign(c, userTier)) continue;
    const pm = pricingModeOf(c);
    if (pm === "price_list") {
      const row = variantInPriceList(c, ctx.variantId);
      if (!row) continue;
      return {
        effectivePrice: row.price,
        catalogPrice: catalog,
        campaignId: c.campaignId,
        campaignName: c.name ?? null,
      };
    }
    if (!inScopePriceRule(c, ctx, variantIdToProductId)) continue;
    const override = variantInPriceList(c, ctx.variantId);
    const effective = override ? override.price : applyRuleDiscount(c, catalog);
    if (!override && effective >= catalog) continue;
    return {
      effectivePrice: effective,
      catalogPrice: catalog,
      campaignId: c.campaignId,
      campaignName: c.name ?? null,
    };
  }
  return {
    effectivePrice: catalog,
    catalogPrice: catalog,
    campaignId: null,
    campaignName: null,
  };
}

export async function resolveVariantPricingBatch(
  rows: VariantPricingContext[],
  userTier: "bronze" | "silver" | "gold",
  at: Date = new Date()
): Promise<Map<string, ResolvedVariantPricing>> {
  const out = new Map<string, ResolvedVariantPricing>();
  if (!rows.length) return out;
  const campaigns = await loadActiveCampaignsOrdered(at);
  const partialIds = collectPartialRuleVariantIds(campaigns);
  const variantIdToProductId = await loadVariantIdToProductIdMap(partialIds);
  for (const ctx of rows) {
    out.set(ctx.variantId, resolveVariantAgainstCampaigns(campaigns, ctx, userTier, variantIdToProductId));
  }
  return out;
}

function setVariantDisplayPrices(variant: any, resolved: ResolvedVariantPricing) {
  const eff = resolved.effectivePrice;
  const base = resolved.catalogPrice;
  if (typeof variant?.setDataValue === "function") {
    variant.setDataValue("price", eff);
    variant.setDataValue("compareAtPrice", eff < base ? base : null);
  } else {
    variant.price = eff;
    variant.compareAtPrice = eff < base ? base : null;
  }
}

/**
 * Mutates Sequelize cart item rows: variant.price/compareAtPrice and item.appliedCampaign.
 */
export async function enrichCartItemLinesForStorefront(cartItems: any[], clerkId: string | null | undefined) {
  if (!cartItems?.length) return;
  const tier = await getStorefrontUserTier(clerkId);
  const at = new Date();
  const contexts: VariantPricingContext[] = [];
  for (const item of cartItems) {
    const product = item.product;
    const variant = item.variant;
    if (!product) continue;
    const catalog = variant ? parseFloat(variant.price) : parseFloat(product.price);
    const variantId = variant?.variantId ?? item.variantId;
    if (!variantId) continue;
    contexts.push({
      variantId,
      productId: product.productId,
      categoryId: product.categoryId != null ? Number(product.categoryId) : NaN,
      catalogUnitPrice: Number.isFinite(catalog) ? catalog : 0,
    });
  }
  const map = await resolveVariantPricingBatch(contexts, tier, at);
  for (const item of cartItems) {
    const product = item.product;
    const variant = item.variant;
    if (!variant || !product) continue;
    const resolved = map.get(variant.variantId);
    if (!resolved) continue;
    setVariantDisplayPrices(variant, resolved);
    if (resolved.campaignId) {
      item.dataValues.appliedCampaign = {
        campaignId: resolved.campaignId,
        name: resolved.campaignName || "",
      };
    } else {
      item.dataValues.appliedCampaign = null;
    }
  }
}

/**
 * Overlay campaign pricing on product + variants for storefront JSON (mutates instances or plain objects).
 */
/** Build JSON-safe cart after `enrichCartItemLinesForStorefront` (includes `appliedCampaign`). */
export function serializeCartForStorefrontJson(cart: any) {
  if (!cart || typeof cart.get !== "function") return cart;
  const plain = cart.get({ plain: true });
  if (!plain.items || !cart.items) return plain;
  plain.items = cart.items.map((orig: any) => {
    const row = orig.get({ plain: true });
    const v = orig.variant;
    const p = orig.product;
    return {
      ...row,
      product: p && typeof p.get === "function" ? p.get({ plain: true }) : row.product,
      variant: v && typeof v.get === "function" ? v.get({ plain: true }) : row.variant,
      appliedCampaign: orig.dataValues?.appliedCampaign ?? orig.appliedCampaign ?? null,
    };
  });
  return plain;
}

export async function applyCampaignPricingToProductForStorefront(product: any, userTier: "bronze" | "silver" | "gold") {
  if (!product) return;
  const variants = product.variants;
  if (!variants || !Array.isArray(variants) || !variants.length) return;
  const at = new Date();
  const categoryId =
    product.categoryId != null
      ? Number(product.categoryId)
      : product.category?.categoryId != null
        ? Number(product.category.categoryId)
        : NaN;
  const productId = product.productId;
  const contexts: VariantPricingContext[] = [];
  for (const v of variants) {
    const plain = v.get ? v.get({ plain: true }) : v;
    const vid = plain.variantId;
    const catalog = parseFloat(plain.price);
    if (!vid || !Number.isFinite(catalog)) continue;
    contexts.push({
      variantId: vid,
      productId,
      categoryId: Number.isFinite(categoryId) ? categoryId : NaN,
      catalogUnitPrice: catalog,
    });
  }
  const map = await resolveVariantPricingBatch(contexts, userTier, at);
  let minEff = Infinity;
  let compareForMin: number | null = null;
  for (const v of variants) {
    const plain = v.get ? v.get({ plain: true }) : v;
    const vid = plain.variantId;
    const resolved = map.get(vid);
    if (!resolved) continue;
    setVariantDisplayPrices(v, resolved);
    if (resolved.effectivePrice < minEff) {
      minEff = resolved.effectivePrice;
      compareForMin = resolved.effectivePrice < resolved.catalogPrice ? resolved.catalogPrice : null;
    }
  }
  if (minEff !== Infinity && typeof product.setDataValue === "function") {
    product.setDataValue("price", minEff);
    product.setDataValue("compareAtPrice", compareForMin != null && compareForMin > minEff ? compareForMin : null);
  } else if (minEff !== Infinity) {
    product.price = minEff;
    product.compareAtPrice = compareForMin != null && compareForMin > minEff ? compareForMin : null;
  }
}
