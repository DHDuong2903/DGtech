import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, BadgePercent, Package } from "lucide-react";

interface ProductImageProps {
  imageUrl?: string;
  name: string;
  isFeatured?: boolean;
  isOnSale?: boolean;
}

export const ProductImage = ({ imageUrl, name, isFeatured, isOnSale }: ProductImageProps) => {
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

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {isFeatured && (
                <Badge className="bg-yellow-600 hover:bg-yellow-700">
                  <Star className="h-3 w-3 mr-1" />
                  Nổi bật
                </Badge>
              )}
              {isOnSale && (
                <Badge className="bg-red-600 hover:bg-red-700">
                  <BadgePercent className="h-3 w-3 mr-1" />
                  Giảm giá
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
