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
        <h1 className="text-foreground mb-3 text-3xl font-bold">{name}</h1>
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
      <div className="border-border border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-foreground text-sm font-medium">Availability</span>
          {isOutOfStock ? (
            <Badge variant="destructive">Out of stock</Badge>
          ) : isLowStock ? (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Low stock — {stock} left
            </Badge>
          ) : (
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500">In stock</Badge>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="border-border border-t pt-4">
          <h3 className="text-foreground mb-2 text-sm font-semibold">Description</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
};
