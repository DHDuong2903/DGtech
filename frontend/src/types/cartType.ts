import { Product } from "./productType";

export interface CartItem {
  cartItemId: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: Product;
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
  quantity?: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}
