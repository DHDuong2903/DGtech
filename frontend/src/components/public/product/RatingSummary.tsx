import { Star } from "lucide-react";
import { Review } from "@/src/types";

interface RatingSummaryProps {
  reviews: Review[];
}

export const RatingSummary = ({ reviews }: RatingSummaryProps) => {
  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const averageRating = calculateAverageRating();

  return (
    <div className="bg-card border-border mb-8 rounded-lg border p-6 shadow-sm">
      <div className="flex items-center gap-8">
        <div className="text-center">
          <div className="text-5xl font-bold text-foreground">{averageRating}</div>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(Number(averageRating)) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/35"
                }`}
              />
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
        </div>

        <div className="flex-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => r.rating === star).length;
            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 mb-2">
                <span className="text-muted-foreground w-12 text-sm">{star}★</span>
                <div className="bg-muted h-2 flex-1 rounded-full">
                  <div className="bg-yellow-400 h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-muted-foreground w-12 text-sm">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
