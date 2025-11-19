"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Product, Review } from "../../../types";
import { productsApi, reviewsApi } from "../../../apis";
import { formatCurrency } from "../../../utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star, BadgePercent, Package, ArrowLeft, ShoppingCart, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { UserAvatar } from "../../../components/public/UserAvatar";
import { useCartStore } from "../../../stores";

const ProductDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const { user } = useUser();
  const { addToCart, loading: cartLoading } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productsApi.getById(productId);
        setProduct(data);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Không thể tải thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  // Fetch reviews for the product
  useEffect(() => {
    const fetchReviews = async () => {
      if (!productId) return;

      try {
        const data = await reviewsApi.getByProductId(productId);
        setReviews(data);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        // Don't show toast for review errors, just log them
        setReviews([]); // Set empty array on error
      }
    };

    fetchReviews();
  }, [productId]);

  // Fetch related products based on category
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!product) return;

      try {
        const response = await productsApi.getAll({
          categoryId: product.categoryId,
          limit: 4,
        });
        // Filter out current product
        const filtered = response.data?.filter((p) => p.productId !== productId) || [];
        setRelatedProducts(filtered.slice(0, 4));
      } catch (error) {
        console.error("Error fetching related products:", error);
      }
    };

    fetchRelatedProducts();
  }, [product, productId]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && product && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      return;
    }

    if (!product) return;

    try {
      await addToCart(product.productId, quantity);
    } catch (error) {
      // Error already handled in store with toast
      console.error("Add to cart error:", error);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để đánh giá sản phẩm");
      return;
    }

    if (!comment.trim()) {
      toast.error("Vui lòng nhập nội dung đánh giá");
      return;
    }

    try {
      setSubmitting(true);
      
      await reviewsApi.create({
        productId: productId,
        rating,
        comment: comment.trim(),
      });

      // Refresh reviews
      const data = await reviewsApi.getByProductId(productId);
      setReviews(data);

      // Reset form
      setRating(5);
      setComment("");
      toast.success("Đánh giá của bạn đã được gửi!");
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Có lỗi xảy ra khi gửi đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Đang tải sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm</h2>
          <p className="text-gray-600 mb-6">Sản phẩm này không tồn tại hoặc đã bị xóa</p>
          <Button onClick={() => router.push("/shop")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại cửa hàng
          </Button>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock < 10;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button variant="outline" onClick={() => router.back()} className="mb-6" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Side - Product Image */}
          <div className="flex justify-center">
            <div className="w-full max-w-lg">
              <Card className="overflow-hidden">
                <div className="aspect-square bg-white relative">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-4" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-24 w-24 text-gray-400" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {product.isFeatured && (
                      <Badge className="bg-yellow-600 hover:bg-yellow-700">
                        <Star className="h-3 w-3 mr-1" />
                        Nổi bật
                      </Badge>
                    )}
                    {product.isOnSale && (
                      <Badge className="bg-red-600 hover:bg-red-700">
                        <BadgePercent className="h-3 w-3 mr-1" />
                        Giảm giá
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Side - Product Info */}
          <div className="flex flex-col space-y-6">
            {/* Title & Category */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>
              {product.category && (
                <Badge variant="outline" className="text-sm">
                  {product.category.name}
                </Badge>
              )}
            </div>

            {/* Price */}
            <div>
              <span className="text-4xl font-bold text-orange-600">{formatCurrency(product.price)}</span>
            </div>

            {/* Stock Status */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Tình trạng</span>
                {isOutOfStock ? (
                  <Badge variant="destructive">Hết hàng</Badge>
                ) : isLowStock ? (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Sắp hết - Còn {product.stock}
                  </Badge>
                ) : (
                  <Badge className="bg-green-600">Còn hàng</Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Mô tả</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            {!isOutOfStock && (
              <div className="border-t pt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-3 block">Số lượng</label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-semibold w-16 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={handleAddToCart} disabled={cartLoading}>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {cartLoading ? "Đang thêm..." : "Thêm vào giỏ hàng"}
                </Button>

                <div className="text-center pt-2">
                  <span className="text-sm text-gray-600">Tổng: </span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(product.price * quantity)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews & Rating Section */}
        <div className="mt-16 border-t pt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Đánh giá sản phẩm</h2>

          {/* Rating Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900">{calculateAverageRating()}</div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(Number(calculateAverageRating()))
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">{reviews.length} đánh giá</p>
              </div>

              <div className="flex-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r) => r.rating === star).length;
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-gray-600 w-12">{star} sao</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Write Review Form */}
          {user ? (
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Viết đánh giá của bạn</h3>

              {/* Rating Stars */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Đánh giá của bạn</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-all hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
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

              <Button onClick={handleSubmitReview} disabled={submitting} className="w-full">
                {submitting ? "Đang gửi..." : "Gửi đánh giá"}
              </Button>
            </Card>
          ) : (
            <Card className="p-6 mb-8 text-center">
              <p className="text-gray-600">Vui lòng đăng nhập để viết đánh giá</p>
            </Card>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-600">Chưa có đánh giá nào cho sản phẩm này</p>
              </Card>
            ) : (
              reviews.map((review) => (
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
              ))
            )}
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 border-t pt-12">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Sản phẩm khác</h2>
              {product?.category && (
                <Button variant="ghost" onClick={() => router.push(`/shop?category=${product.categoryId}`)}>
                  Xem thêm →
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <div
                  key={relatedProduct.productId}
                  onClick={() => router.push(`/shop/${relatedProduct.productId}`)}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    {relatedProduct.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={relatedProduct.imageUrl}
                        alt={relatedProduct.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                      {relatedProduct.isFeatured && (
                        <Badge className="bg-yellow-600 hover:bg-yellow-700 text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Nổi bật
                        </Badge>
                      )}
                      {relatedProduct.isOnSale && (
                        <Badge className="bg-red-600 hover:bg-red-700 text-xs">
                          <BadgePercent className="h-3 w-3 mr-1" />
                          Giảm giá
                        </Badge>
                      )}
                    </div>

                    {/* Stock badge */}
                    {relatedProduct.stock === 0 && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Badge variant="destructive" className="text-sm">
                          Hết hàng
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-2">
                      {relatedProduct.name}
                    </h3>

                    {relatedProduct.category && (
                      <p className="text-sm text-gray-500 mb-2">{relatedProduct.category.name}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-orange-600 font-bold text-lg">{formatCurrency(relatedProduct.price)}</p>

                      {relatedProduct.stock > 0 && relatedProduct.stock < 10 && (
                        <span className="text-xs text-orange-500">Sắp hết hàng</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
