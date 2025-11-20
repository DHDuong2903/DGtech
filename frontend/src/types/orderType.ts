import { Product } from "./productType";

export interface OrderItem {
  orderItemId: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product: Product;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  orderId: string;
  clerkId: string;
  totalPrice: number;
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  shippingAddress: string;
  phone: string;
  paymentMethod: "COD" | "BANK_TRANSFER";
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  selectedItems: string[]; // Array of cartItemId
  shippingAddress: string;
  phone: string;
  paymentMethod: "COD" | "BANK_TRANSFER";
  notes?: string;
}

export interface OrderStatusBadge {
  label: string;
  color: string;
  bgColor: string;
}
