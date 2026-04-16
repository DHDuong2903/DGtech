import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import { Cart, AddToCartRequest, UpdateCartItemRequest, type FreeShippingMotivation } from "../types";

export type CartWithMotivationResponse = {
  cart: Cart;
  freeShippingMotivation?: FreeShippingMotivation;
};

export const cartApi = {
  // Get user's cart
  getCart: async (): Promise<CartWithMotivationResponse> => {
    const response = await axiosInstance.get(API_ROUTE.CART);
    return response.data;
  },

  // Add item to cart
  addToCart: async (data: AddToCartRequest): Promise<CartWithMotivationResponse & { message: string }> => {
    const response = await axiosInstance.post(`${API_ROUTE.CART}/items`, data);
    return response.data;
  },

  // Update cart item quantity
  updateCartItem: async (
    cartItemId: string,
    data: UpdateCartItemRequest,
  ): Promise<CartWithMotivationResponse & { message: string }> => {
    const response = await axiosInstance.put(`${API_ROUTE.CART}/items/${cartItemId}`, data);
    return response.data;
  },

  // Remove item from cart
  removeFromCart: async (cartItemId: string): Promise<CartWithMotivationResponse & { message: string }> => {
    const response = await axiosInstance.delete(`${API_ROUTE.CART}/items/${cartItemId}`);
    return response.data;
  },

  // Clear cart
  clearCart: async (): Promise<CartWithMotivationResponse & { message: string }> => {
    const response = await axiosInstance.delete(API_ROUTE.CART);
    return response.data;
  },
};
