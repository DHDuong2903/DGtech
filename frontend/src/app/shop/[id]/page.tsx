"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ProductDetailReviews,
  RelatedProducts,
  VariantSelector,
} from "../../../components/public/product";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { ProductVariant } from "@/src/types/productType";

const ProductDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const { user } = useUser();
  const { addToCart, loading: cartLoading, fetchCart, updateCartItem, setCartSheetOpen } = useCartStore();
  const {
    currentProduct: product,
    relatedProducts,
    loading,
    fetchProductById,
    fetchRelatedProducts,
  } = useProductStore();
  const { reviews, fetchReviewsByProductId, createReview } = useReviewStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [buyNowBusy, setBuyNowBusy] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProductById(productId);
      fetchReviewsByProductId(productId);
    }
  }, [productId, fetchProductById, fetchReviewsByProductId]);

  // Set default variant if it's a simple product
  useEffect(() => {
    if (product?.variants) {
      const defaultVar = product.variants.find((v) => v.isDefault);
      if (defaultVar) {
        setSelectedVariant(defaultVar);
      }
    }
  }, [product]);

  // Fetch related products based on category
  useEffect(() => {
    if (product?.categoryId) {
      fetchRelatedProducts(product.categoryId, productId);
    }
  }, [product?.categoryId, productId, fetchRelatedProducts]);

  const hasRealVariants = product?.variants?.some((v) => !v.isDefault) ?? false;
  const isVariantSelected = !!selectedVariant && (!hasRealVariants || !selectedVariant.isDefault);

  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;
  const displayCompareAtPrice = selectedVariant?.compareAtPrice ?? product?.compareAtPrice ?? null;
  const displayStock = selectedVariant?.stock ?? product?.stock ?? 0;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= displayStock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please sign in to add items to your cart");
      return;
    }

    if (!product) return;

    if (hasRealVariants && (!selectedVariant || selectedVariant.isDefault)) {
      toast.error("Please select a product variant");
      return;
    }

    try {
      await addToCart(product.productId, quantity, selectedVariant?.variantId);
    } catch (error) {
      console.error("Add to cart error:", error);
    }
  };

  const handleBuyNow = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to continue");
      return;
    }
    if (!product) return;
    if (hasRealVariants && (!selectedVariant || selectedVariant.isDefault)) {
      toast.error("Please select a product variant");
      return;
    }
    const variantId = selectedVariant?.variantId;
    setBuyNowBusy(true);
    try {
      let cart = useCartStore.getState().cart;
      if (!cart?.items) {
        await fetchCart();
        cart = useCartStore.getState().cart;
      }
      const match = cart?.items?.find(
        (it) =>
          it.productId === product.productId && String(it.variantId ?? "") === String(variantId ?? ""),
      );
      if (match) {
        await updateCartItem(match.cartItemId, quantity, { suppressSuccessToast: true });
      } else {
        await addToCart(product.productId, quantity, variantId, {
          openSheet: false,
          suppressSuccessToast: true,
        });
      }
      const updated = useCartStore.getState().cart;
      const line = updated?.items?.find(
        (it) =>
          it.productId === product.productId && String(it.variantId ?? "") === String(variantId ?? ""),
      );
      if (!line) {
        toast.error("Could not update your cart. Try again.");
        return;
      }
      setCartSheetOpen(false);
      router.push(`/cart?selectOnly=${encodeURIComponent(line.cartItemId)}`);
    } catch (error) {
      console.error("Buy now error:", error);
    } finally {
      setBuyNowBusy(false);
    }
  }, [
    user,
    product,
    hasRealVariants,
    selectedVariant,
    quantity,
    fetchCart,
    updateCartItem,
    addToCart,
    setCartSheetOpen,
    router,
  ]);

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

  const isOutOfStock = displayStock === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className={cn("mx-auto max-w-7xl py-4", STOREFRONT_H_PADDING)}>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex cursor-pointer items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          Back
        </button>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,min(48vw,30rem))_minmax(0,1fr)] lg:gap-5">
          <ProductImage imageUrl={product.imageUrl} name={product.name} />

          <div className="flex min-w-0 flex-col gap-5 py-1 lg:py-3">
            <ProductInfo
              name={product.name}
              price={displayPrice}
              compareAtPrice={displayCompareAtPrice}
              description={product.description}
            />

            {hasRealVariants && (
              <VariantSelector
                variants={product.variants || []}
                selectedVariant={selectedVariant}
                onSelect={setSelectedVariant}
              />
            )}

            {!isOutOfStock && (
              <ProductActions
                quantity={quantity}
                maxStock={displayStock}
                isLoading={cartLoading}
                isBuyNowLoading={buyNowBusy}
                hasVariants={hasRealVariants}
                isVariantSelected={isVariantSelected}
                onQuantityChange={handleQuantityChange}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
              />
            )}

            {isOutOfStock && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg font-semibold text-center mt-4">
                Out of Stock
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 sm:mt-5">
          <ProductDetailReviews reviews={reviews} isLoggedIn={!!user} onSubmit={handleSubmitReviewWrapper} />
        </div>

        <div className="mt-4 sm:mt-4">
          <RelatedProducts
            products={relatedProducts}
            onViewMore={product?.category ? () => router.push(`/shop?category=${product.categoryId}`) : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
