"use strict";

/** Internal ops fields for admin order management (demo + fulfillment). */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("orders", "adminNotes", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("orders", "trackingNumber", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });
    await queryInterface.addColumn("orders", "carrierName", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("orders", "carrierName");
    await queryInterface.removeColumn("orders", "trackingNumber");
    await queryInterface.removeColumn("orders", "adminNotes");
  },
};
