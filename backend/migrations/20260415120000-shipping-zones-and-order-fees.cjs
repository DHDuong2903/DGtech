"use strict";

const fs = require("fs");
const path = require("path");

/** Deterministic UUIDs for seed rows so `down` can remove them reliably. */
const SEED_ZONE_ID = "a0000001-0001-4000-8001-000000000001";
const SEED_METHOD_ID = "a0000001-0001-4000-8002-000000000001";
const SEED_RATE_ID = "a0000001-0001-4000-8003-000000000001";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("shipping_zones", {
      zoneId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("shipping_methods", {
      methodId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      zoneId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "shipping_zones", key: "zoneId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      code: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("shipping_methods", ["zoneId", "code"], {
      unique: true,
      name: "shipping_methods_zone_id_code_uidx",
    });

    await queryInterface.createTable("shipping_rates", {
      rateId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      methodId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "shipping_methods", key: "methodId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      pricingType: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "flat",
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("shipping_province_zones", {
      provinceCode: {
        type: Sequelize.STRING(32),
        primaryKey: true,
        allowNull: false,
      },
      zoneId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "shipping_zones", key: "zoneId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("shipping_province_zones", ["zoneId"], {
      name: "shipping_province_zones_zone_id_idx",
    });

    await queryInterface.addColumn("orders", "subtotal", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("orders", "shippingFee", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.sequelize.query(
      `UPDATE "orders" SET "subtotal" = "totalPrice" WHERE "subtotal" IS NULL`,
    );
    await queryInterface.changeColumn("orders", "subtotal", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    const now = new Date();
    await queryInterface.bulkInsert("shipping_zones", [
      {
        zoneId: SEED_ZONE_ID,
        name: "Mặc định",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await queryInterface.bulkInsert("shipping_methods", [
      {
        methodId: SEED_METHOD_ID,
        zoneId: SEED_ZONE_ID,
        code: "standard",
        name: "Tiêu chuẩn",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await queryInterface.bulkInsert("shipping_rates", [
      {
        rateId: SEED_RATE_ID,
        methodId: SEED_METHOD_ID,
        pricingType: "flat",
        amount: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const provincesPath = path.join(__dirname, "../src/data/vn/provinces.json");
    const provinces = JSON.parse(fs.readFileSync(provincesPath, "utf8"));
    const rows = provinces.map((p) => ({
      provinceCode: String(p.provinceCode),
      zoneId: SEED_ZONE_ID,
      createdAt: now,
      updatedAt: now,
    }));
    if (rows.length) {
      await queryInterface.bulkInsert("shipping_province_zones", rows);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("orders", "shippingFee");
    await queryInterface.removeColumn("orders", "subtotal");

    await queryInterface.dropTable("shipping_province_zones");
    await queryInterface.dropTable("shipping_rates");
    await queryInterface.dropTable("shipping_methods");
    await queryInterface.dropTable("shipping_zones");
  },
};
