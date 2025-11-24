import axiosInstance from "../lib/axios";
import { Cart, AddToCartRequest, UpdateCartItemRequest } from "../types";

const CART_URL = "/cart";

export const cartApi = {
  // Get user's cart
  getCart: async (): Promise<{ cart: Cart }> => {
    const response = await axiosInstance.get(CART_URL);
    return response.data;
  },

  // Add item to cart
  addToCart: async (data: AddToCartRequest): Promise<{ cart: Cart; message: string }> => {
    const response = await axiosInstance.post(`${CART_URL}/items`, data);
    return response.data;
  },

  // Update cart item quantity
  updateCartItem: async (cartItemId: string, data: UpdateCartItemRequest): Promise<{ cart: Cart; message: string }> => {
    const response = await axiosInstance.put(`${CART_URL}/items/${cartItemId}`, data);
    return response.data;
  },

  // Remove item from cart
  removeFromCart: async (cartItemId: string): Promise<{ cart: Cart; message: string }> => {
    const response = await axiosInstance.delete(`${CART_URL}/items/${cartItemId}`);
    return response.data;
  },

  // Clear cart
  clearCart: async (): Promise<{ cart: Cart; message: string }> => {
    const response = await axiosInstance.delete(CART_URL);
    return response.data;
  },
};
