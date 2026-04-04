"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Tag, ShoppingBag, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar";
import { ADMIN_BELOW_NAV_HEIGHT } from "./adminShell";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { id: "orders", label: "Orders", icon: ShoppingBag, href: "/admin/orders" },
  { id: "products", label: "Products", icon: Package, href: "/admin/products" },
  { id: "categories", label: "Categories", icon: Tag, href: "/admin/categories" },
  { id: "users", label: "Users", icon: Users, href: "/admin/users" },
] as const;

export const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="none"
      className={`${ADMIN_BELOW_NAV_HEIGHT} shrink-0 border-r border-border bg-background text-foreground`}
    >
      <SidebarContent className="flex-1 bg-background pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className="hover:bg-muted/80 hover:text-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground"
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
