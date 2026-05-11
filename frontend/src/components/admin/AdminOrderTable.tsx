"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Package, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
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
import type { Order } from "@/src/types";
import {
  formatCurrency,
  getPaymentStatusColor,
  getPaymentStatusLabel,
  getStatusColor,
  getStatusLabel,
} from "@/src/utils";

export function createAdminOrderColumns(handlers: { onDelete: (order: Order) => void }): ColumnDef<Order>[] {
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
      accessorFn: (row) => row.orderId.slice(0, 8),
      id: "orderIdShort",
      header: "Order ID",
      cell: ({ row }) => <span className="font-medium">#{row.original.orderId.slice(0, 8)}</span>,
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const o = row.original;
        const label = o.user?.username?.trim() || o.user?.email?.trim() || "";
        return (
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-muted-foreground text-xs">{o.user?.email || o.phone}</p>
          </div>
        );
      },
    },
    {
      accessorFn: (row) => row.items.length,
      id: "qty",
      header: "Quantity",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Package className="text-muted-foreground h-4 w-4" />
          <span className="text-sm">{row.original.items.length} items</span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm">{new Date(row.original.createdAt).toLocaleDateString("en-US")}</span>
      ),
    },
    {
      accessorKey: "totalPrice",
      header: "Total",
      cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.totalPrice)}</span>,
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant={row.original.paymentMethod === "COD" ? "secondary" : "default"}>
          {row.original.paymentMethod === "COD" ? "COD" : "Bank Transfer"}
        </Badge>
      ),
    },
    {
      id: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const o = row.original;
        const isCancelled = o.status === "CANCELLED";
        const label = isCancelled ? "Cancelled" : getPaymentStatusLabel(o.paymentMethod, o.status, o.payment);
        const color = isCancelled
          ? "border-red-500/30 bg-red-500/15 text-red-950 dark:text-red-300"
          : getPaymentStatusColor(o.paymentMethod, o.status, o.payment);

        return <Badge className={color}>{label}</Badge>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>{getStatusLabel(row.original.status)}</Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders/${order.orderId}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    Detail
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(order)}>
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
