"use client";

import { useEffect, useState, useMemo } from "react";
import type { Category } from "@/src/types";
import { Tag, Search } from "lucide-react";
import { useProductStore } from "@/src/stores";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  initialCategoryIds: number[];
  onConfirm: (categoryIds: number[]) => void;
};

export function DiscountCampaignCategoryPickerModal({
  open,
  onOpenChange,
  categories,
  initialCategoryIds,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const products = useProductStore((s) => s.products);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }
    setDraft([...initialCategoryIds]);
  }, [open, initialCategoryIds]);

  const toggle = (id: number) => {
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(88dvh,720px)] w-[min(92vw,640px)] max-w-[640px] flex-col gap-3 overflow-hidden p-4 sm:max-w-[min(92vw,640px)]"
      >
        <DialogHeader className="shrink-0 space-y-0 p-0">
          <DialogTitle>Select categories</DialogTitle>
        </DialogHeader>
        <div className="relative max-w-xs shrink-0">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
            aria-label="Search categories"
          />
        </div>
        <div className="min-h-0 max-h-[min(50vh,420px)] overflow-auto rounded-md border">
          <Table>
            <TableHeader className="bg-background sticky top-0 z-20 shadow-[0_1px_0_hsl(var(--border))]">
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Name</TableHead>
                <TableHead className="w-28 pr-4 text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((c) => {
                  const qty = products.filter((p) => p.categoryId === c.categoryId).length;
                  return (
                    <TableRow key={c.categoryId}>
                      <TableCell className="w-10">
                        <Checkbox
                          checked={draft.includes(c.categoryId)}
                          onCheckedChange={() => toggle(c.categoryId)}
                          aria-label={c.name}
                        />
                      </TableCell>
                      <TableCell className="max-w-0 whitespace-normal">
                        <div className="flex min-w-0 items-center gap-2 pr-4">
                          <div className="bg-muted relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border">
                            <Tag className="text-muted-foreground h-4 w-4" />
                          </div>
                          <span className="min-w-0 truncate font-semibold leading-tight">{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-28 pr-4 text-right text-xs tabular-nums font-semibold text-foreground">
                        {qty}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t pt-3 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm(draft);
              onOpenChange(false);
            }}
          >
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
