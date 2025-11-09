import { Category } from "./categoryModel.js";
import { Product } from "./productModel.js";
import { User } from "./userModel.js";
import { Review } from "./reviewModel.js";

// Quan he giua Category va Product
Category.hasMany(Product, { foreignKey: "categoryId", as: "products" });
Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

// Quan he giua User va Review
User.hasMany(Review, { foreignKey: "clerkId", as: "reviews" });
Review.belongsTo(User, { foreignKey: "clerkId", as: "user" });

// Quan he giua Product va Review
Product.hasMany(Review, { foreignKey: "productId", as: "reviews" });
Review.belongsTo(Product, { foreignKey: "productId", as: "product" });

export { Category, Product, User, Review };
