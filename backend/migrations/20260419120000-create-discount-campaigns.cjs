"use strict";

/**
 * Admin discount campaigns: scope (all / products / categories), tier targeting,
 * percent or fixed discount, optional per-variant fixed prices during campaign.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('sequelize').Sequelize} Sequelize
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    let exists = false;
    try {
      await queryInterface.describeTable("discount_campaigns");
      exists = true;
    } catch {
      exists = false;
    }

    if (!exists) {
      await queryInterface.createTable("discount_campaigns", {
        campaignId: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        priority: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        campaignType: {
          type: Sequelize.STRING(64),
          allowNull: false,
        },
        discountKind: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        discountValue: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        appliesToAllProducts: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        targetTiers: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: Sequelize.literal("'[]'::jsonb"),
        },
        startsAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        endsAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: Sequelize.literal("'{}'::jsonb"),
        },
        isEnabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
    }

    let junctionP = false;
    try {
      await queryInterface.describeTable("discount_campaign_products");
      junctionP = true;
    } catch {
      junctionP = false;
    }
    if (!junctionP) {
      await queryInterface.createTable("discount_campaign_products", {
        campaignId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: "discount_campaigns", key: "campaignId" },
          onDelete: "CASCADE",
        },
        productId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: "products", key: "productId" },
          onDelete: "CASCADE",
        },
      });
    }

    let junctionC = false;
    try {
      await queryInterface.describeTable("discount_campaign_categories");
      junctionC = true;
    } catch {
      junctionC = false;
    }
    if (!junctionC) {
      await queryInterface.createTable("discount_campaign_categories", {
        campaignId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: "discount_campaigns", key: "campaignId" },
          onDelete: "CASCADE",
        },
        categoryId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          references: { model: "categories", key: "categoryId" },
          onDelete: "CASCADE",
        },
      });
    }

    let vp = false;
    try {
      await queryInterface.describeTable("discount_campaign_variant_prices");
      vp = true;
    } catch {
      vp = false;
    }
    if (!vp) {
      await queryInterface.createTable("discount_campaign_variant_prices", {
        campaignId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: "discount_campaigns", key: "campaignId" },
          onDelete: "CASCADE",
        },
        variantId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: "product_variants", key: "variantId" },
          onDelete: "CASCADE",
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("discount_campaign_variant_prices");
    await queryInterface.dropTable("discount_campaign_categories");
    await queryInterface.dropTable("discount_campaign_products");
    await queryInterface.dropTable("discount_campaigns");
  },
};
