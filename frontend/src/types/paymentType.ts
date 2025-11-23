export interface Payment {
  paymentId: string;
  orderId: string;
  amount: number;
  paymentMethod: "COD" | "BANK_TRANSFER" | "SEPAY";
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  transactionId?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  transactionContent?: string;
  paidAt?: string;
  qrCodeUrl?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  orderId: string;
}
