import { cn } from "@/src/lib/utils";

/** Full-area page spinner — same visual as admin; no caption. */
export function PageContentSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-10 w-10 shrink-0 animate-spin rounded-full border-4 border-primary border-t-transparent",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Centers {@link PageContentSpinner} in the content region.
 * Use smaller `minHeightClass` inside sections (e.g. featured products).
 */
export function PageContentLoader({
  className,
  minHeightClass = "min-h-[min(70vh,calc(100dvh-10rem))]",
}: {
  className?: string;
  /** Tailwind min-height for vertical centering */
  minHeightClass?: string;
}) {
  return (
    <div className={cn("flex w-full items-center justify-center", minHeightClass, className)}>
      <PageContentSpinner />
    </div>
  );
}
