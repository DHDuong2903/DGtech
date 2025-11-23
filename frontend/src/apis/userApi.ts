// Users API Service
import axiosInstance from "../lib/axios";
import type { User, ApiResponse } from "../types";
import { API_ENDPOINTS } from "../constants";

export const usersApi = {
  /**
   * Get user by Clerk ID
   */
  getByClerkId: async (clerkId: string): Promise<User> => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<User>>(API_ENDPOINTS.USER_BY_CLERK_ID(clerkId));
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
      const { data } = await axiosInstance.post<ApiResponse<User>>(API_ENDPOINTS.USERS, userData);
      return data.user!;
    } catch (error) {
      console.error("Error creating/updating user:", error);
      throw error;
    }
  },

  /**
   * Get all users (Admin only)
   */
  getAllUsers: async (): Promise<{ users: User[]; total: number }> => {
    try {
      const { data } = await axiosInstance.get(API_ENDPOINTS.USERS);
      return data;
    } catch (error) {
      console.error("Error fetching all users:", error);
      throw error;
    }
  },

  /**
   * Update user role (Admin only)
   */
  updateUserRole: async (clerkId: string, role: "user" | "admin"): Promise<User> => {
    try {
      const { data } = await axiosInstance.put<ApiResponse<User>>(`${API_ENDPOINTS.USERS}/${clerkId}/role`, { role });
      return data.user!;
    } catch (error) {
      console.error(`Error updating user role ${clerkId}:`, error);
      throw error;
    }
  },

  /**
   * Delete user (Admin only)
   */
  deleteUser: async (clerkId: string): Promise<void> => {
    try {
      await axiosInstance.delete(`${API_ENDPOINTS.USERS}/${clerkId}`);
    } catch (error) {
      console.error(`Error deleting user ${clerkId}:`, error);
      throw error;
    }
  },
};
