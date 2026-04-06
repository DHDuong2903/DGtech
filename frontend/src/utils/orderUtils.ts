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
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-950 dark:text-emerald-300";
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
      return "Pending payment";
    case "PROCESSING":
      return "Processing";
    case "SHIPPED":
      return "Shipped";
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
