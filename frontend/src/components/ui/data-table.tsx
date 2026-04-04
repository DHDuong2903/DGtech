"use client";

import * as React from "react";
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type Table as TanstackTable,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { cn } from "@/src/lib/utils";

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}

export interface DataTableBulkContext<TData> {
  table: TanstackTable<TData>;
  selectedRows: Row<TData>[];
  selectedData: TData[];
  clearSelection: () => void;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageSize?: number;
  filterColumnId?: string;
  filterPlaceholder?: string;
  showToolbar?: boolean;
  showColumnVisibility?: boolean;
  enableSorting?: boolean;
  showFooterSelectionSummary?: boolean;
  enableRowSelection?: boolean;
  bulkSelectionActions?: (ctx: DataTableBulkContext<TData>) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 10,
  filterColumnId,
  filterPlaceholder = "Filter…",
  showToolbar = true,
  showColumnVisibility = true,
  enableSorting = true,
  showFooterSelectionSummary = true,
  enableRowSelection = true,
  bulkSelectionActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    ...(enableSorting
      ? { getSortedRowModel: getSortedRowModel(), onSortingChange: setSorting }
      : { enableSorting: false }),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    initialState: {
      pagination: { pageSize },
    },
    state: {
      ...(enableSorting ? { sorting } : {}),
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const filterColumn = filterColumnId ? table.getColumn(filterColumnId) : undefined;

  const selectedModel = table.getFilteredSelectedRowModel();
  const bulkCtx: DataTableBulkContext<TData> | null =
    enableRowSelection && bulkSelectionActions && selectedModel.rows.length > 0
      ? {
          table,
          selectedRows: selectedModel.rows,
          selectedData: selectedModel.rows.map((r) => r.original),
          clearSelection: () => setRowSelection({}),
        }
      : null;

  return (
    <div className="w-full space-y-4">
      {showToolbar && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {filterColumn && (
              <Input
                placeholder={filterPlaceholder}
                value={(filterColumn.getFilterValue() as string) ?? ""}
                onChange={(event) => filterColumn.setFilterValue(event.target.value)}
                className="max-w-sm"
              />
            )}
          </div>
          {showColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  Columns
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    const label =
                      (column.columnDef.meta as { label?: string } | undefined)?.label ??
                      column.id;
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {bulkCtx && bulkSelectionActions && (
        <div className="bg-muted/40 flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2">
          {bulkSelectionActions(bulkCtx)}
        </div>
      )}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {enableRowSelection && showFooterSelectionSummary ? (
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
        ) : !enableRowSelection ? (
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredRowModel().rows.length} row(s).
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="flex items-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
