// Reviews API Service
import axiosInstance from '../lib/axios';
import type { Review, ApiResponse } from '../types';
import { API_ENDPOINTS } from '../constants';

export const reviewsApi = {
  /**
   * Get reviews by product ID
   */
  getByProductId: async (productId: string): Promise<Review[]> => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<Review[]>>(
        API_ENDPOINTS.REVIEWS_BY_PRODUCT(productId)
      );
      return data.reviews || [];
    } catch (error) {
      console.error(`Error fetching reviews for product ${productId}:`, error);
      throw error;
    }
  },

  /**
   * Create new review
   */
  create: async (reviewData: { productId: string; rating: number; comment: string }): Promise<Review> => {
    try {
      const { data } = await axiosInstance.post<ApiResponse<Review>>(
        API_ENDPOINTS.REVIEWS,
        reviewData
      );
      return data.review!;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  },

  /**
   * Update review
   */
  update: async (id: number, reviewData: { rating: number; comment: string }): Promise<Review> => {
    try {
      const { data } = await axiosInstance.put<ApiResponse<Review>>(
        API_ENDPOINTS.REVIEW_BY_ID(id),
        reviewData
      );
      return data.review!;
    } catch (error) {
      console.error(`Error updating review ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete review
   */
  delete: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(API_ENDPOINTS.REVIEW_BY_ID(id));
    } catch (error) {
      console.error(`Error deleting review ${id}:`, error);
      throw error;
    }
  },
};
