// @ts-nocheck
import {
  Cart,
  CartItem,
  Product,
  ProductVariant,
  ShippingSetting,
  Bundle,
  BundleItem,
} from "../models/associationsModel.js";
import { enrichCartItemLinesForStorefront } from "../services/discountCampaignResolveService.js";
import { cartLineUnitSubtotal } from "../services/cartBundleStorefront.js";

export const cartItemBundleInclude = {
  model: Bundle,
  as: "bundle",
  required: false,
  include: [
    {
      model: BundleItem,
      as: "items",
      include: [
        {
          model: ProductVariant,
          as: "variant",
          attributes: ["variantId", "price", "stock", "attributes", "productId"],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "name", "imageUrl", "model3dUrl", "stock", "status", "categoryId"],
            },
          ],
        },
      ],
    },
  ],
};

export const storefrontCartItemIncludes = [
  {
    model: Product,
    as: "product",
    required: false,
    attributes: ["productId", "name", "price", "imageUrl", "model3dUrl", "stock", "categoryId", "status"],
  },
  {
    model: ProductVariant,
    as: "variant",
    required: false,
    attributes: ["variantId", "price", "stock", "attributes"],
  },
  cartItemBundleInclude,
];

// Cap nhat tong tien va so luong trong gio hang (gia sau campaign khi co clerkId)
export const updateCartTotals = async (cartId: string, clerkId?: string | null) => {
  const cartItems = await CartItem.findAll({
    where: { cartId },
    include: storefrontCartItemIncludes,
  });

  if (clerkId) {
    await enrichCartItemLinesForStorefront(cartItems, clerkId);
  }

  let totalPrice = 0;
  let totalItems = 0;

  cartItems.forEach((item) => {
    const unit = cartLineUnitSubtotal(item);
    totalPrice += unit * item.quantity;
    totalItems += item.quantity;
  });

  await Cart.update({ totalPrice, totalItems }, { where: { cartId } });
};

// Lay gio hang voi chi tiet day du
export const getCartWithDetails = async (clerkId: string) => {
  return await Cart.findOne({
    where: { clerkId },
    include: [
      {
        model: CartItem,
        as: "items",
        include: storefrontCartItemIncludes,
      },
    ],
  });
};

/**
 * Payload for storefront cart free-ship progress (subtotal vs threshold).
 * @returns {{ show: false } | { show: true, minSubtotal: number, standardOnly: boolean }}
 */
export async function getFreeShippingMotivation() {
  try {
    const row = await ShippingSetting.findByPk(1);
    if (!row) return { show: false };
    if (row.displayMode === "included") return { show: false };
    if (!row.freeShippingEnabled) return { show: false };
    if (row.showFreeShippingProgressInCart === false) return { show: false };
    const min = Math.round(Number(row.freeShippingMinSubtotal) * 100) / 100;
    if (!Number.isFinite(min) || min <= 0) return { show: false };
    return {
      show: true,
      minSubtotal: min,
      standardOnly: row.freeShippingStandardOnly !== false,
    };
  } catch (e) {
    console.error("getFreeShippingMotivation", e);
    return { show: false };
  }
}
