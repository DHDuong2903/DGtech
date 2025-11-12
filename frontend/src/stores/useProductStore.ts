// Zustand store for Products
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Product, ApiError } from "../types";
import { productsApi } from "../apis";
import { toast } from "sonner";

interface ProductState {
  // State
  products: Product[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchProducts: () => Promise<void>;
  createProduct: (formData: FormData) => Promise<{ success: boolean; data?: Product; error?: string }>;
  updateProduct: (id: string, formData: FormData) => Promise<{ success: boolean; data?: Product; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleFeatured: (id: string, isFeatured: boolean) => Promise<{ success: boolean; data?: Product; error?: string }>;
  toggleOnSale: (id: string, isOnSale: boolean) => Promise<{ success: boolean; data?: Product; error?: string }>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useProductStore = create<ProductState>()(
  devtools(
    (set) => ({
      // Initial state
      products: [],
      loading: false,
      error: null,

      // Fetch all products
      fetchProducts: async () => {
        set({ loading: true, error: null });
        try {
          const response = await productsApi.getAll();
          // Extract products array from paginated response
          const products = response.data || [];
          set({ products, loading: false });
        } catch (err) {
          console.error("Error fetching products:", err);
          const error = err as ApiError;
          set({ error: error.message || "Failed to fetch products", loading: false });
        }
      },

      // Create product
      createProduct: async (formData: FormData) => {
        try {
          const newProduct = await productsApi.create(formData);
          set((state) => ({
            products: [...state.products, newProduct],
            error: null,
          }));
          toast.success("Sản phẩm đã được tạo mới thành công!");
          return { success: true, data: newProduct };
        } catch (err) {
          console.error("Error creating product:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to create product";
          set({ error: errorMessage });
          toast.error("Không thể tạo sản phẩm. Vui lòng thử lại!");
          return { success: false, error: errorMessage };
        }
      },

      // Update product
      updateProduct: async (id: string, formData: FormData) => {
        try {
          const updatedProduct = await productsApi.update(id, formData);
          set((state) => ({
            products: state.products.map((prod) => (prod.productId === id ? updatedProduct : prod)),
            error: null,
          }));
          toast.success("Sản phẩm đã được cập nhật thành công");
          return { success: true, data: updatedProduct };
        } catch (err) {
          console.error("Error updating product:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to update product";
          set({ error: errorMessage });
          toast.error("Không thể cập nhật sản phẩm. Vui lòng thử lại");
          return { success: false, error: errorMessage };
        }
      },

      // Delete product
      deleteProduct: async (id: string) => {
        try {
          await productsApi.delete(id);
          set((state) => ({
            products: state.products.filter((prod) => prod.productId !== id),
            error: null,
          }));
          toast.success("Sản phẩm đã được xóa thành công");
          return { success: true };
        } catch (err) {
          console.error("Error deleting product:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to delete product";
          set({ error: errorMessage });
          toast.error("Không thể xóa sản phẩm. Vui lòng thử lại");
          return { success: false, error: errorMessage };
        }
      },

      // Toggle featured status
      toggleFeatured: async (id: string, isFeatured: boolean) => {
        try {
          const updatedProduct = await productsApi.toggleFeatured(id, isFeatured);
          set((state) => ({
            products: state.products.map((prod) => (prod.productId === id ? { ...prod, isFeatured } : prod)),
            error: null,
          }));
          toast.success(isFeatured ? "Đã đánh dấu là sản phẩm nổi bật" : "Đã bỏ đánh dấu sản phẩm nổi bật");
          return { success: true, data: updatedProduct };
        } catch (err) {
          console.error("Error toggling featured:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to toggle featured status";
          set({ error: errorMessage });
          toast.error("Không thể cập nhật trạng thái nổi bật. Vui lòng thử lại");
          return { success: false, error: errorMessage };
        }
      },

      // Toggle on sale status
      toggleOnSale: async (id: string, isOnSale: boolean) => {
        try {
          const updatedProduct = await productsApi.toggleOnSale(id, isOnSale);
          set((state) => ({
            products: state.products.map((prod) => (prod.productId === id ? { ...prod, isOnSale } : prod)),
            error: null,
          }));
          toast.success(isOnSale ? "Đã đánh dấu là đang giảm giá" : "Đã bỏ đánh dấu giảm giá");
          return { success: true, data: updatedProduct };
        } catch (err) {
          console.error("Error toggling on sale:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to toggle on sale status";
          set({ error: errorMessage });
          toast.error("Không thể cập nhật trạng thái giảm giá. Vui lòng thử lại");
          return { success: false, error: errorMessage };
        }
      },

      // Set error
      setError: (error: string | null) => {
        set({ error });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: "ProductStore" }
  )
);
