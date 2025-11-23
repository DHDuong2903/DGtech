import { Cart } from "../models/cartModel.js";
import { CartItem } from "../models/cartItemModel.js";
import { Product } from "../models/productModel.js";
import { updateCartTotals, getCartWithDetails } from "../helpers/cartHelper.js";

// Lay gio hang cua user hien tai
export const getCart = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;

    // Tim hoac tao moi gio hang
    let cart = await getCartWithDetails(clerkId);

    if (!cart) {
      await Cart.create({ clerkId });
      cart = await getCartWithDetails(clerkId);
    }

    res.status(200).json({ cart });
  } catch (error) {
    console.error("Loi khi getCart", error);
    res.status(500).json({ error: "Không thể lấy giỏ hàng" });
  }
};

// Them san pham vao gio hang
export const addToCart = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID là bắt buộc" });
    }

    // Kiem tra san pham ton tai khong
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: "Không đủ hàng trong kho" });
    }

    // Tim hoac tao moi gio hang
    let cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      cart = await Cart.create({ clerkId });
    }

    // Kiem tra san pham da co trong gio hang chua
    let cartItem = await CartItem.findOne({
      where: { cartId: cart.cartId, productId },
    });

    let message;
    if (cartItem) {
      // Cap nhat so luong
      const newQuantity = cartItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ error: "Không đủ hàng trong kho" });
      }
      cartItem.quantity = newQuantity;
      await cartItem.save();
      message = `Đã cập nhật số lượng sản phẩm trong giỏ hàng (${newQuantity})`;
    } else {
      // Tao moi san pham trong gio hang
      cartItem = await CartItem.create({
        cartId: cart.cartId,
        productId,
        quantity,
      });
      message = "Sản phẩm đã được thêm vào giỏ hàng";
    }

    // Cap nhat tong tien gio hang
    await updateCartTotals(cart.cartId);

    // Lay lai gio hang sau cap nhat
    cart = await getCartWithDetails(clerkId);

    res.status(200).json({ cart, message });
  } catch (error) {
    console.error("Loi khi addToCart", error);
    res.status(500).json({ error: "Không thể thêm sản phẩm vào giỏ hàng" });
  }
};

// Cap nhat so luong san pham trong gio hang
export const updateCartItem = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Số lượng hợp lệ là bắt buộc" });
    }

    // Tim gio hang
    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });
    }

    // Tim san pham trong gio hang
    const cartItem = await CartItem.findOne({
      where: { cartItemId, cartId: cart.cartId },
      include: [{ model: Product, as: "product" }],
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    // Kiem tra kho
    if (cartItem.product.stock < quantity) {
      return res.status(400).json({ error: "Không đủ hàng trong kho" });
    }

    // Cap nhat so luong
    cartItem.quantity = quantity;
    await cartItem.save();

    // Cap nhat tong tien gio hang
    await updateCartTotals(cart.cartId);

    // Lay lai gio hang sau cap nhat
    const updatedCart = await getCartWithDetails(clerkId);

    res.status(200).json({ cart: updatedCart, message: "Sản phẩm trong giỏ hàng đã được cập nhật" });
  } catch (error) {
    console.error("Loi khi updateCartItem", error);
    res.status(500).json({ error: "Không thể cập nhật sản phẩm trong giỏ hàng" });
  }
};

// Xoa san pham khoi gio hang
export const removeFromCart = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;
    const { cartItemId } = req.params;

    // Tim gio hang
    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });
    }

    // Tim va xoa san pham trong gio hang
    const cartItem = await CartItem.findOne({
      where: { cartItemId, cartId: cart.cartId },
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    await cartItem.destroy();

    // Cap nhat tong tien gio hang
    await updateCartTotals(cart.cartId);

    // Lay lai gio hang sau cap nhat
    const updatedCart = await getCartWithDetails(clerkId);

    res.status(200).json({ cart: updatedCart, message: "Sản phẩm đã được xóa khỏi giỏ hàng" });
  } catch (error) {
    console.error("Loi khi removeFromCart", error);
    res.status(500).json({ error: "Không thể xóa sản phẩm khỏi giỏ hàng" });
  }
};

// Xoa toan bo san pham trong gio hang
export const clearCart = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;

    // Tim gio hang
    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });
    }

    // Xoa toan bo san pham trong gio hang
    await CartItem.destroy({ where: { cartId: cart.cartId } });

    // Cap nhat tong tien gio hang
    cart.totalPrice = 0;
    cart.totalItems = 0;
    await cart.save();

    // Lay lai gio hang sau cap nhat
    const updatedCart = await getCartWithDetails(clerkId);

    res.status(200).json({ cart: updatedCart, message: "Giỏ hàng đã được làm trống" });
  } catch (error) {
    console.error("Loi khi clearCart", error);
    res.status(500).json({ error: "Không thể làm trống giỏ hàng" });
  }
};
