"use client";

import { useState } from "react";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { Star } from "lucide-react";

interface ReviewFormProps {
  isLoggedIn: boolean;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export const ReviewForm = ({ isLoggedIn, onSubmit }: ReviewFormProps) => {
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

  if (!isLoggedIn) {
    return (
      <Card className="p-6 mb-8 text-center">
        <p className="text-gray-600">Vui lòng đăng nhập để viết đánh giá</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Viết đánh giá của bạn</h3>

      {/* Rating Stars */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Đánh giá của bạn</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" onClick={() => setRating(star)} className="transition-all hover:scale-110">
              <Star className={`h-8 w-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">({rating} sao)</span>
        </div>
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Nhận xét của bạn</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
          rows={4}
          className="resize-none"
        />
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? "Đang gửi..." : "Gửi đánh giá"}
      </Button>
    </Card>
  );
};
