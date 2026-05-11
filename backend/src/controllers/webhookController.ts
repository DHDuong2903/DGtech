// @ts-nocheck
import {
  handleSepayWebhook as handleSepayWebhookSvc,
  handleClerkWebhook as handleClerkWebhookSvc,
} from "../services/webhookService.js";

export const handleSepayWebhook = async (req: any, res: any) => {
  try {
    console.log("Received SePay webhook:", JSON.stringify(req.body, null, 2));
    const { orderId } = await handleSepayWebhookSvc(req.body, req.headers);
    console.log("Payment successful for order:", orderId);
    return res.status(200).json({
      success: true,
      message: "Payment successful. Order is being processed.",
    });
  } catch (error: any) {
    console.error("Error processing SePay webhook:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};

export const handleClerkWebhook = async (req: any, res: any) => {
  try {
    const body = req.body.toString();
    const { eventType } = await handleClerkWebhookSvc(body, req.headers);
    console.log(`Clerk Webhook: ${eventType}`);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error processing Clerk webhook:", error?.message);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};
