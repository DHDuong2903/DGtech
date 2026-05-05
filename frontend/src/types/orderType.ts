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

/** Buyer snapshot on admin APIs when `user` is included. */
export interface OrderBuyerSummary {
  clerkId: string;
  username?: string | null;
  email?: string | null;
}

export interface OrderPaymentSummary {
  status?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | string;
  paymentMethod?: "COD" | "BANK_TRANSFER" | string;
  paidAt?: string | null;
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
  voucherId?: string | null;
  voucherName?: string | null;
  voucherDiscountAmount?: number;
  taxAmount?: number;
  itemsTaxAmount?: number;
  shippingTaxAmount?: number;
  taxRateSnapshot?: number;
  taxEnabledSnapshot?: boolean;
  taxIncludedSnapshot?: boolean;
  totalPrice: number;
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CANCELLED";
  shippingAddress: string;
  phone: string;
  paymentMethod: "COD" | "BANK_TRANSFER";
  notes?: string;
  userAddressId?: string | null;
  items: OrderItem[];
  payment?: OrderPaymentSummary | null;
  /** Present on admin list/detail when backend includes User. */
  user?: OrderBuyerSummary;
  adminNotes?: string | null;
  trackingNumber?: string | null;
  carrierName?: string | null;
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
