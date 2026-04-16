import { Product } from "./productType";

export interface OrderItem {
  orderItemId: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  product: Product;
  variant: any; // ProductVariant
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  orderId: string;
  clerkId: string;
  /** Line items total before shipping. */
  subtotal?: number;
  shippingFee?: number;
  /** Snapshot: `separate` | `included` — how shipping was shown/charged at checkout. */
  shippingDisplayMode?: "separate" | "included" | string | null;
  shippingMethodCode?: string | null;
  shippingMethodName?: string | null;
  shippingMethodEtaNote?: string | null;
  totalPrice: number;
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CANCELLED";
  shippingAddress: string;
  phone: string;
  paymentMethod: "COD" | "BANK_TRANSFER";
  notes?: string;
  userAddressId?: string | null;
  items: OrderItem[];
  payment?: any; // Payment info if exists
  createdAt: string;
  updatedAt: string;
}

/** Either `userAddressId` (server builds snapshot) or `shippingAddress` + `phone` for one-off delivery. */
export interface CreateOrderRequest {
  selectedItems: string[]; // Array of cartItemId
  shippingAddress?: string;
  phone?: string;
  userAddressId?: string;
  /** Required when ordering without a saved address (server validates against VN catalog). */
  provinceCode?: string;
  /** `standard` | `express` — must match an option returned by shipping quote for the province. */
  shippingMethodCode?: string;
  paymentMethod: "COD" | "BANK_TRANSFER";
  notes?: string;
}

export interface OrderStatusBadge {
  label: string;
  color: string;
  bgColor: string;
}
