"use client";

import { useMemo } from "react";
import { CartItem as CartItemComponent } from "./CartItem";
import { Button } from "@/src/components/ui/button";
import { CartItem as CartItemType } from "@/src/types";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Checkbox } from "@/src/components/ui/checkbox";
import { sortCartItemsForDisplay } from "@/src/utils/cartUtils";

interface CartItemListProps {
  items: CartItemType[];
  selectedItems: Set<string>;
  onToggleSelect: (cartItemId: string) => void;
  onToggleSelectAll: () => void;
  onRemoveSelected: () => void | Promise<void>;
  removeSelectedDisabled?: boolean;
}

export function CartItemList({
  items,
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  onRemoveSelected,
  removeSelectedDisabled,
}: CartItemListProps) {
  const sortedItems = useMemo(() => sortCartItemsForDisplay(items), [items]);
  const selectedCount = items.filter((item) => selectedItems.has(item.cartItemId)).length;
  const isAllSelected = items.length > 0 && selectedCount === items.length;
  const isSomeSelected = selectedCount > 0 && selectedCount < items.length;

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-card border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 px-2">
                <Checkbox
                  id="select-all-cart"
                  checked={isSomeSelected ? "indeterminate" : isAllSelected}
                  onCheckedChange={() => onToggleSelectAll()}
                  disabled={items.length === 0}
                  aria-label="Select all items in cart"
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="min-w-[100px] px-2 text-right">
                {selectedCount > 0 ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void onRemoveSelected()}
                    disabled={removeSelectedDisabled}
                  >
                    Remove ({selectedCount})
                  </Button>
                ) : (
                  <span className="sr-only">Actions</span>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <CartItemComponent
                key={item.cartItemId}
                item={item}
                selected={selectedItems.has(item.cartItemId)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
