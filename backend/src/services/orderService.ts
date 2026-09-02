// @ts-nocheck
import {
  Order,
  OrderItem,
  Product,
  ProductVariant,
  CartItem,
  Payment,
  UserAddress,
  User,
  BundlePurchase,
  UserVoucherRedemption,
} from "../models/associationsModel.js";
import { formatShippingSnapshot, getProvinceName } from "../helpers/vnAddressHelper.js";
import {
  loadSelectedCartLines,
  computeSubtotalFromLines,
  resolveShippingForCheckout,
  ShippingConfigError,
  normalizeShippingMethodCode,
} from "./shippingService.js";
import {
  discountFactorForBundle,
  roundMoney,
  effectiveStockForBundleLine,
} from "./bundlePricingService.js";
import { sumEligibleBundlePurchasesForUser } from "./bundlePurchaseService.js";
import { sequelize } from "../libs/db.js";
import { Op } from "sequelize";
import { incrementStockForOrderItems } from "./orderStockService.js";
import { completeBankTransferPayment } from "./orderPaymentCompletionService.js";
import { generateQRCodeUrl, generateTransactionContent } from "../helpers/paymentHelper.js";
import { listEligibleVouchersForUser } from "./voucherService.js";
import { computeTaxBreakdown, getTaxSettings } from "./taxService.js";
import { invalidateUserTierCache } from "./discountCampaignResolveService.js";

const RANK_AFFECTING_STATUSES = new Set(["DELIVERED", "COMPLETED", "CANCELLED"]);
const FULFILLMENT_STATUSES = ["PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"];
const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED"];
const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

function bankTransferUnpaidBlocksTargetStatus(order: any, payment: any, newStatus: string) {
  if (order.paymentMethod !== "BANK_TRANSFER") return false;
  if (newStatus === "PENDING" || newStatus === "CANCELLED") return false;
  const paid = payment && payment.status === "PAID";
  if (paid) return false;
  return FULFILLMENT_STATUSES.includes(newStatus);
}

function canTransitionOrderStatus(order: any, nextStatus: string) {
  const current = String(order.status || "");
  if (current === nextStatus) return { ok: true };
  if (TERMINAL_STATUSES.includes(current)) {
    return { ok: false, reason: `Order is already in a terminal state (${current}) and cannot be transitioned.` };
  }
  const allowed = ORDER_STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      ok: false,
      reason: `Cannot transition from ${current} to ${nextStatus}. Valid flow: PENDING -> PROCESSING -> SHIPPED -> DELIVERED -> COMPLETED (or CANCELLED in early stages).`,
    };
  }
  return { ok: true };
}

function hasAllocatedStock(order: any, payment: any) {
  if (order.paymentMethod === "COD") return true;
  if (payment?.status === "PAID") return true;
  return FULFILLMENT_STATUSES.includes(String(order.status || ""));
}

function shouldRestoreStockWhenCancelled(order: any, payment: any) {
  return hasAllocatedStock(order, payment);
}

const USER_ORDER_PAYMENT_INCLUDE = {
  model: Payment,
  as: "payment",
  attributes: ["status", "paymentMethod", "paidAt"],
  required: false,
};

const USER_ORDER_ITEM_INCLUDE = {
  model: OrderItem,
  as: "items",
  include: [{ model: Product, as: "product", attributes: ["productId", "name", "price", "imageUrl"] }],
};

const USER_ORDER_DETAIL_ITEM_INCLUDE = {
  model: OrderItem,
  as: "items",
  include: [
    { model: Product, as: "product", attributes: ["productId", "name", "price", "imageUrl", "description"] },
    { model: ProductVariant, as: "variant" },
  ],
};

export async function fetchOrderAdminDetail(orderId: string) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: User, as: "user", attributes: ["clerkId", "username", "email"] },
      { model: Payment, as: "payment" },
      {
        model: OrderItem,
        as: "items",
        include: [
          { model: Product, as: "product", attributes: ["productId", "name", "price", "imageUrl", "description"] },
          { model: ProductVariant, as: "variant" },
        ],
      },
    ],
  });
  if (!order) return null;
  const p = (order as any).payment;
  if (p) {
    p.dataValues.qrCodeUrl = generateQRCodeUrl(p);
    p.dataValues.accountName = process.env.SEPAY_ACCOUNT_NAME;
  }
  return order;
}

export async function createOrder(clerkId: string, body: Record<string, unknown>) {
  const transaction = await sequelize.transaction();
  try {
    const {
      selectedItems, shippingAddress, phone, paymentMethod, notes,
      userAddressId, provinceCode, shippingMethodCode: shippingMethodCodeRaw,
    } = body as any;

    if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
      await transaction.rollback();
      throw Object.assign(new Error("Please select at least one product"), { status: 400 });
    }

    let resolvedShipping = typeof shippingAddress === "string" ? shippingAddress.trim() : "";
    let resolvedPhone = typeof phone === "string" ? phone.trim() : "";
    let resolvedUserAddressId = userAddressId || null;
    let provinceCodeForShip = "";

    if (resolvedUserAddressId) {
      const saved = await UserAddress.findOne({ where: { addressId: resolvedUserAddressId, clerkId }, transaction });
      if (!saved) {
        await transaction.rollback();
        throw Object.assign(new Error("Saved address not found"), { status: 404 });
      }
      const userRow = await User.findByPk(clerkId, { attributes: ["username"], transaction });
      const displayName = (userRow?.username && String(userRow.username).trim()) || "Customer";
      resolvedShipping = formatShippingSnapshot({
        displayName, phone: saved.phone, addressLine: saved.addressLine,
        wardName: saved.wardName, provinceName: saved.provinceName,
      });
      resolvedPhone = saved.phone;
      provinceCodeForShip = String(saved.provinceCode || "").trim();
    } else if (!resolvedShipping || !resolvedPhone) {
      await transaction.rollback();
      throw Object.assign(new Error("Please provide full shipping information"), { status: 400 });
    } else {
      provinceCodeForShip = typeof provinceCode === "string" ? provinceCode.trim() : "";
      if (!provinceCodeForShip || !getProvinceName(provinceCodeForShip)) {
        await transaction.rollback();
        throw Object.assign(new Error("Please provide a valid provinceCode when not using a saved address"), { status: 400 });
      }
    }

    let cartItems: any[], cart: any;
    try {
      ({ cart, cartItems } = await loadSelectedCartLines(clerkId, selectedItems, transaction));
    } catch (e) {
      await transaction.rollback();
      if (e instanceof ShippingConfigError) throw Object.assign(new Error(e.message), { status: 400, code: e.code });
      throw e;
    }

    // Validate product availability
    for (const cartItem of cartItems) {
      const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
      if (lineType === "BUNDLE") {
        for (const bi of (cartItem.bundle?.items || [])) {
          const pname = bi.variant?.product?.name || "Bundle item";
          if (bi.variant?.product?.status !== "ACTIVE") {
            await transaction.rollback();
            throw Object.assign(new Error(`Product "${pname}" in bundle is no longer available`), { status: 400 });
          }
        }
      } else {
        if (cartItem.product.status !== "ACTIVE") {
          await transaction.rollback();
          throw Object.assign(new Error(`Product "${cartItem.product.name}" is no longer available`), { status: 400 });
        }
      }
    }

    // Validate stock
    for (const cartItem of cartItems) {
      const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
      if (lineType === "BUNDLE") {
        for (const bi of (cartItem.bundle?.items || [])) {
          const need = (bi.quantity || 0) * cartItem.quantity;
          const stockAvailable = effectiveStockForBundleLine(bi);
          const pname = bi.variant?.product?.name || "Bundle item";
          if (!Number.isFinite(stockAvailable) || stockAvailable < need) {
            await transaction.rollback();
            throw Object.assign(new Error(`Product "${pname}" in bundle has insufficient stock`), { status: 400 });
          }
        }
      } else {
        const stockAvailable = cartItem.variant ? cartItem.variant.stock : cartItem.product.stock;
        if (stockAvailable < cartItem.quantity) {
          await transaction.rollback();
          throw Object.assign(new Error(`Product "${cartItem.product.name}"${cartItem.variant ? " (selected variant)" : ""} has insufficient stock`), { status: 400 });
        }
      }
    }

    // Validate bundle per-user limits
    for (const cartItem of cartItems) {
      const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
      if (lineType !== "BUNDLE" || !cartItem.bundleId) continue;
      const b = cartItem.bundle?.get ? cartItem.bundle.get({ plain: true }) : cartItem.bundle;
      const maxPerUser = parseInt(String(b?.maxPerUser ?? 0), 10) || 0;
      if (maxPerUser <= 0) continue;
      const purchased = await sumEligibleBundlePurchasesForUser(clerkId, cartItem.bundleId, transaction);
      if (purchased + cartItem.quantity > maxPerUser) {
        await transaction.rollback();
        throw Object.assign(new Error(`You can only purchase a maximum of ${maxPerUser} units of bundle "${b?.name || ""}". Please adjust your cart.`), { status: 400 });
      }
    }

    const subtotal = computeSubtotalFromLines(cartItems);
    const shippingMethodCode = normalizeShippingMethodCode(shippingMethodCodeRaw);
    let ship: any;
    try {
      ship = await resolveShippingForCheckout(provinceCodeForShip, subtotal, { methodCode: shippingMethodCode, transaction });
    } catch (e) {
      await transaction.rollback();
      if (e instanceof ShippingConfigError) {
        throw Object.assign(new Error(e.message), { status: e.code === "SETTINGS_MISSING" ? 500 : 400, code: e.code });
      }
      throw e;
    }

    const shippingFee = ship.shippingFee;
    const taxSettings = await getTaxSettings(transaction);
    const taxSnapshot = {
      enableTax: !!taxSettings.enableTax,
      taxRate: Number(taxSettings.taxRate ?? 0),
      taxIncluded: taxSettings.taxIncluded !== false,
    };
    const taxBreakdown = computeTaxBreakdown({ subtotal, shippingFee, ...taxSnapshot });

    let voucherId: string | null = cart.appliedVoucherId || null;
    let voucherName: string | null = null;
    let voucherDiscountAmount = 0;
    if (voucherId) {
      const eligible = await listEligibleVouchersForUser({ clerkId, subtotal, shippingFee, provinceCode: provinceCodeForShip, shippingMethodCode });
      const picked = eligible.find((v) => v.voucherId === voucherId);
      if (picked) {
        voucherName = picked.name;
        voucherDiscountAmount = Math.max(0, Math.min(taxBreakdown.totalWithTax, Number(picked.estimatedSavings || 0)));
      } else {
        voucherId = null;
      }
    }

    const totalPrice = Math.max(0, taxBreakdown.totalWithTax - voucherDiscountAmount);

    const orderItemsData: any[] = [];
    for (const cartItem of cartItems) {
      const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
      if (lineType === "BUNDLE" && cartItem.bundle) {
        const b = cartItem.bundle.get ? cartItem.bundle.get({ plain: true }) : cartItem.bundle;
        const factor = discountFactorForBundle(b);
        const bundleQty = cartItem.quantity;
        for (const bi of (b.items || [])) {
          const v = bi.variant;
          if (!v) continue;
          const cat = parseFloat(String(v.price));
          const unitOrderPrice = roundMoney((Number.isFinite(cat) ? cat : 0) * factor);
          orderItemsData.push({ productId: v.productId, variantId: v.variantId, quantity: bi.quantity * bundleQty, price: unitOrderPrice });
        }
      } else {
        const itemPrice = cartItem.variant ? cartItem.variant.price : cartItem.product.price;
        orderItemsData.push({ productId: cartItem.productId, variantId: cartItem.variantId, quantity: cartItem.quantity, price: itemPrice });
      }
    }

    const order = await Order.create({
      clerkId, subtotal, shippingFee, totalPrice,
      shippingAddress: resolvedShipping, phone: resolvedPhone,
      userAddressId: resolvedUserAddressId,
      paymentMethod: paymentMethod || "COD",
      notes: notes || null,
      status: paymentMethod === "BANK_TRANSFER" ? "PENDING" : "PROCESSING",
      shippingDisplayMode: ship.displayMode,
      shippingMethodCode: ship.shippingMethodCode,
      shippingMethodName: ship.shippingMethodName,
      shippingMethodEtaNote: ship.shippingMethodEtaNote,
      voucherId, voucherName, voucherDiscountAmount,
      taxAmount: taxBreakdown.taxAmount,
      itemsTaxAmount: taxBreakdown.itemsTaxAmount,
      shippingTaxAmount: taxBreakdown.shippingTaxAmount,
      taxRateSnapshot: taxSnapshot.taxRate,
      taxEnabledSnapshot: taxSnapshot.enableTax,
      taxIncludedSnapshot: taxSnapshot.taxIncluded,
    }, { transaction });

    await Promise.all(
      orderItemsData.map((item) => OrderItem.create({ orderId: (order as any).orderId, ...item }, { transaction }))
    );

    for (const cartItem of cartItems) {
      const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
      if (lineType !== "BUNDLE" || !cartItem.bundleId) continue;
      await BundlePurchase.create({ clerkId, bundleId: cartItem.bundleId, orderId: (order as any).orderId, quantity: cartItem.quantity }, { transaction });
    }

    if (paymentMethod !== "BANK_TRANSFER") {
      for (const cartItem of cartItems) {
        const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
        if (lineType === "BUNDLE" && cartItem.bundle) {
          const b = cartItem.bundle.get ? cartItem.bundle.get({ plain: true }) : cartItem.bundle;
          const bundleQty = cartItem.quantity;
          for (const bi of (b.items || [])) {
            const v = bi.variant;
            if (!v?.variantId) continue;
            const dec = bi.quantity * bundleQty;
            await ProductVariant.decrement("stock", { by: dec, where: { variantId: v.variantId }, transaction });
            await Product.decrement("stock", { by: dec, where: { productId: v.productId }, transaction });
          }
        } else {
          if (cartItem.variantId) {
            await ProductVariant.decrement("stock", { by: cartItem.quantity, where: { variantId: cartItem.variantId }, transaction });
          }
          await Product.decrement("stock", { by: cartItem.quantity, where: { productId: cartItem.productId }, transaction });
        }
      }
    }

    await CartItem.destroy({ where: { cartItemId: selectedItems, cartId: cart.cartId }, transaction });

    if (voucherId) {
      await UserVoucherRedemption.create({ voucherId, clerkId, orderId: (order as any).orderId }, { transaction });
    }
    await cart.update({ appliedVoucherId: null }, { transaction });

    let payment: any = null;
    if (paymentMethod === "BANK_TRANSFER") {
      const transactionContent = generateTransactionContent((order as any).orderId);
      payment = await Payment.create({
        orderId: (order as any).orderId, amount: totalPrice,
        paymentMethod: "BANK_TRANSFER", status: "PENDING", transactionContent,
        bankCode: process.env.SEPAY_BANK_CODE, accountNumber: process.env.SEPAY_ACCOUNT_NUMBER,
      }, { transaction });
    }

    await transaction.commit();

    const completeOrder = await Order.findByPk(order.orderId, {
      include: [
        { model: OrderItem, as: "items", include: [{ model: Product, as: "product", attributes: ["productId", "name", "imageUrl"] }] },
        ...(payment ? [{ model: Payment, as: "payment" }] : []),
      ],
    });

    if (payment) {
      completeOrder.payment.dataValues.qrCodeUrl = generateQRCodeUrl(payment);
      completeOrder.payment.dataValues.accountName = process.env.SEPAY_ACCOUNT_NAME;
    }

    return completeOrder;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getOrders(clerkId: string, query: Record<string, unknown>) {
  const { status, page = 1, limit = 10 } = query as any;
  const whereClause: any = { clerkId };
  if (status) whereClause.status = status;
  const offset = (page - 1) * limit;

  const { count, rows: orders } = await Order.findAndCountAll({
    where: whereClause,
    include: [USER_ORDER_PAYMENT_INCLUDE, USER_ORDER_ITEM_INCLUDE],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit), offset: parseInt(offset),
    distinct: true, col: "orderId",
  });

  return {
    orders,
    pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) },
  };
}

export async function getOrderById(clerkId: string, orderId: string) {
  const order = await Order.findOne({
    where: { orderId, clerkId },
    include: [USER_ORDER_PAYMENT_INCLUDE, USER_ORDER_DETAIL_ITEM_INCLUDE],
  });
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  return order;
}

export async function cancelOrder(clerkId: string, orderId: string) {
  const transaction = await sequelize.transaction();
  try {
    const order = await Order.findOne({
      where: { orderId, clerkId },
      include: [{ model: OrderItem, as: "items" }],
      transaction,
    });
    if (!order) {
      await transaction.rollback();
      throw Object.assign(new Error("Order not found"), { status: 404 });
    }
    if (!["PENDING", "PROCESSING"].includes(order.status)) {
      await transaction.rollback();
      throw Object.assign(new Error("Order cannot be cancelled in its current state"), { status: 400 });
    }

    const shouldRestoreStock = order.paymentMethod === "COD" || order.status !== "PENDING";
    if (shouldRestoreStock) await incrementStockForOrderItems(order.items, transaction);

    await order.update({ status: "CANCELLED" }, { transaction });
    await transaction.commit();

    invalidateUserTierCache(clerkId);

    return Order.findByPk(order.orderId, {
      include: [{ model: OrderItem, as: "items", include: [{ model: Product, as: "product", attributes: ["productId", "name", "price", "imageUrl"] }] }],
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getAllOrders(query: Record<string, unknown>) {
  const { status, page = 1, limit = 20, paymentMethod, search, q: queryQ } = query as any;
  const andParts: any[] = [];
  if (status) andParts.push({ status });
  if (paymentMethod) andParts.push({ paymentMethod });
  const searchTerm = (search || queryQ || "").toString().trim();
  if (searchTerm) {
    const q = searchTerm;
    const uuidExact = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
    const orParts: any[] = [
      { phone: { [Op.iLike]: `%${q}%` } },
      { "$user.username$": { [Op.iLike]: `%${q}%` } },
      { "$user.email$": { [Op.iLike]: `%${q}%` } },
    ];
    if (uuidExact) orParts.push({ orderId: q });
    else if (q.length >= 6) {
      orParts.push(sequelize.where(sequelize.cast(sequelize.col("orders.orderId"), "TEXT"), { [Op.iLike]: `%${q}%` }));
    }
    andParts.push({ [Op.or]: orParts });
  }

  const whereClause = andParts.length ? { [Op.and]: andParts } : {};
  const offset = (Number(page) - 1) * Number(limit);

  const { count, rows: orders } = await Order.findAndCountAll({
    where: whereClause,
    include: [
      { model: User, as: "user", attributes: ["clerkId", "username", "email"], required: false },
      { model: Payment, as: "payment", attributes: ["status", "paymentMethod", "paidAt"], required: false },
      { model: OrderItem, as: "items", include: [{ model: Product, as: "product", attributes: ["productId", "name", "price", "imageUrl"] }] },
    ],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit), offset: parseInt(offset),
    distinct: true, col: "orderId",
  });

  return {
    orders,
    pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) },
  };
}

export async function confirmOrderPaymentAdmin(orderId: string, reference: any, extraMeta: any) {
  const transaction = await sequelize.transaction();
  try {
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: "items" }, { model: Payment, as: "payment" }],
      transaction,
    });
    if (!order) {
      await transaction.rollback();
      throw Object.assign(new Error("Order not found"), { status: 404 });
    }
    if (order.paymentMethod !== "BANK_TRANSFER") {
      await transaction.rollback();
      throw Object.assign(new Error("Only applicable for bank transfer orders"), { status: 400 });
    }
    const payment = (order as any).payment;
    if (!payment) {
      await transaction.rollback();
      throw Object.assign(new Error("No payment record for this order"), { status: 400 });
    }
    const { alreadyPaid } = await completeBankTransferPayment({
      order, payment, transaction, paidAt: new Date(), transactionId: reference,
      metadata: { source: "admin_confirm", ...(extraMeta || {}) },
    });
    await transaction.commit();
    const full = await fetchOrderAdminDetail(orderId);
    return { alreadyPaid, order: full };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function patchAdminOrder(orderId: string, body: Record<string, unknown>) {
  const order = await Order.findByPk(orderId);
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });

  const { adminNotes, trackingNumber, carrierName } = body as any;
  const patch: any = {};
  if (adminNotes !== undefined) patch.adminNotes = adminNotes;
  if (trackingNumber !== undefined) patch.trackingNumber = trackingNumber;
  if (carrierName !== undefined) patch.carrierName = carrierName;

  if (Object.keys(patch).length === 0) {
    throw Object.assign(new Error("No valid fields to update"), { status: 400 });
  }
  await order.update(patch);
  return fetchOrderAdminDetail(orderId);
}

export async function deleteAdminOrder(orderId: string) {
  const transaction = await sequelize.transaction();
  try {
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: "items" }, { model: Payment, as: "payment", required: false }],
      transaction,
    });
    if (!order) {
      await transaction.rollback();
      throw Object.assign(new Error("Order not found"), { status: 404 });
    }
    const payment = (order as any).payment;
    if (shouldRestoreStockWhenCancelled(order, payment)) {
      await incrementStockForOrderItems(order.items, transaction);
    }
    if (payment) await Payment.destroy({ where: { orderId }, transaction });
    await UserVoucherRedemption.destroy({ where: { orderId }, transaction });
    await BundlePurchase.destroy({ where: { orderId }, transaction });
    await OrderItem.destroy({ where: { orderId }, transaction });
    await Order.destroy({ where: { orderId }, transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  const VALID_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"];
  if (!VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error("Invalid status"), { status: 400 });
  }
  const transaction = await sequelize.transaction();
  try {
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: "items" }, { model: Payment, as: "payment", required: false }],
      transaction,
    });
    if (!order) {
      await transaction.rollback();
      throw Object.assign(new Error("Order not found"), { status: 404 });
    }
    const payment = (order as any).payment;
    const transition = canTransitionOrderStatus(order, status);
    if (!transition.ok) {
      await transaction.rollback();
      throw Object.assign(new Error(transition.reason), { status: 400 });
    }
    if (bankTransferUnpaidBlocksTargetStatus(order, payment, status)) {
      await transaction.rollback();
      throw Object.assign(
        new Error("Bank transfer order has not been confirmed. Please confirm payment before moving to processing / shipping state."),
        { status: 400 }
      );
    }
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      if (shouldRestoreStockWhenCancelled(order, payment)) {
        await incrementStockForOrderItems(order.items, transaction);
      }
    }
    await order.update({ status }, { transaction });
    await transaction.commit();
    if (RANK_AFFECTING_STATUSES.has(status)) {
      invalidateUserTierCache(order.clerkId);
    }
    return fetchOrderAdminDetail(orderId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
