import { DataTypes } from "sequelize";
import { sequelize } from "../libs/db.js";

export const Payment = sequelize.define(
  "Payment",
  {
    paymentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM("COD", "BANK_TRANSFER", "SEPAY"),
      allowNull: false,
      defaultValue: "COD",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "PAID", "FAILED", "REFUNDED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    // SePay transaction info
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "SePay transaction ID",
    },
    bankCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transactionContent: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Nội dung chuyển khoản",
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Metadata
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Additional payment data from SePay",
    },
  },
  {
    tableName: "payments",
    timestamps: true,
  }
);
