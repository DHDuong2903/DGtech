"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type { Bundle } from "@/src/types/bundleType";

function discountLabel(b: Bundle) {
  if (b.discountKind === "PERCENT") return `${b.discountValue}%`;
  if (b.discountKind === "FIXED_AMOUNT") return `${b.discountValue.toFixed(2)} off`;
  return "—";
}

export function createAdminBundleColumns(handlers: {
  onDelete: (row: Bundle) => void;
  onSetActive: (row: Bundle) => void;
  onDeactivate: (row: Bundle) => void;
}): ColumnDef<Bundle>[] {
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
      accessorKey: "name",
      header: "Bundle name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: "discount",
      header: "Discount",
      cell: ({ row }) => <span>{discountLabel(row.original)}</span>,
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: ({ row }) => {
        const n = row.original.itemCount ?? row.original.items?.length ?? 0;
        return <span className="tabular-nums">{n}</span>;
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.isEnabled ? (
          <Badge variant="success" className="font-normal">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-normal">
            Inactive
          </Badge>
        ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const b = row.original;
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
                  <Link href={`/admin/bundles/${b.bundleId}`} className="flex cursor-pointer items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                {!b.isEnabled ? (
                  <DropdownMenuItem onClick={() => handlers.onSetActive(b)}>
                    <Power className="h-4 w-4" />
                    Set active
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handlers.onDeactivate(b)}>
                    <PowerOff className="h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(b)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
