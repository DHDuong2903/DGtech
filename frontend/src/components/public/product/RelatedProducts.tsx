import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Star, BadgePercent, Package } from "lucide-react";
import { Product } from "@/src/types";
import { formatCurrency } from "@/src/utils";

interface RelatedProductsProps {
  products: Product[];
  onViewMore?: () => void;
  onProductClick: (productId: string) => void;
}

export const RelatedProducts = ({ products, onViewMore, onProductClick }: RelatedProductsProps) => {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 border-t pt-12">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Sản phẩm khác</h2>
        {onViewMore && (
          <Button variant="ghost" onClick={onViewMore}>
            Xem thêm →
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={product.productId}
            onClick={() => onProductClick(product.productId)}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer"
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
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                {product.isFeatured && (
                  <Badge className="bg-yellow-600 hover:bg-yellow-700 text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Nổi bật
                  </Badge>
                )}
                {product.isOnSale && (
                  <Badge className="bg-red-600 hover:bg-red-700 text-xs">
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

                {product.stock > 0 && product.stock < 10 && (
                  <span className="text-xs text-orange-500">Sắp hết hàng</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
