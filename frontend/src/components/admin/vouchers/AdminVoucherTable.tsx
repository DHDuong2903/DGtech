"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type { Voucher } from "@/src/types";

function typeLabel(v: Voucher) {
  if (v.voucherType === "PERCENT_DISCOUNT") return `${v.discountPercent}% off`;
  if (v.voucherType === "FIXED_DISCOUNT") return `${v.discountAmount.toFixed(2)} off`;
  if (v.voucherType === "FREE_SHIPPING") return "Free shipping";
  return "Bonus points";
}

export function createAdminVoucherColumns(handlers: {
  onDelete: (row: Voucher) => void;
  onSetActive: (row: Voucher) => void;
  onDeactivate: (row: Voucher) => void;
}): ColumnDef<Voucher>[] {
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
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-normal">
          {typeLabel(row.original)}
        </Badge>
      ),
    },
    {
      accessorKey: "audience",
      header: "Tier",
      cell: ({ row }) =>
        row.original.audience === "ALL_USERS" ? (
          <span>All users</span>
        ) : (
          <span className="capitalize">{row.original.tierTargets.join(", ") || "Tier users"}</span>
        ),
    },
    {
      accessorKey: "maxUsesPerUser",
      header: "Uses/user",
      cell: ({ row }) => <span>{row.original.maxUsesPerUser}</span>,
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => (row.original.expiresAt ? new Date(row.original.expiresAt).toLocaleDateString("vi-VN") : ""),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
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
        const voucher = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/vouchers/${voucher.voucherId}`} className="flex cursor-pointer items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                {voucher.isActive ? (
                  <DropdownMenuItem onClick={() => handlers.onDeactivate(voucher)}>
                    <PowerOff className="h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handlers.onSetActive(voucher)}>
                    <Power className="h-4 w-4" />
                    Set active
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(voucher)}>
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
