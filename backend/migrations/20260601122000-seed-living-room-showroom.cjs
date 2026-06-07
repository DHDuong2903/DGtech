"use strict";

const SCENES = [
  {
    sceneId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d001",
    sceneKey: "living-room",
    name: "Living Room",
    sortOrder: 1,
    slots: [
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d101",
        slotCode: "slot-1",
        label: "Sofa Zone",
        anchorPosition: [-2.6, 0, -1.25],
        anchorRotation: [0, 0.52, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [-2.1, 0.9, -1.1],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d102",
        slotCode: "slot-2",
        label: "Coffee Table Zone",
        anchorPosition: [-0.2, 0, -0.35],
        anchorRotation: [0, 0, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [-0.1, 0.6, -0.2],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d103",
        slotCode: "slot-3",
        label: "Console Zone",
        anchorPosition: [2.4, 0, -1.55],
        anchorRotation: [0, -0.4, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [2.1, 1, -1.3],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d104",
        slotCode: "slot-4",
        label: "Accent Chair Zone",
        anchorPosition: [3.1, 0, 1.35],
        anchorRotation: [0, -1.15, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [2.6, 1.1, 1.0],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d105",
        slotCode: "slot-5",
        label: "Storage Zone",
        anchorPosition: [-3.25, 0, 1.55],
        anchorRotation: [0, 1.05, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [-2.7, 1.05, 1.1],
      },
    ],
  },
  {
    sceneId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d002",
    sceneKey: "kitchen",
    name: "Kitchen",
    sortOrder: 2,
    slots: [
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d201",
        slotCode: "slot-1",
        label: "Dining Set Zone",
        anchorPosition: [0, 0, -0.7],
        anchorRotation: [0, 0, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [0, 0.9, -0.6],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d202",
        slotCode: "slot-2",
        label: "Counter Stool Zone",
        anchorPosition: [2.35, 0, -1.8],
        anchorRotation: [0, -0.7, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [1.9, 1, -1.5],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d203",
        slotCode: "slot-3",
        label: "Storage Cabinet Zone",
        anchorPosition: [-3.1, 0, -2.2],
        anchorRotation: [0, 0.7, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [-2.4, 1.2, -1.9],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d204",
        slotCode: "slot-4",
        label: "Appliance Zone",
        anchorPosition: [-2.85, 0, 1.7],
        anchorRotation: [0, 0.85, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [-2.2, 1, 1.2],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d205",
        slotCode: "slot-5",
        label: "Accessory Zone",
        anchorPosition: [3.15, 0, 1.35],
        anchorRotation: [0, -1.0, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [2.5, 1, 1.0],
      },
    ],
  },
  {
    sceneId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d003",
    sceneKey: "bedroom",
    name: "Bedroom",
    sortOrder: 3,
    slots: [
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d301",
        slotCode: "slot-1",
        label: "Bed Zone",
        anchorPosition: [0, 0, -2.0],
        anchorRotation: [0, 0, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [0, 1.1, -1.6],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d302",
        slotCode: "slot-2",
        label: "Nightstand Zone",
        anchorPosition: [2.35, 0, -1.85],
        anchorRotation: [0, -0.55, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [1.8, 0.9, -1.55],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d303",
        slotCode: "slot-3",
        label: "Wardrobe Zone",
        anchorPosition: [-3.2, 0, -1.95],
        anchorRotation: [0, 0.55, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [-2.5, 1.2, -1.7],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d304",
        slotCode: "slot-4",
        label: "Bench Zone",
        anchorPosition: [0.1, 0, 1.1],
        anchorRotation: [0, 0, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [0.1, 0.8, 0.8],
      },
      {
        slotId: "b1f37f68-3b3f-44a3-a852-a50e2ea4d305",
        slotCode: "slot-5",
        label: "Decor Zone",
        anchorPosition: [-2.9, 0, 1.9],
        anchorRotation: [0, 0.8, 0],
        anchorScale: [1, 1, 1],
        cameraFocus: [-2.2, 1.0, 1.4],
      },
    ],
  },
];

module.exports = {
  async up(queryInterface) {
    for (const scene of SCENES) {
      await queryInterface.sequelize.query(
        `
          INSERT INTO "showroom_scenes"
            ("sceneId", "sceneKey", "name", "roomModelUrl", "roomModelPublicId", "roomModelMimeType", "roomModelFileName", "roomModelSizeBytes", "thumbnailUrl", "isActive", "sortOrder", "createdAt", "updatedAt")
          VALUES
            (:sceneId, :sceneKey, :name, NULL, NULL, NULL, NULL, NULL, NULL, true, :sortOrder, NOW(), NOW())
          ON CONFLICT ("sceneKey") DO UPDATE
          SET "name" = EXCLUDED."name",
              "isActive" = EXCLUDED."isActive",
              "sortOrder" = EXCLUDED."sortOrder",
              "updatedAt" = NOW();
        `,
        {
          replacements: {
            sceneId: scene.sceneId,
            sceneKey: scene.sceneKey,
            name: scene.name,
            sortOrder: scene.sortOrder,
          },
        },
      );

      for (const row of scene.slots) {
        await queryInterface.sequelize.query(
          `
            INSERT INTO "showroom_scene_slots"
              ("slotId", "sceneId", "slotCode", "label", "allowedCategoryId", "anchorPosition", "anchorRotation", "anchorScale", "cameraFocus", "isActive", "createdAt", "updatedAt")
            VALUES
              (:slotId, :sceneId, :slotCode, :label, NULL, CAST(:anchorPosition AS jsonb), CAST(:anchorRotation AS jsonb), CAST(:anchorScale AS jsonb), CAST(:cameraFocus AS jsonb), true, NOW(), NOW())
            ON CONFLICT ("sceneId", "slotCode") DO UPDATE
            SET "label" = EXCLUDED."label",
                "anchorPosition" = EXCLUDED."anchorPosition",
                "anchorRotation" = EXCLUDED."anchorRotation",
                "anchorScale" = EXCLUDED."anchorScale",
                "cameraFocus" = EXCLUDED."cameraFocus",
                "updatedAt" = NOW();
          `,
          {
            replacements: {
              slotId: row.slotId,
              sceneId: scene.sceneId,
              slotCode: row.slotCode,
              label: row.label,
              anchorPosition: JSON.stringify(row.anchorPosition),
              anchorRotation: JSON.stringify(row.anchorRotation),
              anchorScale: JSON.stringify(row.anchorScale),
              cameraFocus: JSON.stringify(row.cameraFocus),
            },
          },
        );
      }
    }
  },

  async down(queryInterface) {
    const sceneIds = SCENES.map((scene) => scene.sceneId);
    await queryInterface.bulkDelete("showroom_scene_slots", { sceneId: sceneIds });
    await queryInterface.bulkDelete("showroom_scenes", { sceneId: sceneIds });
  },
};
