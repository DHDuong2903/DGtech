import type { LucideIcon } from "lucide-react";
import { Images, LayoutDashboard, Package, Sofa, Tag, Users } from "lucide-react";

// ---------------------------------------------------------------------------
// Admin layout
// ---------------------------------------------------------------------------

/** Viewport below navbar — keep in sync with Navbar height (4.5rem / `h-18`). */
export const ADMIN_BELOW_NAV_HEIGHT = "h-[calc(100dvh-4.5rem)] min-h-[calc(100dvh-4.5rem)]";

/** Default props for admin list screens using DataTable (Users, Categories, …). */
export const ADMIN_LIST_DATA_TABLE_PROPS = {
  showFooterSelectionSummary: false,
  pageSize: 8,
} as const;

export type AdminSidebarNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const ADMIN_SIDEBAR_NAV_ITEMS: AdminSidebarNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { id: "orders", label: "Orders", icon: Package, href: "/admin/orders" },
  { id: "products", label: "Products", icon: Sofa, href: "/admin/products" },
  { id: "categories", label: "Categories", icon: Tag, href: "/admin/categories" },
  { id: "users", label: "Users", icon: Users, href: "/admin/users" },
  { id: "slideshows", label: "Slideshows", icon: Images, href: "/admin/slideshows" },
];

// ---------------------------------------------------------------------------
// API path segments (relative to axios base URL)
// ---------------------------------------------------------------------------

export const API_ROUTE = {
  USERS: "/users",
  CATEGORIES: "/categories",
  CART: "/cart",
  ORDERS: "/orders",
  PAYMENTS: "/payments",
  PRODUCTS: "/products",
  REVIEWS: "/reviews",
  SLIDESHOWS: "/slideshows",
} as const;

// ---------------------------------------------------------------------------
// UI shell (shadcn Sidebar)
// ---------------------------------------------------------------------------

export const SIDEBAR_COOKIE_NAME = "sidebar_state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_WIDTH = "16rem";
export const SIDEBAR_WIDTH_MOBILE = "18rem";
export const SIDEBAR_WIDTH_ICON = "3rem";
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";

// ---------------------------------------------------------------------------
// Layout / responsive
// ---------------------------------------------------------------------------

export const MOBILE_BREAKPOINT_PX = 768;

// ---------------------------------------------------------------------------
// Validation (uploads)
// ---------------------------------------------------------------------------

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;

/** 5 MiB */
export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const ORDER_STATUS_FILTER_OPTIONS = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatusFilterValue = (typeof ORDER_STATUS_FILTER_OPTIONS)[number];
