"use strict";

/**
 * Variants referenced by stock receipts / inventory movements cannot be hard-deleted (FK RESTRICT).
 * isActive=false archives them while preserving inventory history.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('sequelize').Sequelize} Sequelize
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("product_variants");
    if (table.isActive) return;

    await queryInterface.addColumn("product_variants", "isActive", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addIndex("product_variants", ["productId", "isActive"], {
      name: "product_variants_productId_isActive_idx",
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("product_variants");
    if (!table.isActive) return;

    await queryInterface.removeIndex("product_variants", "product_variants_productId_isActive_idx");
    await queryInterface.removeColumn("product_variants", "isActive");
  },
};
