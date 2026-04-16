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
} from "../models/associationsModel.js";
import { formatShippingSnapshot, getProvinceName } from "../helpers/vnAddressHelper.js";
import {
  loadSelectedCartLines,
  computeSubtotalFromLines,
  resolveShippingForCheckout,
  ShippingConfigError,
  normalizeShippingMethodCode,
} from "../services/shippingService.js";
import { sequelize } from "../libs/db.js";
import { generateQRCodeUrl, generateTransactionContent } from "../helpers/paymentHelper.js";

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
      if (cartItem.product.status !== "ACTIVE") {
        await transaction.rollback();
        return res.status(400).json({
          error: `Sản phẩm "${cartItem.product.name}" không còn được bán`,
        });
      }
    }

    // Check stock (prefer variant stock)
    for (const cartItem of cartItems) {
      const stockAvailable = cartItem.variant ? cartItem.variant.stock : cartItem.product.stock;
      if (stockAvailable < cartItem.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Sản phẩm "${cartItem.product.name}"${cartItem.variant ? " (phân loại đã chọn)" : ""} không đủ số lượng trong kho`,
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
    const totalPrice = ship.totalPrice;

    const orderItemsData = [];
    for (const cartItem of cartItems) {
      const itemPrice = cartItem.variant ? cartItem.variant.price : cartItem.product.price;
      orderItemsData.push({
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        quantity: cartItem.quantity,
        price: itemPrice,
      });
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

    // Decrement stock unless BANK_TRANSFER
    if (paymentMethod !== "BANK_TRANSFER") {
      for (const cartItem of cartItems) {
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

    // Remove selected items from cart
    await CartItem.destroy({
      where: { cartItemId: selectedItems, cartId: cart.cartId },
      transaction,
    });

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
      for (const item of order.items) {
        await Product.increment("stock", {
          by: item.quantity,
          where: { productId: item.productId },
          transaction,
        });
      }
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
    const { status, page = 1, limit = 20 } = req.query;

    const whereClause: any = {};
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
    console.error("Error getting all orders:", error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách đơn hàng" });
  }
};

// Admin: Cap nhat trang thai don hang
export const updateOrderStatus = async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: "items",
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      for (const item of order.items) {
        await Product.increment("stock", {
          by: item.quantity,
          where: { productId: item.productId },
        });
      }
    }

    await order.update({ status });

    res.status(200).json({
      message: "Cập nhật trạng thái đơn hàng thành công",
      order,
    });
  } catch (error) {
    console.error("Loi khi updateOrderStatus", error);
    res.status(500).json({ error: "Lỗi khi cập nhật trạng thái đơn hàng" });
  }
};
