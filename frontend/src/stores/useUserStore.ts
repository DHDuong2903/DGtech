import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { User } from "../types";
import { usersApi } from "../apis/userApi";
import { toast } from "sonner";

interface UserStore {
  user: User | null;
  users: User[];
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  isAdmin: () => boolean;
  // Admin functions
  fetchAllUsers: () => Promise<void>;
  updateUserRole: (clerkId: string, role: "user" | "admin") => Promise<void>;
  deleteUser: (clerkId: string) => Promise<void>;
  updateUsersRole: (clerkIds: string[], role: "user" | "admin") => Promise<void>;
  deleteUsers: (clerkIds: string[]) => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        users: [],
        isLoading: false,
        loading: false,
        error: null,
        setUser: (user) => set({ user, error: null }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        clearUser: () => set({ user: null, error: null }),
        isAdmin: () => get().user?.role === "admin",

        // Fetch all users (Admin only)
        fetchAllUsers: async () => {
          set({ loading: true, error: null });
          try {
            const { users } = await usersApi.getAllUsers();
            set({ users, loading: false });
          } catch (error) {
            console.error("Error fetching users:", error);
            set({ error: "Không thể tải danh sách người dùng", loading: false });
            toast.error("Không thể tải danh sách người dùng");
          }
        },

        // Update user role (Admin only)
        updateUserRole: async (clerkId: string, role: "user" | "admin") => {
          try {
            const updatedUser = await usersApi.updateUserRole(clerkId, role);
            set((state) => ({
              users: state.users.map((u) => (u.clerkId === clerkId ? updatedUser : u)),
            }));
            toast.success("Cập nhật vai trò thành công");
          } catch (error) {
            console.error("Error updating user role:", error);
            toast.error("Không thể cập nhật vai trò");
            throw error;
          }
        },

        // Delete user (Admin only)
        deleteUser: async (clerkId: string) => {
          try {
            await usersApi.deleteUser(clerkId);
            set((state) => ({
              users: state.users.filter((u) => u.clerkId !== clerkId),
            }));
            toast.success("Xóa người dùng thành công");
          } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Không thể xóa người dùng");
            throw error;
          }
        },

        updateUsersRole: async (clerkIds: string[], role: "user" | "admin") => {
          if (clerkIds.length === 0) return;
          try {
            const updated = await Promise.all(clerkIds.map((id) => usersApi.updateUserRole(id, role)));
            set((state) => ({
              users: state.users.map((u) => {
                const next = updated.find((x) => x.clerkId === u.clerkId);
                return next ?? u;
              }),
            }));
            toast.success(`Đã cập nhật vai trò cho ${clerkIds.length} người dùng`);
          } catch (error) {
            console.error("Error bulk updating roles:", error);
            toast.error("Không thể cập nhật vai trò hàng loạt");
            throw error;
          }
        },

        deleteUsers: async (clerkIds: string[]) => {
          if (clerkIds.length === 0) return;
          try {
            await Promise.all(clerkIds.map((id) => usersApi.deleteUser(id)));
            set((state) => ({
              users: state.users.filter((u) => !clerkIds.includes(u.clerkId)),
            }));
            toast.success(`Đã xóa ${clerkIds.length} người dùng`);
          } catch (error) {
            console.error("Error bulk deleting users:", error);
            toast.error("Không thể xóa hàng loạt");
            throw error;
          }
        },
      }),
      {
        name: "user-storage",
        partialize: (state) => ({ user: state.user }), // Only persist current user
      }
    )
  )
);
