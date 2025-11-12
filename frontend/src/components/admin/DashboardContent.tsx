"use client";

import { Package, Tag, Users, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

const StatCard = ({ title, value, icon, trend, trendUp }: StatCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs flex items-center gap-1 mt-1 ${
            trendUp ? "text-green-600" : "text-red-600"
          }`}>
            {trendUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const DashboardContent = () => {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Chào mừng bạn trở lại! Sau đây là tổng quan về cửa hàng của bạn.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Products"
          value="0"
          icon={<Package className="h-4 w-4" />}
          trend="+0% from last month"
          trendUp={true}
        />
        <StatCard
          title="Categories"
          value="0"
          icon={<Tag className="h-4 w-4" />}
        />
        <StatCard
          title="Total Users"
          value="0"
          icon={<Users className="h-4 w-4" />}
          trend="+0% from last month"
          trendUp={true}
        />
        <StatCard
          title="Total Sales"
          value="$0"
          icon={<TrendingUp className="h-4 w-4" />}
          trend="-5% from last month"
          trendUp={false}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No recent activity yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
