// @ts-nocheck
import { handleError } from "../helpers/handleError.js";
import {
  createPayment as createPaymentSvc,
  getPaymentByOrderId as getPaymentByOrderIdSvc,
  checkPaymentStatus as checkPaymentStatusSvc,
} from "../services/paymentService.js";

export const createPayment = async (req: any, res: any) => {
  try {
    const payment = await createPaymentSvc(req.body.orderId);
    return res.status(200).json({ payment, message: "Thông tin thanh toán đã được tạo" });
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return handleError(res, error, "Lỗi khi tạo thông tin thanh toán");
  }
};

export const getPaymentByOrderId = async (req: any, res: any) => {
  try {
    const payment = await getPaymentByOrderIdSvc(req.params.orderId);
    return res.status(200).json({ payment });
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return handleError(res, error, "Lỗi khi lấy thông tin thanh toán");
  }
};

export const checkPaymentStatus = async (req: any, res: any) => {
  try {
    const result = await checkPaymentStatusSvc(req.params.orderId);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return handleError(res, error, "Error checking payment status");
  }
};
