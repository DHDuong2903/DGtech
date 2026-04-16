// Zustand store for Orders
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Order, ApiError } from "../types";
import { orderApi } from "../apis/orderApi";
import { toast } from "sonner";

interface OrderState {
  // State
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;

  // Actions
  fetchOrders: (params?: { status?: string; page?: number; limit?: number }) => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<void>;
  createOrder: (data: {
    selectedItems: string[];
    shippingAddress?: string;
    phone?: string;
    userAddressId?: string;
    provinceCode?: string;
    shippingMethodCode?: string;
    paymentMethod: "COD" | "BANK_TRANSFER";
    notes?: string;
  }) => Promise<Order | null>;
  cancelOrder: (orderId: string) => Promise<void>;

  // Admin actions
  fetchAllOrders: (params?: { status?: string; page?: number; limit?: number }) => Promise<void>;
  updateStatus: (orderId: string, status: string) => Promise<void>;

  setError: (error: string | null) => void;
  clearError: () => void;
  clearCurrentOrder: () => void;
}

export const useOrderStore = create<OrderState>()(
  devtools(
    (set, get) => ({
      // Initial state
      orders: [],
      currentOrder: null,
      loading: false,
      error: null,
      pagination: null,

      // Fetch orders
      fetchOrders: async (params) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.getOrders(params);
          set({
            orders: response.orders,
            pagination: response.pagination,
            loading: false,
          });
        } catch (err) {
          console.error("Error fetching orders:", err);
          const error = err as ApiError;
          set({
            error: error.message || "Lỗi khi tải danh sách đơn hàng",
            loading: false,
          });
          toast.error(error.message || "Lỗi khi tải danh sách đơn hàng");
        }
      },

      // Fetch order by ID
      fetchOrderById: async (orderId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.getOrderById(orderId);
          set({ currentOrder: response.order, loading: false });
        } catch (err) {
          console.error("Error fetching order:", err);
          const error = err as ApiError;
          set({
            error: error.message || "Lỗi khi tải thông tin đơn hàng",
            loading: false,
          });
          toast.error(error.message || "Lỗi khi tải thông tin đơn hàng");
        }
      },

      // Create order
      createOrder: async (data) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.createOrder(data);
          set({ currentOrder: response.order, loading: false });
          toast.success(response.message || "Đặt hàng thành công!");
          return response.order;
        } catch (err: unknown) {
          console.error("Error creating order:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          const errorMessage = error?.response?.data?.error || error?.message || "Lỗi khi tạo đơn hàng";
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
          return null;
        }
      },

      // Cancel order
      cancelOrder: async (orderId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.cancelOrder(orderId);

          // Update orders list if exists
          const currentOrders = get().orders;
          const updatedOrders = currentOrders.map((order) => (order.orderId === orderId ? response.order : order));

          // Update current order if it's the same
          const currentOrder = get().currentOrder;
          const updatedCurrentOrder = currentOrder?.orderId === orderId ? response.order : currentOrder;

          set({
            orders: updatedOrders,
            currentOrder: updatedCurrentOrder,
            loading: false,
          });

          toast.success(response.message || "Đã hủy đơn hàng thành công");
        } catch (err: unknown) {
          console.error("Error cancelling order:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          const errorMessage = error?.response?.data?.error || error?.message || "Lỗi khi hủy đơn hàng";
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      // Admin: Fetch all orders
      fetchAllOrders: async (params) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.getAllOrders(params);
          set({
            orders: response.orders,
            pagination: response.pagination,
            loading: false,
          });
        } catch (err) {
          console.error("Error fetching all orders:", err);
          const error = err as ApiError;
          set({
            error: error.message || "Lỗi khi tải danh sách đơn hàng",
            loading: false,
          });
          toast.error(error.message || "Lỗi khi tải danh sách đơn hàng");
        }
      },

      // Admin: Update order status
      updateStatus: async (orderId: string, status: string) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.updateOrderStatus(orderId, status);

          // Update orders list
          const currentOrders = get().orders;
          const updatedOrders = currentOrders.map((order) => (order.orderId === orderId ? response.order : order));

          // Update current order if it's the same
          const currentOrder = get().currentOrder;
          const updatedCurrentOrder = currentOrder?.orderId === orderId ? response.order : currentOrder;

          set({
            orders: updatedOrders,
            currentOrder: updatedCurrentOrder,
            loading: false,
          });

          toast.success(response.message || "Cập nhật trạng thái thành công");
        } catch (err: unknown) {
          console.error("Error updating order status:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          const errorMessage = error?.response?.data?.error || error?.message || "Lỗi khi cập nhật trạng thái";
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      // Set error
      setError: (error: string | null) => set({ error }),

      // Clear error
      clearError: () => set({ error: null }),

      // Clear current order
      clearCurrentOrder: () => set({ currentOrder: null }),
    }),
    { name: "OrderStore" }
  )
);
