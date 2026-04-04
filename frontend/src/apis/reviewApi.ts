// Reviews API Service
import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import type { Review, ApiResponse } from "../types";

export const reviewsApi = {
  getByProductId: async (productId: string): Promise<Review[]> => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<Review[]>>(`${API_ROUTE.REVIEWS}/product/${productId}`);
      return data.reviews || [];
    } catch (error) {
      console.error(`Error fetching reviews for product ${productId}:`, error);
      throw error;
    }
  },

  create: async (reviewData: { productId: string; rating: number; comment: string }): Promise<Review> => {
    try {
      const { data } = await axiosInstance.post<ApiResponse<Review>>(API_ROUTE.REVIEWS, reviewData);
      return data.review!;
    } catch (error) {
      console.error("Error creating review:", error);
      throw error;
    }
  },

  update: async (id: number, reviewData: { rating: number; comment: string }): Promise<Review> => {
    try {
      const { data } = await axiosInstance.put<ApiResponse<Review>>(`${API_ROUTE.REVIEWS}/${id}`, reviewData);
      return data.review!;
    } catch (error) {
      console.error(`Error updating review ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`${API_ROUTE.REVIEWS}/${id}`);
    } catch (error) {
      console.error(`Error deleting review ${id}:`, error);
      throw error;
    }
  },
};
