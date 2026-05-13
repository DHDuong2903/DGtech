// Users API Service
import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import type { User, ApiResponse, UserRank, RankSettings } from "../types";

export const usersApi = {
  getByClerkId: async (clerkId: string): Promise<User> => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<User>>(`${API_ROUTE.USERS}/${clerkId}`);
      return data.user!;
    } catch (error) {
      console.error(`Error fetching user ${clerkId}:`, error);
      throw error;
    }
  },

  createOrUpdate: async (userData: Partial<User>): Promise<User> => {
    try {
      const { data } = await axiosInstance.post<ApiResponse<User>>(API_ROUTE.USERS, userData);
      return data.user!;
    } catch (error) {
      console.error("Error creating/updating user:", error);
      throw error;
    }
  },

  getAllUsers: async (): Promise<{ users: User[]; total: number }> => {
    try {
      const { data } = await axiosInstance.get(API_ROUTE.USERS);
      return data;
    } catch (error) {
      console.error("Error fetching all users:", error);
      throw error;
    }
  },

  getMyRank: async (): Promise<UserRank> => {
    try {
      const { data } = await axiosInstance.get<{ message: string; rank: UserRank }>(`${API_ROUTE.USERS}/me/rank`);
      return data.rank;
    } catch (error) {
      console.error("Error fetching my rank:", error);
      throw error;
    }
  },

  adminGetRankConfig: async (): Promise<{ settings: RankSettings }> => {
    try {
      const { data } = await axiosInstance.get<{ settings: RankSettings }>(`${API_ROUTE.USERS}/admin/rank-config`);
      return data;
    } catch (error) {
      console.error("Error fetching rank settings:", error);
      throw error;
    }
  },

  adminPutRankConfig: async (payload: { settings: RankSettings }): Promise<{ settings: RankSettings }> => {
    try {
      const { data } = await axiosInstance.put<{ settings: RankSettings }>(
        `${API_ROUTE.USERS}/admin/rank-config`,
        payload,
      );
      return data;
    } catch (error) {
      console.error("Error updating rank settings:", error);
      throw error;
    }
  },

  updateUserRole: async (clerkId: string, role: "user" | "admin"): Promise<User> => {
    try {
      const { data } = await axiosInstance.put<ApiResponse<User>>(`${API_ROUTE.USERS}/${clerkId}/role`, { role });
      return data.user!;
    } catch (error) {
      console.error(`Error updating user role ${clerkId}:`, error);
      throw error;
    }
  },

  deleteUser: async (clerkId: string): Promise<void> => {
    try {
      await axiosInstance.delete(`${API_ROUTE.USERS}/${clerkId}`);
    } catch (error) {
      console.error(`Error deleting user ${clerkId}:`, error);
      throw error;
    }
  },
};
