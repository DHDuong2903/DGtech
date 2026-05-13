"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let exists = false;
    try {
      await queryInterface.describeTable("rank_settings");
      exists = true;
    } catch {
      exists = false;
    }
    if (!exists) {
      await queryInterface.createTable("rank_settings", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          allowNull: false,
          defaultValue: 1,
        },
        bronzeMax: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 5000000,
        },
        silverMax: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 20000000,
        },
        cancelPenaltyUnit: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 500000,
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

    await queryInterface.sequelize.query(`
      INSERT INTO "rank_settings" ("id","bronzeMax","silverMax","cancelPenaltyUnit","createdAt","updatedAt")
      VALUES (1,5000000,20000000,500000,NOW(),NOW())
      ON CONFLICT ("id") DO NOTHING;
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("rank_settings");
  },
};
