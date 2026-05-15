// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const AiConversationMessage = sequelize.define(
  "AiConversationMessage",
  {
    messageId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("user", "assistant", "system"),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    intent: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    tableName: "ai_conversation_messages",
    indexes: [{ fields: ["conversationId"] }, { fields: ["role"] }, { fields: ["createdAt"] }],
  },
);
