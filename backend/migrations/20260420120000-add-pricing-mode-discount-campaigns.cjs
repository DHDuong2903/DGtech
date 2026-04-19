"use strict";

/**
 * Adds first-class `pricingMode` (price_rule | price_list) on discount_campaigns,
 * backfilled from metadata.pricingMode. For price_list rows, `discountKind` is cleared
 * (nullable) so PERCENT/0 is no longer a misleading sentinel.
 *
 * Adds index on discount_campaign_variant_prices(variantId) for storefront-style lookups.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('sequelize').Sequelize} Sequelize
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const t = "discount_campaigns";

    let hasPricingMode = false;
    try {
      const desc = await qi.describeTable(t);
      hasPricingMode = Boolean(desc.pricingMode);
    } catch {
      return;
    }

    if (!hasPricingMode) {
      await qi.addColumn(t, "pricingMode", {
        type: Sequelize.STRING(32),
        allowNull: true,
      });
    }

    await qi.sequelize.query(`
      UPDATE "${t}"
      SET "pricingMode" = CASE
        WHEN COALESCE(metadata->>'pricingMode', '') = 'price_list' THEN 'price_list'
        ELSE 'price_rule'
      END
      WHERE "pricingMode" IS NULL
    `);

    await qi.changeColumn(t, "pricingMode", {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: "price_rule",
    });

    await qi.changeColumn(t, "discountKind", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await qi.sequelize.query(`
      UPDATE "${t}"
      SET "discountKind" = NULL
      WHERE "pricingMode" = 'price_list'
    `);

    try {
      await qi.addIndex("discount_campaign_variant_prices", ["variantId"], {
        name: "idx_discount_campaign_variant_prices_variant_id",
      });
    } catch (e) {
      if (!String(e?.message || e).includes("already exists")) throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    const t = "discount_campaigns";

    try {
      await queryInterface.removeIndex(
        "discount_campaign_variant_prices",
        "idx_discount_campaign_variant_prices_variant_id"
      );
    } catch {
      /* index may not exist */
    }

    await queryInterface.sequelize.query(`
      UPDATE "${t}"
      SET "discountKind" = 'PERCENT'
      WHERE "pricingMode" = 'price_list' AND "discountKind" IS NULL
    `);

    await queryInterface.changeColumn(t, "discountKind", {
      type: Sequelize.STRING(20),
      allowNull: false,
    });

    await queryInterface.removeColumn(t, "pricingMode");
  },
};
