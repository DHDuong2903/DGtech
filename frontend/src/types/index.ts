// Types cho User
export interface User {
  clerkId: string;
  username: string;
  email: string;
  phone?: string;
  role: "user" | "admin";
  createdAt?: string;
  updatedAt?: string;
}

// Types cho API Response
export interface ApiResponse<T> {
  message: string;
  user?: T;
  data?: T;
}

// Types cho Error Response
export interface ApiError {
  message: string;
  error?: string;
}
