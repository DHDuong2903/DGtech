"use strict";

const fs = require("fs");
const path = require("path");

/** Fixed UUIDs for deterministic seed (multi-warehouse can attach later). */
const Z = {
  warehouse: "d1000001-0001-4000-8000-000000000001",
  north_near: "d1000001-0001-4000-8000-000000000002",
  north_far: "d1000001-0001-4000-8000-000000000003",
  central: "d1000001-0001-4000-8000-000000000004",
  south: "d1000001-0001-4000-8000-000000000005",
};

const M = {
  warehouse: "d1000002-0001-4000-8000-000000000001",
  north_near: "d1000002-0001-4000-8000-000000000002",
  north_far: "d1000002-0001-4000-8000-000000000003",
  central: "d1000002-0001-4000-8000-000000000004",
  south: "d1000002-0001-4000-8000-000000000005",
};

const R = {
  warehouse: "d1000003-0001-4000-8000-000000000001",
  north_near: "d1000003-0001-4000-8000-000000000002",
  north_far: "d1000003-0001-4000-8000-000000000003",
  central: "d1000003-0001-4000-8000-000000000004",
  south: "d1000003-0001-4000-8000-000000000005",
};

const ZONE_META = [
  { key: "warehouse", name: "Điểm cơ sở (Hà Nội)", sortOrder: 0, amount: 0 },
  { key: "north_near", name: "Miền Bắc gần", sortOrder: 1, amount: 30000 },
  { key: "north_far", name: "Miền Bắc xa", sortOrder: 2, amount: 40000 },
  { key: "central", name: "Miền Trung", sortOrder: 3, amount: 60000 },
  { key: "south", name: "Miền Nam", sortOrder: 4, amount: 80000 },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("shipping_settings", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        defaultValue: 1,
      },
      displayMode: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "separate",
      },
      freeShippingEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      freeShippingMinSubtotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 500000,
      },
      fallbackShippingAmount: {
        type: Sequelize.DECIMAL(12, 2),
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

    const now = new Date();
    await queryInterface.bulkInsert("shipping_settings", [
      {
        id: 1,
        displayMode: "separate",
        freeShippingEnabled: false,
        freeShippingMinSubtotal: 500000,
        fallbackShippingAmount: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await queryInterface.addColumn("orders", "shippingDisplayMode", {
      type: Sequelize.STRING(16),
      allowNull: true,
    });

    await queryInterface.addColumn("shipping_zones", "zoneKey", {
      type: Sequelize.STRING(32),
      allowNull: true,
    });
    await queryInterface.addColumn("shipping_zones", "warehouseId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn("shipping_zones", "zoneType", {
      type: Sequelize.STRING(16),
      allowNull: false,
      defaultValue: "system",
    });

    await queryInterface.sequelize.query(
      'DELETE FROM "shipping_province_zones"; DELETE FROM "shipping_rates"; DELETE FROM "shipping_methods"; DELETE FROM "shipping_zones";',
    );

    for (const z of ZONE_META) {
      await queryInterface.bulkInsert("shipping_zones", [
        {
          zoneId: Z[z.key],
          name: z.name,
          sortOrder: z.sortOrder,
          zoneKey: z.key,
          warehouseId: null,
          zoneType: "system",
          createdAt: now,
          updatedAt: now,
        },
      ]);
      await queryInterface.bulkInsert("shipping_methods", [
        {
          methodId: M[z.key],
          zoneId: Z[z.key],
          code: "standard",
          name: "Tiêu chuẩn",
          createdAt: now,
          updatedAt: now,
        },
      ]);
      await queryInterface.bulkInsert("shipping_rates", [
        {
          rateId: R[z.key],
          methodId: M[z.key],
          pricingType: "flat",
          amount: z.amount,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }

    const keysPath = path.join(__dirname, "../src/data/vn/province-zone-keys.json");
    const map = JSON.parse(fs.readFileSync(keysPath, "utf8"));
    const pzRows = Object.entries(map).map(([provinceCode, zoneKey]) => ({
      provinceCode: String(provinceCode),
      zoneId: Z[zoneKey],
      createdAt: now,
      updatedAt: now,
    }));
    if (pzRows.length) {
      await queryInterface.bulkInsert("shipping_province_zones", pzRows);
    }

    await queryInterface.addIndex("shipping_zones", ["zoneKey"], {
      unique: true,
      name: "shipping_zones_zone_key_uidx",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("shipping_zones", "shipping_zones_zone_key_uidx").catch(() => {});
    await queryInterface.removeColumn("shipping_zones", "zoneType");
    await queryInterface.removeColumn("shipping_zones", "warehouseId");
    await queryInterface.removeColumn("shipping_zones", "zoneKey");
    await queryInterface.removeColumn("orders", "shippingDisplayMode");
    await queryInterface.dropTable("shipping_settings");
  },
};
