import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import { Payment, CreatePaymentRequest } from "../types";

export const paymentApi = {
  // Create payment for order
  createPayment: async (data: CreatePaymentRequest): Promise<{ payment: Payment; message: string }> => {
    const response = await axiosInstance.post(`${API_ROUTE.PAYMENTS}/create`, data);
    return response.data;
  },

  // Get payment by order ID
  getPaymentByOrderId: async (orderId: string): Promise<{ payment: Payment }> => {
    const response = await axiosInstance.get(`${API_ROUTE.PAYMENTS}/order/${orderId}`);
    return response.data;
  },

  // Check payment status
  checkPaymentStatus: async (orderId: string): Promise<{ status: string; paidAt?: string; transactionId?: string }> => {
    const response = await axiosInstance.get(`${API_ROUTE.PAYMENTS}/status/${orderId}`);
    return response.data;
  },
};
