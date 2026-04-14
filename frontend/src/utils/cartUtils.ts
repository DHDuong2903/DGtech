import type { CartItem } from "@/src/types";

/** Newest line first (last added on top), oldest at bottom. */
export function sortCartItemsForDisplay(items: CartItem[]): CartItem[] {
  return [...items].sort((a, b) => {
    const tb = new Date(b.createdAt).getTime();
    const ta = new Date(a.createdAt).getTime();
    if (tb !== ta) return tb - ta;
    return b.cartItemId.localeCompare(a.cartItemId);
  });
}
