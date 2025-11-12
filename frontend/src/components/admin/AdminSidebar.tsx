"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { LayoutDashboard, Package, Tag, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    href: "/admin",
  },
  {
    id: "categories",
    label: "Quản lý danh mục",
    icon: <Tag size={20} />,
    href: "/admin/categories",
  },
  {
    id: "products",
    label: "Quản lý sản phẩm",
    icon: <Package size={20} />,
    href: "/admin/products",
  },
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  const { user } = useUser();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-64"
      } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-screen sticky top-0`}
    >
      {/* Header với Avatar và Username */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10",
              },
            }}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.fullName || user?.username || "Admin"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-orange-50 text-orange-600 font-medium"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={isActive ? "text-orange-600" : "text-gray-500"}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="flex-1 text-sm">{item.label}</span>
              )}
              {!collapsed && isActive && (
                <ChevronRight size={16} className="text-orange-600" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          {collapsed ? "→" : "← Collapse"}
        </button>
      </div>
    </aside>
  );
};
