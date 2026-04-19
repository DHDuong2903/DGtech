"use client";

import { useRouter } from "next/navigation";
import { Product } from "@/src/types";
import { formatCurrency, toMoneyNumber } from "@/src/utils";
import { ProductImageFallback } from "./ProductImageFallback";

interface ProductCardProps {
  product: Product;
  /** Denser layout and typography (e.g. shop grid with many columns). */
  compact?: boolean;
}

export const ProductCard = ({ product, compact }: ProductCardProps) => {
  const router = useRouter();
  const sale = toMoneyNumber(product.price);
  const list = toMoneyNumber(product.compareAtPrice);
  const saleOk = Number.isFinite(sale) ? sale : 0;
  const showStrike = Number.isFinite(list) && list > saleOk;

  const handleClick = () => {
    router.push(`/shop/${product.productId}`);
  };

  return (
    <div
      className="bg-card border-border group min-w-0 cursor-pointer overflow-hidden rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md"
      onClick={handleClick}
    >
      {/* Image */}
      <div className="bg-muted relative aspect-square overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ProductImageFallback className="h-full w-full" iconClassName="h-12 w-12 sm:h-14 sm:w-14" />
        )}
      </div>

      {/* Info */}
      <div className={compact ? "min-w-0 p-2.5" : "min-w-0 p-4"}>
        <h3
          className={
            compact
              ? "text-foreground/80 group-hover:text-primary mb-1 line-clamp-2 break-words text-sm font-medium leading-snug transition-colors"
              : "text-foreground group-hover:text-primary mb-2 line-clamp-2 break-words text-base font-semibold leading-snug transition-colors"
          }
        >
          {product.name}
        </h3>

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
