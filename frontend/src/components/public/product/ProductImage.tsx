import { Package } from "lucide-react";

interface ProductImageProps {
  imageUrl?: string;
  name: string;
}

export const ProductImage = ({ imageUrl, name }: ProductImageProps) => {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[min(100%,22rem)] justify-self-center sm:max-w-[min(100%,26rem)] md:max-w-[min(100%,28rem)] lg:mx-0 lg:max-w-none lg:justify-self-stretch">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/40">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="text-muted-foreground h-16 w-16" />
          </div>
        )}
      </div>
    </div>
  );
};
