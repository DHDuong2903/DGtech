"use client";

import Image from "next/image";
import { ShowroomProductPreview } from "@/src/components/public/showroom/ShowroomProductPreview";
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
import { cn } from "@/src/lib/utils";

type ProductMediaThumbProps = {
  imageUrl?: string | null;
  model3dUrl?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  previewClassName?: string;
  fallbackIconClassName?: string;
  sizes?: string;
};

export function ProductMediaThumb({
  imageUrl,
  model3dUrl,
  alt,
  className,
  imageClassName,
  previewClassName,
  fallbackIconClassName,
  sizes = "56px",
}: ProductMediaThumbProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-md border bg-background", className)}>
      {model3dUrl ? (
        <ShowroomProductPreview
          src={model3dUrl}
          className={cn("h-full w-full rounded-none border-0", previewClassName)}
        />
      ) : imageUrl ? (
        <Image src={imageUrl} alt={alt} fill sizes={sizes} className={cn("object-contain", imageClassName)} />
      ) : (
        <ProductImageFallback
          className="absolute inset-0"
          iconClassName={fallbackIconClassName ?? "h-6 w-6 md:h-7 md:w-7"}
        />
      )}
    </div>
  );
}
