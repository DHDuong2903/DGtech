import { Category } from "./categoryModel.js";
import { Product } from "./productModel.js";

Category.hasMany(Product, { foreignKey: "categoryId", as: "products" });
Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

export { Category, Product };
