"use client";

import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar";
import { ADMIN_BELOW_NAV_HEIGHT } from "@/src/constant";
import { AdminSpinner } from "./AdminLoading";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { isAdmin, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/");
      } else if (!isAdmin) {
        router.push("/");
      }
    }
  }, [isAdmin, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <AdminSpinner />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={`flex w-full flex-1 flex-col ${ADMIN_BELOW_NAV_HEIGHT}`}>
      <SidebarProvider defaultOpen className={`flex w-full flex-1 flex-row items-stretch ${ADMIN_BELOW_NAV_HEIGHT}`}>
        <AdminSidebar />
        <SidebarInset className={`min-w-0 overflow-y-auto bg-background ${ADMIN_BELOW_NAV_HEIGHT}`}>
          <div className="text-foreground flex min-w-0 flex-col break-words p-4 text-sm leading-normal">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};
