// Products API Service
import axiosInstance from '../lib/axios';
import type { Product, PaginatedResponse, ApiResponse } from '../types';
import { API_ENDPOINTS } from '../constants';

export const productsApi = {
  /**
   * Get all products with pagination and filters
   */
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
    order?: 'ASC' | 'DESC';
  }): Promise<PaginatedResponse<Product>> => {
    try {
      const { data } = await axiosInstance.get<PaginatedResponse<Product>>(
        API_ENDPOINTS.PRODUCTS,
        { params }
      );
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  /**
   * Get product by ID
   */
  getById: async (id: string): Promise<Product> => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<Product>>(API_ENDPOINTS.PRODUCT_BY_ID(id));
      return data.product!;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create new product
   */
  create: async (productData: FormData): Promise<Product> => {
    try {
      const { data } = await axiosInstance.post<ApiResponse<Product>>(
        API_ENDPOINTS.PRODUCTS,
        productData
      );
      return data.newProduct!;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  /**
   * Update product
   */
  update: async (id: string, productData: FormData): Promise<Product> => {
    try {
      const { data } = await axiosInstance.put<ApiResponse<Product>>(
        API_ENDPOINTS.PRODUCT_BY_ID(id),
        productData
      );
      return data.product!;
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete product
   */
  delete: async (id: string): Promise<void> => {
    try {
      await axiosInstance.delete(API_ENDPOINTS.PRODUCT_BY_ID(id));
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  },
};
