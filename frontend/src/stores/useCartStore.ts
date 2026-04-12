// Zustand store for Cart
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Cart, ApiError } from "../types";
import { cartApi } from "../apis";
import { toast } from "sonner";

interface CartState {
  // State
  cart: Cart | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number, variantId?: string) => Promise<void>;
  updateCartItem: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        cart: null,
        loading: false,
        error: null,

        // Fetch cart
        fetchCart: async () => {
          set({ loading: true, error: null });
          try {
            const response = await cartApi.getCart();
            set({ cart: response.cart, loading: false });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            console.error("Error fetching cart:", err);
            // Không hiển thị lỗi nếu là 401 (chưa đăng nhập)
            if (err?.response?.status !== 401) {
              const error = err as ApiError;
              set({
                error: error.message || "Failed to fetch cart",
                loading: false,
              });
            } else {
              set({ loading: false, cart: null });
            }
          }
        },

        // Add item to cart
        addToCart: async (productId: string, quantity = 1, variantId?: string) => {
          set({ loading: true, error: null });
          try {
            const response = await cartApi.addToCart({ productId, quantity, variantId });
            set({ cart: response.cart, loading: false });
            toast.success(response.message || "Sản phẩm đã được thêm vào giỏ hàng");
          } catch (err: any) {
            console.error("Error adding to cart:", err);
            const errorMessage = err?.response?.data?.error || err?.message || "Không thể thêm sản phẩm vào giỏ hàng";
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
          }
        },

        // Update cart item quantity
        updateCartItem: async (cartItemId: string, quantity: number) => {
          set({ loading: true, error: null });
          try {
            const response = await cartApi.updateCartItem(cartItemId, {
              quantity,
            });
            set({ cart: response.cart, loading: false });
            toast.success(response.message || "Cập nhật giỏ hàng thành công");
          } catch (err) {
            console.error("Error updating cart item:", err);
            const error = err as ApiError;
            const errorMessage = error.message || "Lỗi khi cập nhật sản phẩm trong giỏ hàng";
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
          }
        },

        // Remove item from cart
        removeFromCart: async (cartItemId: string) => {
          set({ loading: true, error: null });
          try {
            const response = await cartApi.removeFromCart(cartItemId);
            set({ cart: response.cart, loading: false });
            toast.success(response.message || "Sản phẩm đã được xóa khỏi giỏ hàng");
          } catch (err) {
            console.error("Error removing from cart:", err);
            const error = err as ApiError;
            const errorMessage = error.message || "Không thể xóa sản phẩm khỏi giỏ hàng";
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
          }
        },

        // Clear cart
        clearCart: async () => {
          set({ loading: true, error: null });
          try {
            const response = await cartApi.clearCart();
            set({ cart: response.cart, loading: false });
            toast.success(response.message || "Giỏ hàng đã được làm trống");
          } catch (err) {
            console.error("Error clearing cart:", err);
            const error = err as ApiError;
            const errorMessage = error.message || "Không thể làm trống giỏ hàng";
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
          }
        },

        // Set error
        setError: (error: string | null) => set({ error }),

        // Clear error
        clearError: () => set({ error: null }),
      }),
      {
        name: "cart-storage", // name in localStorage
        partialize: (state) => ({ cart: state.cart }), // only persist cart
      }
    ),
    { name: "CartStore" }
  )
);
