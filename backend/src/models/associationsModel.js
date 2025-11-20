import { Category } from "./categoryModel.js";
import { Product } from "./productModel.js";
import { User } from "./userModel.js";
import { Review } from "./reviewModel.js";
import { Cart } from "./cartModel.js";
import { CartItem } from "./cartItemModel.js";
import { Order } from "./orderModel.js";
import { OrderItem } from "./orderItemModel.js";

// Quan he giua Category va Product
Category.hasMany(Product, { foreignKey: "categoryId", as: "products" });
Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

// Quan he giua User va Review
User.hasMany(Review, { foreignKey: "clerkId", as: "reviews" });
Review.belongsTo(User, { foreignKey: "clerkId", as: "user" });

// Quan he giua Product va Review
Product.hasMany(Review, { foreignKey: "productId", as: "reviews" });
Review.belongsTo(Product, { foreignKey: "productId", as: "product" });

// Quan he giua User va Cart
User.hasOne(Cart, { foreignKey: "clerkId", as: "cart" });
Cart.belongsTo(User, { foreignKey: "clerkId", as: "user" });

// Quan he giua Cart va CartItem
Cart.hasMany(CartItem, { foreignKey: "cartId", as: "items", onDelete: "CASCADE" });
CartItem.belongsTo(Cart, { foreignKey: "cartId", as: "cart" });

// Quan he giua Product va CartItem
Product.hasMany(CartItem, { foreignKey: "productId", as: "cartItems" });
CartItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

// Quan he giua User va Order
User.hasMany(Order, { foreignKey: "clerkId", as: "orders" });
Order.belongsTo(User, { foreignKey: "clerkId", as: "user" });

// Quan he giua Order va OrderItem
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items", onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

// Quan he giua Product va OrderItem
Product.hasMany(OrderItem, { foreignKey: "productId", as: "orderItems" });
OrderItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

export { Category, Product, User, Review, Cart, CartItem, Order, OrderItem };
