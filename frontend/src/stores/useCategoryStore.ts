// Zustand store for Categories
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Category, CategoryFormData, ApiError } from "../types";
import { categoriesApi } from "../apis";
import { toast } from "sonner";

interface CategoryState {
  // State
  categories: Category[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchCategories: () => Promise<void>;
  createCategory: (data: CategoryFormData) => Promise<{ success: boolean; data?: Category; error?: string }>;
  updateCategory: (
    id: number,
    data: CategoryFormData
  ) => Promise<{ success: boolean; data?: Category; error?: string }>;
  deleteCategory: (id: number) => Promise<{ success: boolean; error?: string }>;
  toggleHomepage: (id: number, isActive: boolean) => Promise<{ success: boolean; data?: Category; error?: string }>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useCategoryStore = create<CategoryState>()(
  devtools(
    (set) => ({
      // Initial state
      categories: [],
      loading: false,
      error: null,

      // Fetch all categories
      fetchCategories: async () => {
        set({ loading: true, error: null });
        try {
          const categories = await categoriesApi.getAll();
          set({ categories, loading: false });
        } catch (err) {
          console.error("Error fetching categories:", err);
          const error = err as ApiError;
          set({ error: error.message || "Failed to fetch categories", loading: false });
        }
      },

      // Create category
      createCategory: async (data: CategoryFormData) => {
        try {
          const newCategory = await categoriesApi.create(data);
          set((state) => ({
            categories: [...state.categories, newCategory],
            error: null,
          }));
          toast.success("Danh mục đã được tạo mới thành công");
          return { success: true, data: newCategory };
        } catch (err) {
          console.error("Error creating category:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to create category";
          set({ error: errorMessage });
          toast.error("Không thể tạo danh mục. Vui lòng thử lại");
          return { success: false, error: errorMessage };
        }
      },

      // Update category
      updateCategory: async (id: number, data: CategoryFormData) => {
        try {
          const updatedCategory = await categoriesApi.update(id, data);
          set((state) => ({
            categories: state.categories.map((cat) => (cat.categoryId === id ? updatedCategory : cat)),
            error: null,
          }));
          toast.success("Danh mục đã được cập nhật thành công");
          return { success: true, data: updatedCategory };
        } catch (err) {
          console.error("Error updating category:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to update category";
          set({ error: errorMessage });
          toast.error("Không thể cập nhật danh mục. Vui lòng thử lại");
          return { success: false, error: errorMessage };
        }
      },

      // Delete category
      deleteCategory: async (id: number) => {
        try {
          await categoriesApi.delete(id);
          set((state) => ({
            categories: state.categories.filter((cat) => cat.categoryId !== id),
            error: null,
          }));
          toast.success("Danh mục đã được xóa thành công");
          return { success: true };
        } catch (err) {
          console.error("Error deleting category:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to delete category";
          set({ error: errorMessage });
          toast.error("Không thể xóa danh mục. Vui lòng thử lại");
          return { success: false, error: errorMessage };
        }
      },

      // Toggle homepage status
      toggleHomepage: async (id: number, isActive: boolean) => {
        try {
          // Check if trying to activate and already have 4 active categories
          const state = useCategoryStore.getState();
          const activeCount = state.categories.filter((cat) => cat.isActiveOnHomepage).length;

          if (isActive && activeCount >= 4) {
            toast.error("Chỉ được hiển thị tối đa 4 danh mục trên trang chủ");
            return { success: false, error: "Maximum 4 active categories allowed" };
          }

          const updatedCategory = await categoriesApi.toggleHomepage(id, isActive);
          set((state) => ({
            categories: state.categories.map((cat) =>
              cat.categoryId === id ? { ...cat, isActiveOnHomepage: isActive } : cat
            ),
            error: null,
          }));
          toast.success(isActive ? "Danh mục đã được hiển thị trên trang chủ" : "Danh mục đã được ẩn khỏi trang chủ");
          return { success: true, data: updatedCategory };
        } catch (err) {
          console.error("Error toggling homepage:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to toggle homepage status";
          set({ error: errorMessage });
          toast.error("Không thể cập nhật trạng thái hiển thị. Vui lòng thử lại");
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
    { name: "CategoryStore" }
  )
);
