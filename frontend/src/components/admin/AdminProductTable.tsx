"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Eye, Power, PowerOff, Trash2 } from "lucide-react";
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
import type { Product } from "@/src/types";
import { formatCurrency } from "@/src/utils";
import { ProductImage } from "./ProductImage";
import Link from "next/link";

export function createAdminProductColumns(handlers: {
  onDelete: (product: Product) => void;
  onSetActive: (product: Product) => void;
  onSetDraft: (product: Product) => void;
}): ColumnDef<Product>[] {
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
      id: "image",
      header: "Image",
      cell: ({ row }) => (
        <ProductImage imageUrl={row.original.imageUrl} alt={row.original.name} className="h-12 w-12" />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div>
            <p>{p.name}</p>
            {p.description?.trim() ? (
              <p className="text-muted-foreground line-clamp-1 text-sm" title={p.description}>
                {p.description}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorFn: (row) => row.category?.name ?? "",
      id: "categoryName",
      header: "Category",
      cell: ({ row }) => <Badge variant="outline">{row.original.category?.name ?? ""}</Badge>,
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => <span>{formatCurrency(row.original.price)}</span>,
    },
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const stock = row.original.stock;
        return <span className={stock < 10 ? "font-medium text-orange-600" : ""}>{stock}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        if (s === "ACTIVE") {
          return (
            <Badge variant="success" className="font-normal">
              Active
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            Draft
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const product = row.original;
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
                  <Link href={`/admin/products/${product.productId}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    Detail
                  </Link>
                </DropdownMenuItem>
                {product.status !== "ACTIVE" ? (
                  <DropdownMenuItem onClick={() => handlers.onSetActive(product)}>
                    <Power className="h-4 w-4" />
                    Set active
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handlers.onSetDraft(product)}>
                    <PowerOff className="h-4 w-4" />
                    Mark as draft
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(product)}>
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
