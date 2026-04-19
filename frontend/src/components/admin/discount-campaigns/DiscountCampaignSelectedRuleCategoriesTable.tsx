"use client";

import React, { useState } from "react";
import type { Category, Product } from "@/src/types";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Tag } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

interface Props {
  categoryIds: number[];
  categories: Category[];
  products: Product[];
  onDeleteCategories: (ids: number[]) => void;
}

export function DiscountCampaignSelectedRuleCategoriesTable({
  categoryIds,
  categories,
  products,
  onDeleteCategories,
}: Props) {
  const [marked, setMarked] = useState<number[]>([]);

  const handleToggleMark = (id: number) => {
    setMarked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (marked.length === categoryIds.length) {
      setMarked([]);
    } else {
      setMarked([...categoryIds]);
    }
  };

  const handleDelete = () => {
    onDeleteCategories(marked);
    setMarked([]);
  };

  if (!categoryIds.length) {
    return <p className="text-muted-foreground text-sm">No categories selected yet.</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col gap-2">
      <div className="flex min-h-0 flex-1 w-full overflow-y-auto overflow-x-hidden rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_hsl(var(--border))]">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={marked.length === categoryIds.length && categoryIds.length > 0}
                  onCheckedChange={handleToggleAll}
                  aria-label="Select all categories"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-28 text-right">Quantity</TableHead>
              <TableHead className="w-24 px-4 text-right">
                {marked.length > 0 ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleDelete}
                  >
                    Remove ({marked.length})
                  </Button>
                ) : null}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryIds.map((cid) => {
              const c = categories.find((x) => x.categoryId === cid);
              if (!c) return null;
              
              const qty = products.filter((p) => p.categoryId === cid).length;
              return (
                <TableRow key={cid} className="hover:bg-muted/40 group">
                  <TableCell className="w-10 p-2 align-middle">
                    <Checkbox
                      checked={marked.includes(cid)}
                      onCheckedChange={() => handleToggleMark(cid)}
                      aria-label={c.name}
                    />
                  </TableCell>
                  <TableCell className="max-w-0 whitespace-normal p-2 align-middle">
                    <div className="flex min-w-0 items-center gap-2 pr-4">
                      <div className="bg-muted relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border">
                        <Tag className="text-muted-foreground h-4 w-4" />
                      </div>
                      <span className="min-w-0 truncate font-medium leading-tight">
                        {c.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="w-28 p-2 align-middle right-0 tabular-nums font-semibold text-foreground text-right text-xs">
                    {qty}
                  </TableCell>
                  <TableCell className="w-24 px-4 align-middle" />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
