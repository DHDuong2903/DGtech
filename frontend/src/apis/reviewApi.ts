// Reviews API Service
import axiosInstance from "../lib/axios";
import type { Review, ApiResponse } from "../types";

const REVIEWS_URL = "/reviews";

export const reviewsApi = {
  getByProductId: async (productId: string): Promise<Review[]> => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<Review[]>>(`${REVIEWS_URL}/product/${productId}`);
      return data.reviews || [];
    } catch (error) {
      console.error(`Error fetching reviews for product ${productId}:`, error);
      throw error;
    }
  },

  create: async (reviewData: { productId: string; rating: number; comment: string }): Promise<Review> => {
    try {
      const { data } = await axiosInstance.post<ApiResponse<Review>>(REVIEWS_URL, reviewData);
      return data.review!;
    } catch (error) {
      console.error("Error creating review:", error);
      throw error;
    }
  },

  update: async (id: number, reviewData: { rating: number; comment: string }): Promise<Review> => {
    try {
      const { data } = await axiosInstance.put<ApiResponse<Review>>(`${REVIEWS_URL}/${id}`, reviewData);
      return data.review!;
    } catch (error) {
      console.error(`Error updating review ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`${REVIEWS_URL}/${id}`);
    } catch (error) {
      console.error(`Error deleting review ${id}:`, error);
      throw error;
    }
  },
};
