import { Button } from "@/components/ui/button";
import { Package, ArrowLeft } from "lucide-react";

interface ProductNotFoundProps {
  onBackToShop: () => void;
}

export const ProductNotFound = ({ onBackToShop }: ProductNotFoundProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm</h2>
        <p className="text-gray-600 mb-6">Sản phẩm này không tồn tại hoặc đã bị xóa</p>
        <Button onClick={onBackToShop}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại cửa hàng
        </Button>
      </div>
    </div>
  );
};
