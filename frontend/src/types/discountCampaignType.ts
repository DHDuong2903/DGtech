export type DiscountCampaignType = "SEASONAL" | "FLASH_SALE" | "TIER" | "CUSTOM";

/** Canonical engine mode (mirrors DB column `pricingMode`). */
export type PricingMode = "price_rule" | "price_list";

export type DiscountKind = "PERCENT" | "FIXED_AMOUNT";

export type UserTierOption = "bronze" | "silver" | "gold";

export type DiscountCampaignVariantPriceRow = {
  variantId: string;
  price: number;
  sku?: string | null;
  productId?: string | null;
  attributes?: Record<string, string> | null;
};

export type DiscountCampaign = {
  campaignId: string;
  name: string;
  priority: number;
  campaignType: string;
  pricingMode: PricingMode;
  discountKind: DiscountKind | null;
  discountValue: number;
  appliesToAllProducts: boolean;
  targetTiers: UserTierOption[];
  startsAt: string;
  endsAt: string | null;
  metadata: Record<string, unknown>;
  isEnabled: boolean;
  productIds: string[];
  categoryIds: number[];
  variantPrices: DiscountCampaignVariantPriceRow[];
  /** Populated on list endpoint when variant rows are omitted for payload size. */
  variantPriceCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DiscountCampaignFormPayload = {
  name: string;
  priority: number;
  campaignType: string;
  pricingMode: PricingMode;
  discountKind: DiscountKind | null;
  discountValue: number;
  appliesToAllProducts: boolean;
  targetTiers: UserTierOption[];
  startsAt: string;
  endsAt: string | null;
  metadata: Record<string, unknown>;
  isEnabled: boolean;
  productIds: string[];
  categoryIds: number[];
  variantPrices: DiscountCampaignVariantPriceRow[];
};
