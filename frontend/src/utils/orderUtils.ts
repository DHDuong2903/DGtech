import { Order } from "../types";

export const getStatusColor = (status: Order["status"]) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "PROCESSING":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "SHIPPED":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "DELIVERED":
      return "bg-green-100 text-green-800 border-green-200";
    case "COMPLETED":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const getStatusLabel = (status: Order["status"]) => {
  switch (status) {
    case "PENDING":
      return "Chờ thanh toán";
    case "PROCESSING":
      return "Đang chuẩn bị";
    case "SHIPPED":
      return "Đang giao hàng";
    case "DELIVERED":
      return "Đã giao hàng";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
};
