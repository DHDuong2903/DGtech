import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Request interceptor để tự động set Content-Type phù hợp
axiosInstance.interceptors.request.use(
  (config) => {
    // Nếu data là FormData thì không set Content-Type (để browser tự động set với boundary)
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    // Token sẽ được thêm từ useAxios hook
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
