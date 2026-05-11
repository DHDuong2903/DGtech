// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const OrderItem = sequelize.define(
  "OrderItem",
  {
    orderItemId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Giá sản phẩm tại thời điểm mua",
    },
  },
  {
    timestamps: true,
    tableName: "order_items",
    indexes: [{ fields: ["orderId"] }, { fields: ["productId"] }, { fields: ["variantId"] }],
  }
);

