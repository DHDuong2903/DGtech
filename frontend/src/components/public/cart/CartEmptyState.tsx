import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

export function CartEmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-lg shadow-sm">
      <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Giỏ hàng trống</h2>
      <p className="text-gray-600 mb-6">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</p>
      <Link href="/shop">
        <Button size="lg" className="gap-2">
          <ShoppingBag className="h-5 w-5" />
          Khám phá sản phẩm
        </Button>
      </Link>
    </div>
  );
}
