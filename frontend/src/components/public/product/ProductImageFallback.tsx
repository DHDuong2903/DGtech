import { Sofa } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface ProductImageFallbackProps {
  className?: string;
  iconClassName?: string;
}

/** Placeholder when a product has no image (storefront + admin). */
export function ProductImageFallback({ className, iconClassName }: ProductImageFallbackProps) {
  return (
    <div
      role="img"
      aria-label="No product image"
      className={cn("flex items-center justify-center bg-muted", className)}
    >
      <Sofa className={cn("text-muted-foreground shrink-0", iconClassName ?? "h-10 w-10")} />
    </div>
  );
}
