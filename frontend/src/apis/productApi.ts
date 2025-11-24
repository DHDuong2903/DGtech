// Products API Service
import axiosInstance from "../lib/axios";
import type { Product, PaginatedResponse, ApiResponse } from "../types";

const PRODUCTS_URL = "/products";

export const productsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    minStock?: number;
    maxStock?: number;
    sortBy?: string;
    order?: "ASC" | "DESC";
  }): Promise<PaginatedResponse<Product>> => {
    try {
      const { data } = await axiosInstance.get<PaginatedResponse<Product>>(PRODUCTS_URL, { params });
      return data;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  },

  getById: async (id: string): Promise<Product> => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<Product>>(`${PRODUCTS_URL}/${id}`);
      return data.product!;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  },

  create: async (productData: FormData): Promise<Product> => {
    try {
      const { data } = await axiosInstance.post<ApiResponse<Product>>(PRODUCTS_URL, productData);
      return data.newProduct!;
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  },

  update: async (id: string, productData: FormData): Promise<Product> => {
    try {
      const { data } = await axiosInstance.put<ApiResponse<Product>>(`${PRODUCTS_URL}/${id}`, productData);
      return data.product!;
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await axiosInstance.delete(`${PRODUCTS_URL}/${id}`);
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  },

  toggleFeatured: async (id: string, isFeatured: boolean): Promise<Product> => {
    try {
      const { data } = await axiosInstance.patch<ApiResponse<Product>>(`${PRODUCTS_URL}/${id}/toggle-featured`, {
        isFeatured,
      });
      return data.product!;
    } catch (error) {
      console.error(`Error toggling featured for product ${id}:`, error);
      throw error;
    }
  },

  toggleOnSale: async (id: string, isOnSale: boolean): Promise<Product> => {
    try {
      const { data } = await axiosInstance.patch<ApiResponse<Product>>(`${PRODUCTS_URL}/${id}/toggle-on-sale`, {
        isOnSale,
      });
      return data.product!;
    } catch (error) {
      console.error(`Error toggling on sale for product ${id}:`, error);
      throw error;
    }
  },

  getFeatured: async (limit: number = 8): Promise<Product[]> => {
    try {
      const { data } = await axiosInstance.get<{ message: string; products: Product[] }>(`${PRODUCTS_URL}/featured`, {
        params: { limit },
      });
      return data.products || [];
    } catch (error) {
      console.error("Error fetching featured products:", error);
      throw error;
    }
  },

  getOnSale: async (limit: number = 8): Promise<Product[]> => {
    try {
      const { data } = await axiosInstance.get<{ message: string; products: Product[] }>(`${PRODUCTS_URL}/on-sale`, {
        params: { limit },
      });
      return data.products || [];
    } catch (error) {
      console.error("Error fetching on sale products:", error);
      throw error;
    }
  },
};
