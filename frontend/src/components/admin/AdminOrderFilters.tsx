"use client";

import { useState } from "react";
import { Filter, ListFilter } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";

/** Reserved for future order filters (payment method, date range, etc.). */
export function AdminOrderFilters() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0">
          <ListFilter className="h-4 w-4" />
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="end">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Filter className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-semibold">Filter orders</span>
        </div>
        <div className="p-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Extra filters (payment method, date range, etc.) can be added here later. Status chips above still apply to
            the list.
          </p>
          <Button type="button" size="sm" variant="secondary" className="mt-4 w-full" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
