"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useCartStore, useProductStore, useReviewStore } from "../../../stores";
import {
  ProductLoadingState,
  ProductNotFound,
  ProductImage,
  ProductInfo,
  ProductActions,
  RatingSummary,
  ReviewForm,
  ReviewsList,
  RelatedProducts,
} from "../../../components/public/product";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";

const ProductDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const { user } = useUser();
  const { addToCart, loading: cartLoading } = useCartStore();
  const {
    currentProduct: product,
    relatedProducts,
    loading,
    fetchProductById,
    fetchRelatedProducts,
  } = useProductStore();
  const { reviews, fetchReviewsByProductId, createReview } = useReviewStore();

  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (productId) {
      fetchProductById(productId);
      fetchReviewsByProductId(productId);
    }
  }, [productId, fetchProductById, fetchReviewsByProductId]);

  // Fetch related products based on category
  useEffect(() => {
    if (product?.categoryId) {
      fetchRelatedProducts(product.categoryId, productId);
    }
  }, [product?.categoryId, productId, fetchRelatedProducts]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && product && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please sign in to add items to your cart");
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

  const handleSubmitReviewWrapper = async (rating: number, comment: string) => {
    if (!user) {
      toast.error("Please sign in to write a review");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please enter your review");
      return;
    }

    await createReview({
      productId: productId,
      rating,
      comment,
    });
  };

  if (loading) {
    return <ProductLoadingState />;
  }

  if (!product) {
    return <ProductNotFound onBackToShop={() => router.push("/shop")} />;
  }

  const isOutOfStock = product.stock === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className={cn("mx-auto max-w-7xl py-8", STOREFRONT_H_PADDING)}>
        {/* Back Button */}
        <Button variant="outline" onClick={() => router.back()} className="mb-6" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <ProductImage imageUrl={product.imageUrl} name={product.name} />

          <div className="flex flex-col space-y-6">
            <ProductInfo
              name={product.name}
              categoryName={product.category?.name}
              price={product.price}
              description={product.description}
              stock={product.stock}
            />

            {!isOutOfStock && (
              <ProductActions
                quantity={quantity}
                maxStock={product.stock}
                price={product.price}
                isLoading={cartLoading}
                onQuantityChange={handleQuantityChange}
                onAddToCart={handleAddToCart}
              />
            )}
          </div>
        </div>

        {/* Reviews & Rating Section */}
        <div className="mt-16 border-t pt-12">
          <h2 className="text-foreground mb-6 text-2xl font-bold">Customer reviews</h2>

          <RatingSummary reviews={reviews} />

          <ReviewForm isLoggedIn={!!user} onSubmit={handleSubmitReviewWrapper} />

          <ReviewsList reviews={reviews} />
        </div>

        <RelatedProducts
          products={relatedProducts}
          onViewMore={product?.category ? () => router.push(`/shop?category=${product.categoryId}`) : undefined}
          onProductClick={(productId) => router.push(`/shop/${productId}`)}
        />
      </div>
    </div>
  );
};

export default ProductDetailPage;
