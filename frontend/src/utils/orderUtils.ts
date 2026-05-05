import { Order } from "../types";

export const getStatusColor = (status: Order["status"]) => {
  switch (status) {
    case "PENDING":
      return "border-amber-500/30 bg-amber-500/15 text-amber-950 dark:text-amber-300";
    case "PROCESSING":
      return "border-sky-500/30 bg-sky-500/15 text-sky-950 dark:text-sky-300";
    case "SHIPPED":
      return "border-violet-500/30 bg-violet-500/15 text-violet-950 dark:text-violet-300";
    case "DELIVERED":
      return "border-indigo-500/30 bg-indigo-500/15 text-indigo-950 dark:text-indigo-300";
    case "COMPLETED":
      return "border-teal-500/30 bg-teal-500/15 text-teal-950 dark:text-teal-300";
    case "CANCELLED":
      return "border-red-500/30 bg-red-500/15 text-red-950 dark:text-red-300";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const getStatusLabel = (status: Order["status"]) => {
  switch (status) {
    case "PENDING":
      return "Awaiting payment";
    case "PROCESSING":
      return "Preparing order";
    case "SHIPPED":
      return "In transit";
    case "DELIVERED":
      return "Delivered";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
};

type PaymentSummary = { status?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | string } | null | undefined;

export const getPaymentStatusLabel = (
  paymentMethod: Order["paymentMethod"],
  orderStatus?: Order["status"],
  payment?: PaymentSummary,
) => {
  if (paymentMethod === "COD") {
    if (orderStatus === "DELIVERED" || orderStatus === "COMPLETED") {
      return "Paid";
    }
    return "Pay on delivery";
  }
  switch (payment?.status) {
    case "PAID":
      return "Paid";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    case "PENDING":
    default:
      return "Awaiting transfer";
  }
};

export const getPaymentStatusColor = (paymentMethod: Order["paymentMethod"], orderStatus?: Order["status"], payment?: PaymentSummary) => {
  if (paymentMethod === "COD") {
    if (orderStatus === "DELIVERED" || orderStatus === "COMPLETED") {
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-950 dark:text-emerald-300";
    }
    return "border-slate-500/30 bg-slate-500/10 text-slate-950 dark:text-slate-300";
  }
  switch (payment?.status) {
    case "PAID":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-950 dark:text-emerald-300";
    case "FAILED":
      return "border-red-500/30 bg-red-500/15 text-red-950 dark:text-red-300";
    case "REFUNDED":
      return "border-orange-500/30 bg-orange-500/15 text-orange-950 dark:text-orange-300";
    case "PENDING":
    default:
      return "border-amber-500/30 bg-amber-500/15 text-amber-950 dark:text-amber-300";
  }
};
