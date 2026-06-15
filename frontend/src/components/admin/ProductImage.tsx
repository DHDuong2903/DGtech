"use client";

import { ProductMediaThumb } from "@/src/components/shared/ProductMediaThumb";

interface ProductImageProps {
  imageUrl?: string | null;
  model3dUrl?: string | null;
  alt: string;
  className?: string;
}

export const ProductImage = ({ imageUrl, model3dUrl, alt, className = "h-12 w-12" }: ProductImageProps) => {
  return (
    <ProductMediaThumb
      imageUrl={imageUrl}
      model3dUrl={model3dUrl}
      alt={alt}
      className={className}
      sizes="48px"
      imageClassName="object-cover"
      fallbackIconClassName="h-6 w-6"
    />
  );
};
