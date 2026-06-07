"use strict";

function hasColumn(table, name) {
  return !!(table[name] || table[name.toLowerCase()]);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("products");

    if (!hasColumn(table, "model3dUrl")) {
      await queryInterface.addColumn("products", "model3dUrl", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!hasColumn(table, "model3dPublicId")) {
      await queryInterface.addColumn("products", "model3dPublicId", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!hasColumn(table, "model3dMimeType")) {
      await queryInterface.addColumn("products", "model3dMimeType", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!hasColumn(table, "model3dFileName")) {
      await queryInterface.addColumn("products", "model3dFileName", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!hasColumn(table, "model3dSizeBytes")) {
      await queryInterface.addColumn("products", "model3dSizeBytes", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!hasColumn(table, "isShowroomEnabled")) {
      await queryInterface.addColumn("products", "isShowroomEnabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("products");
    const maybeRemove = async (name) => {
      if (hasColumn(table, name)) {
        await queryInterface.removeColumn("products", name);
      }
    };

    await maybeRemove("isShowroomEnabled");
    await maybeRemove("model3dSizeBytes");
    await maybeRemove("model3dFileName");
    await maybeRemove("model3dMimeType");
    await maybeRemove("model3dPublicId");
    await maybeRemove("model3dUrl");
  },
};
