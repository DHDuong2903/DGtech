export type BundleDiscountKind = "PERCENT" | "FIXED_AMOUNT";

export type BundleItem = {
  variantId: string;
  quantity: number;
  /** Populated from server */
  sku?: string | null;
  productId?: string | null;
  productName?: string | null;
  productImageUrl?: string | null;
  attributes?: Record<string, string> | null;
  price?: number;
};

export type Bundle = {
  bundleId: string;
  name: string;
  discountKind: BundleDiscountKind;
  discountValue: number;
  maxPerUser: number;
  isEnabled: boolean;
  items: BundleItem[];
  /** Populated on list endpoint when items are omitted for payload size */
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BundleFormPayload = {
  name: string;
  discountKind: BundleDiscountKind;
  discountValue: number;
  maxPerUser: number;
  isEnabled: boolean;
  items: { variantId: string; quantity: number }[];
};

/** Public PDP API: one line in a bundle. */
export type StorefrontBundleLine = {
  variantId: string;
  quantity: number;
  productId: string | null;
  productName: string | null;
  imageUrl: string | null;
  attributes: Record<string, string> | null;
  unitCatalogPrice: number | null;
  storefrontProductUrl: string | null;
};

/** Public PDP API: bundle card payload. */
export type StorefrontBundleForPdp = {
  bundleId: string;
  name: string;
  discountKind: BundleDiscountKind;
  discountValue: number;
  originTotal: number;
  discountedTotal: number;
  items: StorefrontBundleLine[];
};
