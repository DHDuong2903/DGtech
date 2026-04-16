"use strict";

/** Matches zone UUIDs from 20260416120000-shipping-v2-zones-settings-display.cjs */
const Z = {
  warehouse: "d1000001-0001-4000-8000-000000000001",
  north_near: "d1000001-0001-4000-8000-000000000002",
  north_far: "d1000001-0001-4000-8000-000000000003",
  central: "d1000001-0001-4000-8000-000000000004",
  south: "d1000001-0001-4000-8000-000000000005",
};

const ME = {
  warehouse: "e2000002-0001-4000-8000-000000000001",
  north_near: "e2000002-0001-4000-8000-000000000002",
  north_far: "e2000002-0001-4000-8000-000000000003",
  central: "e2000002-0001-4000-8000-000000000004",
  south: "e2000002-0001-4000-8000-000000000005",
};

const RE = {
  warehouse: "e2000003-0001-4000-8000-000000000001",
  north_near: "e2000003-0001-4000-8000-000000000002",
  north_far: "e2000003-0001-4000-8000-000000000003",
  central: "e2000003-0001-4000-8000-000000000004",
  south: "e2000003-0001-4000-8000-000000000005",
};

/** Standard flat amounts from seed (same as ZONE_META in v2). Express = standard + delta. */
const ZONE_META = [
  { key: "warehouse", std: 0, expressDelta: 15000 },
  { key: "north_near", std: 30000, expressDelta: 25000 },
  { key: "north_far", std: 40000, expressDelta: 25000 },
  { key: "central", std: 60000, expressDelta: 30000 },
  { key: "south", std: 80000, expressDelta: 30000 },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("shipping_methods", "enabled", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn("shipping_methods", "customerEtaNote", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("shipping_methods", "sortOrder", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("shipping_settings", "freeShippingStandardOnly", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn("orders", "shippingMethodCode", {
      type: Sequelize.STRING(32),
      allowNull: true,
    });
    await queryInterface.addColumn("orders", "shippingMethodName", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });
    await queryInterface.addColumn("orders", "shippingMethodEtaNote", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      `UPDATE "shipping_methods" SET "sortOrder" = 0, "enabled" = true WHERE "code" = 'standard';`,
    );

    const now = new Date();
    for (const z of ZONE_META) {
      const zoneId = Z[z.key];
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM "shipping_methods" WHERE "zoneId" = :zoneId AND "code" = 'express' LIMIT 1`,
        { replacements: { zoneId } },
      );
      if (rows && rows.length) continue;

      const expressAmount = z.std + z.expressDelta;
      await queryInterface.bulkInsert("shipping_methods", [
        {
          methodId: ME[z.key],
          zoneId,
          code: "express",
          name: "Nhanh",
          enabled: true,
          customerEtaNote: z.key === "warehouse" ? "Nội thành nhanh" : "Ưu tiên xử lý",
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      await queryInterface.bulkInsert("shipping_rates", [
        {
          rateId: RE[z.key],
          methodId: ME[z.key],
          pricingType: "flat",
          amount: expressAmount,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }

    await queryInterface.sequelize.query(
      `UPDATE "shipping_methods" SET "customerEtaNote" = '2–4 ngày làm việc' WHERE "code" = 'standard' AND ("customerEtaNote" IS NULL OR "customerEtaNote" = '');`,
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("orders", "shippingMethodEtaNote");
    await queryInterface.removeColumn("orders", "shippingMethodName");
    await queryInterface.removeColumn("orders", "shippingMethodCode");
    await queryInterface.removeColumn("shipping_settings", "freeShippingStandardOnly");
    await queryInterface.removeColumn("shipping_methods", "sortOrder");
    await queryInterface.removeColumn("shipping_methods", "customerEtaNote");
    await queryInterface.removeColumn("shipping_methods", "enabled");
    await queryInterface.sequelize.query(`DELETE FROM "shipping_rates" WHERE "methodId" IN (SELECT "methodId" FROM "shipping_methods" WHERE "code" = 'express');`);
    await queryInterface.sequelize.query(`DELETE FROM "shipping_methods" WHERE "code" = 'express';`);
  },
};
