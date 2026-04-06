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
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";

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
      toast.error("Could not load payment details");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const checkPaymentStatus = useCallback(async () => {
    try {
      setChecking(true);
      const response = await paymentApi.checkPaymentStatus(orderId);

      if (response.status === "PAID") {
        toast.success("Payment received. Your order is being processed.");
        // Refresh payment info
        await fetchPayment();
      } else {
        toast.info("Payment not detected yet");
      }
    } catch (error) {
      console.error("Error checking payment:", error);
      toast.error("Could not check payment status");
    } finally {
      setChecking(false);
    }
  }, [orderId, fetchPayment]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`Copied ${field}`);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    // Fetch only when authenticated
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
        toast.error("Order cancelled: payment time expired");
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
    <div className="min-h-screen bg-background py-8">
      <div className={cn("mx-auto max-w-4xl", STOREFRONT_H_PADDING)}>
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
