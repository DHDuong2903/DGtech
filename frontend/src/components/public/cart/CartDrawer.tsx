"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Minus, Plus, Trash2, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/src/components/ui/drawer";
import { Button } from "@/src/components/ui/button";
import { useCartStore } from "@/src/stores";
import type { Cart, CartItem as CartItemType } from "@/src/types";
import { formatCurrency } from "@/src/utils";
import { sortCartItemsForDisplay } from "@/src/utils/cartUtils";
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
import { FreeShippingCartProgress } from "./FreeShippingCartProgress";

function cartLineQuantity(cart: Cart) {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

function CartSheetLine({ item }: { item: CartItemType }) {
  const { loading, updateCartItem, removeFromCart } = useCartStore();

  const itemPrice = item.variant ? item.variant.price : item.product.price;
  const maxStock = item.variant ? item.variant.stock : item.product.stock;
  const hasRealVariant = !!item.variant && Object.keys(item.variant.attributes ?? {}).length > 0;

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateCartItem(item.cartItemId, newQuantity);
  };

  return (
    <div className="border-border flex gap-3 border-b px-3 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
            {item.product.imageUrl ? (
              <Image src={item.product.imageUrl} alt="" fill sizes="56px" className="object-contain" />
            ) : (
              <ProductImageFallback className="absolute inset-0" iconClassName="h-7 w-7" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium leading-tight">{item.product.name}</p>
            {hasRealVariant && (
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs">
                {Object.entries(item.variant!.attributes ?? {}).map(([key, value]) => (
                  <span key={key} className="bg-accent rounded px-1.5 py-0 capitalize">
                    {key}: {value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pl-17">
          <div className="inline-flex items-center gap-0.5">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => void handleUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1 || loading}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => void handleUpdateQuantity(item.quantity + 1)}
              disabled={item.quantity >= maxStock || loading}
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex w-22 shrink-0 flex-col items-end justify-between gap-2 pt-0.5">
        <span className="text-orange-600 text-sm font-semibold tabular-nums">{formatCurrency(itemPrice)}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 hover:bg-red-50"
          onClick={() => void removeFromCart(item.cartItemId)}
          disabled={loading}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const router = useRouter();
  const cart = useCartStore((s) => s.cart);
  const freeShippingMotivation = useCartStore((s) => s.freeShippingMotivation);
  const cartSheetOpen = useCartStore((s) => s.cartSheetOpen);
  const setCartSheetOpen = useCartStore((s) => s.setCartSheetOpen);

  const cartItems = cart?.items;
  const sortedItems = useMemo(() => sortCartItemsForDisplay(cartItems ?? []), [cartItems]);
  const hasLines = sortedItems.length > 0;
  const lineQty = cart ? cartLineQuantity(cart) : 0;

  const goToCheckout = () => {
    if (!sortedItems.length) return;
    const ids = sortedItems.map((i) => i.cartItemId);
    const params = new URLSearchParams();
    params.set("items", encodeURIComponent(JSON.stringify(ids)));
    setCartSheetOpen(false);
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <Drawer
      direction="right"
      open={cartSheetOpen}
      onOpenChange={setCartSheetOpen}
      shouldScaleBackground={false}
      setBackgroundColorOnScale={false}
    >
      <DrawerContent className="inset-y-0 right-0 left-auto top-0 mt-0 flex h-full max-h-none w-full max-w-md flex-col overflow-hidden rounded-l-xl border-l p-0">
        <DrawerHeader className="border-border relative space-y-1 border-b px-4 py-4 pr-12 text-left">
          <DrawerTitle>Your cart</DrawerTitle>
          <DrawerDescription>
            {lineQty > 0 ? `${lineQty} ${lineQty === 1 ? "item" : "items"} in your cart` : "Your cart is empty."}
          </DrawerDescription>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground absolute top-3 right-3 h-9 w-9 rounded-md"
              aria-label="Close cart"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!hasLines ? (
            <p className="text-muted-foreground p-4 text-sm">No items in your cart.</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {sortedItems.map((item) => (
                <CartSheetLine key={item.cartItemId} item={item} />
              ))}
            </div>
          )}
        </div>

        {cart && hasLines && (
          <div className="border-border shrink-0 border-t">
            <div className="px-4 pt-3">
              <FreeShippingCartProgress
                motivation={freeShippingMotivation}
                cartTotal={Number(cart.totalPrice) || 0}
              />
            </div>
            <div className="text-foreground flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">Estimated total</span>
              <span className="text-base font-semibold text-orange-600 tabular-nums">
                {formatCurrency(cart.totalPrice)}
              </span>
            </div>
          </div>
        )}

        <DrawerFooter className="border-border mt-0 shrink-0 gap-2 border-t p-4 pt-3">
          <Button type="button" size="lg" className="w-full" disabled={!hasLines} onClick={goToCheckout}>
            Checkout
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
