"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrderStore } from "../../../stores";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, MapPin, Phone, CreditCard, FileText } from "lucide-react";
import Link from "next/link";
import { formatCurrency, getStatusColor, getStatusLabel } from "../../../utils";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const getPaymentMethodLabel = (method: "COD" | "BANK_TRANSFER") => {
  return method === "COD" ? "Thanh toán khi nhận hàng" : "Chuyển khoản ngân hàng";
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const { isSignedIn, isLoaded } = useUser();
  const { currentOrder, loading, fetchOrderById, cancelOrder } = useOrderStore();
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn && orderId) {
      fetchOrderById(orderId);
    }
  }, [isLoaded, isSignedIn, orderId, fetchOrderById]);

  const handleCancelOrder = async () => {
    if (!currentOrder) return;
    await cancelOrder(currentOrder.orderId);
    setShowCancelModal(false);
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Đang tải chi tiết đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center py-16 bg-white rounded-lg shadow-sm">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Không tìm thấy đơn hàng</h2>
            <p className="text-gray-600 mb-6">Đơn hàng không tồn tại hoặc đã bị xóa</p>
            <Link href="/orders">
              <Button>Về danh sách đơn hàng</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/orders">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Đơn hàng #{currentOrder.orderId.slice(0, 8)}</h1>
              <Badge className={getStatusColor(currentOrder.status)}>{getStatusLabel(currentOrder.status)}</Badge>
            </div>
            <p className="text-gray-600">Đặt ngày: {new Date(currentOrder.createdAt).toLocaleString("vi-VN")}</p>
          </div>
          {(currentOrder.status === "PENDING" || currentOrder.status === "PROCESSING") && (
            <Button variant="destructive" onClick={() => setShowCancelModal(true)}>
              Hủy đơn hàng
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Sản phẩm đã đặt</h2>
              <div className="space-y-4">
                {currentOrder.items.map((item) => (
                  <div key={item.orderItemId} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="relative w-24 h-24 bg-gray-100 rounded shrink-0">
                      <Image
                        src={item.product?.imageUrl || "/images/placeholder.png"}
                        alt={item.product?.name || "Product"}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{item.product?.name || "Sản phẩm"}</h3>
                      <p className="text-gray-600 mb-2">Số lượng: {item.quantity}</p>
                      <p className="text-orange-600 font-bold">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Thông tin đơn hàng</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 text-gray-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Địa chỉ giao hàng</p>
                    <p className="text-gray-600">{currentOrder.shippingAddress}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="h-5 w-5 text-gray-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Số điện thoại</p>
                    <p className="text-gray-600">{currentOrder.phone}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CreditCard className="h-5 w-5 text-gray-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Phương thức thanh toán</p>
                    <p className="text-gray-600">{getPaymentMethodLabel(currentOrder.paymentMethod)}</p>
                  </div>
                </div>
                {currentOrder.notes && (
                  <div className="flex gap-3">
                    <FileText className="h-5 w-5 text-gray-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Ghi chú</p>
                      <p className="text-gray-600">{currentOrder.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Tổng đơn hàng</h2>
              <div className="space-y-3 mb-4 pb-4 border-b">
                <div className="flex justify-between text-gray-700">
                  <span>Tạm tính ({currentOrder.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm):</span>
                  <span className="font-semibold">{formatCurrency(currentOrder.totalPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-green-600">Miễn phí</span>
                </div>
              </div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold">Tổng cộng:</span>
                <span className="text-2xl font-bold text-orange-600">{formatCurrency(currentOrder.totalPrice)}</span>
              </div>

              {currentOrder.status === "DELIVERED" && <Button className="w-full mb-3">Mua lại</Button>}
              <Link href="/orders">
                <Button variant="outline" className="w-full">
                  Về danh sách đơn hàng
                </Button>
              </Link>
            </Card>
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Xác nhận hủy đơn hàng</DialogTitle>
              <DialogDescription className="pt-2">
                Bạn có chắc chắn muốn hủy đơn hàng{" "}
                <span className="font-semibold">#{currentOrder.orderId.slice(0, 8)}</span>? Số lượng sản phẩm sẽ được
                hoàn lại vào kho.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCancelModal(false)}>
                Đóng
              </Button>
              <Button type="button" variant="destructive" onClick={handleCancelOrder}>
                Xác nhận hủy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
