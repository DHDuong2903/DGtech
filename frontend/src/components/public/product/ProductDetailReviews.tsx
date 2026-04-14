"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { Spinner } from "@/src/components/ui/spinner";
import { cn } from "@/src/lib/utils";
import type { Review } from "@/src/types";
import { ReviewsList } from "./ReviewsList";

function averageRatingLabel(reviews: Review[]) {
  if (reviews.length === 0) return "0.0";
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  return (sum / reviews.length).toFixed(1);
}

interface ProductDetailReviewsProps {
  reviews: Review[];
  isLoggedIn: boolean;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export const ProductDetailReviews = ({ reviews, isLoggedIn, onSubmit }: ProductDetailReviewsProps) => {
  const avgRounded = Math.round(Number(averageRatingLabel(reviews)));
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      setRating(5);
      setComment("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border p-4 sm:p-3">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex sm:mt-6 mt-3 w-full shrink-0 flex-col items-center gap-2 text-center lg:w-44">
          <div className="text-foreground text-5xl font-bold">{averageRatingLabel(reviews)}</div>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  "h-5 w-5",
                  s <= avgRounded ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/35"
                )}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-sm">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          {isLoggedIn && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="cursor-pointer rounded p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8",
                        s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/35"
                      )}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this product…"
                rows={4}
                className="resize-none"
              />
              <Button
                onClick={handleSubmit}
                disabled={submitting || !comment.trim()}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Submit
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          )}

          <div className="bg-muted/30 max-h-[min(20rem,42vh)] min-h-30 overflow-y-auto overscroll-y-contain rounded-lg border border-border/80 p-3 sm:p-4">
            <ReviewsList reviews={reviews} />
          </div>
        </div>
      </div>
    </div>
  );
};
