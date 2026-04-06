import { CartItem as CartItemComponent } from "../cart/CartItem";
import { Button } from "@/src/components/ui/button";
import { CartItem as CartItemType } from "@/src/types";

interface CartItemListProps {
  items: CartItemType[];
  selectedItems: Set<string>;
  onToggleSelect: (cartItemId: string) => void;
  onClearCart: () => void;
  loading: boolean;
}

export function CartItemList({ items, selectedItems, onToggleSelect, onClearCart, loading }: CartItemListProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <CartItemComponent
          key={item.cartItemId}
          item={item}
          selected={selectedItems.has(item.cartItemId)}
          onToggleSelect={onToggleSelect}
        />
      ))}

      {/* Clear Cart Button */}
      <Button
        variant="outline"
        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
        onClick={onClearCart}
        disabled={loading}
      >
        Clear cart
      </Button>
    </div>
  );
}
