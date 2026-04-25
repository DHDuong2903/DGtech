import type { CartItem } from "@/src/types";
import { toMoneyNumber } from "./formatUtil";

export function isBundleCartItem(item: CartItem): boolean {
  return item.itemType === "BUNDLE" || Boolean(item.bundleSnapshot);
}

export function cartItemUnitPrice(item: CartItem): number {
  if (isBundleCartItem(item)) {
    const u = item.bundleSnapshot?.discountedUnitTotal;
    if (typeof u === "number" && Number.isFinite(u)) return u;
    return toMoneyNumber(item.product?.price);
  }
  return toMoneyNumber(item.variant?.price ?? item.product?.price);
}

export function cartItemCompareAtUnit(item: CartItem): number | null {
  if (isBundleCartItem(item)) {
    const o = item.bundleSnapshot?.originTotal;
    if (typeof o === "number" && Number.isFinite(o) && o > 0) return o;
    return null;
  }
  const c = item.variant?.compareAtPrice ?? item.product?.compareAtPrice ?? null;
  const n = toMoneyNumber(c as unknown);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function cartItemMaxQuantity(item: CartItem): number {
  return item.variant?.stock ?? item.product?.stock ?? 0;
}
