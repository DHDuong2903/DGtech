"use client";

import { Package } from "lucide-react";
import { useState } from "react";

interface ProductImageProps {
  imageUrl?: string;
  alt: string;
  className?: string;
}

export const ProductImage = ({ imageUrl, alt, className = "h-12 w-12" }: ProductImageProps) => {
  const [imageError, setImageError] = useState(false);

  if (!imageUrl || imageError) {
    return (
      <div className={`${className} rounded-md bg-muted flex items-center justify-center border`}>
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={imageUrl}
      alt={alt}
      className={`${className} rounded-md object-cover border`}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  );
};
