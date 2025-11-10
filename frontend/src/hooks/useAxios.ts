"use client";

import { useAuth } from "@clerk/nextjs";
import axiosInstance from "../lib/axios";
import { useCallback } from "react";

export const useAxios = () => {
  const { getToken } = useAuth();

  const request = useCallback(
    async (config: {
      method: "get" | "post" | "put" | "delete";
      url: string;
      data?: unknown;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
    }) => {
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication required");
      }

      const { method, url, data, params, headers = {} } = config;

      return axiosInstance({
        method,
        url,
        data,
        params,
        headers: {
          Authorization: `Bearer ${token}`,
          ...headers,
        },
      });
    },
    [getToken]
  );

  const get = useCallback(
    (url: string, params?: Record<string, unknown>) => {
      return request({ method: "get", url, params });
    },
    [request]
  );

  const post = useCallback(
    (url: string, data?: unknown, headers?: Record<string, string>) => {
      return request({ method: "post", url, data, headers });
    },
    [request]
  );

  const put = useCallback(
    (url: string, data?: unknown, headers?: Record<string, string>) => {
      return request({ method: "put", url, data, headers });
    },
    [request]
  );

  const del = useCallback(
    (url: string) => {
      return request({ method: "delete", url });
    },
    [request]
  );

  return {
    get,
    post,
    put,
    delete: del,
    request,
  };
};
