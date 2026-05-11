"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Transaction for atomic index creation
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("Adding performance indexes...");

      // Index 1: DiscountCampaign - filter active campaigns by status and date range
      // Used by loadActiveCampaignsOrdered() - critical hot path
      await queryInterface.addIndex("discount_campaigns", ["isEnabled", "startsAt"], {
        name: "idx_discount_campaigns_active_status_date",
        transaction,
      });
      console.log("✓ Index on DiscountCampaign(isEnabled, startsAt) created");

      // Index 2: DiscountCampaign - filter by endsAt for date range queries
      await queryInterface.addIndex("discount_campaigns", ["endsAt"], {
        name: "idx_discount_campaigns_ends_at",
        transaction,
      });
      console.log("✓ Index on DiscountCampaign(endsAt) created");

      // Index 3: Product - filter ACTIVE products
      // Used frequently in getAllProducts() and storefront queries
      await queryInterface.addIndex("products", ["status", "createdAt"], {
        name: "idx_products_status_created_at",
        transaction,
      });
      console.log("✓ Index on Product(status, createdAt) created");

      // Index 4: ProductVariant - lookup by variantId (likely already exists, but ensure)
      // Used in discount campaign resolution
      try {
        await queryInterface.addIndex("product_variants", ["variantId"], {
          name: "idx_product_variants_variant_id",
          transaction,
        });
        console.log("✓ Index on ProductVariant(variantId) created");
      } catch (e) {
        // Index may already exist
        console.log("ℹ ProductVariant(variantId) index may already exist");
      }

      // Index 5: ProductVariant - lookup by productId
      // Used in getAllProducts() variant filtering
      try {
        await queryInterface.addIndex("product_variants", ["productId"], {
          name: "idx_product_variants_product_id",
          transaction,
        });
        console.log("✓ Index on ProductVariant(productId) created");
      } catch (e) {
        console.log("ℹ ProductVariant(productId) index may already exist");
      }

      // Index 6: CartItem - lookup by cartId
      // Used in cart operations
      try {
        await queryInterface.addIndex("cart_items", ["cartId"], {
          name: "idx_cart_items_cart_id",
          transaction,
        });
        console.log("✓ Index on CartItem(cartId) created");
      } catch (e) {
        console.log("ℹ CartItem(cartId) index may already exist");
      }

      // Index 7: DiscountCampaignVariantPrice - lookup by variantId
      // Used in campaign pricing resolution
      try {
        await queryInterface.addIndex("discount_campaign_variant_prices", ["variantId"], {
          name: "idx_discount_campaign_variant_prices_variant_id",
          transaction,
        });
        console.log("✓ Index on DiscountCampaignVariantPrice(variantId) created");
      } catch (e) {
        console.log("ℹ DiscountCampaignVariantPrice(variantId) index may already exist");
      }

      await transaction.commit();
      console.log("✅ All performance indexes created successfully");
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("Removing performance indexes...");

      const indexNames = [
        "idx_discount_campaigns_active_status_date",
        "idx_discount_campaigns_ends_at",
        "idx_products_status_created_at",
        "idx_product_variants_variant_id",
        "idx_product_variants_product_id",
        "idx_cart_items_cart_id",
        "idx_discount_campaign_variant_prices_variant_id",
      ];

      for (const indexName of indexNames) {
        try {
          await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${indexName}`, { transaction });
          console.log(`✓ Removed index: ${indexName}`);
        } catch (e) {
          console.log(`ℹ Could not remove index ${indexName} (may not exist)`);
        }
      }

      await transaction.commit();
      console.log("✅ Removed all performance indexes");
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
