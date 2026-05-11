// @ts-nocheck
import { Payment } from "../models/paymentModel.js";
import { Order } from "../models/orderModel.js";
import { sequelize } from "../libs/db.js";
import { generateQRCodeUrl, generateTransactionContent } from "../helpers/paymentHelper.js";

export async function createPayment(orderId: string) {
  const transaction = await sequelize.transaction();
  try {
    const order = await Order.findByPk(orderId, { transaction });
    if (!order) {
      await transaction.rollback();
      throw Object.assign(new Error("Order not found"), { status: 404 });
    }

    let payment = await Payment.findOne({ where: { orderId }, transaction });

    if (payment && payment.status === "PAID") {
      await transaction.rollback();
      throw Object.assign(new Error("Order has already been paid"), { status: 400 });
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

    return {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      amount: payment.amount,
      status: payment.status,
      bankCode: payment.bankCode,
      accountNumber: payment.accountNumber,
      accountName: process.env.SEPAY_ACCOUNT_NAME,
      transactionContent: payment.transactionContent,
      qrCodeUrl: generateQRCodeUrl(payment),
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getPaymentByOrderId(orderId: string) {
  const payment = await Payment.findOne({
    where: { orderId },
    include: [{ model: Order, as: "order" }],
  });

  if (!payment) {
    throw Object.assign(new Error("Payment information not found"), { status: 404 });
  }

  return {
    ...payment.toJSON(),
    accountName: process.env.SEPAY_ACCOUNT_NAME,
    qrCodeUrl: payment.status === "PENDING" ? generateQRCodeUrl(payment) : null,
  };
}

export async function checkPaymentStatus(orderId: string) {
  const payment = await Payment.findOne({ where: { orderId } });

  if (!payment) {
    throw Object.assign(new Error("Không tìm thấy thông tin thanh toán"), { status: 404 });
  }

  return {
    status: payment.status,
    paidAt: payment.paidAt,
    transactionId: payment.transactionId,
  };
}
