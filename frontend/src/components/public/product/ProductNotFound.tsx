import { Button } from "@/src/components/ui/button";
import { Package, ArrowLeft } from "lucide-react";

interface ProductNotFoundProps {
  onBackToShop: () => void;
}

export const ProductNotFound = ({ onBackToShop }: ProductNotFoundProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Package className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 className="text-foreground mb-2 text-2xl font-bold">Product not found</h2>
        <p className="text-muted-foreground mb-6">This product does not exist or has been removed.</p>
        <Button onClick={onBackToShop}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to shop
        </Button>
      </div>
    </div>
  );
};
