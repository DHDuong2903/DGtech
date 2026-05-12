"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import type { StockReceiptLineInput } from "@/src/types";

const numberInputClass =
  "h-8 w-full text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

type Props = {
  lines: StockReceiptLineInput[];
  lineLabels: Map<string, string>;
  editable: boolean;
  /** Selection column + bulk Remove (draft edit / create only) */
  showSelection: boolean;
  onChangeLine: (index: number, patch: Partial<StockReceiptLineInput>) => void;
  onRemoveVariantIds: (variantIds: string[]) => void;
  /** Posted receipts: show posted total when provided, else sum of lines */
  postedTotal?: number | null;
  /** Footer label + amount source for posted vs draft */
  footerMode?: "draft" | "posted";
};

function draftLineTotal(row: StockReceiptLineInput) {
  const qty = Math.max(0, row.quantity || 0);
  const cost = Math.max(0, row.unitCost || 0);
  return Math.round(qty * cost * 100) / 100;
}

export function StockReceiptLinesTable({
  lines,
  lineLabels,
  editable,
  showSelection,
  onChangeLine,
  onRemoveVariantIds,
  postedTotal,
  footerMode = "draft",
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = new Set(lines.map((l) => l.variantId));
    setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
  }, [lines]);

  const variantIds = useMemo(() => lines.map((l) => l.variantId), [lines]);
  const someSelected = variantIds.some((id) => selected.has(id));
  const allSelected = variantIds.length > 0 && variantIds.every((id) => selected.has(id));
  const headerCheckboxState = !someSelected ? false : allSelected ? true : "indeterminate";

  const draftTotals = useMemo(() => {
    const t = lines.reduce((s, row) => s + draftLineTotal(row), 0);
    return Math.round(t * 100) / 100;
  }, [lines]);

  const footerAmount =
    footerMode === "posted" && postedTotal != null && Number.isFinite(Number(postedTotal))
      ? Number(postedTotal)
      : draftTotals;

  const footerCaption = footerMode === "posted" ? "Posted total" : "Receipt total";

  const toggleOne = (variantId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const toggleSelectAll = (on: boolean) => {
    if (on) setSelected(new Set(variantIds));
    else setSelected(new Set());
  };

  const handleRemove = () => {
    if (selected.size === 0) return;
    onRemoveVariantIds([...selected]);
    setSelected(new Set());
  };

  const labelColSpan = showSelection ? 4 : 3;

  return (
    <div className="min-h-0 w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-[0_1px_0_hsl(var(--border))]">
          <TableRow>
            {showSelection && (
              <TableHead className="w-10 p-2">
                <Checkbox
                  checked={headerCheckboxState}
                  onCheckedChange={(v) => toggleSelectAll(v === true)}
                  disabled={variantIds.length === 0}
                  aria-label="Select all lines"
                />
              </TableHead>
            )}
            <TableHead className="min-w-0">Variant</TableHead>
            <TableHead className="w-24 text-right">Qty</TableHead>
            <TableHead className="w-28 text-right">Unit cost</TableHead>
            <TableHead className="w-40 min-w-[10rem] text-right">
              <div className="flex flex-row items-center justify-end gap-2">
                <span className="shrink-0">Line total</span>
                {showSelection && selected.size > 0 ? (
                  <Button type="button" variant="destructive" size="sm" className="h-7 shrink-0 text-xs" onClick={handleRemove}>
                    Remove ({selected.size})
                  </Button>
                ) : null}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((row, index) => (
            <TableRow key={`${row.variantId}-${index}`} className="hover:bg-muted/30">
              {showSelection && (
                <TableCell className="w-10 p-2">
                  <Checkbox
                    checked={selected.has(row.variantId)}
                    onCheckedChange={() => toggleOne(row.variantId)}
                    aria-label="Select line"
                  />
                </TableCell>
              )}
              <TableCell className="max-w-0 whitespace-normal">
                <div className="wrap-break-word pr-2">
                  {(lineLabels.get(row.variantId) ?? "").trim() || ""}
                </div>
              </TableCell>
              <TableCell className="w-24 text-right">
                {!editable ? (
                  <span className="tabular-nums">{row.quantity}</span>
                ) : (
                  <Input
                    type="number"
                    min={1}
                    className={`${numberInputClass} w-20 min-w-0 sm:w-full`}
                    value={row.quantity}
                    onChange={(e) =>
                      onChangeLine(index, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                  />
                )}
              </TableCell>
              <TableCell className="w-28 text-right">
                {!editable ? (
                  <span className="tabular-nums">{Number(row.unitCost).toFixed(2)}</span>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className={`${numberInputClass} w-24 min-w-0 sm:w-full`}
                    value={row.unitCost}
                    onChange={(e) =>
                      onChangeLine(index, { unitCost: Math.max(0, parseFloat(e.target.value) || 0) })
                    }
                  />
                )}
              </TableCell>
              <TableCell className="w-40 min-w-[10rem] text-right tabular-nums text-foreground">{draftLineTotal(row).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="border-t border-border bg-muted/40 hover:bg-muted/40">
            <TableCell colSpan={labelColSpan} className="py-2.5 text-right align-middle">
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">{footerCaption}</span>
            </TableCell>
            <TableCell className="w-40 min-w-[10rem] py-2.5 text-right align-middle">
              <span className="text-primary text-lg font-bold tabular-nums tracking-tight">{footerAmount.toFixed(2)}</span>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
