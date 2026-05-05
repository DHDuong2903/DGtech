import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import { Order, CreateOrderRequest } from "../types";

export const orderApi = {
  // Create new order
  createOrder: async (data: CreateOrderRequest): Promise<{ order: Order; message: string }> => {
    const response = await axiosInstance.post(API_ROUTE.ORDERS, data);
    return response.data;
  },

  // Get user's orders
  getOrders: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    orders: Order[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    const response = await axiosInstance.get(API_ROUTE.ORDERS, { params });
    return response.data;
  },

  // Get order by ID
  getOrderById: async (orderId: string): Promise<{ order: Order }> => {
    const response = await axiosInstance.get(`${API_ROUTE.ORDERS}/${orderId}`);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId: string): Promise<{ order: Order; message: string }> => {
    const response = await axiosInstance.put(`${API_ROUTE.ORDERS}/${orderId}/cancel`);
    return response.data;
  },

  // Admin: Get all orders
  getAllOrders: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    paymentMethod?: string;
    search?: string;
  }): Promise<{
    orders: Order[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    const response = await axiosInstance.get(`${API_ROUTE.ORDERS}/admin/all`, { params });
    return response.data;
  },

  // Admin: Single order (any customer)
  getAdminOrderById: async (orderId: string): Promise<{ order: Order }> => {
    const response = await axiosInstance.get(`${API_ROUTE.ORDERS}/admin/${orderId}`);
    return response.data;
  },

  // Admin: Update order status
  updateOrderStatus: async (orderId: string, status: string): Promise<{ order: Order; message: string }> => {
    const response = await axiosInstance.put(`${API_ROUTE.ORDERS}/admin/${orderId}/status`, {
      status,
    });
    return response.data;
  },

  // Admin: Confirm bank transfer manually
  confirmAdminPayment: async (
    orderId: string,
    body?: { reference?: string; transactionId?: string },
  ): Promise<{ order: Order; message: string; alreadyPaid?: boolean }> => {
    const response = await axiosInstance.put(`${API_ROUTE.ORDERS}/admin/${orderId}/confirm-payment`, body ?? {});
    return response.data;
  },

  // Admin: Internal notes + tracking
  patchAdminOrder: async (
    orderId: string,
    body: { adminNotes?: string; trackingNumber?: string; carrierName?: string },
  ): Promise<{ order: Order; message: string }> => {
    const response = await axiosInstance.patch(`${API_ROUTE.ORDERS}/admin/${orderId}`, body);
    return response.data;
  },

  /** Admin: permanently remove order and related records (with stock restore if needed). */
  deleteAdminOrder: async (orderId: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`${API_ROUTE.ORDERS}/admin/${orderId}`);
    return response.data;
  },
};
