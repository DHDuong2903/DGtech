"use client";

import { useEffect, useState } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/nextjs";
import { useUserStore } from "../stores/useUserStore";
import axiosInstance from "../lib/axios";

export const useAuth = () => {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const { user, setUser, setLoading, setError, clearUser, isAdmin } = useUserStore();
  const [mounted, setMounted] = useState(false);

  // Đợi component mount trên client để tránh hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!isLoaded) return;

      if (!isSignedIn || !clerkUser) {
        clearUser();
        return;
      }

      // Nếu đã có user trong store và clerkId khớp, không cần fetch lại
      if (user && user.clerkId === clerkUser.id) {
        return;
      }

      try {
        setLoading(true);
        
        // Lấy token từ Clerk
        const token = await getToken();
        
        if (!token) {
          throw new Error("No token available");
        }
        
        // Gọi API getMe với Bearer token
        const response = await axiosInstance.get("/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || "Failed to fetch user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [isLoaded, isSignedIn, clerkUser, user, setUser, setLoading, setError, clearUser, getToken]);

  return {
    user,
    isAdmin: mounted ? isAdmin() : false, // Trả về false cho đến khi mounted
    isLoading: !isLoaded || !mounted,
  };
};
