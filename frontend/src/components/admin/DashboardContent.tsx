"use client";

import { useEffect } from "react";
import { Package, Tag, Users, ShoppingCart, DollarSign, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { useProductStore, useCategoryStore, useUserStore, useOrderStore } from "../../stores";
import { formatCurrency, getStatusColor, getStatusLabel } from "../../utils";
import Link from "next/link";
import { AdminContentLoader } from "./AdminLoading";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  iconColor?: string;
}

const StatCard = ({ title, value, icon, description, iconColor = "text-blue-500" }: StatCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={iconColor}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

export const DashboardContent = () => {
  const { products, fetchProducts, loading: productsLoading } = useProductStore();
  const { categories, fetchCategories, loading: categoriesLoading } = useCategoryStore();
  const { users, fetchAllUsers, loading: usersLoading } = useUserStore();
  const { adminOrders: orders, fetchAllOrders, loading: ordersLoading } = useOrderStore();

  const dashboardLoading = productsLoading || categoriesLoading || usersLoading || ordersLoading;

  useEffect(() => {
    fetchProducts({}, { adminCatalog: true });
    fetchCategories();
    fetchAllUsers();
    fetchAllOrders({});
  }, [fetchProducts, fetchCategories, fetchAllUsers, fetchAllOrders]);

  // Calculate statistics
  const totalRevenue = orders.reduce((sum, order) => {
    if (["COMPLETED", "SHIPPED", "DELIVERED"].includes(order.status)) {
      return sum + parseFloat(order.totalPrice.toString());
    }
    return sum;
  }, 0);

  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;

  const lowStockProducts = products.filter((p) => p.stock < 10).length;
  const totalProductValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  // Get recent orders (last 5)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Order status breakdown
  const orderStatusData = [
    { status: "PENDING", count: orders.filter((o) => o.status === "PENDING").length, color: "bg-yellow-500" },
    { status: "PROCESSING", count: orders.filter((o) => o.status === "PROCESSING").length, color: "bg-blue-500" },
    { status: "SHIPPED", count: orders.filter((o) => o.status === "SHIPPED").length, color: "bg-purple-500" },
    { status: "COMPLETED", count: orders.filter((o) => o.status === "COMPLETED").length, color: "bg-green-500" },
    { status: "CANCELLED", count: orders.filter((o) => o.status === "CANCELLED").length, color: "bg-red-500" },
  ];

  const maxCount = Math.max(...orderStatusData.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Tổng quan về hoạt động kinh doanh của bạn</p>
      </div>

      {dashboardLoading ? (
        <AdminContentLoader />
      ) : (
        <>
          {/* Main Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Tổng doanh thu"
              value={formatCurrency(totalRevenue)}
              icon={<DollarSign className="h-5 w-5" />}
              description={`Từ ${completedOrders} đơn hàng`}
              iconColor="text-green-500"
            />
            <StatCard
              title="Tổng đơn hàng"
              value={orders.length}
              icon={<ShoppingCart className="h-5 w-5" />}
              description={`${pendingOrders} đang chờ xử lý`}
              iconColor="text-blue-500"
            />
            <StatCard
              title="Sản phẩm"
              value={products.length}
              icon={<Package className="h-5 w-5" />}
              description={`${lowStockProducts} sắp hết hàng`}
              iconColor="text-purple-500"
            />
            <StatCard
              title="Người dùng"
              value={users.length}
              icon={<Users className="h-5 w-5" />}
              description={`${users.filter((u) => u.role === "admin").length} quản trị viên`}
              iconColor="text-orange-500"
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Danh mục</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Tổng danh mục sản phẩm</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Giá trị kho</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalProductValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">Tổng giá trị tồn kho</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đơn hủy</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cancelledOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">Đơn hàng đã bị hủy</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Order Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Trạng thái đơn hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderStatusData.map((item) => (
                    <div key={item.status} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{getStatusLabel(item.status as any)}</span>
                        <span className="text-muted-foreground">{item.count} đơn</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all`}
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Đơn hàng gần đây</CardTitle>
                <Link href="/admin/orders">
                  <span className="text-sm text-primary hover:underline cursor-pointer">Xem tất cả</span>
                </Link>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Chưa có đơn hàng nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <Link key={order.orderId} href={`/admin/orders/${order.orderId}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex-1">
                            <p className="font-medium text-sm">#{order.orderId.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                          <div className="text-right mr-3">
                            <p className="font-semibold text-sm">{formatCurrency(order.totalPrice)}</p>
                            <p className="text-xs text-muted-foreground">{order.items.length} sản phẩm</p>
                          </div>
                          <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Low Stock Alert */}
          {lowStockProducts > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="h-5 w-5" />
                  Cảnh báo tồn kho thấp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-orange-700">
                  Có <strong>{lowStockProducts}</strong> sản phẩm đang có số lượng tồn kho dưới 10.{" "}
                  <Link href="/admin/products" className="underline font-medium hover:text-orange-900">
                    Xem chi tiết
                  </Link>
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
