"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("showroom_saved_setups").catch(() => null);
    if (!table) return;
    if (!table.colorByProductId) {
      await queryInterface.addColumn("showroom_saved_setups", "colorByProductId", {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("showroom_saved_setups").catch(() => null);
    if (!table?.colorByProductId) return;
    await queryInterface.removeColumn("showroom_saved_setups", "colorByProductId");
  },
};
