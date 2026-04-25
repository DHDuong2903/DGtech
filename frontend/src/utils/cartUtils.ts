import type { CartItem } from "@/src/types";
import { isBundleCartItem } from "@/src/utils/cartLineUtils";

/**
 * Bundle lines first, then other lines. Within each group: newest first (last added on top).
 */
export function sortCartItemsForDisplay(items: CartItem[]): CartItem[] {
  return [...items].sort((a, b) => {
    const aBundle = isBundleCartItem(a);
    const bBundle = isBundleCartItem(b);
    if (aBundle !== bBundle) {
      if (aBundle && !bBundle) return -1;
      if (!aBundle && bBundle) return 1;
    }
    const tb = new Date(b.createdAt).getTime();
    const ta = new Date(a.createdAt).getTime();
    if (tb !== ta) return tb - ta;
    return b.cartItemId.localeCompare(a.cartItemId);
  });
}
