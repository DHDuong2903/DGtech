// @ts-nocheck
import { Payment } from "../models/paymentModel.js";
import { Order } from "../models/orderModel.js";
import { sequelize } from "../libs/db.js";
import { generateQRCodeUrl, generateTransactionContent } from "../helpers/paymentHelper.js";
import { handleError } from "../helpers/handleError.js";

// Tao thong tin thanh toan cho order
export const createPayment = async (req: any, res: any) => {
  const transaction = await sequelize.transaction();

  try {
    const { orderId } = req.body;

    const order = await Order.findByPk(orderId, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    let payment = await Payment.findOne({
      where: { orderId },
      transaction,
    });

    if (payment && payment.status === "PAID") {
      await transaction.rollback();
      return res.status(400).json({ error: "Đơn hàng đã được thanh toán" });
    }

    const transactionContent = generateTransactionContent(order.orderId);

    if (!payment) {
      payment = await Payment.create(
        {
          orderId: order.orderId,
          amount: order.totalPrice,
          paymentMethod: "SEPAY",
          status: "PENDING",
          transactionContent,
          bankCode: process.env.SEPAY_BANK_CODE || "MB",
          accountNumber: process.env.SEPAY_ACCOUNT_NUMBER,
        },
        { transaction }
      );
    }

    await transaction.commit();

    res.status(200).json({
      payment: {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
        bankCode: payment.bankCode,
        accountNumber: payment.accountNumber,
        accountName: process.env.SEPAY_ACCOUNT_NAME,
        transactionContent: payment.transactionContent,
        qrCodeUrl: generateQRCodeUrl(payment),
      },
      message: "Thông tin thanh toán đã được tạo",
    });
  } catch (error) {
    await transaction.rollback();
    return handleError(res, error, "Lỗi khi tạo thông tin thanh toán");
  }
};

// Lay thong tin thanh toan theo order ID
export const getPaymentByOrderId = async (req: any, res: any) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({
      where: { orderId },
      include: [
        {
          model: Order,
          as: "order",
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({ error: "Không tìm thấy thông tin thanh toán" });
    }

    res.status(200).json({
      payment: {
        ...payment.toJSON(),
        accountName: process.env.SEPAY_ACCOUNT_NAME,
        qrCodeUrl: payment.status === "PENDING" ? generateQRCodeUrl(payment) : null,
      },
    });
  } catch (error) {
    return handleError(res, error, "Lỗi khi lấy thông tin thanh toán");
  }
};

// Kiem tra trang thai thanh toan theo order ID
export const checkPaymentStatus = async (req: any, res: any) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({
      where: { orderId },
    });

    if (!payment) {
      return res.status(404).json({ error: "Không tìm thấy thông tin thanh toán" });
    }

    res.status(200).json({
      status: payment.status,
      paidAt: payment.paidAt,
      transactionId: payment.transactionId,
    });
  } catch (error) {
    return handleError(res, error, "Lỗi khi kiểm tra trạng thái thanh toán");
  }
};

