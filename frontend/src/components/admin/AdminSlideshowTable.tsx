"use client";

import type { ColumnDef } from "@tanstack/react-table";
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
import type { SlideshowCampaign } from "../../types";

export function createAdminSlideshowColumns(handlers: {
  onEdit: (row: SlideshowCampaign) => void;
  onDelete: (row: SlideshowCampaign) => void;
  onActivate: (row: SlideshowCampaign) => void;
  onDeactivate: (row: SlideshowCampaign) => void;
}): ColumnDef<SlideshowCampaign>[] {
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
      header: "Slideshow name",
      cell: ({ row }) => <span>{row.original.name}</span>,
    },
    {
      id: "slideCount",
      header: "Slides",
      cell: ({ row }) => {
        const n = Array.isArray(row.original.slides) ? row.original.slides.length : 0;
        return <span className="text-muted-foreground tabular-nums">{n}</span>;
      },
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
      accessorFn: (row) => row.updatedAt ?? row.createdAt ?? "",
      id: "updatedAt",
      header: "Updated",
      cell: ({ row }) => {
        const d = row.original.updatedAt ?? row.original.createdAt;
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
        const s = row.original;
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
                <DropdownMenuItem onClick={() => handlers.onEdit(s)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {!s.isActive ? (
                  <DropdownMenuItem onClick={() => handlers.onActivate(s)}>
                    <Power className="h-4 w-4" />
                    Set active
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handlers.onDeactivate(s)}>
                    <PowerOff className="h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(s)}>
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
