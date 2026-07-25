"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { ProductImageFallback } from "./ProductImageFallback";

const GlbPreviewViewer = dynamic(
  () => import("@/src/components/shared/GlbPreviewViewer").then((mod) => mod.GlbPreviewViewer),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-muted/50" />,
  },
);

interface ProductImageProps {
  imageUrl?: string;
  model3dUrl?: string | null;
  name: string;
  /** Hex tint from selected Color variant (3D preview only). */
  tintHex?: string | null;
}

export const ProductImage = ({ imageUrl, model3dUrl, name, tintHex = null }: ProductImageProps) => {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[min(100%,22rem)] justify-self-center sm:max-w-[min(100%,26rem)] md:max-w-[min(100%,28rem)] lg:mx-0 lg:max-w-none lg:justify-self-stretch">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/40">
        {model3dUrl ? (
          <GlbPreviewViewer
            key={`${model3dUrl}:${tintHex || "default"}`}
            src={model3dUrl}
            title={`${name} 3D preview`}
            description="3D preview"
            className="h-full w-full rounded-xl border-0"
            useEmbeddedCameraMarkers={false}
            allowFreeNavigation
            tintHex={tintHex}
            fallback={
              imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={name}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ProductImageFallback className="h-full w-full" iconClassName="h-16 w-16" />
              )
            }
          />
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
            className="h-full w-full object-cover"
          />
        ) : (
          <ProductImageFallback className="h-full w-full" iconClassName="h-16 w-16" />
        )}
      </div>
    </div>
  );
};
