// Categories API Service
import axiosInstance from "../lib/axios";
import type { Category } from "../types";
import { API_ENDPOINTS } from "../constants";

export const categoriesApi = {
  /**
   * Get all categories
   */
  getAll: async (): Promise<Category[]> => {
    try {
      const response = await axiosInstance.get<{ message: string; categories: Category[] }>(API_ENDPOINTS.CATEGORIES);
      return response.data.categories || [];
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  },

  /**
   * Get active categories for homepage
   */
  getActive: async (): Promise<Category[]> => {
    try {
      const response = await axiosInstance.get<{ message: string; categories: Category[] }>(
        API_ENDPOINTS.CATEGORIES_ACTIVE
      );
      return response.data.categories || [];
    } catch (error) {
      console.error("Error fetching active categories:", error);
      throw error;
    }
  },

  /**
   * Get category by ID
   */
  getById: async (id: number): Promise<Category> => {
    try {
      const response = await axiosInstance.get<{ message: string; category: Category }>(
        API_ENDPOINTS.CATEGORY_BY_ID(id)
      );
      return response.data.category;
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create new category
   */
  create: async (categoryData: { name: string; description: string }): Promise<Category> => {
    try {
      const response = await axiosInstance.post<{ message: string; newCategory: Category }>(
        API_ENDPOINTS.CATEGORIES,
        categoryData
      );
      return response.data.newCategory;
    } catch (error) {
      console.error("Error creating category:", error);
      throw error;
    }
  },

  /**
   * Update category
   */
  update: async (id: number, categoryData: { name: string; description: string }): Promise<Category> => {
    try {
      const response = await axiosInstance.put<{ message: string; category: Category }>(
        API_ENDPOINTS.CATEGORY_BY_ID(id),
        categoryData
      );
      return response.data.category;
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete category
   */
  delete: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(API_ENDPOINTS.CATEGORY_BY_ID(id));
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  },

  /**
   * Toggle category on homepage
   */
  toggleHomepage: async (id: number, isActive: boolean): Promise<Category> => {
    try {
      const response = await axiosInstance.patch<{ message: string; category: Category }>(
        API_ENDPOINTS.CATEGORY_TOGGLE_HOMEPAGE(id),
        { isActive }
      );
      // Backend returns { message, category }
      return response.data.category;
    } catch (error) {
      console.error(`Error toggling homepage for category ${id}:`, error);
      throw error;
    }
  },
};
