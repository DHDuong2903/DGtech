"use client";

import { Fragment, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { BadgePercent, ChevronDown, Minus, Plus, Trash2 } from "lucide-react";
import { BundleSummaryHeader, BundleLineList, type BundleLineRow } from "@/src/components/public/bundle";
import { Checkbox } from "@/src/components/ui/checkbox";
import { TableCell, TableRow } from "@/src/components/ui/table";
import { CartItem as CartItemType } from "@/src/types";
import { useCartStore } from "@/src/stores";
import { cn } from "@/src/lib/utils";
import { formatCurrency } from "@/src/utils";
import { ProductMediaThumb } from "@/src/components/shared/ProductMediaThumb";
import {
  cartItemCompareAtUnit,
  cartItemMaxQuantity,
  cartItemUnitPrice,
  isBundleCartItem,
} from "@/src/utils/cartLineUtils";

interface CartItemProps {
  item: CartItemType;
  selected: boolean;
  onToggleSelect: (cartItemId: string) => void;
}

export const CartItem = ({ item, selected, onToggleSelect }: CartItemProps) => {
  const { loading, updateCartItem, removeFromCart } = useCartStore();
  const [bundleOpen, setBundleOpen] = useState(false);

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateCartItem(item.cartItemId, newQuantity);
  };

  const handleRemoveItem = async () => {
    await removeFromCart(item.cartItemId);
  };

  const itemPrice = cartItemUnitPrice(item);
  const compareAt = cartItemCompareAtUnit(item);
  const showCompareStrike = compareAt != null && compareAt > itemPrice;
  const maxStock = cartItemMaxQuantity(item);

  const hasRealVariant =
    !isBundleCartItem(item) &&
    item.variant &&
    Object.keys(item.variant.attributes ?? {}).length > 0;

  const bundleLines: BundleLineRow[] | null =
    isBundleCartItem(item) && item.bundleSnapshot?.lines?.length
      ? item.bundleSnapshot.lines.map((ln) => ({
          id: ln.variantId,
          imageUrl: ln.imageUrl,
          model3dUrl: ln.model3dUrl,
          name: ln.productName ?? "Product",
          attributes: ln.attributes ?? null,
          quantity: ln.quantity,
          href: ln.storefrontProductUrl ?? null,
        }))
      : null;

  if (bundleLines) {
    return (
      <Fragment>
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
            <BundleSummaryHeader
              variant="cart"
              name={item.bundleSnapshot?.name ?? item.product.name}
              discountKind={item.bundleSnapshot?.discountKind ?? "PERCENT"}
              discountValue={item.bundleSnapshot?.discountValue ?? 0}
            />
          </TableCell>
          <TableCell className="hidden whitespace-nowrap sm:table-cell">
            <div className="flex flex-wrap items-baseline justify-start gap-1.5">
              <span className="text-orange-600 font-semibold tabular-nums">{formatCurrency(itemPrice)}</span>
              {showCompareStrike ? (
                <span className="text-muted-foreground text-sm line-through tabular-nums">
                  {formatCurrency(compareAt)}
                </span>
              ) : null}
            </div>
          </TableCell>
          <TableCell className="whitespace-nowrap" />
          <TableCell className="w-19 px-1 text-right sm:w-21">
            <div className="inline-flex items-center justify-end gap-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-muted-foreground h-8 w-8 shrink-0"
                onClick={() => setBundleOpen((v) => !v)}
                aria-expanded={bundleOpen}
                aria-label={bundleOpen ? "Hide bundle contents" : "Show bundle contents"}
              >
                <ChevronDown
                  className={cn("h-5 w-5 transition-transform duration-200", bundleOpen && "rotate-180")}
                />
              </Button>
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
            </div>
          </TableCell>
        </TableRow>
        {bundleOpen ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={5} className="border-border bg-muted/20 p-0">
              <div className="max-h-[min(18rem,42vh)] overflow-y-auto overscroll-contain px-4 py-3">
                <BundleLineList lines={bundleLines} />
              </div>
            </TableCell>
          </TableRow>
        ) : null}
      </Fragment>
    );
  }

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
          <ProductMediaThumb
            imageUrl={item.product.imageUrl}
            model3dUrl={item.product.model3dUrl}
            alt={item.product.name}
            className="h-12 w-12 shrink-0 md:h-14 md:w-14"
            imageClassName="object-contain p-0"
            fallbackIconClassName="h-6 w-6 md:h-7 md:w-7"
          />
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
            {item.appliedCampaign?.name ? (
              <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                <BadgePercent className="h-3.5 w-3.5 shrink-0 text-orange-600" aria-hidden />
                <span className="truncate">{item.appliedCampaign.name}</span>
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-baseline gap-1.5 sm:hidden">
              <span className="text-orange-600 text-sm font-semibold tabular-nums">{formatCurrency(itemPrice)}</span>
              {showCompareStrike ? (
                <span className="text-muted-foreground text-xs line-through tabular-nums">
                  {formatCurrency(compareAt)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden whitespace-nowrap sm:table-cell">
        <div className="flex flex-wrap items-baseline justify-start gap-1.5">
          <span className="text-orange-600 font-semibold tabular-nums">{formatCurrency(itemPrice)}</span>
          {showCompareStrike ? (
            <span className="text-muted-foreground text-sm line-through tabular-nums">
              {formatCurrency(compareAt)}
            </span>
          ) : null}
        </div>
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
