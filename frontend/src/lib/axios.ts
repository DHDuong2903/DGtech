import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { getClerkTokenForApi } from "./clerk-auth-bridge";

// Use environment variable for API URL (required for separate services)
const getBaseURL = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

type RequestWithClerkRetry = InternalAxiosRequestConfig & { _clerk401Retried?: boolean };

/** Set Authorization on axios config (AxiosHeaders or plain object). */
export function applyBearerToAxiosConfig(config: InternalAxiosRequestConfig, token: string) {
  const h = config.headers;
  if (!h) {
    config.headers = new AxiosHeaders({ Authorization: `Bearer ${token}` });
    return;
  }
  if (h instanceof AxiosHeaders) {
    h.set("Authorization", `Bearer ${token}`);
  } else {
    (h as Record<string, string>).Authorization = `Bearer ${token}`;
  }
}

// Request interceptor để tự động set Content-Type phù hợp
axiosInstance.interceptors.request.use(
  (config) => {
    // Nếu data là FormData thì không set Content-Type (để browser tự động set với boundary)
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response: on 401, lấy JWT mới từ Clerk (skipCache) và thử lại đúng 1 lần
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RequestWithClerkRetry | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._clerk401Retried
    ) {
      const fresh = await getClerkTokenForApi({ skipCache: true });
      if (fresh) {
        originalRequest._clerk401Retried = true;
        applyBearerToAxiosConfig(originalRequest, fresh);
        return axiosInstance.request(originalRequest);
      }
    }

    if (error.response?.status === 401) {
      console.error("Unauthorized access - Please login");
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
