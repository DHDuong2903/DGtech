// Review Types
export interface Review {
  reviewId: number;
  clerkId: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewFormData {
  productId: string;
  rating: number;
  comment: string;
}
