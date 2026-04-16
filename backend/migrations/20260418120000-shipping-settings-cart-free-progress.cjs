"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("shipping_settings", "showFreeShippingProgressInCart", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("shipping_settings", "showFreeShippingProgressInCart");
  },
};
