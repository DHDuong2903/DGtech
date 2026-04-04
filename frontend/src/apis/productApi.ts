// Products API Service
import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import type { Product, PaginatedResponse, ApiResponse } from "../types";

export type ProductListParams = {
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
  /** Admin inventory only: filter by status */
  status?: "ACTIVE" | "DRAFT";
};

export const productsApi = {
  getAll: async (params?: ProductListParams): Promise<PaginatedResponse<Product>> => {
    try {
      const { data } = await axiosInstance.get<PaginatedResponse<Product>>(API_ROUTE.PRODUCTS, { params });
      return data;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  },

  /** Admin: all products (draft + active). Requires auth + admin role. */
  getAdminInventory: async (params?: ProductListParams): Promise<PaginatedResponse<Product>> => {
    try {
      const { data } = await axiosInstance.get<PaginatedResponse<Product>>(
        `${API_ROUTE.PRODUCTS}/admin/inventory`,
        { params },
      );
      return data;
    } catch (error) {
      console.error("Error fetching admin inventory:", error);
      throw error;
    }
  },

  getById: async (id: string): Promise<Product> => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<Product>>(`${API_ROUTE.PRODUCTS}/${id}`);
      return data.product!;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  },

  create: async (productData: FormData): Promise<Product> => {
    try {
      const { data } = await axiosInstance.post<ApiResponse<Product>>(API_ROUTE.PRODUCTS, productData);
      return data.newProduct!;
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  },

  update: async (id: string, productData: FormData): Promise<Product> => {
    try {
      const { data } = await axiosInstance.put<ApiResponse<Product>>(`${API_ROUTE.PRODUCTS}/${id}`, productData);
      return data.product!;
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await axiosInstance.delete(`${API_ROUTE.PRODUCTS}/${id}`);
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  },

  getFeatured: async (limit: number = 8): Promise<Product[]> => {
    try {
      const { data } = await axiosInstance.get<{ message: string; products: Product[] }>(
        `${API_ROUTE.PRODUCTS}/featured`,
        {
          params: { limit },
        },
      );
      return data.products || [];
    } catch (error) {
      console.error("Error fetching featured products:", error);
      throw error;
    }
  },
};
