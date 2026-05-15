import { sequelize } from "./db.js";

import { User } from "../models/userModel.js";
import { Category } from "../models/categoryModel.js";
import { Product } from "../models/productModel.js";
import { Review } from "../models/reviewModel.js";
import { Cart } from "../models/cartModel.js";
import { CartItem } from "../models/cartItemModel.js";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { Payment } from "../models/paymentModel.js";
import { Slideshow } from "../models/slideshowModel.js";
import { DiscountCampaign } from "../models/discountCampaignModel.js";
import { DiscountCampaignProduct } from "../models/discountCampaignProductModel.js";
import { DiscountCampaignCategory } from "../models/discountCampaignCategoryModel.js";
import { DiscountCampaignVariantPrice } from "../models/discountCampaignVariantPriceModel.js";
import { Voucher } from "../models/voucherModel.js";
import { UserVoucherRedemption } from "../models/userVoucherRedemptionModel.js";
import { TaxSetting } from "../models/taxSettingModel.js";
import { AiConversation } from "../models/aiConversationModel.js";
import { AiConversationMessage } from "../models/aiConversationMessageModel.js";

// Import associations
import "../models/associationsModel.js";

export const syncModels = async () => {
  try {
    await sequelize.sync({ alter: false });
    await sequelize.query(`
      ALTER TABLE IF EXISTS "carts"
      ADD COLUMN IF NOT EXISTS "appliedVoucherId" UUID;
    `);
    await sequelize.query(`
      ALTER TABLE IF EXISTS "orders"
      ADD COLUMN IF NOT EXISTS "voucherId" UUID,
      ADD COLUMN IF NOT EXISTS "voucherName" VARCHAR(200),
      ADD COLUMN IF NOT EXISTS "voucherDiscountAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "itemsTaxAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "shippingTaxAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "taxRateSnapshot" DECIMAL(6, 4) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "taxEnabledSnapshot" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "taxIncludedSnapshot" BOOLEAN NOT NULL DEFAULT true;
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "vouchers" (
        "voucherId" UUID PRIMARY KEY,
        "name" VARCHAR(200) NOT NULL,
        "voucherType" VARCHAR(32) NOT NULL DEFAULT 'PERCENT_DISCOUNT',
        "audience" VARCHAR(32) NOT NULL DEFAULT 'ALL_USERS',
        "tierTargets" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "discountPercent" DECIMAL(10, 2),
        "discountAmount" DECIMAL(10, 2),
        "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
        "expiresAt" TIMESTAMPTZ,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
      );
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "user_voucher_redemptions" (
        "redemptionId" UUID PRIMARY KEY,
        "voucherId" UUID NOT NULL,
        "clerkId" VARCHAR(255) NOT NULL,
        "orderId" UUID,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
      );
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "user_voucher_redemptions_voucherId_clerkId_idx"
      ON "user_voucher_redemptions" ("voucherId", "clerkId");
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "tax_settings" (
        "id" INTEGER PRIMARY KEY,
        "enableTax" BOOLEAN NOT NULL DEFAULT false,
        "taxRate" DECIMAL(6, 4) NOT NULL DEFAULT 0.1,
        "taxIncluded" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
      );
    `);
    await sequelize.query(`
      INSERT INTO "tax_settings" ("id","enableTax","taxRate","taxIncluded","createdAt","updatedAt")
      VALUES (1,false,0.1,true,NOW(),NOW())
      ON CONFLICT ("id") DO NOTHING;
    `);
    await sequelize.query(`
      ALTER TABLE IF EXISTS "tax_settings" DROP COLUMN IF EXISTS "applyTaxToShipping";
    `);
    await sequelize.query(`
      ALTER TABLE IF EXISTS "orders" DROP COLUMN IF EXISTS "applyTaxToShippingSnapshot";
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "rank_settings" (
        "id" INTEGER PRIMARY KEY,
        "bronzeMax" DECIMAL(12, 2) NOT NULL DEFAULT 5000000,
        "silverMax" DECIMAL(12, 2) NOT NULL DEFAULT 20000000,
        "cancelPenaltyUnit" DECIMAL(12, 2) NOT NULL DEFAULT 500000,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
      );
    `);
    await sequelize.query(`
      INSERT INTO "rank_settings" ("id","bronzeMax","silverMax","cancelPenaltyUnit","createdAt","updatedAt")
      VALUES (1,5000000,20000000,500000,NOW(),NOW())
      ON CONFLICT ("id") DO NOTHING;
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "ai_conversations" (
        "conversationId" UUID PRIMARY KEY,
        "clerkId" VARCHAR(255),
        "guestSessionId" VARCHAR(128),
        "title" VARCHAR(160) NOT NULL DEFAULT 'New chat',
        "status" VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
      );
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "ai_conversation_messages" (
        "messageId" UUID PRIMARY KEY,
        "conversationId" UUID NOT NULL,
        "role" VARCHAR(32) NOT NULL,
        "content" TEXT NOT NULL,
        "intent" VARCHAR(64),
        "model" VARCHAR(128),
        "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
      );
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "ai_conversations_clerkId_idx" ON "ai_conversations" ("clerkId");
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "ai_conversations_guestSessionId_idx" ON "ai_conversations" ("guestSessionId");
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "ai_conversation_messages_conversationId_idx" ON "ai_conversation_messages" ("conversationId");
    `);
    console.log("Models da duoc dong bo voi database");
  } catch (error) {
    console.error("Loi khi dong bo syncModels:", error);
    throw error;
  }
};
