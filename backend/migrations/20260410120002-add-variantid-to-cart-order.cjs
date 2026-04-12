"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add variantId to cart_items (nullable - existing records won't have it)
    await queryInterface.addColumn("cart_items", "variantId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "product_variants",
        key: "variantId",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    // Add variantId to order_items (nullable - historical orders won't have it)
    await queryInterface.addColumn("order_items", "variantId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "product_variants",
        key: "variantId",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("cart_items", "variantId");
    await queryInterface.removeColumn("order_items", "variantId");
  },
};
