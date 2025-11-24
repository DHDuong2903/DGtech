import axiosInstance from "../lib/axios";
import { Payment, CreatePaymentRequest } from "../types";

const PAYMENTS_URL = "/payments";

export const paymentApi = {
  // Create payment for order
  createPayment: async (data: CreatePaymentRequest): Promise<{ payment: Payment; message: string }> => {
    const response = await axiosInstance.post(`${PAYMENTS_URL}/create`, data);
    return response.data;
  },

  // Get payment by order ID
  getPaymentByOrderId: async (orderId: string): Promise<{ payment: Payment }> => {
    const response = await axiosInstance.get(`${PAYMENTS_URL}/order/${orderId}`);
    return response.data;
  },

  // Check payment status
  checkPaymentStatus: async (orderId: string): Promise<{ status: string; paidAt?: string; transactionId?: string }> => {
    const response = await axiosInstance.get(`${PAYMENTS_URL}/status/${orderId}`);
    return response.data;
  },
};
