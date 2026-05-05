"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type Table as TanstackTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/src/lib/utils";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

export interface DataTableBulkContext<TData> {
  table: TanstackTable<TData>;
  selectedRows: Row<TData>[];
  selectedData: TData[];
  clearSelection: () => void;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Stable row id for selection (e.g. primary key). Defaults to row index if omitted. */
  getRowId?: (originalRow: TData, index: number) => string;
  pageSize?: number;
  filterColumnId?: string;
  filterPlaceholder?: string;
  showToolbar?: boolean;
  showFooterSelectionSummary?: boolean;
  enableRowSelection?: boolean;
  bulkSelectionActions?: (ctx: DataTableBulkContext<TData>) => React.ReactNode;
  /** When provided, the 'actions' column header is replaced by a 'Remove (N)' button when rows are selected. */
  onBulkDelete?: (ctx: DataTableBulkContext<TData>) => void;
  bulkDeleteDisabled?: boolean;
  /** Rendered to the right of the search input in the toolbar (e.g. filter popover). */
  toolbarEnd?: React.ReactNode;
  /** Label for the total count (e.g. 'products', 'variants'). Defaults to 'row(s)'. */
  noun?: string;
  /** When false, hides the bottom pagination row (e.g. server-side paging). Default true. */
  showPagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  pageSize = 10,
  filterColumnId,
  filterPlaceholder = "Filter…",
  showToolbar = true,
  showFooterSelectionSummary = true,
  enableRowSelection = true,
  bulkSelectionActions,
  onBulkDelete,
  bulkDeleteDisabled,
  toolbarEnd,
  noun = "row(s)",
  showPagination = true,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const columnFiltersKey = React.useMemo(() => JSON.stringify(columnFilters), [columnFilters]);

  const table = useReactTable({
    data,
    columns,
    ...(getRowId
      ? { getRowId: (originalRow: TData, index: number) => getRowId(originalRow, index) }
      : {}),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSorting: false,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    /** Keep current page when `data` is updated in place (e.g. editing variant cells). */
    autoResetPageIndex: false,
    initialState: {
      pagination: { pageSize },
    },
    state: {
      columnFilters,
      rowSelection,
    },
  });

  const tableRef = React.useRef(table);
  tableRef.current = table;

  React.useEffect(() => {
    tableRef.current.setPageIndex(0);
  }, [columnFiltersKey]);

  const filterColumn = filterColumnId ? table.getColumn(filterColumnId) : undefined;

  const pageCount = table.getPageCount();
  const currentPage = pageCount > 0 ? table.getState().pagination.pageIndex + 1 : 1;
  const totalPages = pageCount > 0 ? pageCount : 1;

  const selectedModel = table.getFilteredSelectedRowModel();
  const bulkCtx: DataTableBulkContext<TData> | null =
    enableRowSelection && (bulkSelectionActions || onBulkDelete) && selectedModel.rows.length > 0
      ? {
          table,
          selectedRows: selectedModel.rows,
          selectedData: selectedModel.rows.map((r) => r.original),
          clearSelection: () => setRowSelection({}),
        }
      : null;

  return (
    <div className="w-full space-y-4">
      {showToolbar && (filterColumn || toolbarEnd) && (
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
            {toolbarEnd}
          </div>
        </div>
      )}

      {bulkCtx && bulkSelectionActions && !onBulkDelete && (
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
                  <TableHead key={header.id} className={cn(header.column.id === "actions" && "text-right")}>
                    {header.column.id === "actions" && bulkCtx && onBulkDelete ? (
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onBulkDelete(bulkCtx)}
                          disabled={bulkDeleteDisabled}
                        >
                          Remove ({bulkCtx.selectedRows.length})
                        </Button>
                      </div>
                    ) : (
                      header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())
                    )}
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

      {showPagination && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground flex flex-1 flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <span className="flex items-center gap-1">
              <span>{table.getFilteredRowModel().rows.length}</span> {noun}
              {enableRowSelection && table.getFilteredSelectedRowModel().rows.length > 0 && (
                <span className="ml-1 opacity-70">
                  ({table.getFilteredSelectedRowModel().rows.length} selected)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
