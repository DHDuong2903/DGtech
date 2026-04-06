import Link from "next/link";
import { Package, ShoppingBag } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export const EmptyOrdersState = () => {
  return (
    <div className="bg-card border-border rounded-lg border py-16 text-center shadow-sm">
      <Package className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
      <h2 className="text-foreground mb-2 text-2xl font-semibold">No orders yet</h2>
      <p className="text-muted-foreground mb-6">When you place an order, it will show up here.</p>
      <Link href="/shop">
        <Button size="lg" className="gap-2">
          <ShoppingBag className="h-5 w-5" />
          Start shopping
        </Button>
      </Link>
    </div>
  );
};
