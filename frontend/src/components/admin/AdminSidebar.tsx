"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_BELOW_NAV_HEIGHT, ADMIN_SIDEBAR_NAV_ITEMS } from "@/src/constant";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar";

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
              {ADMIN_SIDEBAR_NAV_ITEMS.map((item) => {
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
