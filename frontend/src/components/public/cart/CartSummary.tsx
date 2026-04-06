import { Button } from "@/src/components/ui/button";
import { formatCurrency } from "../../../utils";

interface CartSummaryProps {
  totalItems: number;
  totalPrice: number;
  onCheckout: () => void;
}

export function CartSummary({ totalItems, totalPrice, onCheckout }: CartSummaryProps) {
  return (
    <div className="bg-card border-border sticky top-4 rounded-lg border p-6 shadow-sm">
      <h2 className="text-foreground mb-4 text-xl font-bold">Order summary</h2>

      {totalItems === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">Select items to checkout</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6 pb-4 border-b">
            <div className="text-foreground flex justify-between">
              <span>
                Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"}):
              </span>
              <span className="font-semibold">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="text-foreground flex justify-between">
              <span>Shipping:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <span className="text-foreground text-lg font-bold">Total:</span>
            <span className="text-2xl font-bold text-orange-600">{formatCurrency(totalPrice)}</span>
          </div>
        </>
      )}

      <Button className="w-full mb-4" size="lg" disabled={totalItems === 0} onClick={onCheckout}>
        {totalItems === 0 ? "Select items to checkout" : "Proceed to checkout"}
      </Button>

      <div className="bg-muted text-muted-foreground space-y-2 rounded-lg p-4 text-sm">
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
