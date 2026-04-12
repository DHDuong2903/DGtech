import { Button } from "@/src/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";

interface CartLoadingStateProps {
  type: "loading" | "auth-loading" | "not-signed-in";
  onGoHome?: () => void;
}

export function CartLoadingState({ type, onGoHome }: CartLoadingStateProps) {
  if (type === "loading" || type === "auth-loading") {
    return (
      <div className="bg-background py-8">
        <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
          <PageContentLoader minHeightClass="min-h-[calc(100vh-200px)]" />
        </div>
      </div>
    );
  }

  if (type === "not-signed-in") {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-background py-16">
        <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
          <div className="bg-card border-border mx-auto max-w-md rounded-lg border py-16 text-center shadow-sm">
            <ShoppingBag className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
            <h2 className="text-foreground mb-2 text-2xl font-bold">Sign in required</h2>
            <p className="text-muted-foreground mb-6">Sign in to view your cart.</p>
            <Button onClick={onGoHome}>Go home</Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
