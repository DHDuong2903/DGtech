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
    res.status(500).json({ error: "Failed to get cart" });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
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

    if (cartItem) {
      // Update quantity
      const newQuantity = cartItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ error: "Insufficient stock" });
      }
      cartItem.quantity = newQuantity;
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        cartId: cart.cartId,
        productId,
        quantity,
      });
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

    res.status(200).json({ cart, message: "Item added to cart" });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Failed to add item to cart" });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Valid quantity is required" });
    }

    // Find cart
    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    // Find cart item
    const cartItem = await CartItem.findOne({
      where: { cartItemId, cartId: cart.cartId },
      include: [{ model: Product, as: "product" }],
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    // Check stock
    if (cartItem.product.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
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

    res.status(200).json({ cart: updatedCart, message: "Cart item updated" });
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({ error: "Failed to update cart item" });
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
      return res.status(404).json({ error: "Cart not found" });
    }

    // Find and delete cart item
    const cartItem = await CartItem.findOne({
      where: { cartItemId, cartId: cart.cartId },
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
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

    res.status(200).json({ cart: updatedCart, message: "Item removed from cart" });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ error: "Failed to remove item from cart" });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const { userId: clerkId } = req.auth;

    // Find cart
    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
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

    res.status(200).json({ cart: updatedCart, message: "Cart cleared" });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ error: "Failed to clear cart" });
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
