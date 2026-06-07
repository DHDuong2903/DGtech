"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth, useUser } from "@clerk/nextjs";
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
  ProductBundleBlocks,
} from "../../../components/public/product";
import { bundleApi } from "@/src/apis/bundleApi";
import type { StorefrontBundleForPdp } from "@/src/types/bundleType";
import { cn } from "@/src/lib/utils";
import { toMoneyNumber } from "@/src/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import type { Product } from "@/src/types";
import { ProductVariant } from "@/src/types/productType";

/** Storefront list/detail use the same min sale price among real variants (see backend applyCampaignPricingToProductForStorefront). */
function pickCheapestRealVariant(variants: ProductVariant[]): ProductVariant | null {
  const real = variants.filter((v) => !v.isDefault);
  if (!real.length) return null;
  let best = real[0];
  let bestPrice = toMoneyNumber(best.price);
  if (!Number.isFinite(bestPrice)) bestPrice = Number.POSITIVE_INFINITY;
  for (let i = 1; i < real.length; i++) {
    const v = real[i];
    const p = toMoneyNumber(v.price);
    const ok = Number.isFinite(p) ? p : Number.POSITIVE_INFINITY;
    if (ok < bestPrice) {
      best = v;
      bestPrice = ok;
    }
  }
  return best;
}

function resolveStorefrontSelectedVariant(
  product: Product | null | undefined,
  userSelectedVariantId: string | null,
): ProductVariant | null {
  if (!product?.variants?.length) return null;
  const vs = product.variants;
  if (userSelectedVariantId) {
    const hit = vs.find((v) => v.variantId === userSelectedVariantId);
    if (hit) return hit;
  }
  const cheapestReal = pickCheapestRealVariant(vs);
  if (cheapestReal) return cheapestReal;
  return vs.find((v) => v.isDefault) ?? vs[0] ?? null;
}

const ProductDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const { user } = useUser();
  const { isLoaded: clerkLoaded } = useAuth();
  const {
    addToCart,
    addBundleToCart,
    loading: cartLoading,
    fetchCart,
    updateCartItem,
    setCartSheetOpen,
  } = useCartStore();
  const {
    currentProduct: product,
    relatedProducts,
    loading,
    fetchProductById,
    fetchRelatedProducts,
  } = useProductStore();
  const { reviews, fetchReviewsByProductId, createReview } = useReviewStore();

  const [quantity, setQuantity] = useState(1);
  /** When null, PDP uses the cheapest real variant (same anchor price as cards). Set when shopper picks options. */
  const [userSelectedVariantId, setUserSelectedVariantId] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [buyNowBusy, setBuyNowBusy] = useState(false);
  const [bundles, setBundles] = useState<StorefrontBundleForPdp[]>([]);
  const [bundleBuyBusyId, setBundleBuyBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!productId || !clerkLoaded) return;
    setQuantity(1);
    setUserSelectedVariantId(null);
    fetchProductById(productId);
    fetchReviewsByProductId(productId);
  }, [productId, clerkLoaded, fetchProductById, fetchReviewsByProductId]);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    void bundleApi
      .getStorefrontByProduct(productId)
      .then((b) => {
        if (!cancelled) setBundles(b);
      })
      .catch(() => {
        if (!cancelled) setBundles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const selectedVariant = useMemo(
    () => resolveStorefrontSelectedVariant(product, userSelectedVariantId),
    [product, userSelectedVariantId],
  );

  const handleVariantSelect = useCallback((v: ProductVariant | null) => {
    // Partial attribute selection calls null; keep auto/last full variant for price until a full match.
    if (v?.variantId) setUserSelectedVariantId(v.variantId);
  }, []);

  // Fetch related products based on category
  useEffect(() => {
    if (product?.categoryId) {
      fetchRelatedProducts(product.categoryId, productId);
    }
  }, [product?.categoryId, productId, fetchRelatedProducts]);

  const hasRealVariants = product?.variants?.some((v) => !v.isDefault) ?? false;
  const isVariantSelected = !!selectedVariant && (!hasRealVariants || !selectedVariant.isDefault);

  const displayPrice = toMoneyNumber(selectedVariant?.price ?? product?.price) || 0;
  const listNum = toMoneyNumber(selectedVariant?.compareAtPrice ?? product?.compareAtPrice ?? null);
  const displayCompareAtPrice = Number.isFinite(listNum) ? listNum : null;
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

    setAddBusy(true);
    try {
      await addToCart(product.productId, quantity, selectedVariant?.variantId);
    } catch (error) {
      console.error("Add to cart error:", error);
    } finally {
      setAddBusy(false);
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
        (it) => it.productId === product.productId && String(it.variantId ?? "") === String(variantId ?? ""),
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
        (it) => it.productId === product.productId && String(it.variantId ?? "") === String(variantId ?? ""),
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

  const handleBuyNowBundle = useCallback(
    async (bundleId: string) => {
      if (!user) {
        toast.error("Please sign in to continue");
        return;
      }
      const sameBundle = (it: { bundleId?: string | null; bundleSnapshot?: { bundleId?: string | null } | null }) => {
        const a = it.bundleId ?? it.bundleSnapshot?.bundleId;
        if (a == null || bundleId == null) return false;
        return String(a).toLowerCase() === String(bundleId).toLowerCase();
      };

      setBundleBuyBusyId(bundleId);
      try {
        let cart = useCartStore.getState().cart;
        if (!cart?.items) {
          await fetchCart();
          cart = useCartStore.getState().cart;
        }
        const match = cart?.items?.find(
          (it) => sameBundle(it) && (it.itemType === "BUNDLE" || Boolean(it.bundleSnapshot)),
        );
        if (match) {
          await updateCartItem(match.cartItemId, 1, {
            suppressSuccessToast: true,
            throwOnError: true,
          });
        } else {
          await addBundleToCart(bundleId, 1, {
            openSheet: false,
            suppressSuccessToast: true,
            throwOnError: true,
          });
        }
        await fetchCart();
        const updated = useCartStore.getState().cart;
        const line = updated?.items?.find(
          (it) => sameBundle(it) && (it.itemType === "BUNDLE" || Boolean(it.bundleSnapshot)),
        );
        if (!line) {
          toast.error("Could not update your cart. Try again.");
          return;
        }
        setCartSheetOpen(false);
        router.push(`/cart?selectOnly=${encodeURIComponent(line.cartItemId)}`);
      } catch {
        /* addBundleToCart / updateCartItem already showed toast */
      } finally {
        setBundleBuyBusyId(null);
      }
    },
    [user, fetchCart, updateCartItem, addBundleToCart, setCartSheetOpen, router],
  );

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

  if (!clerkLoaded || loading) {
    return <ProductLoadingState />;
  }

  if (!product) {
    return <ProductNotFound onBackToShop={() => router.push("/shop")} />;
  }

  const isOutOfStock = displayStock === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className={cn("mx-auto max-w-7xl py-3", STOREFRONT_H_PADDING)}>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex cursor-pointer items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          Back
        </button>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,min(48vw,30rem))_minmax(0,1fr)] lg:gap-5">
          <ProductImage imageUrl={product.imageUrl} model3dUrl={product.model3dUrl} name={product.name} />

          <div className="flex min-w-0 flex-col gap-3 py-1 lg:py-1">
            <ProductInfo
              name={product.name}
              price={displayPrice}
              compareAtPrice={displayCompareAtPrice}
              description={product.description}
            />

            {hasRealVariants && (
              <VariantSelector
                key={product.productId}
                variants={product.variants || []}
                selectedVariant={selectedVariant}
                onSelect={handleVariantSelect}
              />
            )}

            {!isOutOfStock && (
              <ProductActions
                quantity={quantity}
                maxStock={displayStock}
                isAddLoading={addBusy}
                globalDisabled={cartLoading}
                isBuyNowLoading={buyNowBusy}
                hasVariants={hasRealVariants}
                isVariantSelected={isVariantSelected}
                onQuantityChange={handleQuantityChange}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
              />
            )}

            {isOutOfStock && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-center font-semibold">
                Out of Stock
              </div>
            )}

            <ProductBundleBlocks
              bundles={bundles}
              bundleBuyBusyId={bundleBuyBusyId}
              onBuyNowBundle={handleBuyNowBundle}
            />
          </div>
        </div>

        <div className="mt-3 sm:mt-3">
          <ProductDetailReviews reviews={reviews} isLoggedIn={!!user} onSubmit={handleSubmitReviewWrapper} />
        </div>

        <div className="mt-3 sm:mt-3">
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
