"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/src/lib/utils";

export type SpinnerProps = React.ComponentProps<typeof Loader2> & {
  "data-icon"?: "inline-start" | "inline-end";
};

/**
 * Loading indicator for buttons. Use with {@link Button}: place inside the button and set `disabled` while loading.
 * Optional `data-icon="inline-start"` / `inline-end` for spacing with label text.
 */
function Spinner({ className, "data-icon": dataIcon, ...props }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      data-icon={dataIcon}
      className={cn(
        "size-4 shrink-0 animate-spin",
        dataIcon === "inline-start" && "-ml-0.5",
        dataIcon === "inline-end" && "-mr-0.5",
        className
      )}
      {...props}
    />
  );
}

export { Spinner };
