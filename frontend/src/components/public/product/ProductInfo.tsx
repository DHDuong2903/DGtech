import { Badge } from "@/src/components/ui/badge";
import { formatCurrency } from "@/src/utils";

interface ProductInfoProps {
  name: string;
  categoryName?: string;
  price: number;
  compareAtPrice?: number | null;
  description?: string;
}

export const ProductInfo = ({ name, categoryName, price, compareAtPrice, description }: ProductInfoProps) => {
  return (
    <div className="flex flex-col space-y-6">
      {/* Title & Category */}
      <div>
        <h1 className="text-foreground mb-3 break-words text-3xl font-bold">{name}</h1>
        {categoryName && (
          <Badge variant="outline" className="text-sm">
            {categoryName}
          </Badge>
        )}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold text-orange-600">{formatCurrency(price)}</span>
        {compareAtPrice && compareAtPrice > price && (
          <span className="text-xl text-muted-foreground line-through decoration-muted-foreground/50">
            {formatCurrency(compareAtPrice)}
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="border-border border-t pt-4">
          <h3 className="text-foreground mb-2 text-sm font-semibold">Description</h3>
          <p className="text-muted-foreground break-words text-sm leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};
