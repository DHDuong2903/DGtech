// Export all types
export * from './categoryType';
export * from './productType';
export * from './userType';
export * from './reviewType';

// API Response Types
export interface ApiResponse<T> {
  message: string;
  user?: T;
  data?: T;
  categories?: T;
  category?: T;
  newCategory?: T;
  products?: T;
  product?: T;
  newProduct?: T;
  reviews?: T;
  review?: T;
}

// Paginated Response
export interface PaginatedResponse<T> {
  message: string;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  data: T[];
}

// Error Response
export interface ApiError {
  message: string;
  error?: string;
  details?: string;
}
