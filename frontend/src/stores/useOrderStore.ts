// Zustand store for Orders
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Order, ApiError } from "../types";
import { orderApi } from "../apis/orderApi";
import { toast } from "sonner";

interface OrderState {
  // State — customer
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

  // State — admin (separate from customer to avoid clobbering)
  adminOrders: Order[];
  adminOrderDetail: Order | null;
  /** Last params used by `fetchAllOrders` (for list refresh after delete). */
  lastAdminListParams: {
    status?: string;
    page?: number;
    limit?: number;
    paymentMethod?: string;
    search?: string;
  } | null;
  adminPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;

  // Actions — customer
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

  // Actions — admin
  fetchAllOrders: (params?: {
    status?: string;
    page?: number;
    limit?: number;
    paymentMethod?: string;
    search?: string;
  }) => Promise<void>;
  fetchAdminOrderById: (orderId: string) => Promise<void>;
  updateStatus: (orderId: string, status: string) => Promise<void>;
  confirmAdminPayment: (orderId: string, body?: { reference?: string }) => Promise<void>;
  patchAdminOrder: (
    orderId: string,
    body: { adminNotes?: string; trackingNumber?: string; carrierName?: string },
  ) => Promise<void>;
  deleteAdminOrder: (orderId: string) => Promise<void>;
  deleteAdminOrders: (orderIds: string[]) => Promise<void>;

  setError: (error: string | null) => void;
  clearError: () => void;
  clearCurrentOrder: () => void;
  clearAdminOrderDetail: () => void;
}

export const useOrderStore = create<OrderState>()(
  devtools(
    (set, get) => ({
      orders: [],
      currentOrder: null,
      loading: false,
      error: null,
      pagination: null,

      adminOrders: [],
      adminOrderDetail: null,
      lastAdminListParams: null,
      adminPagination: null,

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
            error: error.message || "Error loading orders list",
            loading: false,
          });
          toast.error(error.message || "Error loading orders list");
        }
      },

      fetchOrderById: async (orderId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.getOrderById(orderId);
          set({ currentOrder: response.order, loading: false });
        } catch (err) {
          console.error("Error fetching order:", err);
          const error = err as ApiError;
          set({
            error: error.message || "Error loading order details",
            loading: false,
          });
          toast.error(error.message || "Error loading order details");
        }
      },

      createOrder: async (data) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.createOrder(data);
          set({ currentOrder: response.order, loading: false });
          toast.success(response.message || "Order placed successfully!");
          return response.order;
        } catch (err: unknown) {
          console.error("Error creating order:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          const errorMessage = error?.response?.data?.error || error?.message || "Error creating order";
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
          return null;
        }
      },

      cancelOrder: async (orderId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.cancelOrder(orderId);

          const currentOrders = get().orders;
          const updatedOrders = currentOrders.map((order) => (order.orderId === orderId ? response.order : order));

          const currentOrder = get().currentOrder;
          const updatedCurrentOrder = currentOrder?.orderId === orderId ? response.order : currentOrder;

          set({
            orders: updatedOrders,
            currentOrder: updatedCurrentOrder,
            loading: false,
          });

          toast.success(response.message || "Order cancelled successfully");
        } catch (err: unknown) {
          console.error("Error cancelling order:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          const errorMessage = error?.response?.data?.error || error?.message || "Error cancelling order";
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      fetchAllOrders: async (params) => {
        set({ loading: true, error: null, lastAdminListParams: params ?? get().lastAdminListParams });
        try {
          const response = await orderApi.getAllOrders(params);
          set({
            adminOrders: response.orders,
            adminPagination: response.pagination,
            lastAdminListParams: params ?? get().lastAdminListParams,
            loading: false,
          });
        } catch (err) {
          console.error("Error fetching all orders:", err);
          const error = err as ApiError;
          set({
            error: error.message || "Error loading orders list",
            loading: false,
          });
          toast.error(error.message || "Error loading orders list");
        }
      },

      fetchAdminOrderById: async (orderId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.getAdminOrderById(orderId);
          set({ adminOrderDetail: response.order, loading: false });
        } catch (err) {
          console.error("Error fetching admin order:", err);
          const error = err as ApiError;
          set({
            adminOrderDetail: null,
            error: error.message || "Error loading order details",
            loading: false,
          });
          toast.error(error.message || "Error loading order details");
        }
      },

      updateStatus: async (orderId: string, status: string) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.updateOrderStatus(orderId, status);

          const adminOrders = get().adminOrders;
          const updatedAdminOrders = adminOrders.map((order) =>
            order.orderId === orderId ? response.order : order,
          );

          const adminOrderDetail = get().adminOrderDetail;
          const nextDetail = adminOrderDetail?.orderId === orderId ? response.order : adminOrderDetail;

          set({
            adminOrders: updatedAdminOrders,
            adminOrderDetail: nextDetail,
            loading: false,
          });

          toast.success(response.message || "Status updated successfully");
        } catch (err: unknown) {
          console.error("Error updating order status:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          const errorMessage = error?.response?.data?.error || error?.message || "Error updating status";
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      confirmAdminPayment: async (orderId: string, body) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.confirmAdminPayment(orderId, body);
          const adminOrders = get().adminOrders;
          const updatedAdminOrders = adminOrders.map((order) =>
            order.orderId === orderId ? response.order : order,
          );
          const adminOrderDetail = get().adminOrderDetail;
          const nextDetail = adminOrderDetail?.orderId === orderId ? response.order : adminOrderDetail;
          set({
            adminOrders: updatedAdminOrders,
            adminOrderDetail: nextDetail,
            loading: false,
          });
          toast.success(response.message || "Payment confirmed");
        } catch (err: unknown) {
          console.error("Error confirming payment:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          const errorMessage = error?.response?.data?.error || error?.message || "Error confirming payment";
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      patchAdminOrder: async (orderId, body) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.patchAdminOrder(orderId, body);
          const adminOrders = get().adminOrders;
          const updatedAdminOrders = adminOrders.map((order) =>
            order.orderId === orderId ? response.order : order,
          );
          const adminOrderDetail = get().adminOrderDetail;
          const nextDetail = adminOrderDetail?.orderId === orderId ? response.order : adminOrderDetail;
          set({
            adminOrders: updatedAdminOrders,
            adminOrderDetail: nextDetail,
            loading: false,
          });
          toast.success(response.message || "Saved successfully");
        } catch (err: unknown) {
          console.error("Error patching admin order:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          const errorMessage = error?.response?.data?.error || error?.message || "Error while saving";
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      deleteAdminOrder: async (orderId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await orderApi.deleteAdminOrder(orderId);
          if (get().adminOrderDetail?.orderId === orderId) {
            set({ adminOrderDetail: null });
          }
          const p = get().lastAdminListParams;
          if (p) {
            await get().fetchAllOrders(p);
          } else {
            set({
              adminOrders: get().adminOrders.filter((o) => o.orderId !== orderId),
              loading: false,
            });
          }
          toast.success(response.message || "Order deleted");
        } catch (err: unknown) {
          console.error("Error deleting order:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          const errorMessage = error?.response?.data?.error || error?.message || "Error deleting order";
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      deleteAdminOrders: async (orderIds: string[]) => {
        if (!orderIds.length) return;
        set({ loading: true, error: null });
        try {
          for (const id of orderIds) {
            await orderApi.deleteAdminOrder(id);
          }
          const ad = get().adminOrderDetail;
          if (ad && orderIds.includes(ad.orderId)) {
            set({ adminOrderDetail: null });
          }
          const p = get().lastAdminListParams;
          if (p) {
            await get().fetchAllOrders(p);
          } else {
            set({
              adminOrders: get().adminOrders.filter((o) => !orderIds.includes(o.orderId)),
              loading: false,
            });
          }
          toast.success(`Deleted ${orderIds.length} orders`);
        } catch (err: unknown) {
          console.error("Error deleting orders:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          const errorMessage = error?.response?.data?.error || error?.message || "Error deleting orders";
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      setError: (error: string | null) => set({ error }),

      clearError: () => set({ error: null }),

      clearCurrentOrder: () => set({ currentOrder: null }),

      clearAdminOrderDetail: () => set({ adminOrderDetail: null }),
    }),
    { name: "OrderStore" },
  ),
);
