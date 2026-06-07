"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, MoreHorizontal, Power, PowerOff, Trash2 } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type { ShowroomScene, ShowroomSceneSlot } from "@/src/types";

export type AdminShowroomSceneRow = ShowroomScene & { slots?: ShowroomSceneSlot[] };

export function createAdminShowroomColumns(handlers: {
  onDelete: (scene: AdminShowroomSceneRow) => void;
  onToggleActive: (scene: AdminShowroomSceneRow) => void;
  togglingSceneId?: string | null;
}): ColumnDef<AdminShowroomSceneRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
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
      header: "Scene Name",
      cell: ({ row }) => <span>{row.original.name}</span>,
    },
    {
      id: "room",
      header: "Room",
      cell: ({ row }) => row.original.room?.name || "No room",
    },
    {
      id: "model",
      header: "Model",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.roomModelFileName || (row.original.roomModelUrl ? "Saved model" : "No model")}
        </span>
      ),
    },
    {
      id: "positions",
      header: "Positions",
      cell: ({ row }) => row.original.positionsCount ?? row.original.slots?.length ?? 0,
    },
    {
      accessorKey: "isActive",
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
        const scene = row.original;
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
                  <Link href={`/admin/showroom/${scene.sceneId}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Detail
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlers.onToggleActive(scene)} disabled={handlers.togglingSceneId === scene.sceneId}>
                  {scene.isActive ? (
                    <>
                      <PowerOff className="mr-2 h-4 w-4" />
                      Inactive
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 h-4 w-4" />
                      Active
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(scene)}>
                  <Trash2 className="mr-2 h-4 w-4" />
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
