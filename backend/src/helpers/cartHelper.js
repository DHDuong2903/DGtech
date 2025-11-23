import { Cart } from "../models/cartModel.js";
import { CartItem } from "../models/cartItemModel.js";
import { Product } from "../models/productModel.js";

// Cap nhat tong tien va so luong trong gio hang
export const updateCartTotals = async (cartId) => {
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
        ],
      },
    ],
  });
};
