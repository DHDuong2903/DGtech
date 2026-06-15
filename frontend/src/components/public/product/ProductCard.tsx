"use client";

import Link from "next/link";
import { Product } from "@/src/types";
import { formatCurrency, toMoneyNumber } from "@/src/utils";
import { ProductImageFallback } from "./ProductImageFallback";
import Image from "next/image";
import { ShowroomProductPreview } from "@/src/components/public/showroom/ShowroomProductPreview";

interface ProductCardProps {
  product: Product;
  /** Denser layout and typography (e.g. shop grid with many columns). */
  compact?: boolean;
}

export const ProductCard = ({ product, compact }: ProductCardProps) => {
  const sale = toMoneyNumber(product.price);
  const list = toMoneyNumber(product.compareAtPrice);
  const saleOk = Number.isFinite(sale) ? sale : 0;
  const showStrike = Number.isFinite(list) && list > saleOk;

  return (
    <div className="bg-card border-border group min-w-0 overflow-hidden rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Image */}
      <div className="bg-muted relative aspect-square overflow-hidden">
        {product.model3dUrl ? (
          <ShowroomProductPreview src={product.model3dUrl} className="h-full w-full rounded-none border-0" />
        ) : product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ProductImageFallback className="h-full w-full" iconClassName="h-12 w-12 sm:h-14 sm:w-14" />
        )}
      </div>

      {/* Info */}
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

        <div className="flex flex-wrap items-baseline gap-1.5 mt-auto">
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
                  ? "text-muted-foreground text-xs line-through tabular-nums"
                  : "text-muted-foreground text-sm line-through tabular-nums"
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
