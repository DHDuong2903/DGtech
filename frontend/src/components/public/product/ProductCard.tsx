"use client";

import { useRouter } from "next/navigation";
import { Product } from "@/src/types";
import { formatCurrency } from "@/src/utils";

interface ProductCardProps {
  product: Product;
  /** Denser layout and typography (e.g. shop grid with many columns). */
  compact?: boolean;
}

export const ProductCard = ({ product, compact }: ProductCardProps) => {
  const router = useRouter();

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
          <div className="flex items-center justify-center h-full">
            <span className="text-muted-foreground text-4xl">🖼️</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={compact ? "min-w-0 p-2.5" : "min-w-0 p-4"}>
        <h3
          className={
            compact
              ? "text-foreground mb-1 line-clamp-2 break-words text-sm font-medium transition-colors group-hover:text-orange-600"
              : "text-foreground mb-2 line-clamp-2 break-words font-semibold transition-colors group-hover:text-orange-600"
          }
        >
          {product.name}
        </h3>

        {product.category && (
          <p
            className={
              compact
                ? "text-muted-foreground mb-1 break-words text-xs"
                : "text-muted-foreground mb-2 break-words text-sm"
            }
          >
            {product.category.name}
          </p>
        )}

        <div className="flex flex-wrap items-baseline gap-1.5 mt-auto">
          <p className={compact ? "text-orange-600 text-sm font-semibold" : "text-orange-600 text-lg font-bold"}>
            {formatCurrency(product.price)}
          </p>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <p className={compact ? "text-muted-foreground text-[10px] line-through" : "text-muted-foreground text-xs line-through"}>
              {formatCurrency(product.compareAtPrice)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
