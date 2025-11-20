import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { Product } from "../models/productModel.js";
import { Cart } from "../models/cartModel.js";
import { CartItem } from "../models/cartItemModel.js";
import { sequelize } from "../libs/db.js";

// Create new order from selected cart items
export const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { userId: clerkId } = req.auth;
    const { selectedItems, shippingAddress, phone, paymentMethod, notes } = req.body;

    // Validate required fields
    if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: "Vui lòng chọn ít nhất một sản phẩm" });
    }

    if (!shippingAddress || !phone) {
      await transaction.rollback();
      return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin giao hàng" });
    }

    // Get cart items
    const cartItems = await CartItem.findAll({
      where: { cartItemId: selectedItems },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["productId", "name", "price", "stock"],
        },
      ],
      transaction,
    });

    if (cartItems.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    // Validate stock availability
    for (const cartItem of cartItems) {
      if (cartItem.product.stock < cartItem.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Sản phẩm "${cartItem.product.name}" không đủ số lượng trong kho`,
        });
      }
    }

    // Calculate total price
    let totalPrice = 0;
    const orderItemsData = [];

    for (const cartItem of cartItems) {
      const itemTotal = cartItem.product.price * cartItem.quantity;
      totalPrice += itemTotal;

      orderItemsData.push({
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        price: cartItem.product.price,
      });
    }

    // Create order
    const order = await Order.create(
      {
        clerkId,
        totalPrice,
        shippingAddress,
        phone,
        paymentMethod: paymentMethod || "COD",
        notes: notes || null,
        status: "PENDING",
      },
      { transaction }
    );

    // Create order items
    const orderItems = await Promise.all(
      orderItemsData.map((item) =>
        OrderItem.create(
          {
            orderId: order.orderId,
            ...item,
          },
          { transaction }
        )
      )
    );

    // Update product stock
    for (const cartItem of cartItems) {
      await Product.decrement("stock", {
        by: cartItem.quantity,
        where: { productId: cartItem.productId },
        transaction,
      });
    }

    // Remove ordered items from cart
    await CartItem.destroy({
      where: { cartItemId: selectedItems },
      transaction,
    });

    // Commit transaction
    await transaction.commit();

    // Fetch complete order with items
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
      ],
    });

    res.status(201).json({
      message: "Đặt hàng thành công",
      order: completeOrder,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Lỗi khi tạo đơn hàng" });
  }
};

// Get all orders for current user
export const getOrders = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;
    const { status, page = 1, limit = 10 } = req.query;

    const whereClause = { clerkId };
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
    console.error("Error getting orders:", error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách đơn hàng" });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
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
    console.error("Error getting order:", error);
    res.status(500).json({ error: "Lỗi khi lấy thông tin đơn hàng" });
  }
};

// Cancel order (only if status is PENDING)
export const cancelOrder = async (req, res) => {
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

    if (order.status !== "PENDING") {
      await transaction.rollback();
      return res.status(400).json({
        error: "Chỉ có thể hủy đơn hàng đang chờ xử lý",
      });
    }

    // Restore product stock
    for (const item of order.items) {
      await Product.increment("stock", {
        by: item.quantity,
        where: { productId: item.productId },
        transaction,
      });
    }

    // Update order status
    await order.update({ status: "CANCELLED" }, { transaction });

    await transaction.commit();

    // Fetch complete order with product details
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
    console.error("Error cancelling order:", error);
    res.status(500).json({ error: "Lỗi khi hủy đơn hàng" });
  }
};

// Admin: Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const whereClause = {};
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

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
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

    // If cancelling order, restore stock
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
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Lỗi khi cập nhật trạng thái đơn hàng" });
  }
};
