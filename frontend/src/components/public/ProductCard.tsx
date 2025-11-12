"use client";

import { Product } from "../../types";
import { formatCurrency } from "../../utils";
import { Badge } from "@/components/ui/badge";
import { Star, BadgePercent } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer">
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

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          {product.isFeatured && (
            <Badge className="bg-yellow-600 hover:bg-yellow-700">
              <Star className="h-3 w-3 mr-1" />
              Nổi bật
            </Badge>
          )}
          {product.isOnSale && (
            <Badge className="bg-red-600 hover:bg-red-700">
              <BadgePercent className="h-3 w-3 mr-1" />
              Giảm giá
            </Badge>
          )}
        </div>

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
