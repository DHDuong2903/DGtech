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
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer"
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-400 text-4xl">🖼️</span>
          </div>
        )}

        {/* Stock badge */}
        {product.stock === 0 && (
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
          {product.name}
        </h3>

        {product.category && <p className="text-sm text-gray-500 mb-2">{product.category.name}</p>}

        <div className="flex items-center justify-between">
          <p className="text-orange-600 font-bold text-lg">{formatCurrency(product.price)}</p>

          {product.stock > 0 && product.stock < 10 && <span className="text-xs text-orange-500">Sắp hết hàng</span>}
        </div>
      </div>
    </div>
  );
};
