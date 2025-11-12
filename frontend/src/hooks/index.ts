// Authentication hooks
export { useAuth } from "./useAuth";

// Note: useCategories and useProducts have been migrated to Zustand stores
// Use useCategoryStore and useProductStore from '../stores' instead
// useAxios has been removed - use axiosInstance directly with AxiosInterceptorSetup for automatic token injection
