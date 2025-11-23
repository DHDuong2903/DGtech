import { Button } from "@/src/components/ui/button";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { formatCurrency } from "@/src/utils";

interface ProductActionsProps {
  quantity: number;
  maxStock: number;
  price: number;
  isLoading: boolean;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
}

export const ProductActions = ({
  quantity,
  maxStock,
  price,
  isLoading,
  onQuantityChange,
  onAddToCart,
}: ProductActionsProps) => {
  return (
    <div className="border-t pt-6 space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-900 mb-3 block">Số lượng</label>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => onQuantityChange(-1)} disabled={quantity <= 1}>
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xl font-semibold w-16 text-center">{quantity}</span>
          <Button variant="outline" size="icon" onClick={() => onQuantityChange(1)} disabled={quantity >= maxStock}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button className="w-full" size="lg" onClick={onAddToCart} disabled={isLoading}>
        <ShoppingCart className="h-5 w-5 mr-2" />
        {isLoading ? "Đang thêm..." : "Thêm vào giỏ hàng"}
      </Button>

      <div className="text-center pt-2">
        <span className="text-sm text-gray-600">Tổng: </span>
        <span className="text-lg font-bold text-gray-900">{formatCurrency(price * quantity)}</span>
      </div>
    </div>
  );
};
