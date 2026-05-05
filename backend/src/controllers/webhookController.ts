// @ts-nocheck
import { Payment } from "../models/paymentModel.js";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { User } from "../models/userModel.js";
import { sequelize } from "../libs/db.js";
import { verifyWebhookSignature, extractOrderCode } from "../helpers/paymentHelper.js";
import { completeBankTransferPayment } from "../services/orderPaymentCompletionService.js";
import { Webhook } from "svix";

// Handle SePay webhook
export const handleSepayWebhook = async (req: any, res: any) => {
  const transaction = await sequelize.transaction();

  try {
    const webhookData = req.body;
    console.log("Received SePay webhook:", JSON.stringify(webhookData, null, 2));

    const signature = req.headers["x-sepay-signature"] || req.headers["authorization"];
    if (signature && !verifyWebhookSignature(webhookData, signature)) {
      console.log("Invalid webhook signature");
      await transaction.rollback();
      return res.status(401).json({ error: "Invalid signature" });
    }

    const transactionId =
      webhookData.transaction_id || webhookData.transactionId || webhookData.id;
    const accountNumber =
      webhookData.accountNumber || webhookData.account_number || process.env.SEPAY_ACCOUNT_NUMBER;
    const amount = parseFloat(webhookData.amount || webhookData.transferAmount || 0);
    const content =
      webhookData.content || webhookData.description || webhookData.transferContent;
    const transactionDate =
      webhookData.transaction_date ||
      webhookData.transactionDate ||
      webhookData.when;

    if (!content || !amount) {
      console.log("Missing required fields:", { content, amount });
      await transaction.rollback();
      return res.status(400).json({ error: "Missing required webhook fields" });
    }

    const orderCode = extractOrderCode(content);

    if (!orderCode) {
      console.log("Order code not found in content:", content);
      await transaction.rollback();
      return res.status(400).json({ error: "Invalid transaction content format" });
    }

    console.log("Extracted order code:", orderCode);
    console.log("Searching for payment with:", {
      transactionContent: orderCode,
      accountNumber: accountNumber,
      status: "PENDING",
    });

    const payment = await Payment.findOne({
      where: {
        transactionContent: orderCode,
        accountNumber: accountNumber,
        status: "PENDING",
      },
      include: [
        {
          model: Order,
          as: "order",
          include: [
            {
              model: OrderItem,
              as: "items",
            },
          ],
        },
      ],
      transaction,
    });

    if (!payment) {
      console.log("Payment not found for:", { orderCode, accountNumber, content });

      const allPendingPayments = await Payment.findAll({
        where: { status: "PENDING" },
        attributes: ["paymentId", "transactionContent", "accountNumber", "amount"],
      });
      console.log("All pending payments:", JSON.stringify(allPendingPayments, null, 2));

      await transaction.rollback();
      return res.status(404).json({ error: "Payment not found" });
    }

    if (parseFloat(amount) < parseFloat(payment.amount)) {
      console.log("Amount mismatch:", amount, "vs", payment.amount);
      await transaction.rollback();
      return res.status(400).json({ error: "Amount mismatch" });
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

    console.log("Payment successful for order:", payment.orderId);

    res.status(200).json({
      success: true,
      message: "Thanh toán thành công. Đơn hàng đang được xử lý.",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error processing SePay webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Handle Clerk webhook
export const handleClerkWebhook = async (req: any, res: any) => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error("CLERK_WEBHOOK_SECRET is not set");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: "Missing svix headers" });
    }

    const body = req.body.toString();

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err: any) {
      console.error("Webhook verification failed:", err?.message);
      return res.status(400).json({ error: "Webhook verification failed" });
    }

    const eventType = evt.type;
    console.log(`Clerk Webhook: ${eventType}`);

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

      try {
        await User.create(userData);
        console.log(`User created: ${id}`);
        return res.status(200).json({ success: true });
      } catch (error: any) {
        console.error("Error creating user:", error?.message);
        return res.status(500).json({ error: "Failed to create user" });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error processing Clerk webhook:", error?.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

