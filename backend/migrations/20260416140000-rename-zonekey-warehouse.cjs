"use strict";

/** Align DB zoneKey with catalog rename warehouse_hanoi → warehouse. */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE "shipping_zones" SET "zoneKey" = 'warehouse' WHERE "zoneKey" = 'warehouse_hanoi'`,
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE "shipping_zones" SET "zoneKey" = 'warehouse_hanoi' WHERE "zoneKey" = 'warehouse'`,
    );
  },
};
