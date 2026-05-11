import { ProductImageFallback } from "./ProductImageFallback";
import Image from "next/image";

interface ProductImageProps {
  imageUrl?: string;
  name: string;
}

export const ProductImage = ({ imageUrl, name }: ProductImageProps) => {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[min(100%,22rem)] justify-self-center sm:max-w-[min(100%,26rem)] md:max-w-[min(100%,28rem)] lg:mx-0 lg:max-w-none lg:justify-self-stretch">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/40">
        {imageUrl ? (
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
