// Zustand store for Reviews
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Review, ReviewFormData, ApiError } from "../types";
import { reviewsApi } from "../apis";
import { toast } from "sonner";

interface ReviewState {
  // State
  reviews: Review[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchReviewsByProductId: (productId: string) => Promise<void>;
  createReview: (data: ReviewFormData) => Promise<{ success: boolean; data?: Review; error?: string }>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useReviewStore = create<ReviewState>()(
  devtools(
    (set) => ({
      // Initial state
      reviews: [],
      loading: false,
      error: null,

      // Fetch reviews by product ID
      fetchReviewsByProductId: async (productId: string) => {
        set({ loading: true, error: null });
        try {
          const reviews = await reviewsApi.getByProductId(productId);
          set({ reviews, loading: false });
        } catch (err) {
          console.error("Error fetching reviews:", err);
          const error = err as ApiError;
          set({
            error: error.message || "Failed to fetch reviews",
            reviews: [],
            loading: false,
          });
        }
      },

      // Create review
      createReview: async (data: ReviewFormData) => {
        try {
          const newReview = await reviewsApi.create(data);
          set((state) => ({
            reviews: [newReview, ...state.reviews],
            error: null,
          }));
          toast.success("Đánh giá của bạn đã được gửi!");
          return { success: true, data: newReview };
        } catch (err) {
          console.error("Error creating review:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to create review";
          set({ error: errorMessage });
          toast.error("Có lỗi xảy ra khi gửi đánh giá");
          return { success: false, error: errorMessage };
        }
      },

      // Set error
      setError: (error: string | null) => {
        set({ error });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: "ReviewStore" }
  )
);
