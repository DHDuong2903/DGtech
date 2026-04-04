// Categories API Service
import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import type { Category } from "../types";

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    try {
      const response = await axiosInstance.get<{ message: string; categories: Category[] }>(API_ROUTE.CATEGORIES);
      return response.data.categories || [];
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  },

  getById: async (id: number): Promise<Category> => {
    try {
      const response = await axiosInstance.get<{ message: string; category: Category }>(`${API_ROUTE.CATEGORIES}/${id}`);
      return response.data.category;
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      throw error;
    }
  },

  create: async (categoryData: { name: string; description: string }): Promise<Category> => {
    try {
      const response = await axiosInstance.post<{ message: string; newCategory: Category }>(
        API_ROUTE.CATEGORIES,
        categoryData
      );
      return response.data.newCategory;
    } catch (error) {
      console.error("Error creating category:", error);
      throw error;
    }
  },

  update: async (id: number, categoryData: { name: string; description: string }): Promise<Category> => {
    try {
      const response = await axiosInstance.put<{ message: string; category: Category }>(
        `${API_ROUTE.CATEGORIES}/${id}`,
        categoryData
      );
      return response.data.category;
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`${API_ROUTE.CATEGORIES}/${id}`);
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  },
};
