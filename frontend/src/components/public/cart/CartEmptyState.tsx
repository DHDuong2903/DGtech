import { Button } from "@/src/components/ui/button";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

export function CartEmptyState() {
  return (
    <div className="bg-card border-border rounded-lg border py-16 text-center shadow-sm">
      <ShoppingBag className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
      <h2 className="text-foreground mb-2 text-xl font-semibold">Your cart is empty</h2>
      <p className="text-muted-foreground mb-6">Add products to your cart to keep shopping.</p>
      <Link href="/shop">
        <Button className="gap-2">
          <ShoppingBag className="h-4 w-4" />
          Browse products
        </Button>
      </Link>
    </div>
  );
}
