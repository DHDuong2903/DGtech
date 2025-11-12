// API Endpoints
export const API_ENDPOINTS = {
  // Categories
  CATEGORIES: "/categories",
  CATEGORIES_ACTIVE: "/categories/active",
  CATEGORY_TOGGLE_HOMEPAGE: (id: number) => `/categories/${id}/toggle-homepage`,
  CATEGORY_BY_ID: (id: number) => `/categories/${id}`,

  // Products
  PRODUCTS: "/products",
  PRODUCTS_FEATURED: "/products/featured",
  PRODUCTS_ON_SALE: "/products/on-sale",
  PRODUCT_BY_ID: (id: string) => `/products/${id}`,
  PRODUCT_TOGGLE_FEATURED: (id: string) => `/products/${id}/toggle-featured`,
  PRODUCT_TOGGLE_ON_SALE: (id: string) => `/products/${id}/toggle-on-sale`,

  // Users
  USERS: "/users",
  USER_BY_CLERK_ID: (clerkId: string) => `/users/${clerkId}`,

  // Reviews
  REVIEWS: "/reviews",
  REVIEWS_BY_PRODUCT: (productId: string) => `/reviews/product/${productId}`,
  REVIEW_BY_ID: (id: number) => `/reviews/${id}`,

  // Webhooks
  WEBHOOKS: "/webhooks",
} as const;

// API Base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
