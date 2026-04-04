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
  deleteCategories: (ids: number[]) => Promise<{ success: boolean; error?: string }>;
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
          set({ error: error.message || "Could not load categories", loading: false });
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
          toast.success("Category created");
          return { success: true, data: newCategory };
        } catch (err) {
          console.error("Error creating category:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to create category";
          set({ error: errorMessage });
          toast.error("Could not create category");
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
          toast.success("Category updated");
          return { success: true, data: updatedCategory };
        } catch (err) {
          console.error("Error updating category:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to update category";
          set({ error: errorMessage });
          toast.error("Could not update category");
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
          toast.success("Category deleted");
          return { success: true };
        } catch (err) {
          console.error("Error deleting category:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to delete category";
          set({ error: errorMessage });
          toast.error("Could not delete category");
          return { success: false, error: errorMessage };
        }
      },

      deleteCategories: async (ids: number[]) => {
        if (ids.length === 0) return { success: true };
        try {
          await Promise.all(ids.map((id) => categoriesApi.delete(id)));
          set((state) => ({
            categories: state.categories.filter((cat) => !ids.includes(cat.categoryId)),
            error: null,
          }));
          toast.success(
            ids.length === 1 ? "Category deleted" : `Deleted ${ids.length} categories`
          );
          return { success: true };
        } catch (err) {
          console.error("Error bulk deleting categories:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to delete categories";
          set({ error: errorMessage });
          toast.error("Could not delete selected categories");
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
