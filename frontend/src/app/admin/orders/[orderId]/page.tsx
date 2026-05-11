"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrderStore } from "../../../../stores";
import { AdminLayout } from "../../../../components/admin/AdminLayout";
import { AdminContentLoader } from "../../../../components/admin/AdminLoading";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Separator } from "@/src/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { ArrowLeft, Package } from "lucide-react";
import {
  formatCurrency,
  getPaymentStatusColor,
  getPaymentStatusLabel,
  getStatusColor,
  getStatusLabel,
} from "../../../../utils";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Spinner } from "@/src/components/ui/spinner";
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
import { cn } from "@/src/lib/utils";

function AdminSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-0 overflow-hidden p-0 shadow-sm", className)}>
      <div className="border-b bg-muted/40 px-4 py-3">
        <h2 className="text-sm font-semibold leading-none text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </Card>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-baseline sm:gap-6">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="min-w-0 text-sm text-foreground">{children}</div>
    </div>
  );
}

const getPaymentMethodLabel = (method: "COD" | "BANK_TRANSFER") =>
  method === "COD" ? "Cash on delivery (COD)" : "Bank transfer";

const STATUS_FLOW: Record<string, string[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Awaiting confirmation" },
  { value: "PROCESSING", label: "Preparing order" },
  { value: "SHIPPED", label: "In transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

/** Solid color dot classes for status indicators */
const STATUS_DOT_COLOR: Record<string, string> = {
  PENDING: "bg-amber-500",
  PROCESSING: "bg-sky-500",
  SHIPPED: "bg-violet-500",
  DELIVERED: "bg-indigo-500",
  COMPLETED: "bg-teal-500",
  CANCELLED: "bg-red-500",
};

const normalizePhone = (value?: string | null) => (value || "").replace(/\D/g, "");

const formatShippingAddress = (
  address: string | null | undefined,
  order: {
    user?: { username?: string | null; email?: string | null } | null;
    phone?: string | null;
    clerkId?: string | null;
  },
) => {
  if (!address?.trim()) return "";

  const username = order.user?.username?.trim().toLowerCase();
  const email = order.user?.email?.trim().toLowerCase();
  const phoneNormalized = normalizePhone(order.phone);
  const clerkId = order.clerkId?.trim().toLowerCase();

  const lines = address
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const lower = line.toLowerCase();
      const linePhone = normalizePhone(line);
      if (username && lower === username) return false;
      if (email && lower === email) return false;
      if (clerkId && lower.includes(clerkId)) return false;
      if (phoneNormalized && linePhone && linePhone === phoneNormalized) return false;
      return true;
    });

  return lines.length ? lines.join(", ") : address.trim();
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const {
    adminOrderDetail: order,
    loading,
    fetchAdminOrderById,
    clearAdminOrderDetail,
    updateStatus,
    patchAdminOrder,
  } = useOrderStore();

  const [updating, setUpdating] = useState(false);

  const [notesDraft, setNotesDraft] = useState("");
  const [trackingDraft, setTrackingDraft] = useState("");
  const [carrierDraft, setCarrierDraft] = useState("");
  const [savingOps, setSavingOps] = useState(false);

  useEffect(() => {
    if (orderId) fetchAdminOrderById(orderId);
    return () => clearAdminOrderDetail();
  }, [orderId, fetchAdminOrderById, clearAdminOrderDetail]);

  useEffect(() => {
    if (order) {
      setNotesDraft(order.adminNotes ?? "");
      setTrackingDraft(order.trackingNumber ?? "");
      setCarrierDraft(order.carrierName ?? "");
    }
  }, [order]);

  const handleSaveOps = async () => {
    if (!order) return;
    setSavingOps(true);
    try {
      await patchAdminOrder(order.orderId, {
        adminNotes: notesDraft,
        trackingNumber: trackingDraft || undefined,
        carrierName: carrierDraft || undefined,
      });
    } finally {
      setSavingOps(false);
    }
  };

  const handleStatusUpdate = async (nextStatus: string) => {
    if (!order || !nextStatus || nextStatus === order.status) return;
    setUpdating(true);
    try {
      await updateStatus(order.orderId, nextStatus);
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !order) {
    return (
      <AdminLayout>
        <AdminContentLoader minHeightClass="min-h-[400px]" />
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-md space-y-4 py-16 text-center">
          <Package className="text-muted-foreground mx-auto h-12 w-12" />
          <h2 className="text-lg font-semibold">Order not found</h2>
          <p className="text-muted-foreground text-sm">This order may have been removed or the link is invalid.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/orders">Back to orders</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const isCancelled = order.status === "CANCELLED";

  // For CANCELLED orders, payment status is no longer meaningful — show a muted indicator instead.
  const paymentStatusLabel = isCancelled
    ? "Cancelled"
    : getPaymentStatusLabel(order.paymentMethod, order.status, order.payment);
  const paymentStatusColor = isCancelled
    ? "border-red-500/30 bg-red-500/15 text-red-950 dark:text-red-300"
    : getPaymentStatusColor(order.paymentMethod, order.status, order.payment);

  const nextStatuses = new Set(STATUS_FLOW[order.status] || []);
  const paymentPendingBankTransfer =
    order.paymentMethod === "BANK_TRANSFER" && (order.payment?.status || "PENDING") !== "PAID";

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-bold tracking-tight">Order #{order.orderId.slice(0, 8)}</h1>
              <Badge className={cn("font-normal", getStatusColor(order.status))}>{getStatusLabel(order.status)}</Badge>
              <Badge className={cn("font-normal", paymentStatusColor)}>{paymentStatusLabel}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Created <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString("en-US")}</time>
              {" · "}
              {getPaymentMethodLabel(order.paymentMethod)}
              {" · "}
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          {/* Left: customer + status + operations */}
          <div className="space-y-4 lg:col-span-5">
            {/* Status control card */}
            <AdminSection title="Order status">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current:</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      getStatusColor(order.status),
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_COLOR[order.status])} />
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                {isCancelled ? (
                  <p className="text-xs text-muted-foreground">
                    This order has been cancelled and cannot be updated further.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="status-select" className="text-xs font-medium text-muted-foreground">
                      Update status
                    </Label>
                    <Select value={order.status} onValueChange={handleStatusUpdate} disabled={updating}>
                      <SelectTrigger id="status-select" aria-label="Update status" className="w-full sm:w-[240px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((statusOpt) => {
                          const isCurrent = statusOpt.value === order.status;
                          const isBlockedByFlow = !isCurrent && !nextStatuses.has(statusOpt.value);
                          const isBlockedByPayment =
                            paymentPendingBankTransfer &&
                            (statusOpt.value === "PROCESSING" ||
                              statusOpt.value === "SHIPPED" ||
                              statusOpt.value === "DELIVERED" ||
                              statusOpt.value === "COMPLETED");
                          const disabled = isBlockedByFlow || isBlockedByPayment;
                          return (
                            <SelectItem key={statusOpt.value} value={statusOpt.value} disabled={disabled}>
                              <span className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full shrink-0",
                                    STATUS_DOT_COLOR[statusOpt.value],
                                    disabled && "opacity-40",
                                  )}
                                />
                                {statusOpt.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {paymentPendingBankTransfer && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Payment via bank transfer is still pending. Some status transitions are blocked until payment is
                        confirmed.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </AdminSection>

            <AdminSection title="Customer information">
              <div className="space-y-3">
                <DetailRow label="Name">{order.user?.username?.trim() || ""}</DetailRow>
                <DetailRow label="Email">{order.user?.email?.trim() || ""}</DetailRow>
                <DetailRow label="Phone">{order.phone?.trim() || ""}</DetailRow>
                <DetailRow label="Address">
                  <span className="leading-relaxed">{formatShippingAddress(order.shippingAddress, order)}</span>
                </DetailRow>
                {(order.shippingMethodName || order.shippingMethodCode) && (
                  <DetailRow label="Delivery option">
                    <span>{order.shippingMethodName || order.shippingMethodCode}</span>
                  </DetailRow>
                )}
                {order.notes?.trim() && (
                  <DetailRow label="Order note">
                    <span className="whitespace-pre-wrap leading-relaxed">{order.notes}</span>
                  </DetailRow>
                )}
              </div>
            </AdminSection>

            <AdminSection title="Operations">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-notes" className="text-xs font-medium text-muted-foreground">
                    Admin notes
                  </Label>
                  <Textarea
                    id="admin-notes"
                    rows={4}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Internal only — not shown on the storefront."
                    className="min-h-[100px] resize-y"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="carrier" className="text-xs font-medium text-muted-foreground">
                      Carrier
                    </Label>
                    <Input
                      id="carrier"
                      value={carrierDraft}
                      onChange={(e) => setCarrierDraft(e.target.value)}
                      placeholder="Carrier name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tracking" className="text-xs font-medium text-muted-foreground">
                      Tracking number
                    </Label>
                    <Input
                      id="tracking"
                      value={trackingDraft}
                      onChange={(e) => setTrackingDraft(e.target.value)}
                      placeholder="Tracking ID"
                    />
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" disabled={savingOps} onClick={handleSaveOps}>
                  {savingOps ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </AdminSection>
          </div>

          {/* Right: line items + totals */}
          <div className="space-y-4 lg:col-span-7">
            {/* Line items */}
            <AdminSection title="Line items">
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto rounded-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[52%] min-w-[200px]">Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.orderItemId}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
                              {item.product?.imageUrl ? (
                                <Image
                                  src={item.product.imageUrl}
                                  alt={item.product?.name || "Product"}
                                  fill
                                  className="object-contain"
                                  sizes="48px"
                                />
                              ) : (
                                <ProductImageFallback className="absolute inset-0" iconClassName="h-6 w-6" />
                              )}
                            </div>
                            <div className="min-w-0 pt-0.5">
                              <p className="font-medium leading-snug">{item.product?.name || "Product"}</p>
                              {item.variant && !item.variant.isDefault && item.variant.attributes && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {Object.entries(item.variant.attributes).map(([key, value]) => (
                                    <Badge
                                      key={key}
                                      variant="secondary"
                                      className="px-1.5 py-0 text-[10px] font-normal"
                                    >
                                      {key}: {String(value)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AdminSection>

            {/* Totals */}
            <Card className="gap-0 overflow-hidden p-0 shadow-sm lg:sticky lg:top-4">
              <div className="border-b bg-muted/40 px-4 py-3">
                <h2 className="text-sm font-semibold leading-none">Totals</h2>
              </div>
              <div className="space-y-4 p-4">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums font-medium">
                      {formatCurrency(order.subtotal != null ? Number(order.subtotal) : Number(order.totalPrice))}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Shipping</span>
                    {order.shippingDisplayMode === "included" ? (
                      <span className="max-w-[60%] text-right text-xs text-muted-foreground">
                        Included in product price
                      </span>
                    ) : (
                      (() => {
                        const fee = order.shippingFee != null ? Number(order.shippingFee) : 0;
                        if (fee <= 0) {
                          return (
                            <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                              Free
                            </span>
                          );
                        }
                        return <span className="tabular-nums font-medium">{formatCurrency(fee)}</span>;
                      })()
                    )}
                  </div>
                  {(order.taxEnabledSnapshot || Number(order.taxAmount || 0) > 0) && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">VAT</span>
                      <span className="tabular-nums font-medium">{formatCurrency(Number(order.taxAmount || 0))}</span>
                    </div>
                  )}
                  {Number(order.voucherDiscountAmount || 0) > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Voucher discount</span>
                      <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        −{formatCurrency(Number(order.voucherDiscountAmount || 0))}
                      </span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-xl font-bold tabular-nums tracking-tight">
                    {formatCurrency(Number(order.totalPrice))}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {updating && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50">
          <div className="bg-background text-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-xs shadow-sm">
            <Spinner data-icon="inline-start" />
            Updating status…
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
