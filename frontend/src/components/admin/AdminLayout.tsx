"use client";

import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { isAdmin, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Đợi loading xong mới check
    if (!isLoading) {
      if (!user) {
        // Chưa đăng nhập
        router.push("/");
      } else if (!isAdmin) {
        // Đã đăng nhập nhưng không phải admin
        router.push("/");
      }
    }
  }, [isAdmin, isLoading, user, router]);

  // Hiển thị loading khi đang check auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Không phải admin thì không render gì (sẽ redirect)
  if (!isAdmin) {
    return null;
  }

  // Layout cho admin
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};
