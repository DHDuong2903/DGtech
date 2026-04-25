"use strict";

/**
 * Bundle cart lines: itemType + bundleId; productId may be null for BUNDLE rows.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("cart_items", "itemType", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "PRODUCT",
    });

    await queryInterface.addColumn("cart_items", "bundleId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "bundles",
        key: "bundleId",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.changeColumn("cart_items", "productId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "products",
        key: "productId",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("cart_items", "bundleId");
    await queryInterface.removeColumn("cart_items", "itemType");

    await queryInterface.changeColumn("cart_items", "productId", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "products",
        key: "productId",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },
};
