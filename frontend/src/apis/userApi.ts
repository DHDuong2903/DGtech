// Users API Service
import axiosInstance from '../lib/axios';
import type { User, ApiResponse } from '../types';
import { API_ENDPOINTS } from '../constants';

export const usersApi = {
  /**
   * Get user by Clerk ID
   */
  getByClerkId: async (clerkId: string): Promise<User> => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<User>>(
        API_ENDPOINTS.USER_BY_CLERK_ID(clerkId)
      );
      return data.user!;
    } catch (error) {
      console.error(`Error fetching user ${clerkId}:`, error);
      throw error;
    }
  },

  /**
   * Create or update user (used by webhook)
   */
  createOrUpdate: async (userData: Partial<User>): Promise<User> => {
    try {
      const { data } = await axiosInstance.post<ApiResponse<User>>(
        API_ENDPOINTS.USERS,
        userData
      );
      return data.user!;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  },
};
