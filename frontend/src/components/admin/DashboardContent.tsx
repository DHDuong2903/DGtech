"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgePercent,
  Building2,
  CreditCard,
  DollarSign,
  Package,
  Percent,
  ShoppingCart,
  Ticket,
  TrendingDown,
  TrendingUp,
  Warehouse,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Alert, AlertTitle } from "@/src/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  useProductStore,
  useOrderStore,
  useDiscountCampaignStore,
  useVoucherStore,
} from "../../stores";
import { stockReceiptsApi } from "../../apis/stockReceiptsApi";
import { formatCurrency, getStatusColor, getStatusLabel } from "../../utils";
import { AdminContentLoader } from "./AdminLoading";
import type { DiscountCampaign, Order, Voucher } from "../../types";

const DASHBOARD_ORDER_FETCH_LIMIT = 500;
const LOW_STOCK_THRESHOLD = 10;
const MS_PER_DAY = 86_400_000;

type PeriodKey = "7d" | "30d" | "365d" | "all";

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}

/** Inclusive local calendar range for reports and order-day matching. */
function calendarRangeForPeriod(period: PeriodKey): { from: string; to: string } {
  const to = new Date();
  const toStr = toYmdLocal(to);
  if (period === "all") return { from: "2000-01-01", to: toStr };
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 365;
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from: toYmdLocal(from), to: toStr };
}

/** Previous window of equal length, immediately before current period (same mode as calendarRange). */
function previousCalendarRange(period: PeriodKey): { from: string; to: string } | null {
  if (period === "all") return null;
  const cur = calendarRangeForPeriod(period);
  const fromD = parseYmd(cur.from);
  const toD = parseYmd(cur.to);
  const nDays = Math.round((toD.getTime() - fromD.getTime()) / MS_PER_DAY) + 1;
  const prevTo = new Date(fromD);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (nDays - 1));
  return { from: toYmdLocal(prevFrom), to: toYmdLocal(prevTo) };
}

function orderCreatedYmd(order: Order): string {
  return toYmdLocal(new Date(order.createdAt));
}

function orderYmdInRange(order: Order, from: string, to: string): boolean {
  const ymd = orderCreatedYmd(order);
  return ymd >= from && ymd <= to;
}

function orderInPeriod(order: Order, period: PeriodKey): boolean {
  if (period === "all") return true;
  const { from, to } = calendarRangeForPeriod(period);
  return orderYmdInRange(order, from, to);
}

function revenueFromOrders(orders: Order[]): number {
  return orders.reduce((sum, order) => {
    if (["COMPLETED", "SHIPPED", "DELIVERED"].includes(order.status)) {
      return sum + parseFloat(String(order.totalPrice));
    }
    return sum;
  }, 0);
}

function isCampaignActive(c: DiscountCampaign, now: number): boolean {
  if (!c.isEnabled) return false;
  const start = new Date(c.startsAt).getTime();
  if (Number.isNaN(start) || start > now) return false;
  if (c.endsAt) {
    const end = new Date(c.endsAt).getTime();
    if (!Number.isNaN(end) && end < now) return false;
  }
  return true;
}

function campaignEndsWithin(c: DiscountCampaign, now: number, days: number): boolean {
  if (!c.endsAt || !c.isEnabled) return false;
  const end = new Date(c.endsAt).getTime();
  if (Number.isNaN(end) || end < now) return false;
  return end <= now + days * MS_PER_DAY;
}

function voucherExpiresWithin(v: Voucher, now: number, days: number): boolean {
  if (!v.isActive || !v.expiresAt) return false;
  const end = new Date(v.expiresAt).getTime();
  if (Number.isNaN(end) || end < now) return false;
  return end <= now + days * MS_PER_DAY;
}

function awaitingBankTransfer(o: Order): boolean {
  if (o.paymentMethod !== "BANK_TRANSFER") return false;
  if (o.status === "CANCELLED") return false;
  if (o.payment?.status === "PAID") return false;
  return true;
}

type ActionTileProps = {
  href: string;
  title: string;
  count: number;
  icon: React.ReactNode;
  emphasize?: boolean;
};

function ActionTile({ href, title, count, icon, emphasize }: ActionTileProps) {
  return (
    <Link
      href={href}
      className={`border-border hover:bg-muted/60 flex items-center justify-between gap-2 rounded-lg border p-4 transition-colors ${
        emphasize ? "border-amber-500/40 bg-amber-500/10" : "bg-muted/20"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="truncate text-sm font-medium">{title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={count > 0 ? "default" : "secondary"}>{count}</Badge>
        <ArrowRight className="text-muted-foreground h-4 w-4" />
      </div>
    </Link>
  );
}

/** 16px: viền → title, title → content, content → viền dưới (padding + gap). */
function DashboardBlock({
  title,
  action,
  children,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border bg-card shadow-sm py-0">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div className="text-base font-semibold leading-none tracking-tight">{title}</div>
          {action ?? null}
        </div>
        {children}
      </div>
    </Card>
  );
}

const ORDER_STATUSES_FOR_STRIP: Order["status"][] = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

export const DashboardContent = () => {
  const { products, fetchProducts, loading: productsLoading } = useProductStore();
  const { adminOrders: orders, adminPagination, fetchAllOrders, loading: ordersLoading } = useOrderStore();
  const { campaigns, fetchCampaigns, loading: campaignsLoading } = useDiscountCampaignStore();
  const { vouchers, fetchVouchers, loading: vouchersLoading } = useVoucherStore();

  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [draftReceiptTotal, setDraftReceiptTotal] = useState(0);
  const [receiptsOverviewLoading, setReceiptsOverviewLoading] = useState(true);
  const [importCost, setImportCost] = useState<number | null>(null);
  const [importCostLoading, setImportCostLoading] = useState(true);

  useEffect(() => {
    fetchProducts({}, { adminCatalog: true });
    fetchAllOrders({ page: 1, limit: DASHBOARD_ORDER_FETCH_LIMIT });
    fetchCampaigns();
    fetchVouchers();
  }, [fetchProducts, fetchAllOrders, fetchCampaigns, fetchVouchers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReceiptsOverviewLoading(true);
      try {
        const res = await stockReceiptsApi.list({ status: "DRAFT", page: 1, limit: 1 });
        if (!cancelled) setDraftReceiptTotal(res.totalItems);
      } catch {
        if (!cancelled) setDraftReceiptTotal(0);
      } finally {
        if (!cancelled) setReceiptsOverviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = calendarRangeForPeriod(period);
    setImportCostLoading(true);
    void stockReceiptsApi
      .reportSummary(from, to)
      .then((s) => {
        if (!cancelled) setImportCost(s.totalCost);
      })
      .catch(() => {
        if (!cancelled) setImportCost(0);
      })
      .finally(() => {
        if (!cancelled) setImportCostLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const dashboardLoading =
    productsLoading || ordersLoading || campaignsLoading || vouchersLoading || receiptsOverviewLoading;

  const ordersInPeriod = useMemo(() => orders.filter((o) => orderInPeriod(o, period)), [orders, period]);

  const revenuePeriod = useMemo(() => revenueFromOrders(ordersInPeriod), [ordersInPeriod]);
  const gmvPeriod = useMemo(
    () => ordersInPeriod.reduce((sum, o) => sum + parseFloat(String(o.totalPrice)), 0),
    [ordersInPeriod],
  );
  const fulfilledPeriod = useMemo(
    () => ordersInPeriod.filter((o) => ["COMPLETED", "DELIVERED", "SHIPPED"].includes(o.status)).length,
    [ordersInPeriod],
  );
  const cancelledPeriod = useMemo(
    () => ordersInPeriod.filter((o) => o.status === "CANCELLED").length,
    [ordersInPeriod],
  );
  const ordersPeriodCount = ordersInPeriod.length;
  const avgTicketPeriod = ordersPeriodCount > 0 ? gmvPeriod / ordersPeriodCount : 0;
  const cancelRatePeriod = ordersPeriodCount > 0 ? (cancelledPeriod / ordersPeriodCount) * 100 : 0;

  const { revenuePrevPeriod } = useMemo(() => {
    const prev = previousCalendarRange(period);
    if (!prev) return { revenuePrevPeriod: 0 };
    const list = orders.filter((o) => orderYmdInRange(o, prev.from, prev.to));
    return { revenuePrevPeriod: revenueFromOrders(list) };
  }, [orders, period]);

  const revenueCompare = useMemo((): { mode: "pct"; pct: number } | { mode: "new_period" } | null => {
    if (period === "all") return null;
    if (revenuePrevPeriod > 0) {
      return { mode: "pct", pct: ((revenuePeriod - revenuePrevPeriod) / revenuePrevPeriod) * 100 };
    }
    if (revenuePeriod > 0) return { mode: "new_period" };
    return { mode: "pct", pct: 0 };
  }, [period, revenuePeriod, revenuePrevPeriod]);

  const inventoryValue = useMemo(() => products.reduce((sum, p) => sum + p.price * p.stock, 0), [products]);

  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const processingOrders = orders.filter((o) => o.status === "PROCESSING").length;

  const outOfStockCount = useMemo(() => products.filter((p) => p.stock === 0).length, [products]);
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock < LOW_STOCK_THRESHOLD).length,
    [products],
  );
  const stockAttentionCount = outOfStockCount + lowStockCount;

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [orders],
  );

  const campaignsEndingSoon = useMemo(() => {
    const t = Date.now();
    return campaigns.filter((c) => campaignEndsWithin(c, t, 7));
  }, [campaigns]);

  const vouchersExpiringSoon = useMemo(() => {
    const t = Date.now();
    return vouchers.filter((v) => voucherExpiresWithin(v, t, 7));
  }, [vouchers]);

  const campaignsActive = useMemo(() => {
    const t = Date.now();
    return campaigns.filter((c) => isCampaignActive(c, t));
  }, [campaigns]);

  const vouchersActive = useMemo(() => vouchers.filter((v) => v.isActive).length, [vouchers]);

  const bankTransferAwaiting = useMemo(() => orders.filter(awaitingBankTransfer).length, [orders]);

  const statusCountsPeriod = useMemo(() => {
    const m = new Map<Order["status"], number>();
    for (const s of ORDER_STATUSES_FOR_STRIP) m.set(s, 0);
    for (const o of ordersInPeriod) {
      m.set(o.status, (m.get(o.status) ?? 0) + 1);
    }
    return m;
  }, [ordersInPeriod]);

  const topProductsByRevenue = useMemo(() => {
    const byProduct = new Map<string, { name: string; revenue: number; qty: number }>();
    for (const o of ordersInPeriod) {
      for (const line of o.items) {
        const pid = line.productId;
        const name = line.product?.name ?? pid;
        const lineRev = line.price * line.quantity;
        const cur = byProduct.get(pid) ?? { name, revenue: 0, qty: 0 };
        cur.revenue += lineRev;
        cur.qty += line.quantity;
        byProduct.set(pid, cur);
      }
    }
    return [...byProduct.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [ordersInPeriod]);

  const last7DaysRevenueBars = useMemo(() => {
    const today = new Date();
    const days: { ymd: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ ymd: toYmdLocal(d), revenue: 0 });
    }
    for (const o of orders) {
      if (!["COMPLETED", "SHIPPED", "DELIVERED"].includes(o.status)) continue;
      const ymd = orderCreatedYmd(o);
      const slot = days.find((x) => x.ymd === ymd);
      if (slot) slot.revenue += parseFloat(String(o.totalPrice));
    }
    const maxR = Math.max(...days.map((d) => d.revenue), 1);
    return days.map((d) => ({ ...d, hPx: Math.max(4, Math.round((d.revenue / maxR) * 72)) }));
  }, [orders]);

  const orderTotalInDb = adminPagination?.total ?? orders.length;
  const ordersSampleCapped = orderTotalInDb > DASHBOARD_ORDER_FETCH_LIMIT;

  const periodSelect = (
    <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
      <SelectTrigger size="sm" className="min-w-[9.5rem]" aria-label="Khoảng thời gian">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">7 ngày</SelectItem>
        <SelectItem value="30d">1 tháng</SelectItem>
        <SelectItem value="365d">1 năm</SelectItem>
        <SelectItem value="all">Tổng thời gian</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>

      {dashboardLoading ? (
        <AdminContentLoader />
      ) : (
        <>
          {ordersSampleCapped ? (
            <Alert className="px-4 py-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm font-medium leading-snug">
                Đơn: đang dùng {DASHBOARD_ORDER_FETCH_LIMIT} mẫu gần nhất / {orderTotalInDb} trong hệ thống.
              </AlertTitle>
            </Alert>
          ) : null}

          <DashboardBlock title="Cần xử lý">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ActionTile
                href="/admin/orders?status=PENDING"
                title="Đơn chờ xử lý"
                count={pendingOrders}
                icon={<ShoppingCart className="h-4 w-4" />}
                emphasize={pendingOrders > 0}
              />
              <ActionTile
                href="/admin/orders?status=PROCESSING"
                title="Đơn đang chuẩn bị"
                count={processingOrders}
                icon={<Package className="h-4 w-4" />}
                emphasize={processingOrders > 0}
              />
              <ActionTile
                href="/admin/stock-receipts"
                title="Phiếu nhập nháp"
                count={draftReceiptTotal}
                icon={<Warehouse className="h-4 w-4" />}
                emphasize={draftReceiptTotal > 0}
              />
              <ActionTile
                href="/admin/discount-campaigns"
                title="Chiến dịch sắp hết hạn"
                count={campaignsEndingSoon.length}
                icon={<BadgePercent className="h-4 w-4" />}
                emphasize={campaignsEndingSoon.length > 0}
              />
              <ActionTile
                href="/admin/vouchers"
                title="Voucher sắp hết hạn"
                count={vouchersExpiringSoon.length}
                icon={<Ticket className="h-4 w-4" />}
                emphasize={vouchersExpiringSoon.length > 0}
              />
              <ActionTile
                href="/admin/products"
                title="Tồn kho (hết hoặc thấp)"
                count={stockAttentionCount}
                icon={<Package className="h-4 w-4" />}
                emphasize={outOfStockCount > 0}
              />
            </div>
          </DashboardBlock>

          <DashboardBlock title="Số liệu" action={periodSelect}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                {
                  icon: <DollarSign className="h-3.5 w-3.5" />,
                  label: "Doanh thu",
                  value: formatCurrency(revenuePeriod),
                },
                {
                  icon: <ShoppingCart className="h-3.5 w-3.5" />,
                  label: "Hoàn thành",
                  value: String(fulfilledPeriod),
                },
                {
                  icon: <XCircle className="h-3.5 w-3.5" />,
                  label: "Hủy",
                  value: String(cancelledPeriod),
                },
                {
                  icon: <DollarSign className="h-3.5 w-3.5" />,
                  label: "TB đơn (GMV)",
                  value: ordersPeriodCount ? formatCurrency(avgTicketPeriod) : "—",
                },
                {
                  icon: <Package className="h-3.5 w-3.5" />,
                  label: "Giá trị tồn",
                  value: formatCurrency(inventoryValue),
                },
                {
                  icon: <Warehouse className="h-3.5 w-3.5" />,
                  label: "Giá trị nhập",
                  value: importCostLoading ? "—" : formatCurrency(importCost ?? 0),
                  muted: importCostLoading,
                },
              ].map((cell, i) => (
                <div
                  key={i}
                  className="bg-muted/30 ring-border/60 space-y-2 rounded-lg border border-transparent p-3 ring-1"
                >
                  <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                    {cell.icon}
                    {cell.label}
                  </div>
                  <p
                    className={`text-2xl font-bold tabular-nums ${"muted" in cell && cell.muted ? "text-muted-foreground" : ""}`}
                  >
                    {cell.value}
                  </p>
                </div>
              ))}
            </div>
          </DashboardBlock>

          <DashboardBlock title="Phân tích & tổng hợp">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="bg-muted/20 flex flex-wrap items-stretch gap-3 rounded-lg border p-3">
                  {revenueCompare?.mode === "pct" ? (
                    <div
                      className={`flex min-w-[8rem] flex-1 items-center gap-2 rounded-md px-3 py-2 ${
                        revenueCompare.pct >= 0
                          ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                          : "bg-red-500/10 text-red-900 dark:text-red-200"
                      }`}
                    >
                      {revenueCompare.pct >= 0 ? (
                        <TrendingUp className="h-5 w-5 shrink-0" />
                      ) : (
                        <TrendingDown className="h-5 w-5 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-medium opacity-90">Doanh thu vs kỳ trước</p>
                        <p className="text-lg font-bold tabular-nums">
                          {revenueCompare.pct >= 0 ? "+" : ""}
                          {revenueCompare.pct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ) : revenueCompare?.mode === "new_period" ? (
                    <div className="flex min-w-[8rem] flex-1 items-center gap-2 rounded-md border border-dashed bg-background/80 px-3 py-2">
                      <TrendingUp className="text-muted-foreground h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs font-medium">Kỳ trước không có doanh thu</p>
                        <p className="text-lg font-bold tabular-nums">{formatCurrency(revenuePeriod)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex flex-1 items-center rounded-md border border-dashed px-3 py-2 text-sm">
                      So kỳ không áp dụng cho &quot;Tổng thời gian&quot;.
                    </div>
                  )}
                  <div className="flex min-w-[6rem] flex-1 flex-col justify-center rounded-md border bg-background/80 px-3 py-2">
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <Percent className="h-3.5 w-3.5" />
                      Tỷ lệ hủy (kỳ)
                    </div>
                    <p className="text-lg font-bold tabular-nums">{cancelRatePeriod.toFixed(1)}%</p>
                  </div>
                  <Link
                    href="/admin/orders?status=PENDING"
                    className="flex min-w-[6rem] flex-1 flex-col justify-center rounded-md border bg-background/80 px-3 py-2 transition-colors hover:bg-muted/60"
                  >
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <CreditCard className="h-3.5 w-3.5" />
                      Chờ CK
                    </div>
                    <p className="text-lg font-bold tabular-nums">{bankTransferAwaiting}</p>
                  </Link>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    Đơn theo trạng thái (kỳ đã chọn)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ORDER_STATUSES_FOR_STRIP.map((st) => (
                      <Badge key={st} variant="outline" className="gap-1.5 font-normal tabular-nums">
                        <span>{getStatusLabel(st)}</span>
                        <span className="text-muted-foreground">{statusCountsPeriod.get(st) ?? 0}</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-gradient-to-br from-muted/40 to-transparent px-3 py-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="text-muted-foreground h-4 w-4" />
                    <span>Marketing</span>
                  </div>
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span>
                      <span className="text-foreground font-semibold">{campaignsActive.length}</span> chiến dịch
                      hoạt động
                    </span>
                    <span>
                      <span className="text-foreground font-semibold">{vouchersActive}</span> voucher hoạt động
                    </span>
                    <Link href="/admin/discount-campaigns" className="text-primary font-medium hover:underline">
                      Chiến dịch
                    </Link>
                    <Link href="/admin/vouchers" className="text-primary font-medium hover:underline">
                      Voucher
                    </Link>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    Doanh thu 7 ngày gần nhất
                  </p>
                  <div className="flex h-28 items-end gap-1.5 rounded-lg border bg-muted/15 px-2 pb-2 pt-4">
                    {last7DaysRevenueBars.map((d) => (
                      <div key={d.ymd} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                        <div
                          className="bg-primary/80 w-[min(100%,2.5rem)] rounded-t-sm transition-all"
                          style={{ height: d.hPx }}
                          title={`${d.ymd}: ${formatCurrency(d.revenue)}`}
                        />
                        <span className="text-muted-foreground truncate text-[10px] font-medium">
                          {d.ymd.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    Top sản phẩm theo doanh thu dòng (kỳ đã chọn)
                  </p>
                  {topProductsByRevenue.length === 0 ? (
                    <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-sm">
                      Không có đơn trong kỳ.
                    </div>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {topProductsByRevenue.map((row, idx) => (
                        <li
                          key={row.id}
                          className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-muted-foreground w-5 shrink-0 text-xs font-bold">{idx + 1}</span>
                            <Link
                              href={`/admin/products/${row.id}`}
                              className="truncate font-medium text-primary hover:underline"
                            >
                              {row.name}
                            </Link>
                          </div>
                          <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(row.revenue)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </DashboardBlock>

          <DashboardBlock
            title="Đơn mới nhất"
            action={
              <Link href="/admin/orders" className="text-primary text-sm font-medium hover:underline">
                Tất cả đơn
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center rounded-lg border border-dashed py-10">
                <ShoppingCart className="mb-2 h-10 w-10 opacity-20" />
                <p className="text-sm">Chưa có đơn</p>
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {recentOrders.map((order) => (
                  <Link
                    key={order.orderId}
                    href={`/admin/orders/${order.orderId}`}
                    className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm transition-colors sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">#{order.orderId.slice(0, 8)}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {new Date(order.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold tabular-nums">{formatCurrency(order.totalPrice)}</span>
                      <span className="text-muted-foreground text-xs">{order.items.length} món</span>
                      <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DashboardBlock>
        </>
      )}
    </div>
  );
};
