// API Endpoints
export const API_ENDPOINTS = {
  // Categories
  CATEGORIES: '/categories',
  CATEGORIES_ACTIVE: '/categories/active',
  CATEGORY_TOGGLE_HOMEPAGE: (id: number) => `/categories/${id}/toggle-homepage`,
  CATEGORY_BY_ID: (id: number) => `/categories/${id}`,

  // Products
  PRODUCTS: '/products',
  PRODUCT_BY_ID: (id: string) => `/products/${id}`,

  // Users
  USERS: '/users',
  USER_BY_CLERK_ID: (clerkId: string) => `/users/${clerkId}`,

  // Reviews
  REVIEWS: '/reviews',
  REVIEWS_BY_PRODUCT: (productId: string) => `/reviews/product/${productId}`,
  REVIEW_BY_ID: (id: number) => `/reviews/${id}`,

  // Webhooks
  WEBHOOKS: '/webhooks',
} as const;

// API Base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
