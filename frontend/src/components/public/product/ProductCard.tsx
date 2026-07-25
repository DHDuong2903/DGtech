"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Product } from "@/src/types";
import { formatCurrency, toMoneyNumber } from "@/src/utils";
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

export const ProductCard = ({ product, compact }: ProductCardProps) => {
  const sale = toMoneyNumber(product.price);
  const list = toMoneyNumber(product.compareAtPrice);
  const saleOk = Number.isFinite(sale) ? sale : 0;
  const showStrike = Number.isFinite(list) && list > saleOk;

  return (
    <div className="bg-card border-border group min-w-0 overflow-hidden rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md">
      <ProductCardMedia product={product} />

      <div className={compact ? "min-w-0 p-2.5" : "min-w-0 p-4"}>
        <Link
          href={`/shop/${product.productId}`}
          className={
            compact
              ? "text-foreground/80 hover:text-primary mb-1 block line-clamp-2 break-words text-sm font-medium leading-snug transition-colors"
              : "text-foreground hover:text-primary mb-2 block line-clamp-2 break-words text-base font-semibold leading-snug transition-colors"
          }
        >
          {product.name}
        </Link>

        {product.category && (
          <p
            className={
              compact
                ? "text-muted-foreground mb-1 break-words text-sm leading-normal"
                : "text-muted-foreground mb-2 break-words text-sm leading-normal"
            }
          >
            {product.category.name}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-baseline gap-1.5">
          <p
            className={
              compact ? "text-primary text-sm font-semibold tabular-nums" : "text-primary text-lg font-bold tabular-nums"
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
      </div>
    </div>
  );
};
