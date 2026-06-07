import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  Cuboid,
  DoorOpen,
  Images,
  Layers,
  LayoutDashboard,
  Package,
  ReceiptText,
  Sofa,
  Tag,
  Ticket,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

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
  { id: "stock-receipts", label: "Stock receipts", icon: Warehouse, href: "/admin/stock-receipts" },
  { id: "categories", label: "Categories", icon: Tag, href: "/admin/categories" },
  { id: "rooms", label: "Room", icon: DoorOpen, href: "/admin/rooms" },
  { id: "users", label: "Users", icon: Users, href: "/admin/users" },
  { id: "slideshows", label: "Slideshows", icon: Images, href: "/admin/slideshows" },
  { id: "shipping", label: "Shipping", icon: Truck, href: "/admin/shipping" },
  { id: "discount-campaigns", label: "Discount campaigns", icon: BadgePercent, href: "/admin/discount-campaigns" },
  { id: "bundles", label: "Bundles", icon: Layers, href: "/admin/bundles" },
  { id: "showroom", label: "3D Scenes", icon: Cuboid, href: "/admin/showroom" },
  { id: "vouchers", label: "Vouchers", icon: Ticket, href: "/admin/vouchers" },
  { id: "taxs", label: "Taxs", icon: ReceiptText, href: "/admin/taxs" },
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
  ADDRESSES: "/addresses",
  SHIPPING: "/shipping",
  DISCOUNT_CAMPAIGNS: "/discount-campaigns",
  BUNDLES: "/bundles",
  VOUCHERS: "/vouchers",
  TAXS: "/taxs",
  STOCK_RECEIPTS: "/stock-receipts",
  AI: "/ai",
  SHOWROOM: "/showroom",
  ROOMS: "/rooms",
} as const;

// ---------------------------------------------------------------------------
// UI shell (shadcn Sidebar)
// ---------------------------------------------------------------------------

export const SIDEBAR_COOKIE_NAME = "sidebar_state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_WIDTH = "13rem";
export const SIDEBAR_WIDTH_MOBILE = "18rem";
export const SIDEBAR_WIDTH_ICON = "3rem";
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";

// ---------------------------------------------------------------------------
// Layout / responsive
// ---------------------------------------------------------------------------

/** Storefront horizontal padding for `max-w-7xl` shells (`lg:px-20` = 5rem). */
export const STOREFRONT_H_PADDING = "px-4 sm:px-6 md:px-10 lg:px-18";

export const MOBILE_BREAKPOINT_PX = 768;

// ---------------------------------------------------------------------------
// Validation (uploads)
// ---------------------------------------------------------------------------

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;

/** 5 MiB */
export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MODEL3D_MIME_TYPES = ["model/gltf-binary"] as const;
export const MAX_MODEL3D_FILE_SIZE_BYTES = 25 * 1024 * 1024;

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
