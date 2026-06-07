"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrderStore } from "../../../stores";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Separator } from "@/src/components/ui/separator";
import { ArrowLeft, Package, MapPin, Phone, CreditCard, FileText, Truck } from "lucide-react";
import Link from "next/link";
import {
  formatCurrency,
  getPaymentStatusColor,
  getPaymentStatusLabel,
  getStatusColor,
  getStatusLabel,
} from "../../../utils";
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
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
import { Spinner } from "@/src/components/ui/spinner";

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const { isSignedIn, isLoaded } = useUser();
  const { currentOrder, loading, fetchOrderById, cancelOrder } = useOrderStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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
    setCancelling(true);
    try {
      await cancelOrder(currentOrder.orderId);
      setShowCancelModal(false);
    } finally {
      setCancelling(false);
    }
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

  const isCancelled = currentOrder.status === "CANCELLED";
  const canCancel = currentOrder.status === "PENDING" || currentOrder.status === "PROCESSING";

  const paymentStatusLabel = isCancelled
    ? "Cancelled"
    : getPaymentStatusLabel(currentOrder.paymentMethod, currentOrder.status, currentOrder.payment);
  const paymentStatusColor = isCancelled
    ? "border-red-500/30 bg-red-500/15 text-red-950 dark:text-red-300"
    : getPaymentStatusColor(currentOrder.paymentMethod, currentOrder.status, currentOrder.payment);
  const canContinuePayment =
    currentOrder.paymentMethod === "BANK_TRANSFER" &&
    currentOrder.status === "PENDING" &&
    currentOrder.payment?.status !== "PAID";

  return (
    <div className="min-h-[calc(100vh-200px)] bg-background py-3">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        {/* Header */}
        <div className="mb-3 space-y-3">
          <Link
            href="/orders"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">Order #{currentOrder.orderId.slice(0, 8)}</h1>
                <Badge className={cn("font-normal", getStatusColor(currentOrder.status))}>
                  {getStatusLabel(currentOrder.status)}
                </Badge>
                <Badge className={cn("font-normal", paymentStatusColor)}>{paymentStatusLabel}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Placed on {new Date(currentOrder.createdAt).toLocaleString("en-US")}
              </p>
            </div>
            {canCancel && (
              <Button variant="destructive" size="sm" onClick={() => setShowCancelModal(true)}>
                Cancel order
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-3">
            <Card className="overflow-hidden gap-0 p-0 shadow-none">
              <div className="border-b bg-muted/30 p-3">
                <h2 className="text-foreground font-semibold">Items</h2>
              </div>
              <div className="p-3">
                <div className="max-h-44 overflow-y-auto">
                  <div className="divide-y pr-2">
                    {currentOrder.items.map((item) => (
                      <div key={item.orderItemId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-background">
                          {item.product?.imageUrl ? (
                            <Image
                              src={item.product.imageUrl}
                              alt={item.product?.name || "Product"}
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <ProductImageFallback className="absolute inset-0" iconClassName="h-6 w-6" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.product?.name || "Product"}
                          </p>
                          <p className="text-muted-foreground text-xs">x {item.quantity}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden gap-0 p-0 shadow-none">
              <div className="border-b bg-muted/30 p-3">
                <h2 className="text-foreground font-semibold">Delivery & payment details</h2>
              </div>
              <div className="space-y-3 p-3">
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-0.5">Shipping address</p>
                    <p className="text-muted-foreground text-sm">{currentOrder.shippingAddress}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-0.5">Phone</p>
                    <p className="text-muted-foreground text-sm">{currentOrder.phone}</p>
                  </div>
                </div>
                {(currentOrder.shippingMethodName || currentOrder.shippingMethodCode) && (
                  <div className="flex gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm mb-0.5">Delivery method</p>
                      <p className="text-muted-foreground text-sm">
                        {currentOrder.shippingMethodName || currentOrder.shippingMethodCode}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-0.5">Payment</p>
                    <p className="text-muted-foreground text-sm">
                      <span className={cn("font-medium", isCancelled ? "text-red-600 dark:text-red-400" : "")}>
                        {paymentStatusLabel}
                      </span>
                    </p>
                  </div>
                </div>
                {currentOrder.notes && (
                  <div className="flex gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm mb-0.5">Order note</p>
                      <p className="text-muted-foreground text-sm">{currentOrder.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden gap-0 p-0 sticky top-4 shadow-none">
              <div className="border-b bg-muted/30 p-3">
                <h2 className="text-foreground font-semibold">Order summary</h2>
              </div>
              <div className="p-3 space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      Subtotal ({currentOrder.items.reduce((sum, item) => sum + item.quantity, 0)} items)
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(
                        currentOrder.subtotal != null ? Number(currentOrder.subtotal) : Number(currentOrder.totalPrice),
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Shipping</span>
                    {currentOrder.shippingDisplayMode === "included" ? (
                      <span className="text-muted-foreground max-w-[58%] text-right text-xs font-medium">
                        Included in product price
                      </span>
                    ) : (
                      (() => {
                        const fee = currentOrder.shippingFee != null ? Number(currentOrder.shippingFee) : 0;
                        if (fee <= 0) {
                          return <span className="font-medium text-emerald-600 dark:text-emerald-400">Free</span>;
                        }
                        return <span className="font-medium tabular-nums">{formatCurrency(fee)}</span>;
                      })()
                    )}
                  </div>
                  {(currentOrder.taxEnabledSnapshot || Number(currentOrder.taxAmount || 0) > 0) && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">VAT</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(Number(currentOrder.taxAmount || 0))}
                      </span>
                    </div>
                  )}
                  {Number(currentOrder.voucherDiscountAmount || 0) > 0 && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Voucher discount</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                        −{formatCurrency(Number(currentOrder.voucherDiscountAmount || 0))}
                      </span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-base">Total</span>
                  <span className="text-xl font-bold tabular-nums tracking-tight">
                    {formatCurrency(Number(currentOrder.totalPrice))}
                  </span>
                </div>

                <div className="space-y-2 pt-0">
                  {canContinuePayment && (
                    <Link href={`/payment/${currentOrder.orderId}`} className="block">
                      <Button className="w-full bg-orange-600 hover:bg-orange-700">Continue Payment</Button>
                    </Link>
                  )}
                  {currentOrder.status === "COMPLETED" && <Button className="w-full">Buy again</Button>}
                  <Link href="/orders" className="block">
                    <Button variant="outline" className="w-full">
                      Back to orders
                    </Button>
                  </Link>
                </div>
              </div>
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
                returned to stock. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCancelModal(false)} disabled={cancelling}>
                Keep order
              </Button>
              <Button type="button" variant="destructive" onClick={handleCancelOrder} disabled={cancelling}>
                {cancelling ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Cancelling…
                  </>
                ) : (
                  "Cancel order"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
