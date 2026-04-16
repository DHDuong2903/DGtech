import { Button } from "@/src/components/ui/button";
import { formatCurrency } from "../../../utils";
import type { FreeShippingMotivation } from "@/src/types";
import { FreeShippingCartProgress } from "./FreeShippingCartProgress";

interface CartSummaryProps {
  totalItems: number;
  totalPrice: number;
  /** Full-cart subtotal for free-ship progress (usually `cart.totalPrice`). */
  cartTotalForShippingBar?: number;
  freeShippingMotivation?: FreeShippingMotivation | null;
  onCheckout: () => void;
}

export function CartSummary({
  totalItems,
  totalPrice,
  cartTotalForShippingBar,
  freeShippingMotivation,
  onCheckout,
}: CartSummaryProps) {
  return (
    <div className="bg-card border-border sticky top-4 rounded-lg border p-4 shadow-sm">
      {totalItems === 0 ? (
        <div className="py-6 text-center">
          <p className="text-muted-foreground text-sm">Select items to checkout</p>
        </div>
      ) : (
        <>
          {cartTotalForShippingBar != null && (
            <div className="mb-3">
              <FreeShippingCartProgress
                motivation={freeShippingMotivation}
                cartTotal={cartTotalForShippingBar}
              />
            </div>
          )}
          <div className="mb-4 space-y-2 border-b pb-3">
            <div className="text-foreground flex justify-between text-sm">
              <span>
                Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"})
              </span>
              <span className="font-semibold">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="text-foreground flex justify-between text-sm">
              <span>Shipping</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-foreground font-bold">Estimated total</span>
            <span className="text-xl font-bold text-orange-600">{formatCurrency(totalPrice)}</span>
          </div>
        </>
      )}

      <Button className="w-full" disabled={totalItems === 0} onClick={onCheckout}>
        {totalItems === 0 ? "Select items to checkout" : "Checkout"}
      </Button>
    </div>
  );
}
