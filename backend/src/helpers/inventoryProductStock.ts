// @ts-nocheck
/**
 * Inventory source-of-truth rules (aligns with checkout in orderService):
 *
 * - **ProductVariant.stock** is the per-SKU quantity used when a line item has a variant.
 * - **Product.stock** is updated with the **same delta** as the variant for that line (see order
 *   creation: decrement variant then decrement product by the cart line quantity). So for
 *   multi-variant products, Product.stock tracks **total units across variants**, kept in step
 *   by each sale and each stock receipt line.
 *
 * Receipt posting should call `incrementVariantAndProductStock` once per line (same as orders
 * in reverse). Admin product form may set Product.stock to the sum of variants when saving
 * many variants at once — both paths are consistent if every stock change goes through variant
 * + product delta or a full variant save that recomputes product.stock.
 */
import { Product, ProductVariant } from "../models/associationsModel.js";
import type { Transaction } from "sequelize";

export async function incrementVariantAndProductStock(
  variantId: string,
  quantity: number,
  transaction: Transaction
) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw Object.assign(new Error("Invalid quantity for stock increment"), { status: 400 });
  }
  const variant = await ProductVariant.findByPk(variantId, { transaction });
  if (!variant) {
    throw Object.assign(new Error("Variant not found"), { status: 404 });
  }
  await ProductVariant.increment("stock", { by: quantity, where: { variantId }, transaction });
  await Product.increment("stock", { by: quantity, where: { productId: variant.productId }, transaction });
}

/** Repair Product.stock to equal the sum of all variant stocks for one product (optional maintenance). */
export async function resyncProductStockFromVariants(productId: string, transaction?: Transaction) {
  const variants = await ProductVariant.findAll({
    where: { productId },
    attributes: ["stock"],
    transaction,
  });
  const sum = variants.reduce((acc, v) => acc + (parseInt(String(v.stock), 10) || 0), 0);
  await Product.update({ stock: sum }, { where: { productId }, transaction });
}
