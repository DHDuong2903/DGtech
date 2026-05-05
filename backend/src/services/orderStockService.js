// @ts-nocheck
import { Product } from "../models/productModel.js";
import { ProductVariant } from "../models/productVariantModel.js";

/**
 * Decrement inventory for persisted order line items (matches createOrder stock logic).
 * Each OrderItem row is product + optional variant + quantity.
 */
export async function decrementStockForOrderItems(orderItems, transaction) {
  for (const item of orderItems) {
    const qty = item.quantity;
    if (item.variantId) {
      await ProductVariant.decrement("stock", {
        by: qty,
        where: { variantId: item.variantId },
        transaction,
      });
    }
    await Product.decrement("stock", {
      by: qty,
      where: { productId: item.productId },
      transaction,
    });
  }
}

/**
 * Restore inventory when cancelling an order that had already allocated stock.
 */
export async function incrementStockForOrderItems(orderItems, transaction) {
  for (const item of orderItems) {
    const qty = item.quantity;
    if (item.variantId) {
      await ProductVariant.increment("stock", {
        by: qty,
        where: { variantId: item.variantId },
        transaction,
      });
    }
    await Product.increment("stock", {
      by: qty,
      where: { productId: item.productId },
      transaction,
    });
  }
}
