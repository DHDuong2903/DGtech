// Users API Service
import axiosInstance from "../lib/axios";
import type { User, ApiResponse } from "../types";

const USERS_URL = "/users";

export const usersApi = {
  getByClerkId: async (clerkId: string): Promise<User> => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<User>>(`${USERS_URL}/${clerkId}`);
      return data.user!;
    } catch (error) {
      console.error(`Error fetching user ${clerkId}:`, error);
      throw error;
    }
  },

  createOrUpdate: async (userData: Partial<User>): Promise<User> => {
    try {
      const { data } = await axiosInstance.post<ApiResponse<User>>(USERS_URL, userData);
      return data.user!;
    } catch (error) {
      console.error("Error creating/updating user:", error);
      throw error;
    }
  },

  getAllUsers: async (): Promise<{ users: User[]; total: number }> => {
    try {
      const { data } = await axiosInstance.get(USERS_URL);
      return data;
    } catch (error) {
      console.error("Error fetching all users:", error);
      throw error;
    }
  },

  updateUserRole: async (clerkId: string, role: "user" | "admin"): Promise<User> => {
    try {
      const { data } = await axiosInstance.put<ApiResponse<User>>(`${USERS_URL}/${clerkId}/role`, { role });
      return data.user!;
    } catch (error) {
      console.error(`Error updating user role ${clerkId}:`, error);
      throw error;
    }
  },

  deleteUser: async (clerkId: string): Promise<void> => {
    try {
      await axiosInstance.delete(`${USERS_URL}/${clerkId}`);
    } catch (error) {
      console.error(`Error deleting user ${clerkId}:`, error);
      throw error;
    }
  },
};
