import { Button } from "@/src/components/ui/button";
import { formatCurrency } from "../../../utils";

interface CartSummaryProps {
  totalItems: number;
  totalPrice: number;
  onCheckout: () => void;
}

export function CartSummary({ totalItems, totalPrice, onCheckout }: CartSummaryProps) {
  return (
    <div className="bg-card border-border sticky top-4 rounded-lg border p-4 shadow-sm">
      {totalItems === 0 ? (
        <div className="py-6 text-center">
          <p className="text-muted-foreground text-sm">Select items to checkout</p>
        </div>
      ) : (
        <>
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
            <span className="text-foreground font-bold">Total:</span>
            <span className="text-xl font-bold text-orange-600">{formatCurrency(totalPrice)}</span>
          </div>
        </>
      )}

      <Button className="mb-3 w-full" size="lg" disabled={totalItems === 0} onClick={onCheckout}>
        {totalItems === 0 ? "Select items to checkout" : "Checkout"}
      </Button>

      <div className="bg-muted text-muted-foreground space-y-2 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          <span>Free shipping</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          <span>7-day returns</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          <span>Manufacturer warranty</span>
        </div>
      </div>
    </div>
  );
}
