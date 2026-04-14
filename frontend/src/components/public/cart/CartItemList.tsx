"use client";

import { CartItem as CartItemComponent } from "./CartItem";
import { CartItem as CartItemType } from "@/src/types";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Checkbox } from "@/src/components/ui/checkbox";

interface CartItemListProps {
  items: CartItemType[];
  selectedItems: Set<string>;
  onToggleSelect: (cartItemId: string) => void;
  onToggleSelectAll: () => void;
}

export function CartItemList({ items, selectedItems, onToggleSelect, onToggleSelectAll }: CartItemListProps) {
  const selectedCount = items.filter((item) => selectedItems.has(item.cartItemId)).length;
  const isAllSelected = items.length > 0 && selectedCount === items.length;
  const isSomeSelected = selectedCount > 0 && selectedCount < items.length;

  return (
    <div className="bg-card rounded-lg border">
      <Table>
        <TableHeader>
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
            <TableHead>Qty</TableHead>
            <TableHead className="w-12 px-2 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
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
  );
}
