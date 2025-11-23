import crypto from "crypto";

// Generate QR code URL su dung VietQR API
export const generateQRCodeUrl = (payment) => {
  const { accountNumber, amount, transactionContent, bankCode } = payment;

  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    transactionContent
  )}&accountName=${encodeURIComponent(process.env.SEPAY_ACCOUNT_NAME || "")}`;

  return qrUrl;
};

// Verify webhook signature from SePay
export const verifyWebhookSignature = (data, signature) => {
  if (!signature) {
    console.log("No signature provided - accepting webhook (development mode)");
    return true;
  }

  const token = process.env.SEPAY_API_TOKEN;
  if (!token) {
    console.warn("SEPAY_API_TOKEN not configured");
    return true; // Allow in development
  }

  // SePay uses HMAC SHA256 with API token
  const payload = JSON.stringify(data);
  const hash = crypto.createHmac("sha256", token).update(payload).digest("hex");

  return hash === signature;
};

// Generate unique transaction content for order
export const generateTransactionContent = (orderId) => {
  return `DH${orderId.slice(0, 8).toUpperCase()}`;
};

// Extract order code from payment content
export const extractOrderCode = (content) => {
  const orderCodeMatch = content.match(/DH[A-Z0-9]+/i);
  return orderCodeMatch ? orderCodeMatch[0].toUpperCase() : null;
};
