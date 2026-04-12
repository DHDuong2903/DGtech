import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { ShoppingCart, Minus, Plus } from "lucide-react";

interface ProductActionsProps {
  quantity: number;
  maxStock: number;
  isLoading: boolean;
  hasVariants: boolean;
  isVariantSelected: boolean;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
}

export const ProductActions = ({
  quantity,
  maxStock,
  isLoading,
  hasVariants,
  isVariantSelected,
  onQuantityChange,
  onAddToCart,
}: ProductActionsProps) => {
  const isDisabled = isLoading || (hasVariants && !isVariantSelected) || maxStock === 0;

  return (
    <div className="space-y-3 pt-1">
      <div className="flex w-full items-stretch gap-2">
        <div className="flex w-[30%] min-w-0 shrink-0 items-center justify-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => onQuantityChange(-1)}
            disabled={quantity <= 1 || isLoading}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-foreground min-w-8 text-center text-sm font-semibold tabular-nums">
            {quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => onQuantityChange(1)}
            disabled={quantity >= maxStock || isLoading}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 min-w-0 flex-1 px-3"
          onClick={onAddToCart}
          disabled={isDisabled}
        >
          {isLoading ? (
            <>
              <Spinner data-icon="inline-start" />
              Adding
            </>
          ) : (
            <>
              <ShoppingCart className="mr-1.5 h-4 w-4 shrink-0" />
              <span className="truncate">
                {hasVariants && !isVariantSelected ? "Select options" : "Add to cart"}
              </span>
            </>
          )}
        </Button>
      </div>

      <Button type="button" variant="outline" size="sm" className="text-foreground h-9 w-full">
        Check out
      </Button>
    </div>
  );
};
