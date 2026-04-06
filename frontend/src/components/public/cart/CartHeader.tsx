import { Button } from "@/src/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CartHeaderProps {
  selectedCount: number;
  totalCount: number;
}

export function CartHeader({ selectedCount, totalCount }: CartHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
      <div>
        <h1 className="text-foreground mb-2 text-3xl font-bold">Your cart</h1>
        <p className="text-muted-foreground">
          {selectedCount > 0 ? (
            <>
              <span className="font-semibold text-orange-600">{selectedCount}</span> of {totalCount}{" "}
              {totalCount === 1 ? "item" : "items"} selected
            </>
          ) : (
            `${totalCount} ${totalCount === 1 ? "item" : "items"} in cart`
          )}
        </p>
      </div>
      <Link href="/shop">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Continue shopping
        </Button>
      </Link>
    </div>
  );
}
