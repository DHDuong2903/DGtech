import Link from "next/link";
import { Package, ShoppingBag } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export const EmptyOrdersState = () => {
  return (
    <div className="text-center py-16 bg-white rounded-lg shadow-sm">
      <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Chưa có đơn hàng</h2>
      <p className="text-gray-600 mb-6">Bạn chưa có đơn hàng nào</p>
      <Link href="/shop">
        <Button size="lg" className="gap-2">
          <ShoppingBag className="h-5 w-5" />
          Mua sắm ngay
        </Button>
      </Link>
    </div>
  );
};
