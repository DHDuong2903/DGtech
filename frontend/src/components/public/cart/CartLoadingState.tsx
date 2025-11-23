import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

interface CartLoadingStateProps {
  type: "loading" | "auth-loading" | "not-signed-in";
  onGoHome?: () => void;
}

export function CartLoadingState({ type, onGoHome }: CartLoadingStateProps) {
  if (type === "loading" || type === "auth-loading") {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">{type === "auth-loading" ? "Đang tải..." : "Đang tải giỏ hàng..."}</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === "not-signed-in") {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center py-16 bg-white rounded-lg shadow-sm">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Vui lòng đăng nhập</h2>
            <p className="text-gray-600 mb-6">Bạn cần đăng nhập để xem giỏ hàng của mình</p>
            <Button onClick={onGoHome}>Về trang chủ</Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
