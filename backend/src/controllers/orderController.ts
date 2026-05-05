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
} from "../services/shippingService.js";
import {
  discountFactorForBundle,
  roundMoney,
  effectiveStockForBundleLine,
} from "../services/bundlePricingService.js";
import { sumEligibleBundlePurchasesForUser } from "../services/bundlePurchaseService.js";
import { sequelize } from "../libs/db.js";
import { Op } from "sequelize";
import { ProductVariant } from "../models/productVariantModel.js";
import { incrementStockForOrderItems } from "../services/orderStockService.js";
import { completeBankTransferPayment } from "../services/orderPaymentCompletionService.js";
import { generateQRCodeUrl, generateTransactionContent } from "../helpers/paymentHelper.js";
import { listEligibleVouchersForUser } from "../services/voucherService.js";
import { computeTaxBreakdown, getTaxSettings } from "../services/taxService.js";

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
  if (current === nextStatus) {
    return { ok: true };
  }
  if (TERMINAL_STATUSES.includes(current)) {
    return { ok: false, reason: `Đơn đã ở trạng thái cuối (${current}) và không thể chuyển tiếp` };
  }
  const allowed = ORDER_STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      ok: false,
      reason: `Không thể chuyển từ ${current} sang ${nextStatus}. Luồng hợp lệ: PENDING -> PROCESSING -> SHIPPED -> DELIVERED -> COMPLETED (hoặc CANCELLED ở giai đoạn đầu).`,
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

async function fetchOrderAdminDetail(orderId: string) {
  const order = await Order.findByPk(orderId, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["clerkId", "username", "email"],
      },
      {
        model: Payment,
        as: "payment",
      },
      {
        model: OrderItem,
        as: "items",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["productId", "name", "price", "imageUrl", "description"],
          },
          {
            model: ProductVariant,
            as: "variant",
          },
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

// Tao order moi tu cac san pham duoc chon trong cart
export const createOrder = async (req: any, res: any) => {
  const transaction = await sequelize.transaction();

  try {
    const { userId: clerkId } = req.auth;
    const {
      selectedItems,
      shippingAddress,
      phone,
      paymentMethod,
      notes,
      userAddressId,
      provinceCode,
      shippingMethodCode: shippingMethodCodeRaw,
    } = req.body;

    // Validate
    if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: "Vui lòng chọn ít nhất một sản phẩm" });
    }

    let resolvedShipping = typeof shippingAddress === "string" ? shippingAddress.trim() : "";
    let resolvedPhone = typeof phone === "string" ? phone.trim() : "";
    let resolvedUserAddressId = userAddressId || null;
    let provinceCodeForShip = "";

    if (resolvedUserAddressId) {
      const saved = await UserAddress.findOne({
        where: { addressId: resolvedUserAddressId, clerkId },
        transaction,
      });
      if (!saved) {
        await transaction.rollback();
        return res.status(404).json({ error: "Không tìm thấy địa chỉ đã lưu" });
      }
      const userRow = await User.findByPk(clerkId, {
        attributes: ["username"],
        transaction,
      });
      const displayName = (userRow?.username && String(userRow.username).trim()) || "Khách hàng";
      resolvedShipping = formatShippingSnapshot({
        displayName,
        phone: saved.phone,
        addressLine: saved.addressLine,
        wardName: saved.wardName,
        provinceName: saved.provinceName,
      });
      resolvedPhone = saved.phone;
      provinceCodeForShip = String(saved.provinceCode || "").trim();
    } else if (!resolvedShipping || !resolvedPhone) {
      await transaction.rollback();
      return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin giao hàng" });
    } else {
      provinceCodeForShip = typeof provinceCode === "string" ? provinceCode.trim() : "";
      if (!provinceCodeForShip || !getProvinceName(provinceCodeForShip)) {
        await transaction.rollback();
        return res.status(400).json({
          error: "Vui lòng gửi provinceCode hợp lệ khi không dùng địa chỉ đã lưu",
        });
      }
    }

    let cartItems;
    let cart;
    try {
      ({ cart, cartItems } = await loadSelectedCartLines(clerkId, selectedItems, transaction));
    } catch (e) {
      await transaction.rollback();
      if (e instanceof ShippingConfigError) {
        return res.status(400).json({ error: e.message, code: e.code });
      }
      throw e;
    }

    for (const cartItem of cartItems) {
      const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
      if (lineType === "BUNDLE") {
        const lines = cartItem.bundle?.items || [];
        for (const bi of lines) {
          const pname = bi.variant?.product?.name || "Bundle item";
          if (bi.variant?.product?.status !== "ACTIVE") {
            await transaction.rollback();
            return res.status(400).json({
              error: `Sản phẩm "${pname}" trong bundle không còn được bán`,
            });
          }
        }
      } else {
        if (cartItem.product.status !== "ACTIVE") {
          await transaction.rollback();
          return res.status(400).json({
            error: `Sản phẩm "${cartItem.product.name}" không còn được bán`,
          });
        }
      }
    }

    // Check stock (prefer variant stock)
    for (const cartItem of cartItems) {
      const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
      if (lineType === "BUNDLE") {
        const lines = cartItem.bundle?.items || [];
        for (const bi of lines) {
          const need = (bi.quantity || 0) * cartItem.quantity;
          const stockAvailable = effectiveStockForBundleLine(bi);
          const pname = bi.variant?.product?.name || "Bundle item";
          if (!Number.isFinite(stockAvailable) || stockAvailable < need) {
            await transaction.rollback();
            return res.status(400).json({
              error: `Sản phẩm "${pname}" trong bundle không đủ số lượng trong kho`,
            });
          }
        }
      } else {
        const stockAvailable = cartItem.variant ? cartItem.variant.stock : cartItem.product.stock;
        if (stockAvailable < cartItem.quantity) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Sản phẩm "${cartItem.product.name}"${cartItem.variant ? " (phân loại đã chọn)" : ""} không đủ số lượng trong kho`,
          });
        }
      }
    }

    for (const cartItem of cartItems) {
      const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
      if (lineType !== "BUNDLE" || !cartItem.bundleId) continue;
      const b = cartItem.bundle?.get ? cartItem.bundle.get({ plain: true }) : cartItem.bundle;
      const maxPerUser = parseInt(String(b?.maxPerUser ?? 0), 10) || 0;
      if (maxPerUser <= 0) continue;
      const purchased = await sumEligibleBundlePurchasesForUser(clerkId, cartItem.bundleId, transaction);
      if (purchased + cartItem.quantity > maxPerUser) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Bạn chỉ được mua tối đa ${maxPerUser} bộ bundle "${b?.name || ""}". Vui lòng chỉnh giỏ hàng.`,
        });
      }
    }

    const subtotal = computeSubtotalFromLines(cartItems);
    const shippingMethodCode = normalizeShippingMethodCode(shippingMethodCodeRaw);
    let ship;
    try {
      ship = await resolveShippingForCheckout(provinceCodeForShip, subtotal, {
        methodCode: shippingMethodCode,
        transaction,
      });
    } catch (e) {
      await transaction.rollback();
      if (e instanceof ShippingConfigError) {
        const status = e.code === "SETTINGS_MISSING" ? 500 : 400;
        return res.status(status).json({ error: e.message, code: e.code });
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
    const taxBreakdown = computeTaxBreakdown({
      subtotal,
      shippingFee,
      ...taxSnapshot,
    });
    let voucherId: string | null = cart.appliedVoucherId || null;
    let voucherName: string | null = null;
    let voucherDiscountAmount = 0;
    if (voucherId) {
      const eligible = await listEligibleVouchersForUser({
        clerkId,
        subtotal,
        shippingFee,
        provinceCode: provinceCodeForShip,
        shippingMethodCode,
      });
      const picked = eligible.find((v) => v.voucherId === voucherId);
      if (picked) {
        voucherName = picked.name;
        voucherDiscountAmount = Math.max(0, Math.min(taxBreakdown.totalWithTax, Number(picked.estimatedSavings || 0)));
      } else {
        voucherId = null;
      }
    }
    const totalPrice = Math.max(0, taxBreakdown.totalWithTax - voucherDiscountAmount);

    const orderItemsData = [];
    for (const cartItem of cartItems) {
      const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
      if (lineType === "BUNDLE" && cartItem.bundle) {
        const b = cartItem.bundle.get ? cartItem.bundle.get({ plain: true }) : cartItem.bundle;
        const factor = discountFactorForBundle(b);
        const bundleQty = cartItem.quantity;
        for (const bi of b.items || []) {
          const v = bi.variant;
          if (!v) continue;
          const cat = parseFloat(String(v.price));
          const unitOrderPrice = roundMoney((Number.isFinite(cat) ? cat : 0) * factor);
          orderItemsData.push({
            productId: v.productId,
            variantId: v.variantId,
            quantity: bi.quantity * bundleQty,
            price: unitOrderPrice,
          });
        }
      } else {
        const itemPrice = cartItem.variant ? cartItem.variant.price : cartItem.product.price;
        orderItemsData.push({
          productId: cartItem.productId,
          variantId: cartItem.variantId,
          quantity: cartItem.quantity,
          price: itemPrice,
        });
      }
    }

    // Create order
    const order = await Order.create(
      {
        clerkId,
        subtotal,
        shippingFee,
        totalPrice,
        shippingAddress: resolvedShipping,
        phone: resolvedPhone,
        userAddressId: resolvedUserAddressId,
        paymentMethod: paymentMethod || "COD",
        notes: notes || null,
        status: paymentMethod === "BANK_TRANSFER" ? "PENDING" : "PROCESSING",
        shippingDisplayMode: ship.displayMode,
        shippingMethodCode: ship.shippingMethodCode,
        shippingMethodName: ship.shippingMethodName,
        shippingMethodEtaNote: ship.shippingMethodEtaNote,
        voucherId,
        voucherName,
        voucherDiscountAmount,
        taxAmount: taxBreakdown.taxAmount,
        itemsTaxAmount: taxBreakdown.itemsTaxAmount,
        shippingTaxAmount: taxBreakdown.shippingTaxAmount,
        taxRateSnapshot: taxSnapshot.taxRate,
        taxEnabledSnapshot: taxSnapshot.enableTax,
        taxIncludedSnapshot: taxSnapshot.taxIncluded,
      },
      { transaction },
    );

    // Create order items
    await Promise.all(
      orderItemsData.map((item) =>
        OrderItem.create(
          {
            orderId: (order as any).orderId,
            ...item,
          },
          { transaction },
        ),
      ),
    );

    for (const cartItem of cartItems) {
      const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
      if (lineType !== "BUNDLE" || !cartItem.bundleId) continue;
      await BundlePurchase.create(
        {
          clerkId,
          bundleId: cartItem.bundleId,
          orderId: (order as any).orderId,
          quantity: cartItem.quantity,
        },
        { transaction },
      );
    }

    // Decrement stock unless BANK_TRANSFER
    if (paymentMethod !== "BANK_TRANSFER") {
      for (const cartItem of cartItems) {
        const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");
        if (lineType === "BUNDLE" && cartItem.bundle) {
          const b = cartItem.bundle.get ? cartItem.bundle.get({ plain: true }) : cartItem.bundle;
          const bundleQty = cartItem.quantity;
          for (const bi of b.items || []) {
            const v = bi.variant;
            if (!v?.variantId) continue;
            const dec = bi.quantity * bundleQty;
            await ProductVariant.decrement("stock", {
              by: dec,
              where: { variantId: v.variantId },
              transaction,
            });
            await Product.decrement("stock", {
              by: dec,
              where: { productId: v.productId },
              transaction,
            });
          }
        } else {
          // Decrement variant stock if exists
          if (cartItem.variantId) {
            await ProductVariant.decrement("stock", {
              by: cartItem.quantity,
              where: { variantId: cartItem.variantId },
              transaction,
            });
          }

          // Decrement product cache stock
          await Product.decrement("stock", {
            by: cartItem.quantity,
            where: { productId: cartItem.productId },
            transaction,
          });
        }
      }
    }

    // Remove selected items from cart
    await CartItem.destroy({
      where: { cartItemId: selectedItems, cartId: cart.cartId },
      transaction,
    });
    if (voucherId) {
      await UserVoucherRedemption.create(
        {
          voucherId,
          clerkId,
          orderId: (order as any).orderId,
        },
        { transaction }
      );
    }
    await cart.update({ appliedVoucherId: null }, { transaction });

    // Create payment record if BANK_TRANSFER
    let payment = null;
    if (paymentMethod === "BANK_TRANSFER") {
      const transactionContent = generateTransactionContent((order as any).orderId);

      payment = await Payment.create(
        {
          orderId: (order as any).orderId,
          amount: totalPrice,
          paymentMethod: "BANK_TRANSFER",
          status: "PENDING",
          transactionContent,
          bankCode: process.env.SEPAY_BANK_CODE,
          accountNumber: process.env.SEPAY_ACCOUNT_NUMBER,
        },
        { transaction },
      );
    }

    await transaction.commit();

    // Fetch complete order with relations
    const completeOrder = await Order.findByPk(order.orderId, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "imageUrl"],
            },
          ],
        },
        ...(payment
          ? [
              {
                model: Payment,
                as: "payment",
              },
            ]
          : []),
      ],
    });

    if (payment) {
      const qrCodeUrl = generateQRCodeUrl(payment);
      completeOrder.payment.dataValues.qrCodeUrl = qrCodeUrl;
      completeOrder.payment.dataValues.accountName = process.env.SEPAY_ACCOUNT_NAME;
    }

    res.status(201).json({
      message: "Đặt hàng thành công",
      order: completeOrder,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Loi khi createOrder", error);
    res.status(500).json({ error: "Lỗi khi tạo đơn hàng" });
  }
};

// Lay danh sach orders cua nguoi dung
export const getOrders = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const { status, page = 1, limit = 10 } = req.query;

    const whereClause: any = { clerkId };
    if (status) {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "price", "imageUrl"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Loi khi getOrders", error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách đơn hàng" });
  }
};

// Lay order theo ID
export const getOrderById = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: { orderId, clerkId },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "price", "imageUrl", "description"],
            },
            {
              model: ProductVariant,
              as: "variant",
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    res.status(200).json({ order });
  } catch (error) {
    console.error("Loi khi getOrderById", error);
    res.status(500).json({ error: "Lỗi khi lấy thông tin đơn hàng" });
  }
};

// Huy don hang (chi khi status la PENDING)
export const cancelOrder = async (req: any, res: any) => {
  const transaction = await sequelize.transaction();

  try {
    const { userId: clerkId } = req.auth;
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: { orderId, clerkId },
      include: [
        {
          model: OrderItem,
          as: "items",
        },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    if (!["PENDING", "PROCESSING"].includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({
        error: "Không thể hủy đơn hàng ở trạng thái này",
      });
    }

    const shouldRestoreStock = order.paymentMethod === "COD" || order.status !== "PENDING";

    if (shouldRestoreStock) {
      await incrementStockForOrderItems(order.items, transaction);
    }

    await order.update({ status: "CANCELLED" }, { transaction });
    await transaction.commit();

    const updatedOrder = await Order.findByPk(order.orderId, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "price", "imageUrl"],
            },
          ],
        },
      ],
    });

    res.status(200).json({
      message: "Đã hủy đơn hàng thành công",
      order: updatedOrder,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Loi khi cancelOrder", error);
    res.status(500).json({ error: "Lỗi khi hủy đơn hàng" });
  }
};

// Admin: Lay danh sach tat ca don hang
export const getAllOrders = async (req: any, res: any) => {
  try {
    const { status, page = 1, limit = 20, paymentMethod, search } = req.query;

    const andParts: any[] = [];
    if (status) {
      andParts.push({ status });
    }
    if (paymentMethod) {
      andParts.push({ paymentMethod });
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      const uuidExact =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
      const orParts: any[] = [
        { phone: { [Op.iLike]: `%${q}%` } },
        { "$user.username$": { [Op.iLike]: `%${q}%` } },
        { "$user.email$": { [Op.iLike]: `%${q}%` } },
      ];
      if (uuidExact) {
        orParts.push({ orderId: q });
      } else if (q.length >= 6) {
        orParts.push(
          sequelize.where(sequelize.cast(sequelize.col("orders.orderId"), "TEXT"), {
            [Op.iLike]: `%${q}%`,
          }),
        );
      }
      andParts.push({ [Op.or]: orParts });
    }

    const whereClause = andParts.length ? { [Op.and]: andParts } : {};

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["clerkId", "username", "email"],
          required: false,
        },
        {
          model: Payment,
          as: "payment",
          attributes: ["status", "paymentMethod", "paidAt"],
          required: false,
        },
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "price", "imageUrl"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting all orders:", error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách đơn hàng" });
  }
};

// Admin: Chi tiet don hang (khong gioi han clerkId)
export const getAdminOrderById = async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const order = await fetchOrderAdminDetail(orderId);
    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }
    res.status(200).json({ order });
  } catch (error) {
    console.error("Loi khi getAdminOrderById", error);
    res.status(500).json({ error: "Lỗi khi lấy thông tin đơn hàng" });
  }
};

// Admin: Xac nhan chuyen khoan thu cong (khi khong co webhook)
export const confirmOrderPaymentAdmin = async (req: any, res: any) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderId } = req.params;
    const reference = req.body?.reference ?? req.body?.transactionId ?? null;

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: "items",
        },
        {
          model: Payment,
          as: "payment",
        },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    if (order.paymentMethod !== "BANK_TRANSFER") {
      await transaction.rollback();
      return res.status(400).json({ error: "Chi áp dụng cho đơn chuyển khoản" });
    }

    const payment = (order as any).payment;
    if (!payment) {
      await transaction.rollback();
      return res.status(400).json({ error: "Không có bản ghi thanh toán cho đơn này" });
    }

    const { alreadyPaid } = await completeBankTransferPayment({
      order,
      payment,
      transaction,
      paidAt: new Date(),
      transactionId: reference,
      metadata: { source: "admin_confirm", ...(req.body?.metadata || {}) },
    });

    await transaction.commit();

    const full = await fetchOrderAdminDetail(orderId);
    res.status(200).json({
      message: alreadyPaid ? "Thanh toán đã được ghi nhận trước đó" : "Đã xác nhận thanh toán",
      order: full,
      alreadyPaid,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Loi khi confirmOrderPaymentAdmin", error);
    res.status(500).json({ error: "Lỗi khi xác nhận thanh toán" });
  }
};

// Admin: Cap nhat ghi chu / tracking
export const patchAdminOrder = async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { adminNotes, trackingNumber, carrierName } = req.body || {};

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    const patch: any = {};
    if (adminNotes !== undefined) patch.adminNotes = adminNotes;
    if (trackingNumber !== undefined) patch.trackingNumber = trackingNumber;
    if (carrierName !== undefined) patch.carrierName = carrierName;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Không có trường hợp lệ để cập nhật" });
    }

    await order.update(patch);
    const full = await fetchOrderAdminDetail(orderId);
    res.status(200).json({ message: "Đã cập nhật", order: full });
  } catch (error) {
    console.error("Loi khi patchAdminOrder", error);
    res.status(500).json({ error: "Lỗi khi cập nhật đơn hàng" });
  }
};

// Admin: Xoa don hang (giai phong kho neu da ghi nhan)
export const deleteAdminOrder = async (req: any, res: any) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderId } = req.params;

    const order = await Order.findByPk(orderId, {
      include: [
        { model: OrderItem, as: "items" },
        { model: Payment, as: "payment", required: false },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    const payment = (order as any).payment;
    if (shouldRestoreStockWhenCancelled(order, payment)) {
      await incrementStockForOrderItems(order.items, transaction);
    }

    if (payment) {
      await Payment.destroy({ where: { orderId }, transaction });
    }
    await UserVoucherRedemption.destroy({ where: { orderId }, transaction });
    await BundlePurchase.destroy({ where: { orderId }, transaction });
    await OrderItem.destroy({ where: { orderId }, transaction });
    await Order.destroy({ where: { orderId }, transaction });

    await transaction.commit();
    res.status(200).json({ message: "Đã xóa đơn hàng" });
  } catch (error) {
    await transaction.rollback();
    console.error("Loi khi deleteAdminOrder", error);
    res.status(500).json({ error: "Lỗi khi xóa đơn hàng" });
  }
};

// Admin: Cap nhat trang thai don hang
export const updateOrderStatus = async (req: any, res: any) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      await transaction.rollback();
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: "items",
        },
        {
          model: Payment,
          as: "payment",
          required: false,
        },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    const payment = (order as any).payment;

    const transition = canTransitionOrderStatus(order, status);
    if (!transition.ok) {
      await transaction.rollback();
      return res.status(400).json({ error: transition.reason });
    }

    if (bankTransferUnpaidBlocksTargetStatus(order, payment, status)) {
      await transaction.rollback();
      return res.status(400).json({
        error:
          "Đơn chuyển khoản chưa được xác nhận thanh toán. Hãy xác nhận thanh toán trước khi chuyển sang trạng thái xử lý / giao hàng.",
      });
    }

    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      if (shouldRestoreStockWhenCancelled(order, payment)) {
        await incrementStockForOrderItems(order.items, transaction);
      }
    }

    await order.update({ status }, { transaction });
    await transaction.commit();

    const full = await fetchOrderAdminDetail(orderId);
    res.status(200).json({
      message: "Cập nhật trạng thái đơn hàng thành công",
      order: full,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Loi khi updateOrderStatus", error);
    res.status(500).json({ error: "Lỗi khi cập nhật trạng thái đơn hàng" });
  }
};
