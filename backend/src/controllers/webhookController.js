import { Payment } from "../models/paymentModel.js";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { Product } from "../models/productModel.js";
import { sequelize } from "../libs/db.js";
import { verifyWebhookSignature, extractOrderCode } from "../helpers/paymentHelper.js";

// Handle SePay webhook
export const handleSepayWebhook = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const webhookData = req.body;
    console.log("Received SePay webhook:", JSON.stringify(webhookData, null, 2));

    // Verify webhook signature (optional in development)
    const signature = req.headers["x-sepay-signature"] || req.headers["authorization"];
    if (signature && !verifyWebhookSignature(webhookData, signature)) {
      console.log("Invalid webhook signature");
      await transaction.rollback();
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Support multiple field formats from SePay
    const transactionId = webhookData.transaction_id || webhookData.transactionId || webhookData.id;
    const accountNumber = webhookData.accountNumber || webhookData.account_number || process.env.SEPAY_ACCOUNT_NUMBER;
    const amount = parseFloat(webhookData.amount || webhookData.transferAmount || 0);
    const content = webhookData.content || webhookData.description || webhookData.transferContent;
    const transactionDate = webhookData.transaction_date || webhookData.transactionDate || webhookData.when;

    // Validate required fields
    if (!content || !amount) {
      console.log("Missing required fields:", { content, amount });
      await transaction.rollback();
      return res.status(400).json({ error: "Missing required webhook fields" });
    }

    // Extract transaction code from content (format: DH{orderId})
    // SePay content có thể là: "MBVCB.xxx.DHEFE46868.CT tu..." hoặc đơn giản "DHEFE46868"
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

    // Find payment by transaction content (using LIKE for flexible matching)
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

      // Debug: List all pending payments
      const allPendingPayments = await Payment.findAll({
        where: { status: "PENDING" },
        attributes: ["paymentId", "transactionContent", "accountNumber", "amount"],
      });
      console.log("All pending payments:", JSON.stringify(allPendingPayments, null, 2));

      await transaction.rollback();
      return res.status(404).json({ error: "Payment not found" });
    }

    // Verify amount (phải đúng hoặc nhiều hơn)
    if (parseFloat(amount) < parseFloat(payment.amount)) {
      console.log("Amount mismatch:", amount, "vs", payment.amount);
      await transaction.rollback();
      return res.status(400).json({ error: "Amount mismatch" });
    }

    // Update payment status
    await payment.update(
      {
        status: "PAID",
        transactionId: transactionId,
        paidAt: transactionDate || new Date(),
        metadata: webhookData,
      },
      { transaction }
    );

    // Decrement product stock (vì lúc tạo order chưa trừ)
    for (const item of payment.order.items) {
      await Product.decrement("stock", {
        by: item.quantity,
        where: { productId: item.productId },
        transaction,
      });
    }

    // Update order status to SHIPPED (như yêu cầu)
    await payment.order.update(
      {
        status: "SHIPPED",
      },
      { transaction }
    );

    await transaction.commit();

    console.log("Payment successful for order:", payment.orderId);

    // Schedule auto-complete after 10 seconds
    setTimeout(async () => {
      try {
        const order = await Order.findByPk(payment.orderId);
        if (order && order.status === "SHIPPED") {
          await order.update({ status: "COMPLETED" });
          console.log("Order auto-completed:", payment.orderId);
        }
      } catch (error) {
        console.error("Error auto-completing order:", error);
      }
    }, 10000); // 10 seconds

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
