"use strict";

function hasColumn(table, name) {
  return !!(table?.[name] || table?.[name.toLowerCase()]);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const normalizedTables = tables.map((entry) => (typeof entry === "string" ? entry : entry.tableName || entry.name));

    if (!normalizedTables.includes("rooms")) {
      await queryInterface.createTable("rooms", {
        roomId: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(120),
          allowNull: false,
          unique: true,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
      });
    }

    const sceneTable = await queryInterface.describeTable("showroom_scenes");
    if (!hasColumn(sceneTable, "roomId")) {
      await queryInterface.addColumn("showroom_scenes", "roomId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "rooms",
          key: "roomId",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  },

  async down(queryInterface) {
    const sceneTable = await queryInterface.describeTable("showroom_scenes");
    if (hasColumn(sceneTable, "roomId")) {
      await queryInterface.removeColumn("showroom_scenes", "roomId");
    }

    const tables = await queryInterface.showAllTables();
    const normalizedTables = tables.map((entry) => (typeof entry === "string" ? entry : entry.tableName || entry.name));
    if (normalizedTables.includes("rooms")) {
      await queryInterface.dropTable("rooms");
    }
  },
};
