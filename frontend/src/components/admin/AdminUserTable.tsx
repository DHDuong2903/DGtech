"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Award, MoreHorizontal, Pencil, Shield, Trash2, UserCheck } from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type { User } from "@/src/types";
import { cn } from "@/src/lib/utils";

function TierBadge({ tier }: { tier: User["tier"] }) {
  if (!tier) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  const styles: Record<NonNullable<User["tier"]>, string> = {
    bronze: "border-amber-700/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    silver: "border-slate-400/50 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
    gold: "border-yellow-600/40 bg-yellow-50 text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-100",
  };
  return (
    <Badge variant="outline" className={cn("capitalize", styles[tier])}>
      <Award className="h-3 w-3" />
      {tier}
    </Badge>
  );
}

export function createAdminUserColumns(handlers: {
  onRole: (user: User) => void;
  onDelete: (user: User) => void;
}): ColumnDef<User>[] {
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
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <Badge variant={role === "admin" ? "default" : "secondary"}>
            {role === "admin" ? (
              <>
                <Shield className="mr-1 h-3 w-3" />
                Admin
              </>
            ) : (
              <>
                <UserCheck className="mr-1 h-3 w-3" />
                User
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: "tier",
      header: "Tier",
      cell: ({ row }) => <TierBadge tier={row.original.tier} />,
    },
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ row }) => row.original.username || "—",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || "—",
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => {
        const addr = row.original.address?.trim();
        return (
          <span className="block max-w-[200px] truncate" title={addr || undefined}>
            {addr || "—"}
          </span>
        );
      },
    },
    {
      accessorFn: (row) => row.createdAt ?? "",
      id: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const d = row.original.createdAt;
        return d
          ? new Date(d).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—";
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const user = row.original;
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
                <DropdownMenuItem onClick={() => handlers.onRole(user)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(user)}>
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
