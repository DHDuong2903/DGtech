import { Star } from "lucide-react";
import { Review } from "@/src/types";
import { UserAvatar } from "@/src/components/public/layout/UserAvatar";

interface ReviewsListProps {
  reviews: Review[];
}

export const ReviewsList = ({ reviews }: ReviewsListProps) => {
  if (reviews.length === 0) {
    return (
      <p className="text-muted-foreground text-center text-sm">No reviews for this product yet</p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.reviewId} className="flex items-start gap-4">
          <UserAvatar
            clerkId={review.clerkId}
            username={review.user?.username}
            imageUrl={review.user?.imageUrl}
            size={32}
          />

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-foreground font-semibold">{review.user?.username || "Customer"}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/35"
                    }`}
                  />
                ))}
              </div>
              {review.createdAt && (
                <span className="text-muted-foreground text-sm">
                  • {new Date(review.createdAt).toLocaleDateString("en-US")}
                </span>
              )}
            </div>

            <p className="text-foreground/90 leading-relaxed">{review.comment}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
