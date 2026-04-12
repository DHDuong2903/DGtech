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
      }
    ]
  });
};

// San pham pho bien
export const productIncludeOptions = [
  {
    model: Category,
    as: "category",
    attributes: ["categoryId", "name"],
  },
  {
    model: ProductVariant,
    as: "variants",
  }
];
