"use client"

import * as React from "react"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/src/lib/utils"

export type SpinnerProps = React.ComponentProps<typeof Loader2Icon> & {
  "data-icon"?: "inline-start" | "inline-end"
}

function Spinner({ className, "data-icon": dataIcon, ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      data-icon={dataIcon}
      className={cn(
        "size-4 shrink-0 animate-spin",
        dataIcon === "inline-start" && "",
        dataIcon === "inline-end" && "",
        className
      )}
      {...props}
    />
  )
}

export { Spinner }
