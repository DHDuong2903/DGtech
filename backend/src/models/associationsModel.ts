// @ts-nocheck
import { Category } from "./categoryModel.js";
import { Product } from "./productModel.js";
import { ProductVariant } from "./productVariantModel.js";
import { User } from "./userModel.js";
import { Review } from "./reviewModel.js";
import { Cart } from "./cartModel.js";
import { CartItem } from "./cartItemModel.js";
import { Order } from "./orderModel.js";
import { OrderItem } from "./orderItemModel.js";
import { Payment } from "./paymentModel.js";
import { UserAddress } from "./userAddressModel.js";
import { ShippingZone } from "./shippingZoneModel.js";
import { ShippingMethod } from "./shippingMethodModel.js";
import { ShippingRate } from "./shippingRateModel.js";
import { ShippingProvinceZone } from "./shippingProvinceZoneModel.js";
import { ShippingSetting } from "./shippingSettingModel.js";

// Quan he giua Category va Product
Category.hasMany(Product, { foreignKey: "categoryId", as: "products" });
Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

// Quan he giua Product va ProductVariant
Product.hasMany(ProductVariant, { foreignKey: "productId", as: "variants", onDelete: "CASCADE" });
ProductVariant.belongsTo(Product, { foreignKey: "productId", as: "product" });

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

// Quan he giua ProductVariant va CartItem
ProductVariant.hasMany(CartItem, { foreignKey: "variantId", as: "cartItems" });
CartItem.belongsTo(ProductVariant, { foreignKey: "variantId", as: "variant" });

// Quan he giua User va Order
User.hasMany(Order, { foreignKey: "clerkId", as: "orders" });
Order.belongsTo(User, { foreignKey: "clerkId", as: "user" });

// User saved addresses (VN structured; not Clerk)
User.hasMany(UserAddress, { foreignKey: "clerkId", as: "addresses", onDelete: "CASCADE" });
UserAddress.belongsTo(User, { foreignKey: "clerkId", as: "user" });

Order.belongsTo(UserAddress, { foreignKey: "userAddressId", as: "userAddress" });
UserAddress.hasMany(Order, { foreignKey: "userAddressId", as: "orders" });

// Quan he giua Order va OrderItem
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items", onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

// Quan he giua Product va OrderItem
Product.hasMany(OrderItem, { foreignKey: "productId", as: "orderItems" });
OrderItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

// Quan he giua ProductVariant va OrderItem
ProductVariant.hasMany(OrderItem, { foreignKey: "variantId", as: "orderItems" });
OrderItem.belongsTo(ProductVariant, { foreignKey: "variantId", as: "variant" });

// Quan he giua Order va Payment
Order.hasOne(Payment, { foreignKey: "orderId", as: "payment" });
Payment.belongsTo(Order, { foreignKey: "orderId", as: "order" });

ShippingZone.hasMany(ShippingMethod, { foreignKey: "zoneId", as: "methods", onDelete: "CASCADE" });
ShippingMethod.belongsTo(ShippingZone, { foreignKey: "zoneId", as: "zone" });

ShippingMethod.hasOne(ShippingRate, { foreignKey: "methodId", as: "rate", onDelete: "CASCADE" });
ShippingRate.belongsTo(ShippingMethod, { foreignKey: "methodId", as: "method" });

ShippingZone.hasMany(ShippingProvinceZone, { foreignKey: "zoneId", as: "provinceMappings", onDelete: "CASCADE" });
ShippingProvinceZone.belongsTo(ShippingZone, { foreignKey: "zoneId", as: "zone" });

export {
  Category,
  Product,
  ProductVariant,
  User,
  Review,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Payment,
  UserAddress,
  ShippingZone,
  ShippingMethod,
  ShippingRate,
  ShippingProvinceZone,
  ShippingSetting,
};
