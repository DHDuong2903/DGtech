// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const Order = sequelize.define(
  "Order",
  {
    orderId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    clerkId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "COMPLETED",
        "CANCELLED"
      ),
      defaultValue: "PENDING",
      allowNull: false,
      comment:
        "PENDING: Chờ thanh toán, PROCESSING: Đã thanh toán đang chuẩn bị, SHIPPED: Đang giao, DELIVERED: Đã giao, COMPLETED: Hoàn thành, CANCELLED: Đã hủy",
    },
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM("COD", "BANK_TRANSFER"),
      defaultValue: "COD",
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "orders",
  }
);

