// Zustand store for Cart
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Cart, ApiError, type FreeShippingMotivation } from "../types";
import { cartApi } from "../apis";
import { toast } from "sonner";

interface CartState {
  // State
  cart: Cart | null;
  /** From cart API — free-ship threshold bar when enabled in admin. */
  freeShippingMotivation: FreeShippingMotivation | null;
  loading: boolean;
  error: string | null;
  /** Mini cart sheet after add-to-cart (not persisted). */
  cartSheetOpen: boolean;

  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (
    productId: string,
    quantity?: number,
    variantId?: string,
    opts?: { openSheet?: boolean; suppressSuccessToast?: boolean },
  ) => Promise<void>;
  addBundleToCart: (
    bundleId: string,
    quantity?: number,
    opts?: { openSheet?: boolean; suppressSuccessToast?: boolean; throwOnError?: boolean },
  ) => Promise<void>;
  updateCartItem: (
    cartItemId: string,
    quantity: number,
    opts?: { suppressSuccessToast?: boolean; throwOnError?: boolean },
  ) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  removeManyFromCart: (cartItemIds: string[]) => Promise<void>;
  clearCart: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
  setCartSheetOpen: (open: boolean) => void;
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        cart: null,
        freeShippingMotivation: null,
        loading: false,
        error: null,
        cartSheetOpen: false,

        setCartSheetOpen: (open) => set({ cartSheetOpen: open }),

        // Fetch cart
        fetchCart: async () => {
          set({ loading: true, error: null });
          try {
            const response = await cartApi.getCart();
            set({
              cart: response.cart,
              freeShippingMotivation: response.freeShippingMotivation ?? { show: false },
              loading: false,
            });
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
              set({ loading: false, cart: null, freeShippingMotivation: null });
            }
          }
        },

        // Add item to cart
        addToCart: async (productId: string, quantity = 1, variantId?: string, opts?: { openSheet?: boolean; suppressSuccessToast?: boolean }) => {
          const openSheet = opts?.openSheet !== false;
          const suppressSuccessToast = opts?.suppressSuccessToast === true;
          set({ loading: true, error: null });
          try {
            const response = await cartApi.addToCart({ productId, quantity, variantId });
            set({
              cart: response.cart,
              freeShippingMotivation: response.freeShippingMotivation ?? { show: false },
              loading: false,
            });
            if (openSheet) {
              requestAnimationFrame(() => {
                set({ cartSheetOpen: true });
              });
            }
            // toast.success removed as per request
          } catch (err: unknown) {
            console.error("Error adding to cart:", err);
            const errorMessage =
              (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ||
              (err as { message?: string })?.message ||
              "Không thể thêm sản phẩm vào giỏ hàng";
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
          }
        },

        addBundleToCart: async (
          bundleId: string,
          quantity = 1,
          opts?: { openSheet?: boolean; suppressSuccessToast?: boolean; throwOnError?: boolean },
        ) => {
          const openSheet = opts?.openSheet !== false;
          const throwOnError = opts?.throwOnError === true;
          set({ loading: true, error: null });
          try {
            const response = await cartApi.addToCart({ itemType: "BUNDLE", bundleId, quantity });
            set({
              cart: response.cart,
              freeShippingMotivation: response.freeShippingMotivation ?? { show: false },
              loading: false,
            });
            if (openSheet) {
              requestAnimationFrame(() => {
                set({ cartSheetOpen: true });
              });
            }
          } catch (err: unknown) {
            console.error("Error adding bundle to cart:", err);
            const errorMessage =
              (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ||
              (err as { message?: string })?.message ||
              "Could not add bundle to cart";
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            if (throwOnError) throw err;
          }
        },

        // Update cart item quantity
        updateCartItem: async (cartItemId: string, quantity: number, opts) => {
          const suppressSuccessToast = opts?.suppressSuccessToast === true;
          const throwOnError = opts?.throwOnError === true;
          set({ loading: true, error: null });
          try {
            const response = await cartApi.updateCartItem(cartItemId, {
              quantity,
            });
            set({
              cart: response.cart,
              freeShippingMotivation: response.freeShippingMotivation ?? { show: false },
              loading: false,
            });
          } catch (err) {
            console.error("Error updating cart item:", err);
            const error = err as ApiError;
            const errorMessage =
              (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
              error.message ||
              "Lỗi khi cập nhật sản phẩm trong giỏ hàng";
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            if (throwOnError) throw err;
          }
        },

        // Remove item from cart
        removeFromCart: async (cartItemId: string) => {
          set({ loading: true, error: null });
          try {
            const response = await cartApi.removeFromCart(cartItemId);
            set({
              cart: response.cart,
              freeShippingMotivation: response.freeShippingMotivation ?? { show: false },
              loading: false,
            });
            // toast.success removed as per request
          } catch (err) {
            console.error("Error removing from cart:", err);
            const error = err as ApiError;
            const errorMessage = error.message || "Không thể xóa sản phẩm khỏi giỏ hàng";
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
          }
        },

        removeManyFromCart: async (cartItemIds: string[]) => {
          const unique = [...new Set(cartItemIds)].filter(Boolean);
          if (unique.length === 0) return;
          set({ loading: true, error: null });
          try {
            let lastCart: Cart | null = null;
            let lastMotivation: FreeShippingMotivation = { show: false };
            for (const id of unique) {
              const response = await cartApi.removeFromCart(id);
              lastCart = response.cart;
              lastMotivation = response.freeShippingMotivation ?? { show: false };
            }
            set({
              cart: lastCart,
              freeShippingMotivation: lastMotivation,
              loading: false,
            });
            // toast.success removed as per request
          } catch (err) {
            console.error("Error removing cart items:", err);
            const error = err as ApiError;
            const errorMessage = error.message || "Could not remove selected items";
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            try {
              const response = await cartApi.getCart();
              set({
                cart: response.cart,
                freeShippingMotivation: response.freeShippingMotivation ?? { show: false },
              });
            } catch {
              /* ignore resync failure */
            }
          }
        },

        // Clear cart
        clearCart: async () => {
          set({ loading: true, error: null });
          try {
            const response = await cartApi.clearCart();
            set({
              cart: response.cart,
              freeShippingMotivation: response.freeShippingMotivation ?? { show: false },
              loading: false,
            });
            // toast.success removed as per request
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
