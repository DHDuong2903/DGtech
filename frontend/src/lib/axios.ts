import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor để thêm token vào headers
axiosInstance.interceptors.request.use(
  (config) => {
    // Token sẽ được lấy từ Clerk
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor để xử lý lỗi
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Xử lý khi unauthorized
      console.log("Unauthorized access");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
