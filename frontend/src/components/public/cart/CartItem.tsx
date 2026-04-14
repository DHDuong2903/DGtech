"use client";

import { Button } from "@/src/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
import { Checkbox } from "@/src/components/ui/checkbox";
import { TableCell, TableRow } from "@/src/components/ui/table";
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

  const itemPrice = item.variant ? item.variant.price : item.product.price;
  const maxStock = item.variant ? item.variant.stock : item.product.stock;

  const hasRealVariant = item.variant && Object.keys(item.variant.attributes).length > 0;

  return (
    <TableRow>
      <TableCell className="w-10 px-2">
        <Checkbox
          id={`select-${item.cartItemId}`}
          checked={selected}
          onCheckedChange={() => onToggleSelect(item.cartItemId)}
          aria-label={`Select ${item.product.name}`}
        />
      </TableCell>
      <TableCell className="min-w-[200px] max-w-[min(100vw-12rem,28rem)]">
        <div className="flex items-center gap-3">
          <div className="bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-md md:h-14 md:w-14">
            {item.product.imageUrl ? (
              <Image
                src={item.product.imageUrl}
                alt=""
                fill
                className="object-contain p-1"
              />
            ) : (
              <ProductImageFallback className="absolute inset-0" iconClassName="h-6 w-6 md:h-7 md:w-7" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate font-medium leading-tight">{item.product.name}</p>
            {hasRealVariant && (
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                {Object.entries(item.variant!.attributes).map(([key, value]) => (
                  <span key={key} className="bg-accent rounded px-1.5 py-0 capitalize">
                    {key}: {value}
                  </span>
                ))}
              </div>
            )}
            <p className="text-orange-600 mt-1 text-sm font-semibold sm:hidden">{formatCurrency(itemPrice)}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden whitespace-nowrap sm:table-cell">
        <span className="text-orange-600 font-semibold">{formatCurrency(itemPrice)}</span>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div className="inline-flex items-center gap-0.5">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => handleUpdateQuantity(item.quantity - 1)}
            disabled={item.quantity <= 1 || loading}
            aria-label="Decrease quantity"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => handleUpdateQuantity(item.quantity + 1)}
            disabled={item.quantity >= maxStock || loading}
            aria-label="Increase quantity"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="w-12 px-2 text-right">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 hover:bg-red-50"
          onClick={handleRemoveItem}
          disabled={loading}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </TableCell>
    </TableRow>
  );
};
