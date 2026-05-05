import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { ShoppingCart, Minus, Plus } from "lucide-react";

interface ProductActionsProps {
  quantity: number;
  maxStock: number;
  isAddLoading: boolean;
  globalDisabled?: boolean;
  /** Sync line in cart then open cart with only this line selected */
  isBuyNowLoading?: boolean;
  hasVariants: boolean;
  isVariantSelected: boolean;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
  onBuyNow: () => void | Promise<void>;
}

export const ProductActions = ({
  quantity,
  maxStock,
  isAddLoading,
  globalDisabled = false,
  isBuyNowLoading = false,
  hasVariants,
  isVariantSelected,
  onQuantityChange,
  onAddToCart,
  onBuyNow,
}: ProductActionsProps) => {
  const disableAll = isAddLoading || isBuyNowLoading || globalDisabled;
  const isAddToCartDisabled = disableAll || (hasVariants && !isVariantSelected) || maxStock === 0;
  const isBuyNowDisabled = disableAll || (hasVariants && !isVariantSelected) || maxStock === 0;

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
            disabled={quantity <= 1 || disableAll}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-foreground min-w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => onQuantityChange(1)}
            disabled={quantity >= maxStock || disableAll}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 min-w-0 flex-1 px-3"
          onClick={onAddToCart}
          disabled={isAddToCartDisabled}
        >
          {isAddLoading && <Spinner data-icon="inline-start" />}
          {!isAddLoading && <ShoppingCart className="mr-1.5 h-4 w-4 shrink-0" />}
          <span className="truncate">{hasVariants && !isVariantSelected ? "Select options" : "Add to cart"}</span>
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-foreground h-9 w-full"
        onClick={() => void onBuyNow()}
        disabled={isBuyNowDisabled}
      >
        {isBuyNowLoading && <Spinner data-icon="inline-start" />}
        Buy now
      </Button>
    </div>
  );
};
