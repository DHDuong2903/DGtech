// @ts-nocheck
import { Payment } from "../models/paymentModel.js";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { User } from "../models/userModel.js";
import { sequelize } from "../libs/db.js";
import { verifyWebhookSignature, extractOrderCode } from "../helpers/paymentHelper.js";
import { completeBankTransferPayment } from "./orderPaymentCompletionService.js";
import { Webhook } from "svix";

export async function handleSepayWebhook(webhookData: any, headers: Record<string, string>) {
  const transaction = await sequelize.transaction();
  try {
    const signature = headers["x-sepay-signature"] || headers["authorization"];
    if (signature && !verifyWebhookSignature(webhookData, signature)) {
      await transaction.rollback();
      throw Object.assign(new Error("Invalid signature"), { status: 401 });
    }

    const transactionId = webhookData.transaction_id || webhookData.transactionId || webhookData.id;
    const accountNumber =
      webhookData.accountNumber || webhookData.account_number || process.env.SEPAY_ACCOUNT_NUMBER;
    const amount = parseFloat(webhookData.amount || webhookData.transferAmount || 0);
    const content = webhookData.content || webhookData.description || webhookData.transferContent;
    const transactionDate = webhookData.transaction_date || webhookData.transactionDate || webhookData.when;

    if (!content || !amount) {
      await transaction.rollback();
      throw Object.assign(new Error("Missing required webhook fields"), { status: 400 });
    }

    const orderCode = extractOrderCode(content);
    if (!orderCode) {
      await transaction.rollback();
      throw Object.assign(new Error("Invalid transaction content format"), { status: 400 });
    }

    const payment = await Payment.findOne({
      where: { transactionContent: orderCode, accountNumber, status: "PENDING" },
      include: [
        {
          model: Order,
          as: "order",
          include: [{ model: OrderItem, as: "items" }],
        },
      ],
      transaction,
    });

    if (!payment) {
      await transaction.rollback();
      throw Object.assign(new Error("Payment not found"), { status: 404 });
    }

    if (parseFloat(amount) < parseFloat(payment.amount)) {
      await transaction.rollback();
      throw Object.assign(new Error("Amount mismatch"), { status: 400 });
    }

    await completeBankTransferPayment({
      order: payment.order,
      payment,
      transaction,
      paidAt: transactionDate || new Date(),
      transactionId,
      metadata: webhookData,
    });

    await transaction.commit();
    return { orderId: payment.orderId };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function handleClerkWebhook(rawBody: string, headers: Record<string, string>) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw Object.assign(new Error("Webhook secret not configured"), { status: 500 });
  }

  const svix_id = headers["svix-id"];
  const svix_timestamp = headers["svix-timestamp"];
  const svix_signature = headers["svix-signature"];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    throw Object.assign(new Error("Missing svix headers"), { status: 400 });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;
  try {
    evt = wh.verify(rawBody, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err: any) {
    throw Object.assign(new Error("Webhook verification failed"), { status: 400 });
  }

  const eventType = evt.type;
  if (eventType === "user.created") {
    const { id, email_addresses, username, image_url, phone_numbers } = evt.data;
    const userData = {
      clerkId: id,
      email: email_addresses[0]?.email_address || "",
      username: username || email_addresses[0]?.email_address?.split("@")[0] || "",
      imageUrl: image_url || null,
      phone: phone_numbers[0]?.phone_number || null,
      role: "user",
      tier: "bronze",
    };
    await User.create(userData);
  }

  return { eventType };
}
