"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/src/types";
import { formatCurrency, toMoneyNumber } from "@/src/utils";
import { useCartStore } from "@/src/stores";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { cn } from "@/src/lib/utils";
import { ProductImageFallback } from "./ProductImageFallback";

const ShowroomProductPreview = dynamic(
  () =>
    import("@/src/components/public/showroom/ShowroomProductPreview").then(
      (mod) => mod.ShowroomProductPreview,
    ),
  { ssr: false },
);

interface ProductCardProps {
  product: Product;
  /** Denser layout and typography (e.g. shop grid with many columns). */
  compact?: boolean;
}

function ProductCardMedia({ product }: { product: Product }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!product.model3dUrl) return;
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [product.model3dUrl]);

  const imageFallback = product.imageUrl ? (
    <Image
      src={product.imageUrl}
      alt={product.name}
      fill
      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
      className="object-cover transition-transform duration-300 group-hover:scale-105"
    />
  ) : (
    <ProductImageFallback className="h-full w-full" iconClassName="h-12 w-12 sm:h-14 sm:w-14" />
  );

  if (product.model3dUrl) {
    return (
      <div ref={rootRef} className="bg-muted relative aspect-square overflow-hidden">
        {isVisible ? (
          <ShowroomProductPreview
            src={product.model3dUrl}
            className="h-full w-full rounded-none border-0"
            fallback={imageFallback}
          />
        ) : (
          imageFallback
        )}
      </div>
    );
  }

  return <div className="bg-muted relative aspect-square overflow-hidden">{imageFallback}</div>;
}

function resolveQuickAddVariant(product: Product) {
  const variants = product.variants ?? [];
  const hasRealVariants = variants.some((variant) => !variant.isDefault);
  if (hasRealVariants) {
    return { needsOptions: true as const, variantId: undefined, stock: product.stock };
  }

  const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
  const stock = defaultVariant?.stock ?? product.stock ?? 0;
  return {
    needsOptions: false as const,
    variantId: defaultVariant?.variantId,
    stock,
  };
}

export const ProductCard = ({ product, compact }: ProductCardProps) => {
  const router = useRouter();
  const { user } = useUser();
  const addToCart = useCartStore((state) => state.addToCart);
  const [adding, setAdding] = useState(false);

  const sale = toMoneyNumber(product.price);
  const list = toMoneyNumber(product.compareAtPrice);
  const saleOk = Number.isFinite(sale) ? sale : 0;
  const showStrike = Number.isFinite(list) && list > saleOk;
  const quickAdd = resolveQuickAddVariant(product);
  const outOfStock = quickAdd.stock <= 0;

  const handleQuickAdd = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      toast.error("Please sign in to add items to your cart");
      return;
    }

    if (outOfStock) {
      toast.error("This product is out of stock");
      return;
    }

    if (quickAdd.needsOptions) {
      router.push(`/shop/${product.productId}`);
      return;
    }

    setAdding(true);
    try {
      await addToCart(product.productId, 1, quickAdd.variantId);
    } catch (error) {
      console.error("Quick add to cart error:", error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-card border-border group relative min-w-0 overflow-hidden rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md">
      <Link href={`/shop/${product.productId}`} className="block" aria-label={product.name}>
        <ProductCardMedia product={product} />
      </Link>

      <div className={compact ? "min-w-0 space-y-2 p-2.5" : "min-w-0 space-y-2.5 p-4"}>
        <Link
          href={`/shop/${product.productId}`}
          title={product.name}
          className={
            compact
              ? "text-foreground/80 hover:text-primary block truncate text-sm font-medium leading-snug transition-colors"
              : "text-foreground hover:text-primary block truncate text-base font-semibold leading-snug transition-colors"
          }
        >
          {product.name}
        </Link>

        <p
          title={product.category?.name || undefined}
          className="text-muted-foreground truncate text-sm leading-normal"
        >
          {product.category?.name || "\u00A0"}
        </p>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-baseline gap-1.5">
            <p
              className={
                compact
                  ? "text-primary text-sm font-semibold tabular-nums"
                  : "text-primary text-lg font-bold tabular-nums"
              }
            >
              {formatCurrency(saleOk)}
            </p>
            {showStrike && (
              <p
                className={
                  compact
                    ? "text-muted-foreground text-xs tabular-nums line-through"
                    : "text-muted-foreground text-sm tabular-nums line-through"
                }
              >
                {formatCurrency(list)}
              </p>
            )}
          </div>

          <Button
            type="button"
            size="icon"
            disabled={adding || outOfStock}
            onClick={handleQuickAdd}
            aria-label={
              outOfStock
                ? "Out of stock"
                : quickAdd.needsOptions
                  ? "Choose options"
                  : `Add ${product.name} to cart`
            }
            title={
              outOfStock ? "Out of stock" : quickAdd.needsOptions ? "Choose options on product page" : "Add to cart"
            }
            className={cn(
              "size-10 shrink-0 cursor-pointer rounded-full bg-orange-500 text-white shadow-sm",
              "hover:bg-orange-600 hover:text-white",
              "focus-visible:ring-orange-500/40",
              outOfStock && "opacity-60",
            )}
          >
            {adding ? <Spinner className="size-4" /> : <ShoppingCart className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
