/**
 * Re-exports storefront discount resolution. Prefer importing from `discountCampaignResolveService.js`.
 */
export {
  applyCampaignPricingToProductForStorefront,
  enrichCartItemLinesForStorefront,
  getStorefrontUserTier,
  invalidateDiscountCampaignCache,
  resolveVariantAgainstCampaigns,
  resolveVariantPricingBatch,
  serializeCartForStorefrontJson,
} from "./discountCampaignResolveService.js";

export type { ResolvedVariantPricing, VariantPricingContext } from "./discountCampaignResolveService.js";
