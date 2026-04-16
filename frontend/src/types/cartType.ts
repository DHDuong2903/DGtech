import { Product, ProductVariant } from "./productType";

/** Mirrors cart API `freeShippingMotivation` when free-ship bar is enabled in admin. */
export type FreeShippingMotivation =
  | { show: false }
  | { show: true; minSubtotal: number; standardOnly: boolean };

export interface CartItem {
  cartItemId: string;
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product: Product;
  variant?: ProductVariant;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  cartId: string;
  clerkId: string;
  totalPrice: number;
  totalItems: number;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartRequest {
  productId: string;
  variantId?: string;
  quantity?: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}
