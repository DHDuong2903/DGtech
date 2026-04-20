"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import { formatCurrency } from "@/src/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import type { AdminVariantGridRow } from "./variantUtils";

export function createAdminVariantEditColumns(
  setVariantsGrid: Dispatch<SetStateAction<AdminVariantGridRow[]>>,
): ColumnDef<AdminVariantGridRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "attributes",
      header: "Variant",
      cell: ({ row }) => (
        <span className="break-words">{Object.values(row.original.attributes).join(" / ")}</span>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <Input
          type="number"
          step="0.01"
          min="0"
          className="h-8 max-w-[120px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={row.original.price}
          onChange={(e) => {
            setVariantsGrid((g) => {
              const i = g.indexOf(row.original);
              if (i === -1) return g;
              const next = [...g];
              next[i] = { ...next[i], price: e.target.value };
              return next;
            });
          }}
        />
      ),
    },
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => (
        <Input
          type="number"
          min="0"
          className="h-8 max-w-[100px]"
          value={row.original.stock}
          onChange={(e) => {
            setVariantsGrid((g) => {
              const i = g.indexOf(row.original);
              if (i === -1) return g;
              const next = [...g];
              next[i] = { ...next[i], stock: e.target.value };
              return next;
            });
          }}
        />
      ),
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <Input
          className="h-8 max-w-[140px]"
          value={row.original.sku}
          onChange={(e) => {
            setVariantsGrid((g) => {
              const i = g.indexOf(row.original);
              if (i === -1) return g;
              const next = [...g];
              next[i] = { ...next[i], sku: e.target.value };
              return next;
            });
          }}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setVariantsGrid((g) => g.filter((v) => v !== row.original))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}

export const ADMIN_VARIANT_VIEW_COLUMNS: ColumnDef<AdminVariantGridRow>[] = [
  {
    accessorKey: "attributes",
    header: "Variant",
    cell: ({ row }) => (
      <span className="break-words">
        {Object.entries(row.original.attributes)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" / ")}
      </span>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => (
      <span className="text-foreground">{formatCurrency(Number(row.original.price) || 0)}</span>
    ),
  },
  {
    accessorKey: "stock",
    header: "Stock",
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <span className="text-muted-foreground break-words">{row.original.sku}</span>,
  },
];
