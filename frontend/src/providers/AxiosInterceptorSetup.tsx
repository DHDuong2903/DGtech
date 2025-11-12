"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import axiosInstance from "../lib/axios";

/**
 * Axios Interceptor Setup
 * Automatically adds Clerk auth token to all axios requests
 */
export const AxiosInterceptorSetup = ({ children }: { children: React.ReactNode }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    // Request interceptor to add token
    const requestInterceptor = axiosInstance.interceptors.request.use(
      async (config) => {
        try {
          const token = await getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error("Error getting token:", error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axiosInstance.interceptors.request.eject(requestInterceptor);
    };
  }, [getToken]);

  return <>{children}</>;
};
