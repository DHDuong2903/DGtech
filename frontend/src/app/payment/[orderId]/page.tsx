"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const hasShownPaidToastRef = useRef(false);

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

  const checkPaymentStatus = useCallback(
    async ({ background = false, showPaidToast = true }: { background?: boolean; showPaidToast?: boolean } = {}) => {
      try {
        const response = await paymentApi.checkPaymentStatus(orderId);

        if (response.status === "PAID") {
          if (showPaidToast && !hasShownPaidToastRef.current) {
            toast.success("Payment received. Your order is being processed.");
            hasShownPaidToastRef.current = true;
          }
          await fetchPayment();
        }
      } catch (error) {
        console.error("Error checking payment:", error);
        if (!background) {
          toast.error("Could not check payment status");
        }
      }
    },
    [orderId, fetchPayment]
  );

  useEffect(() => {
    if (payment?.status === "PAID") {
      hasShownPaidToastRef.current = true;
    }
  }, [payment?.status]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${field}`);
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

  // Countdown timer based on createdAt (30 minutes duration)
  useEffect(() => {
    if (!payment || payment.status === "PAID") return;

    const EXPIRE_DURATION = 30 * 60; // 30 minutes in seconds
    const createdAtTime = new Date(payment.createdAt).getTime();

    const calculateTimeLeft = () => {
      const now = Date.now();
      const diff = Math.floor((createdAtTime + EXPIRE_DURATION * 1000 - now) / 1000);
      return diff > 0 ? diff : 0;
    };

    // Initial sync
    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);
    if (initialTimeLeft <= 0) {
      setIsExpired(true);
      return;
    } else {
      setIsExpired(false);
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [payment]);

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

  useEffect(() => {
    if (!payment || payment.status === "PAID" || isExpired) return;

    const interval = setInterval(() => {
      void checkPaymentStatus({ background: true, showPaidToast: true });
    }, 5000);

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
    <div className="min-h-screen bg-background py-3">
      <div className={cn("mx-auto max-w-4xl", STOREFRONT_H_PADDING)}>
        <PaymentHeader
          orderId={orderId}
          isPaid={isPaid}
          isExpired={isExpired}
          timeLeft={timeLeft ?? 0}
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
              onCopy={copyToClipboard}
            />
          </div>
        )}
      </div>
    </div>
  );
}
