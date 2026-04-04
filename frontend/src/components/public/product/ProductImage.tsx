import { Card } from "@/src/components/ui/card";
import { Package } from "lucide-react";

interface ProductImageProps {
  imageUrl?: string;
  name: string;
}

export const ProductImage = ({ imageUrl, name }: ProductImageProps) => {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-lg">
        <Card className="overflow-hidden">
          <div className="aspect-square bg-white relative">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={name} className="w-full h-full object-contain p-4" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-24 w-24 text-gray-400" />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
