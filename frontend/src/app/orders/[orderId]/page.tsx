"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrderStore } from "../../../stores";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
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
} from "@/src/components/ui/dialog";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";

const getPaymentMethodLabel = (method: "COD" | "BANK_TRANSFER") => {
  return method === "COD" ? "Cash on delivery (COD)" : "Bank transfer";
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
    return <PageContentLoader className="bg-background" minHeightClass="min-h-screen" />;
  }

  if (!currentOrder) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-background py-16">
        <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
          <div className="bg-card border-border mx-auto max-w-md rounded-lg border py-16 text-center shadow-sm">
            <Package className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
            <h2 className="text-foreground text-2xl font-bold mb-2">Order not found</h2>
            <p className="text-muted-foreground mb-6">This order does not exist or has been removed.</p>
            <Link href="/orders">
              <Button>Back to orders</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-background py-8">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/orders">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">Order #{currentOrder.orderId.slice(0, 8)}</h1>
              <Badge className={getStatusColor(currentOrder.status)}>{getStatusLabel(currentOrder.status)}</Badge>
            </div>
            <p className="text-muted-foreground">Placed on {new Date(currentOrder.createdAt).toLocaleString("en-US")}</p>
          </div>
          {(currentOrder.status === "PENDING" || currentOrder.status === "PROCESSING") && (
            <Button variant="destructive" onClick={() => setShowCancelModal(true)}>
              Cancel order
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-foreground mb-4 text-xl font-bold">Items</h2>
              <div className="space-y-4">
                {currentOrder.items.map((item) => (
                  <div key={item.orderItemId} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="bg-muted relative h-24 w-24 shrink-0 rounded">
                      <Image
                        src={item.product?.imageUrl || "/images/placeholder.png"}
                        alt={item.product?.name || "Product"}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-foreground mb-1 text-lg font-semibold">{item.product?.name || "Product"}</h3>
                      
                      {/* Variant Info */}
                      {item.variant && !item.variant.isDefault && item.variant.attributes && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {Object.entries(item.variant.attributes).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="px-2 py-0.5 text-[10px] font-normal uppercase">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <p className="text-muted-foreground mb-2">Qty: {item.quantity}</p>
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
              <h2 className="text-foreground mb-4 text-xl font-bold">Order details</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Shipping address</p>
                    <p className="text-muted-foreground">{currentOrder.shippingAddress}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Phone</p>
                    <p className="text-muted-foreground">{currentOrder.phone}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Payment method</p>
                    <p className="text-muted-foreground">{getPaymentMethodLabel(currentOrder.paymentMethod)}</p>
                  </div>
                </div>
                {currentOrder.notes && (
                  <div className="flex gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Notes</p>
                      <p className="text-muted-foreground">{currentOrder.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-foreground mb-4 text-xl font-bold">Summary</h2>
              <div className="space-y-3 mb-4 pb-4 border-b">
                <div className="text-foreground flex justify-between">
                  <span>
                    Subtotal ({currentOrder.items.reduce((sum, item) => sum + item.quantity, 0)} items):
                  </span>
                  <span className="font-semibold">{formatCurrency(currentOrder.totalPrice)}</span>
                </div>
                <div className="text-foreground flex justify-between">
                  <span>Shipping:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
                </div>
              </div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-foreground text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold text-orange-600">{formatCurrency(currentOrder.totalPrice)}</span>
              </div>

              {currentOrder.status === "DELIVERED" && <Button className="w-full mb-3">Buy again</Button>}
              <Link href="/orders">
                <Button variant="outline" className="w-full">
                  Back to orders
                </Button>
              </Link>
            </Card>
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Cancel this order?</DialogTitle>
              <DialogDescription className="pt-2">
                Are you sure you want to cancel order{" "}
                <span className="font-semibold">#{currentOrder.orderId.slice(0, 8)}</span>? Item quantities will be
                returned to inventory.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCancelModal(false)}>
                Close
              </Button>
              <Button type="button" variant="destructive" onClick={handleCancelOrder}>
                Cancel order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
