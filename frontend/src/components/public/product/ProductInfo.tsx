import { Badge } from "@/src/components/ui/badge";
import { formatCurrency } from "@/src/utils";

interface ProductInfoProps {
  name: string;
  categoryName?: string;
  price: number;
  description?: string;
  stock: number;
}

export const ProductInfo = ({ name, categoryName, price, description, stock }: ProductInfoProps) => {
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock < 10;

  return (
    <div className="flex flex-col space-y-6">
      {/* Title & Category */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{name}</h1>
        {categoryName && (
          <Badge variant="outline" className="text-sm">
            {categoryName}
          </Badge>
        )}
      </div>

      {/* Price */}
      <div>
        <span className="text-4xl font-bold text-orange-600">{formatCurrency(price)}</span>
      </div>

      {/* Stock Status */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Tình trạng</span>
          {isOutOfStock ? (
            <Badge variant="destructive">Hết hàng</Badge>
          ) : isLowStock ? (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Sắp hết - Còn {stock}
            </Badge>
          ) : (
            <Badge className="bg-green-600">Còn hàng</Badge>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Mô tả</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
};
