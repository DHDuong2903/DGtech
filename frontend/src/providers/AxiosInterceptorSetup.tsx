"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import axiosInstance, { applyBearerToAxiosConfig } from "../lib/axios";
import {
  getClerkTokenForApi,
  registerClerkGetToken,
  unregisterClerkGetToken,
} from "../lib/clerk-auth-bridge";

/**
 * Registers Clerk getToken for axios + attaches Bearer on each request.
 * 401 responses are retried once in axios.ts with getToken({ skipCache: true }).
 */
export const AxiosInterceptorSetup = ({ children }: { children: React.ReactNode }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    registerClerkGetToken((opts) => getToken(opts));

    const requestInterceptor = axiosInstance.interceptors.request.use(
      async (config) => {
        try {
          const token = await getClerkTokenForApi();
          if (token) {
            applyBearerToAxiosConfig(config, token);
          }
        } catch (error) {
          console.error("Error getting token:", error);
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    return () => {
      axiosInstance.interceptors.request.eject(requestInterceptor);
      unregisterClerkGetToken();
    };
  }, [getToken]);

  return <>{children}</>;
};
