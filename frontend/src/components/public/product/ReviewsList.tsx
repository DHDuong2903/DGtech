import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Review } from "@/src/types";
import { UserAvatar } from "@/src/components/public/layout/UserAvatar";

interface ReviewsListProps {
  reviews: Review[];
}

export const ReviewsList = ({ reviews }: ReviewsListProps) => {
  if (reviews.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600">Chưa có đánh giá nào cho sản phẩm này</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.reviewId} className="p-6">
          <div className="flex items-start gap-4">
            <UserAvatar
              clerkId={review.clerkId}
              username={review.user?.username}
              imageUrl={review.user?.imageUrl}
              size={48}
            />

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-gray-900">{review.user?.username || "Người dùng"}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                {review.createdAt && (
                  <span className="text-sm text-gray-500">
                    • {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                )}
              </div>

              <p className="text-gray-700 leading-relaxed">{review.comment}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
