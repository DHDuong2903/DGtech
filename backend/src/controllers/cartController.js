import { Cart } from "../models/cartModel.js";
import { CartItem } from "../models/cartItemModel.js";
import { Product } from "../models/productModel.js";

// Get cart for current user
export const getCart = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;

    // Find or create cart
    let cart = await Cart.findOne({
      where: { clerkId },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "price", "imageUrl", "stock"],
            },
          ],
        },
      ],
    });

    if (!cart) {
      cart = await Cart.create({ clerkId });
      cart = await Cart.findOne({
        where: { clerkId },
        include: [
          {
            model: CartItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["productId", "name", "price", "imageUrl", "stock"],
              },
            ],
          },
        ],
      });
    }

    res.status(200).json({ cart });
  } catch (error) {
    console.error("Error getting cart:", error);
    res.status(500).json({ error: "Không thể lấy giỏ hàng" });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID là bắt buộc" });
    }

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: "Không đủ hàng trong kho" });
    }

    // Find or create cart
    let cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      cart = await Cart.create({ clerkId });
    }

    // Check if item already exists in cart
    let cartItem = await CartItem.findOne({
      where: { cartId: cart.cartId, productId },
    });

    let message;
    if (cartItem) {
      // Update quantity
      const newQuantity = cartItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ error: "Không đủ hàng trong kho" });
      }
      cartItem.quantity = newQuantity;
      await cartItem.save();
      message = `Đã cập nhật số lượng sản phẩm trong giỏ hàng (${newQuantity})`;
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        cartId: cart.cartId,
        productId,
        quantity,
      });
      message = "Sản phẩm đã được thêm vào giỏ hàng";
    }

    // Update cart totals
    await updateCartTotals(cart.cartId);

    // Fetch updated cart
    cart = await Cart.findOne({
      where: { clerkId },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "price", "imageUrl", "stock"],
            },
          ],
        },
      ],
    });

    res.status(200).json({ cart, message });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Không thể thêm sản phẩm vào giỏ hàng" });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Số lượng hợp lệ là bắt buộc" });
    }

    // Find cart
    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });
    }

    // Find cart item
    const cartItem = await CartItem.findOne({
      where: { cartItemId, cartId: cart.cartId },
      include: [{ model: Product, as: "product" }],
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    // Check stock
    if (cartItem.product.stock < quantity) {
      return res.status(400).json({ error: "Không đủ hàng trong kho" });
    }

    // Update quantity
    cartItem.quantity = quantity;
    await cartItem.save();

    // Update cart totals
    await updateCartTotals(cart.cartId);

    // Fetch updated cart
    const updatedCart = await Cart.findOne({
      where: { clerkId },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "price", "imageUrl", "stock"],
            },
          ],
        },
      ],
    });

    res.status(200).json({ cart: updatedCart, message: "Sản phẩm trong giỏ hàng đã được cập nhật" });
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({ error: "Không thể cập nhật sản phẩm trong giỏ hàng" });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;
    const { cartItemId } = req.params;

    // Find cart
    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });
    }

    // Find and delete cart item
    const cartItem = await CartItem.findOne({
      where: { cartItemId, cartId: cart.cartId },
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    await cartItem.destroy();

    // Update cart totals
    await updateCartTotals(cart.cartId);

    // Fetch updated cart
    const updatedCart = await Cart.findOne({
      where: { clerkId },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "price", "imageUrl", "stock"],
            },
          ],
        },
      ],
    });

    res.status(200).json({ cart: updatedCart, message: "Sản phẩm đã được xóa khỏi giỏ hàng" });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ error: "Không thể xóa sản phẩm khỏi giỏ hàng" });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;

    // Find cart
    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });
    }

    // Delete all cart items
    await CartItem.destroy({ where: { cartId: cart.cartId } });

    // Update cart totals
    cart.totalPrice = 0;
    cart.totalItems = 0;
    await cart.save();

    // Fetch updated cart
    const updatedCart = await Cart.findOne({
      where: { clerkId },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "price", "imageUrl", "stock"],
            },
          ],
        },
      ],
    });

    res.status(200).json({ cart: updatedCart, message: "Giỏ hàng đã được làm trống" });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ error: "Không thể làm trống giỏ hàng" });
  }
};

// Helper function to update cart totals
const updateCartTotals = async (cartId) => {
  const cartItems = await CartItem.findAll({
    where: { cartId },
    include: [{ model: Product, as: "product" }],
  });

  let totalPrice = 0;
  let totalItems = 0;

  cartItems.forEach((item) => {
    totalPrice += parseFloat(item.product.price) * item.quantity;
    totalItems += item.quantity;
  });

  await Cart.update({ totalPrice, totalItems }, { where: { cartId } });
};
