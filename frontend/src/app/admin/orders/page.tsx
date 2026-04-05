"use client";

import { useEffect, useState } from "react";
import { ORDER_STATUS_FILTER_OPTIONS } from "@/src/constant";
import { useOrderStore } from "../../../stores";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { AdminContentLoader } from "../../../components/admin/AdminLoading";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Package, Eye, ShoppingCart, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { Order } from "../../../types";
import { formatCurrency, getStatusColor, getStatusLabel } from "../../../utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const AdminOrdersPage = () => {
  const router = useRouter();
  const { orders, loading, fetchAllOrders, updateStatus } = useOrderStore();
  const [filter, setFilter] = useState<string>("ALL");
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAllOrders(filter === "ALL" ? {} : { status: filter });
  }, [filter, fetchAllOrders]);

  const handleStatusClick = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;

    setUpdating(true);
    try {
      await updateStatus(selectedOrder.orderId, newStatus);
      toast.success("Cập nhật trạng thái đơn hàng thành công");
      setStatusModalOpen(false);
      setSelectedOrder(null);
      setNewStatus("");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Không thể cập nhật trạng thái đơn hàng");
    } finally {
      setUpdating(false);
    }
  };

  // Calculate stats
  const totalRevenue = orders.reduce((sum, order) => {
    if (["COMPLETED", "SHIPPED", "DELIVERED"].includes(order.status)) {
      return sum + parseFloat(order.totalPrice.toString());
    }
    return sum;
  }, 0);

  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý đơn hàng</h1>
            <p className="text-muted-foreground mt-1">Theo dõi và quản lý tất cả đơn hàng</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tổng đơn hàng</p>
                  <h3 className="text-2xl font-bold mt-2">{orders.length}</h3>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tổng doanh thu</p>
                  <h3 className="text-2xl font-bold mt-2">{formatCurrency(totalRevenue)}</h3>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Đang chờ</p>
                  <h3 className="text-2xl font-bold mt-2">{pendingOrders}</h3>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hoàn thành</p>
                  <h3 className="text-2xl font-bold mt-2">{completedOrders}</h3>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUS_FILTER_OPTIONS.map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status === "ALL" ? "Tất cả" : getStatusLabel(status as Order["status"])}
            </Button>
          ))}
        </div>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <AdminContentLoader minHeightClass="min-h-[320px]" />
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Chưa có đơn hàng</h3>
                <p className="text-muted-foreground mt-2">Đơn hàng sẽ hiển thị ở đây khi khách hàng đặt hàng.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn hàng</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Ngày đặt</TableHead>
                      <TableHead>Tổng tiền</TableHead>
                      <TableHead>Thanh toán</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-medium">#{order.orderId.slice(0, 8)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{order.clerkId.slice(0, 15)}...</p>
                            <p className="text-xs text-muted-foreground">{order.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{order.items.length} sản phẩm</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(order.totalPrice)}</TableCell>
                        <TableCell>
                          <Badge variant={order.paymentMethod === "COD" ? "secondary" : "default"}>
                            {order.paymentMethod === "COD" ? "COD" : "Chuyển khoản"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/orders/${order.orderId}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleStatusClick(order)}>
                              Cập nhật
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Status Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
            <DialogDescription>Đơn hàng #{selectedOrder?.orderId.slice(0, 8)}</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Chọn trạng thái mới</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Chờ thanh toán</SelectItem>
                <SelectItem value="PROCESSING">Đang chuẩn bị</SelectItem>
                <SelectItem value="SHIPPED">Đang giao hàng</SelectItem>
                <SelectItem value="DELIVERED">Đã giao hàng</SelectItem>
                <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                <SelectItem value="CANCELLED">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)} disabled={updating}>
              Hủy
            </Button>
            <Button onClick={handleStatusUpdate} disabled={updating}>
              {updating ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Đang cập nhật…
                </>
              ) : (
                "Xác nhận"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrdersPage;
