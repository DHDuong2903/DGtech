import { Product, ProductVariant } from "./productType";
import type { EligibleVoucher } from "./voucherType";

/** Mirrors cart API `freeShippingMotivation` when free-ship bar is enabled in admin. */
export type FreeShippingMotivation =
  | { show: false }
  | { show: true; minSubtotal: number; standardOnly: boolean };

/** Set by cart API when a discount campaign applies to the line. */
export type CartItemAppliedCampaign = {
  campaignId: string;
  name: string;
};

export type CartBundleSnapshotLine = {
  variantId: string;
  quantity: number;
  productId: string | null;
  productName: string | null;
  imageUrl: string | null;
  model3dUrl?: string | null;
  attributes?: Record<string, string> | null;
  unitCatalogPrice: number | null;
  storefrontProductUrl: string | null;
};

export type CartBundleSnapshot = {
  bundleId: string;
  name: string;
  discountKind: string;
  discountValue: number;
  originTotal: number;
  discountedUnitTotal: number;
  lines: CartBundleSnapshotLine[];
};

export interface CartItem {
  cartItemId: string;
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product: Product;
  variant?: ProductVariant;
  appliedCampaign?: CartItemAppliedCampaign | null;
  /** When set, line is a bundle (single cart row). */
  itemType?: "PRODUCT" | "BUNDLE";
  bundleId?: string | null;
  bundleSnapshot?: CartBundleSnapshot | null;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  cartId: string;
  clerkId: string;
  totalPrice: number;
  totalItems: number;
  appliedVoucherId?: string | null;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export type AppliedVoucher = Pick<
  EligibleVoucher,
  "voucherId" | "name" | "voucherType" | "discountPercent" | "discountAmount" | "expiresAt"
> & {
  isActive: boolean;
};

export type AddToCartRequest =
  | {
      productId: string;
      variantId?: string;
      quantity?: number;
      itemType?: "PRODUCT";
    }
  | {
      itemType: "BUNDLE";
      bundleId: string;
      quantity?: number;
    };

export interface UpdateCartItemRequest {
  quantity: number;
}
