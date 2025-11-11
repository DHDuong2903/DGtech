import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel - DGTech",
  description: "Quản lý cửa hàng DGTech",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
