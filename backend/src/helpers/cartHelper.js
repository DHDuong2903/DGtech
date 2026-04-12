import { Cart, CartItem, Product, ProductVariant } from "../models/associationsModel.js";

// Cap nhat tong tien va so luong trong gio hang
export const updateCartTotals = async (cartId) => {
  const cartItems = await CartItem.findAll({
    where: { cartId },
    include: [
      { model: Product, as: "product" },
      { model: ProductVariant, as: "variant" }
    ],
  });

  let totalPrice = 0;
  let totalItems = 0;

  cartItems.forEach((item) => {
    // Luon lay gia tu variant vi moi product deu co variant
    const itemPrice = item.variant ? parseFloat(item.variant.price) : parseFloat(item.product.price);
    totalPrice += itemPrice * item.quantity;
    totalItems += item.quantity;
  });

  await Cart.update({ totalPrice, totalItems }, { where: { cartId } });
};

// Lay gio hang voi chi tiet day du
export const getCartWithDetails = async (clerkId) => {
  return await Cart.findOne({
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
          {
            model: ProductVariant,
            as: "variant",
            attributes: ["variantId", "price", "stock", "attributes"],
          }
        ],
      },
    ],
  });
};
