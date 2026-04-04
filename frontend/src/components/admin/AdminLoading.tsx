import { cn } from "@/src/lib/utils";

/** Primary admin spinner — no caption. */
export function AdminSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-10 w-10 shrink-0 animate-spin rounded-full border-4 border-primary border-t-transparent",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Centers {@link AdminSpinner} in the admin content area.
 * Use smaller `minHeightClass` inside cards (e.g. tables).
 */
export function AdminContentLoader({
  className,
  minHeightClass = "min-h-[min(70vh,calc(100dvh-10rem))]",
}: {
  className?: string;
  /** Tailwind min-height for vertical centering */
  minHeightClass?: string;
}) {
  return (
    <div className={cn("flex w-full items-center justify-center", minHeightClass, className)}>
      <AdminSpinner />
    </div>
  );
}
