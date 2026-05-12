"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, MoreHorizontal, Send } from "lucide-react";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type { StockReceipt } from "@/src/types";

export type StockReceiptTableActions = {
  /** Post a draft from the list row (server state only). */
  onPostDraft?: (receipt: StockReceipt) => void | Promise<void>;
  postingReceiptId?: string | null;
};

function cellText(v: string | null | undefined): string {
  const s = v == null ? "" : String(v).trim();
  return s;
}

function statusBadge(status: string) {
  const s = status?.toUpperCase();
  if (s === "POSTED") {
    return (
      <Badge variant="success" className="font-normal capitalize">
        Posted
      </Badge>
    );
  }
  if (s === "DRAFT") {
    return (
      <Badge variant="secondary" className="text-muted-foreground font-normal capitalize">
        Draft
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-normal">
      {cellText(status) || ""}
    </Badge>
  );
}

export function createAdminStockReceiptColumns(actions?: StockReceiptTableActions): ColumnDef<StockReceipt>[] {
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
    },
    {
      id: "receivedAt",
      header: "Received",
      cell: ({ row }) => {
        const raw = row.original.receivedAt;
        const ymd = raw ? String(raw).slice(0, 10) : "";
        return <span className="whitespace-nowrap tabular-nums">{cellText(ymd) || ""}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      id: "supplierName",
      header: "Supplier",
      cell: ({ row }) => <span>{cellText(row.original.supplierName)}</span>,
    },
    {
      id: "lines",
      header: "Lines",
      cell: ({ row }) => <span className="tabular-nums">{(row.original.lines || []).length}</span>,
    },
    {
      id: "totalCost",
      header: () => <div className="text-right">Total cost</div>,
      cell: ({ row }) => {
        const t = row.original.totalCost;
        if (t == null || !Number.isFinite(Number(t))) return <div className="text-right" />;
        return <div className="text-right tabular-nums">{Number(t).toFixed(2)}</div>;
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const r = row.original;
        const isDraft = r.status?.toUpperCase() === "DRAFT";
        const posting = actions?.postingReceiptId === r.receiptId;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Open menu">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/stock-receipts/${r.receiptId}`} className="flex cursor-pointer items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Detail
                  </Link>
                </DropdownMenuItem>
                {isDraft && actions?.onPostDraft && (
                  <DropdownMenuItem
                    disabled={posting}
                    className="gap-2"
                    onSelect={(e) => {
                      e.preventDefault();
                      void actions.onPostDraft?.(r);
                    }}
                  >
                    <Send className="h-4 w-4" />
                    Post receipt
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
