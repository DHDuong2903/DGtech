"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { paymentApi } from "../../../apis/paymentApi";
import { Payment } from "../../../types";
import { toast } from "sonner";
import {
  PaymentLoadingState,
  PaymentNotFound,
  PaymentHeader,
  PaymentExpired,
  PaymentSuccess,
  PaymentQRCode,
  PaymentBankInfo,
} from "../../../components/public/payment";

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const orderId = params.orderId as string;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);

  const fetchPayment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentApi.getPaymentByOrderId(orderId);
      setPayment(response.payment);
    } catch (error) {
      console.error("Error fetching payment:", error);
      toast.error("Không thể tải thông tin thanh toán");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const checkPaymentStatus = useCallback(async () => {
    try {
      setChecking(true);
      const response = await paymentApi.checkPaymentStatus(orderId);

      if (response.status === "PAID") {
        toast.success("Thanh toán thành công! Đơn hàng đang được giao...");
        // Refresh payment info
        await fetchPayment();
      } else {
        toast.info("Chưa nhận được thanh toán");
      }
    } catch (error) {
      console.error("Error checking payment:", error);
      toast.error("Không thể kiểm tra trạng thái thanh toán");
    } finally {
      setChecking(false);
    }
  }, [orderId, fetchPayment]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`Đã sao chép ${field}`);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    // Chỉ fetch khi đã authenticated
    if (isLoaded && isSignedIn && orderId) {
      fetchPayment();
    }
  }, [isLoaded, isSignedIn, orderId, fetchPayment]);

  // Countdown timer (3 minutes)
  useEffect(() => {
    if (!payment || payment.status === "PAID" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [payment, timeLeft]);

  // Auto cancel order when expired
  useEffect(() => {
    if (!isExpired || !orderId || payment?.status !== "PENDING") return;

    const cancelExpiredOrder = async () => {
      try {
        const { orderApi } = await import("../../../apis/orderApi");
        await orderApi.cancelOrder(orderId);
        toast.error("Đơn hàng đã bị hủy do quá thời gian thanh toán");
      } catch (error) {
        console.error("Error canceling expired order:", error);
      }
    };

    cancelExpiredOrder();
  }, [isExpired, orderId, payment?.status]);

  // Auto refresh payment status every 10 seconds
  useEffect(() => {
    if (!payment || payment.status === "PAID" || isExpired) return;

    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [payment, isExpired, checkPaymentStatus]);

  if (!isLoaded || loading) {
    return <PaymentLoadingState />;
  }

  if (!payment) {
    return <PaymentNotFound orderId={orderId} onBackToOrder={() => router.push(`/orders/${orderId}`)} />;
  }

  const isPaid = payment.status === "PAID";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <PaymentHeader
          orderId={orderId}
          isPaid={isPaid}
          isExpired={isExpired}
          timeLeft={timeLeft}
          onBackToOrder={() => router.push(`/orders/${orderId}`)}
        />

        {isExpired && !isPaid ? (
          <PaymentExpired
            orderId={orderId}
            onViewOrder={() => router.push(`/orders/${orderId}`)}
            onContinueShopping={() => router.push("/shop")}
          />
        ) : isPaid ? (
          <PaymentSuccess
            orderId={orderId}
            transactionId={payment.transactionId}
            onViewOrderDetail={() => router.push(`/orders/${orderId}`)}
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <PaymentQRCode qrCodeUrl={payment.qrCodeUrl} />

            <PaymentBankInfo
              bankCode={payment.bankCode}
              accountNumber={payment.accountNumber}
              accountName={payment.accountName}
              amount={payment.amount}
              transactionContent={payment.transactionContent}
              checking={checking}
              copied={copied}
              onCopy={copyToClipboard}
              onCheckStatus={checkPaymentStatus}
            />
          </div>
        )}
      </div>
    </div>
  );
}
