"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/src/components/ui/badge";
import { Product } from "@/src/types";
import { formatCurrency } from "@/src/utils";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/shop/${product.productId}`);
  };

  return (
    <div
      className="bg-card border-border group cursor-pointer overflow-hidden rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md"
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

        {/* Stock badge */}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="destructive" className="text-sm">
              Out of stock
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-foreground mb-2 line-clamp-2 font-semibold transition-colors group-hover:text-orange-600">
          {product.name}
        </h3>

        {product.category && <p className="text-muted-foreground mb-2 text-sm">{product.category.name}</p>}

        <div className="flex items-center justify-between">
          <p className="text-orange-600 font-bold text-lg">{formatCurrency(product.price)}</p>

          {product.stock > 0 && product.stock < 10 && <span className="text-xs text-orange-500">Low stock</span>}
        </div>
      </div>
    </div>
  );
};
