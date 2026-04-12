// Zustand store for Products
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { isAxiosError } from "axios";
import { Product, ApiError } from "../types";
import { productsApi } from "../apis";
import { toast } from "sonner";

function messageFromApiErr(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as { error?: string; details?: string } | undefined;
    if (d && typeof d.error === "string" && d.error.length > 0) return d.error;
    if (d && typeof d.details === "string" && d.details.length > 0) return d.details;
    if (err.message) return err.message;
  }
  const e = err as ApiError;
  return e.message || fallback;
}

interface ProductState {
  // State
  products: Product[];
  currentProduct: Product | null;
  relatedProducts: Product[];
  loading: boolean;
  error: string | null;
  totalItems: number;
  totalPages: number;
  currentPage: number;

  // Actions
  fetchProducts: (
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      order?: "ASC" | "DESC";
      categoryId?: number;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
      status?: "ACTIVE" | "DRAFT";
    },
    options?: { adminCatalog?: boolean },
  ) => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
  fetchRelatedProducts: (categoryId: number, excludeId: string) => Promise<void>;
  createProduct: (formData: FormData) => Promise<{ success: boolean; data?: Product; error?: string }>;
  updateProduct: (id: string, formData: FormData) => Promise<{ success: boolean; data?: Product; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteProducts: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  updateProductStatus: (id: string, status: "ACTIVE" | "DRAFT") => Promise<{ success: boolean; error?: string }>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useProductStore = create<ProductState>()(
  devtools(
    (set) => ({
      // Initial state
      products: [],
      currentProduct: null,
      relatedProducts: [],
      loading: false,
      error: null,
      totalItems: 0,
      totalPages: 1,
      currentPage: 1,

      // Fetch products with filters and pagination
      fetchProducts: async (
        params?: {
          page?: number;
          limit?: number;
          sortBy?: string;
          order?: "ASC" | "DESC";
          categoryId?: number;
          search?: string;
          minPrice?: number;
          maxPrice?: number;
          status?: "ACTIVE" | "DRAFT";
        },
        options?: { adminCatalog?: boolean },
      ) => {
        set({ loading: true, error: null });
        try {
          const response = options?.adminCatalog
            ? await productsApi.getAdminInventory(params)
            : await productsApi.getAll(params);
          set({
            products: response.data || [],
            totalItems: response.totalItems || 0,
            totalPages: response.totalPages || 1,
            currentPage: response.currentPage || 1,
            loading: false,
          });
        } catch (err) {
          console.error("Error fetching products:", err);
          const error = err as ApiError;
          set({ error: error.message || "Failed to fetch products", loading: false });
        }
      },

      // Fetch single product by ID
      fetchProductById: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const product = await productsApi.getById(id);
          set({ currentProduct: product, loading: false });
        } catch (err) {
          console.error("Error fetching product:", err);
          const error = err as ApiError;
          set({ error: error.message || "Failed to fetch product", loading: false });
        }
      },

      // Fetch related products by category
      fetchRelatedProducts: async (categoryId: number, excludeId: string) => {
        try {
          const response = await productsApi.getAll({ categoryId, limit: 4 });
          const filtered = (response.data || []).filter((p) => p.productId !== excludeId);
          set({ relatedProducts: filtered.slice(0, 4) });
        } catch (err) {
          console.error("Error fetching related products:", err);
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
          toast.success("Product created");
          return { success: true, data: newProduct };
        } catch (err) {
          console.error("Error creating product:", err);
          const errorMessage = messageFromApiErr(err, "Failed to create product");
          set({ error: errorMessage });
          toast.error(errorMessage);
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
          toast.success("Product updated");
          return { success: true, data: updatedProduct };
        } catch (err) {
          console.error("Error updating product:", err);
          const errorMessage = messageFromApiErr(err, "Failed to update product");
          set({ error: errorMessage });
          toast.error(errorMessage);
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
          toast.success("Product deleted");
          return { success: true };
        } catch (err) {
          console.error("Error deleting product:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to delete product";
          set({ error: errorMessage });
          toast.error("Could not delete product");
          return { success: false, error: errorMessage };
        }
      },

      deleteProducts: async (ids: string[]) => {
        if (ids.length === 0) return { success: true };
        try {
          await Promise.all(ids.map((id) => productsApi.delete(id)));
          set((state) => ({
            products: state.products.filter((p) => !ids.includes(p.productId)),
            error: null,
          }));
          toast.success(ids.length === 1 ? "Product deleted" : `Deleted ${ids.length} products`);
          return { success: true };
        } catch (err) {
          console.error("Error bulk deleting products:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to delete products";
          set({ error: errorMessage });
          toast.error("Could not delete selected products");
          return { success: false, error: errorMessage };
        }
      },

      updateProductStatus: async (id, status) => {
        try {
          const fd = new FormData();
          fd.append("status", status);
          const updatedProduct = await productsApi.update(id, fd);
          set((state) => ({
            products: state.products.map((prod) => (prod.productId === id ? updatedProduct : prod)),
            error: null,
          }));
          toast.success(status === "ACTIVE" ? "Product is now active" : "Product marked as draft");
          return { success: true };
        } catch (err) {
          console.error("Error updating product status:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to update status";
          set({ error: errorMessage });
          toast.error("Could not update product status");
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
