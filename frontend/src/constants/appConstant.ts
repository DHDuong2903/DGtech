// App Constants
export const APP_NAME = 'DGTech';

export const APP_DESCRIPTION = 'Cửa Hàng Công Nghệ Uy Tín';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_PAGE = 1;

// Upload
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Routes
export const ROUTES = {
  HOME: '/',
  SHOP: '/shop',
  ADMIN: '/admin',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_PRODUCTS: '/admin/products',
} as const;

// Roles
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  USER: 'user-storage',
  CART: 'cart-storage',
} as const;
