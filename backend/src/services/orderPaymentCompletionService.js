// @ts-nocheck
import { decrementStockForOrderItems } from "./orderStockService.js";

/**
 * After bank transfer is confirmed: mark payment PAID, allocate stock, set order to PROCESSING.
 * Idempotent: if payment is already PAID, does nothing and returns { alreadyPaid: true }.
 */
export async function completeBankTransferPayment({
  order,
  payment,
  transaction,
  paidAt,
  transactionId,
  metadata,
}) {
  if (!payment || payment.status === "PAID") {
    return { alreadyPaid: true };
  }

  await payment.update(
    {
      status: "PAID",
      paidAt: paidAt || new Date(),
      transactionId: transactionId ?? payment.transactionId,
      ...(metadata !== undefined ? { metadata } : {}),
    },
    { transaction },
  );

  await decrementStockForOrderItems(order.items, transaction);
  await order.update({ status: "PROCESSING" }, { transaction });

  return { alreadyPaid: false };
}
