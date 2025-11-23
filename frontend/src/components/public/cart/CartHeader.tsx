import { Button } from "@/src/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CartHeaderProps {
  selectedCount: number;
  totalCount: number;
}

export function CartHeader({ selectedCount, totalCount }: CartHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Giỏ hàng của bạn</h1>
        <p className="text-gray-600">
          {selectedCount > 0 ? (
            <>
              Đã chọn <span className="font-semibold text-orange-600">{selectedCount}</span> sản phẩm / {totalCount} sản
              phẩm
            </>
          ) : (
            `${totalCount} sản phẩm trong giỏ hàng`
          )}
        </p>
      </div>
      <Link href="/shop">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Tiếp tục mua sắm
        </Button>
      </Link>
    </div>
  );
}
