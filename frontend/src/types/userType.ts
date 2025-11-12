// User Types (from existing types/index.ts)
export interface User {
  clerkId: string;
  username: string;
  email: string;
  phone?: string;
  role: "user" | "admin";
  createdAt?: string;
  updatedAt?: string;
}

export interface UserFormData {
  username: string;
  email: string;
  phone?: string;
}
