// @ts-nocheck
import {
  createOrder as createOrderSvc,
  getOrders as getOrdersSvc,
  getOrderById as getOrderByIdSvc,
  cancelOrder as cancelOrderSvc,
  getAllOrders as getAllOrdersSvc,
  confirmOrderPaymentAdmin as confirmOrderPaymentAdminSvc,
  patchAdminOrder as patchAdminOrderSvc,
  deleteAdminOrder as deleteAdminOrderSvc,
  updateOrderStatus as updateOrderStatusSvc,
  fetchOrderAdminDetail,
} from "../services/orderService.js";

export const createOrder = async (req: any, res: any) => {
  try {
    const order = await createOrderSvc(req.auth.userId, req.body);
    return res.status(201).json({ message: "Order placed successfully", order });
  } catch (error: any) {
    console.error("Error in createOrder", error);
    return res.status(error.status || 500).json({ error: error.message || "Error creating order" });
  }
};

export const getOrders = async (req: any, res: any) => {
  try {
    const result = await getOrdersSvc(req.auth.userId, req.query);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in getOrders", error);
    return res.status(500).json({ error: "Error retrieving orders" });
  }
};

export const getOrderById = async (req: any, res: any) => {
  try {
    const order = await getOrderByIdSvc(req.auth.userId, req.params.orderId);
    return res.status(200).json({ order });
  } catch (error: any) {
    console.error("Error in getOrderById", error);
    return res.status(error.status || 500).json({ error: error.message || "Error retrieving order details" });
  }
};

export const cancelOrder = async (req: any, res: any) => {
  try {
    const order = await cancelOrderSvc(req.auth.userId, req.params.orderId);
    return res.status(200).json({ message: "Order cancelled successfully", order });
  } catch (error: any) {
    console.error("Error in cancelOrder", error);
    return res.status(error.status || 500).json({ error: error.message || "Error cancelling order" });
  }
};

export const getAllOrders = async (req: any, res: any) => {
  try {
    const result = await getAllOrdersSvc(req.query);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error getting all orders:", error);
    return res.status(500).json({ error: "Error retrieving orders" });
  }
};

export const getAdminOrderById = async (req: any, res: any) => {
  try {
    const order = await fetchOrderAdminDetail(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    return res.status(200).json({ order });
  } catch (error) {
    console.error("Error in getAdminOrderById", error);
    return res.status(500).json({ error: "Error retrieving order details" });
  }
};

export const confirmOrderPaymentAdmin = async (req: any, res: any) => {
  try {
    const reference = req.body?.reference ?? req.body?.transactionId ?? null;
    const { alreadyPaid, order } = await confirmOrderPaymentAdminSvc(
      req.params.orderId, reference, req.body?.metadata
    );
    return res.status(200).json({
      message: alreadyPaid ? "Payment previously recorded" : "Payment confirmed",
      order, alreadyPaid,
    });
  } catch (error: any) {
    console.error("Error in confirmOrderPaymentAdmin", error);
    return res.status(error.status || 500).json({ error: error.message || "Error confirming payment" });
  }
};

export const patchAdminOrder = async (req: any, res: any) => {
  try {
    const order = await patchAdminOrderSvc(req.params.orderId, req.body);
    return res.status(200).json({ message: "Updated", order });
  } catch (error: any) {
    console.error("Error in patchAdminOrder", error);
    return res.status(error.status || 500).json({ error: error.message || "Error updating order" });
  }
};

export const deleteAdminOrder = async (req: any, res: any) => {
  try {
    await deleteAdminOrderSvc(req.params.orderId);
    return res.status(200).json({ message: "Order deleted" });
  } catch (error: any) {
    console.error("Error in deleteAdminOrder", error);
    return res.status(error.status || 500).json({ error: error.message || "Error deleting order" });
  }
};

export const updateOrderStatus = async (req: any, res: any) => {
  try {
    const order = await updateOrderStatusSvc(req.params.orderId, req.body.status);
    return res.status(200).json({ message: "Order status updated successfully", order });
  } catch (error: any) {
    console.error("Error in updateOrderStatus", error);
    return res.status(error.status || 500).json({ error: error.message || "Error updating order status" });
  }
};
