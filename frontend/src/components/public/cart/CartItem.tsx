"use client";

import { Button } from "@/src/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { Checkbox } from "@/src/components/ui/checkbox";
import { CartItem as CartItemType } from "@/src/types";
import { useCartStore } from "@/src/stores";
import { formatCurrency } from "@/src/utils";

interface CartItemProps {
  item: CartItemType;
  selected: boolean;
  onToggleSelect: (cartItemId: string) => void;
}

export const CartItem = ({ item, selected, onToggleSelect }: CartItemProps) => {
  const { loading, updateCartItem, removeFromCart } = useCartStore();

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateCartItem(item.cartItemId, newQuantity);
  };

  const handleRemoveItem = async () => {
    await removeFromCart(item.cartItemId);
  };

  const subtotal = item.product.price * item.quantity;

  return (
    <div className="bg-card border-border flex gap-4 rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md md:p-6">
      {/* Checkbox */}
      <div className="flex items-start pt-2">
        <Checkbox
          id={`select-${item.cartItemId}`}
          checked={selected}
          onCheckedChange={() => onToggleSelect(item.cartItemId)}
        />
      </div>

      {/* Product Image */}
      <div className="bg-muted relative h-28 w-28 shrink-0 overflow-hidden rounded-lg md:h-36 md:w-36">
        <Image
          src={item.product.imageUrl || "/images/placeholder.png"}
          alt={item.product.name}
          fill
          className="object-contain p-2"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-foreground mb-1 truncate text-base font-semibold md:text-lg">{item.product.name}</h3>
            <p className="text-orange-600 font-bold text-lg md:text-xl">{formatCurrency(item.product.price)}</p>
          </div>

          {/* Remove Button (Desktop) */}
          <Button
            size="icon"
            variant="ghost"
            className="hidden md:flex h-10 w-10 hover:bg-red-50"
            onClick={handleRemoveItem}
            disabled={loading}
          >
            <Trash2 className="h-5 w-5 text-red-500" />
          </Button>
        </div>

        {/* Quantity Controls & Subtotal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm font-medium">Quantity:</span>
            <div className="bg-muted border-border flex items-center gap-1 rounded-lg border">
              <Button
                size="icon"
                variant="ghost"
                className="hover:bg-accent h-9 w-9"
                onClick={() => handleUpdateQuantity(item.quantity - 1)}
                disabled={item.quantity <= 1 || loading}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-semibold w-10 text-center">{item.quantity}</span>
              <Button
                size="icon"
                variant="ghost"
                className="hover:bg-accent h-9 w-9"
                onClick={() => handleUpdateQuantity(item.quantity + 1)}
                disabled={item.quantity >= item.product.stock || loading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Subtotal */}
          <div className="text-left sm:text-right">
            <p className="text-muted-foreground text-xs sm:text-sm">Line total</p>
            <p className="font-bold text-lg sm:text-xl text-orange-600">{formatCurrency(subtotal)}</p>
          </div>
        </div>

        {/* Remove Button (Mobile) */}
        <Button
          size="sm"
          variant="ghost"
          className="md:hidden mt-3 text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={handleRemoveItem}
          disabled={loading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove item
        </Button>
      </div>
    </div>
  );
};
