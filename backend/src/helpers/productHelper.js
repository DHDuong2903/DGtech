import { Category } from "../models/categoryModel.js";
import { ProductVariant } from "../models/productVariantModel.js";

// Lay san pham kem danh muc
export const getProductWithCategory = async (Product, productId) => {
  return await Product.findByPk(productId, {
    include: [
      {
        model: Category,
        as: "category",
        attributes: ["categoryId", "name"],
      },
      {
        model: ProductVariant,
        as: "variants",
        where: { isActive: true },
        required: false,
      },
    ],
  });
};

// San pham pho bien - optimized attributes to reduce data transfer
export const productIncludeOptions = [
  {
    model: Category,
    as: "category",
    attributes: ["categoryId", "name"],
  },
  {
    model: ProductVariant,
    as: "variants",
    where: { isActive: true },
    required: false,
    attributes: ["variantId", "price", "stock", "attributes", "isDefault"],
  },
];

/**
 * Real variants each have an admin-set price; min price is shown without implying a "was/MSRP" discount.
 * Strips compareAtPrice from the product and non-default variants for API responses (and fixes legacy rows).
 */
export function clearCompareAtPriceForMultiVariantProduct(product) {
  if (!product) return;
  const variants = product.variants;
  if (!variants || !Array.isArray(variants)) return;
  const hasRealVariants = variants.some((v) => !v.isDefault);
  if (!hasRealVariants) return;

  if (typeof product.setDataValue === "function") {
    product.setDataValue("compareAtPrice", null);
  } else {
    product.compareAtPrice = null;
  }

  for (const v of variants) {
    if (v.isDefault) continue;
    if (typeof v.setDataValue === "function") {
      v.setDataValue("compareAtPrice", null);
    } else {
      v.compareAtPrice = null;
    }
  }
}
