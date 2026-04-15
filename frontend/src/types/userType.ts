// User Types (from existing types/index.ts)
export interface User {
  clerkId: string;
  username: string;
  email: string;
  imageUrl?: string;
  /** Optional; may sync from Clerk when user adds a phone there. Per-delivery numbers live on `user_addresses`. */
  phone?: string;
  /** Set on admin user list: phone from default/first saved address when profile phone is empty. */
  defaultAddressPhone?: string | null;
  /** Set on admin user list: one-line summary from default (else first) saved address. */
  addressSummary?: string | null;
  tier?: "bronze" | "silver" | "gold";
  role: "user" | "admin";
  createdAt?: string;
  updatedAt?: string;
}

export interface UserFormData {
  username: string;
  email: string;
  phone?: string;
}
