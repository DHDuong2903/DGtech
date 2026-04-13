import { ArrowRight } from "lucide-react";
import { Product } from "@/src/types";
import { ProductCard } from "./ProductCard";

interface RelatedProductsProps {
  products: Product[];
  onViewMore?: () => void;
}

export const RelatedProducts = ({ products, onViewMore }: RelatedProductsProps) => {
  if (products.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <h2 className="text-foreground text-xl font-medium tracking-tight sm:text-xl">Related products</h2>
        {onViewMore && (
          <button
            type="button"
            onClick={onViewMore}
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-sm font-inherit transition-colors"
          >
            View more
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5 *:min-w-0">
        {products.map((product) => (
          <ProductCard key={product.productId} product={product} compact />
        ))}
      </div>
    </div>
  );
};
