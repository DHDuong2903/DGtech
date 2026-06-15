// @ts-nocheck
import { randomUUID } from "crypto";
import { QueryTypes } from "sequelize";
import { sequelize } from "../libs/db.js";
import { Category } from "../models/associationsModel.js";
import { Room } from "../models/roomModel.js";
import { destroyCloudinaryAsset, uploadShowroomRoomBuffer } from "../helpers/uploadProductMedia.js";

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function withAssetVersion(url: unknown, version: unknown) {
  if (typeof url !== "string" || !url.trim()) return null;
  const normalizedUrl = url.trim();
  const normalizedVersion = String(version ?? "").trim();
  if (!normalizedVersion) return normalizedUrl;
  const separator = normalizedUrl.includes("?") ? "&" : "?";
  return `${normalizedUrl}${separator}v=${encodeURIComponent(normalizedVersion)}`;
}

function normalizeSceneRow(row: any) {
  return {
    sceneId: row.sceneId,
    sceneKey: row.sceneKey,
    name: row.name,
    roomId: row.roomId == null ? null : Number(row.roomId),
    room:
      row.roomId && row.roomName
        ? { roomId: Number(row.roomId), name: row.roomName, description: row.roomDescription ?? "" }
        : null,
    roomModelStorageUrl: row.roomModelUrl ?? null,
    roomModelUrl: withAssetVersion(row.roomModelUrl, row.updatedAt ?? row.roomModelPublicId ?? row.roomModelFileName),
    roomModelPublicId: row.roomModelPublicId ?? null,
    roomModelMimeType: row.roomModelMimeType ?? null,
    roomModelFileName: row.roomModelFileName ?? null,
    roomModelSizeBytes: row.roomModelSizeBytes == null ? null : Number(row.roomModelSizeBytes),
    thumbnailUrl: row.thumbnailUrl ?? null,
    isActive: Boolean(row.isActive),
    sortOrder: Number(row.sortOrder || 0),
    isReadyForStorefront: Boolean(row.roomModelUrl && row.isActive),
    positionsCount: row.positionsCount == null ? undefined : Number(row.positionsCount),
  };
}

function normalizeSlotRow(row: any) {
  return {
    slotId: row.slotId,
    sceneId: row.sceneId,
    slotCode: row.slotCode,
    label: row.label,
    allowedCategoryId: row.allowedCategoryId == null ? null : Number(row.allowedCategoryId),
    allowedCategory: row.allowedCategoryId
      ? { categoryId: Number(row.allowedCategoryId), name: row.allowedCategoryName }
      : null,
    anchorPosition: row.anchorPosition ?? [0, 0, 0],
    anchorRotation: row.anchorRotation ?? [0, 0, 0],
    anchorScale: row.anchorScale ?? [1, 1, 1],
    cameraFocus: row.cameraFocus ?? [0, 0, 0],
    isActive: Boolean(row.isActive),
  };
}

function normalizeEligibleProduct(row: any) {
  return {
    productId: row.productId,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    model3dUrl: row.model3dUrl,
    categoryId: Number(row.categoryId),
    category: row.categoryId
      ? {
          categoryId: Number(row.categoryId),
          name: row.categoryName,
        }
      : null,
    price: Number(row.price || 0),
    compareAtPrice: row.compareAtPrice == null ? null : Number(row.compareAtPrice),
    stock: Number(row.stock || 0),
    status: row.status,
    showroomEligible: true,
  };
}

function normalizeSavedSetupRow(row: any) {
  const selectedBySlot =
    row?.selectedBySlot && typeof row.selectedBySlot === "object" && !Array.isArray(row.selectedBySlot)
      ? row.selectedBySlot
      : {};

  return {
    setupId: row.setupId,
    sceneId: row.sceneId,
    clerkId: row.clerkId,
    selectedBySlot,
    updatedAt: row.updatedAt,
  };
}

function parseSlotsPayload(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw Object.assign(new Error("Invalid slots payload"), { status: 400 });
    }
  }
  return [];
}

function normalizeSelectedBySlotPayload(value: unknown) {
  const raw =
    typeof value === "string" && value.trim().length > 0
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            throw Object.assign(new Error("Invalid selectedBySlot payload"), { status: 400 });
          }
        })()
      : value;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [slotId, productId] of Object.entries(raw as Record<string, unknown>)) {
    const normalizedSlotId = String(slotId ?? "").trim();
    const normalizedProductId = String(productId ?? "").trim();
    if (!normalizedSlotId || !normalizedProductId) continue;
    normalized[normalizedSlotId] = normalizedProductId;
  }
  return normalized;
}

function normalizeCategoryId(value: unknown) {
  if (value === null || value === "" || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw Object.assign(new Error("Invalid category selection"), { status: 400 });
  }
  return parsed;
}

function normalizeRoomId(value: unknown) {
  if (value === null || value === "" || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw Object.assign(new Error("Invalid room selection"), { status: 400 });
  }
  return parsed;
}

function normalizeSceneName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlotLabel(value: unknown, fallbackIndex: number) {
  const label = typeof value === "string" ? value.trim() : "";
  return label.length > 0 ? label : `Slot ${fallbackIndex + 1}`;
}

function slugifySceneKey(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);

  return base || "scene";
}

function buildSlotCode(index: number) {
  return `slot-${String(index + 1).padStart(2, "0")}`;
}

function markerSuffix(name: string, prefix: string) {
  return name.slice(prefix.length).trim();
}

function markerNameToSlotCode(name: string) {
  return markerSuffix(name, "SLOT_")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function markerNameToLabel(name: string) {
  const raw = markerSuffix(name, "SLOT_");
  if (!raw) return "Position";
  return raw
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeLookupKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function roundTransform(value: number) {
  return Math.round(value * 1000) / 1000;
}

function quaternionToEulerXYZ([x, y, z, w]: [number, number, number, number]) {
  const sinrCosp = 2 * (w * x + y * z);
  const cosrCosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinrCosp, cosrCosp);

  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * (Math.PI / 2) : Math.asin(sinp);

  const sinyCosp = 2 * (w * z + x * y);
  const cosyCosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(sinyCosp, cosyCosp);

  return [roll, pitch, yaw].map(roundTransform) as [number, number, number];
}

function decomposeGlTfMatrix(matrix: number[]) {
  if (!Array.isArray(matrix) || matrix.length !== 16) return null;
  const translation: [number, number, number] = [matrix[12], matrix[13], matrix[14]].map(roundTransform) as [
    number,
    number,
    number,
  ];

  const sx = Math.hypot(matrix[0], matrix[1], matrix[2]) || 1;
  const sy = Math.hypot(matrix[4], matrix[5], matrix[6]) || 1;
  const sz = Math.hypot(matrix[8], matrix[9], matrix[10]) || 1;
  const scale: [number, number, number] = [roundTransform(sx), roundTransform(sy), roundTransform(sz)];

  const m00 = matrix[0] / sx;
  const m01 = matrix[4] / sy;
  const m02 = matrix[8] / sz;
  const m10 = matrix[1] / sx;
  const m11 = matrix[5] / sy;
  const m12 = matrix[9] / sz;
  const m20 = matrix[2] / sx;
  const m21 = matrix[6] / sy;
  const m22 = matrix[10] / sz;

  const trace = m00 + m11 + m22;
  let x = 0;
  let y = 0;
  let z = 0;
  let w = 1;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (m21 - m12) * s;
    y = (m02 - m20) * s;
    z = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }

  return {
    translation,
    scale,
    rotation: quaternionToEulerXYZ([x, y, z, w]),
  };
}

function buildSlotTransforms(index: number) {
  const columns = 3;
  const gapX = 3.2;
  const gapZ = 3.6;
  const columnIndex = index % columns;
  const rowIndex = Math.floor(index / columns);
  const x = roundTransform((columnIndex - 1) * gapX);
  const z = roundTransform(rowIndex * gapZ - 0.9);

  return {
    anchorPosition: [x, 0, z],
    anchorRotation: [0, 0, 0],
    anchorScale: [1, 1, 1],
    cameraFocus: [x, 1.1, z],
  };
}

function readGlbJsonChunk(buffer: Buffer) {
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  if (magic !== 0x46546c67) throw Object.assign(new Error("Invalid GLB file"), { status: 400 });
  if (version !== 2) throw Object.assign(new Error(`Unsupported GLB version: ${version}`), { status: 400 });

  let offset = 12;
  while (offset < length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    offset += 8;
    const chunkData = buffer.subarray(offset, offset + chunkLength);
    offset += chunkLength;
    if (chunkType === 0x4e4f534a) {
      return JSON.parse(chunkData.toString("utf8"));
    }
  }

  throw Object.assign(new Error("GLB JSON chunk not found"), { status: 400 });
}

async function fetchGlbJsonFromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw Object.assign(new Error(`Could not fetch room model (${response.status})`), { status: 400 });
  }
  const arrayBuffer = await response.arrayBuffer();
  return readGlbJsonChunk(Buffer.from(arrayBuffer));
}

function slotFocusFromPosition(position: [number, number, number]) {
  return [position[0], roundTransform(Math.max(position[1], 0.9)), position[2]] as [number, number, number];
}

function extractSlotMarkersFromGlbJson(json: any) {
  const nodes = Array.isArray(json?.nodes) ? json.nodes : [];
  return nodes
    .filter((node: any) => typeof node?.name === "string" && node.name.startsWith("SLOT_"))
    .map((node: any) => {
      const matrixDecomposition = Array.isArray(node.matrix) ? decomposeGlTfMatrix(node.matrix) : null;
      const anchorPosition = matrixDecomposition?.translation
        ?? (Array.isArray(node.translation) && node.translation.length === 3
          ? (node.translation.map(roundTransform) as [number, number, number])
          : ([0, 0, 0] as [number, number, number]));
      const anchorScale = matrixDecomposition?.scale
        ?? (Array.isArray(node.scale) && node.scale.length === 3
          ? (node.scale.map(roundTransform) as [number, number, number])
          : ([1, 1, 1] as [number, number, number]));
      const anchorRotation = matrixDecomposition?.rotation
        ?? (Array.isArray(node.rotation) && node.rotation.length === 4
          ? quaternionToEulerXYZ(node.rotation as [number, number, number, number])
          : ([0, 0, 0] as [number, number, number]));

      return {
        markerName: node.name,
        slotCode: markerNameToSlotCode(node.name),
        label: markerNameToLabel(node.name),
        anchorPosition,
        anchorRotation,
        anchorScale,
        cameraFocus: slotFocusFromPosition(anchorPosition),
      };
    })
    .sort((a, b) => a.markerName.localeCompare(b.markerName));
}

async function loadSlotMarkersFromRoomModel(roomModelFile?: any, roomModelUrl?: string | null) {
  if (roomModelFile?.buffer) {
    const json = readGlbJsonChunk(roomModelFile.buffer);
    return extractSlotMarkersFromGlbJson(json);
  }
  if (roomModelUrl) {
    const json = await fetchGlbJsonFromUrl(roomModelUrl);
    return extractSlotMarkersFromGlbJson(json);
  }
  return [];
}

async function buildPersistedSlots({
  slots,
  sceneId,
  roomModelFile,
  roomModelUrl,
  existingSlots = [],
}: {
  slots: any[];
  sceneId: string;
  roomModelFile?: any;
  roomModelUrl?: string | null;
  existingSlots?: any[];
}) {
  const slotMarkers = await loadSlotMarkersFromRoomModel(roomModelFile, roomModelUrl);
  const existingByCode = new Map(existingSlots.map((slot) => [String(slot.slotCode || ""), slot]));
  const existingByLabel = new Map(existingSlots.map((slot) => [normalizeLookupKey(slot.label), slot]));
  const incomingByLabel = new Map(slots.map((slot) => [normalizeLookupKey(slot.label), slot]));

  if (slotMarkers.length > 0) {
    return slotMarkers.map((marker, index) => {
      const existingSlot = existingByCode.get(marker.slotCode) || existingByLabel.get(normalizeLookupKey(marker.label));
      const incomingSlot = incomingByLabel.get(normalizeLookupKey(marker.label));
      return {
        slotId: existingSlot?.slotId || incomingSlot?.slotId || randomUUID(),
        sceneId,
        slotCode: marker.slotCode || buildSlotCode(index),
        label: existingSlot?.label || incomingSlot?.label || marker.label,
        allowedCategoryId:
          incomingSlot?.allowedCategoryId ?? existingSlot?.allowedCategoryId ?? null,
        anchorPosition: marker.anchorPosition,
        anchorRotation: marker.anchorRotation,
        anchorScale: marker.anchorScale,
        cameraFocus: marker.cameraFocus,
        isActive: true,
      };
    });
  }

  return slots.map((slot, index) => {
    const transforms = buildSlotTransforms(index);
    const existingSlot = existingSlots.find((item) => item.slotId === slot.slotId) || null;
    return {
      slotId: existingSlot?.slotId || slot.slotId || randomUUID(),
      sceneId,
      slotCode: existingSlot?.slotCode || buildSlotCode(index),
      label: slot.label,
      allowedCategoryId: slot.allowedCategoryId,
      anchorPosition: transforms.anchorPosition,
      anchorRotation: transforms.anchorRotation,
      anchorScale: transforms.anchorScale,
      cameraFocus: transforms.cameraFocus,
      isActive: true,
    };
  });
}

async function ensureUniqueSceneKey(baseKey: string, excludeSceneId?: string | null) {
  let suffix = 1;
  let candidate = baseKey;

  while (true) {
    const rows = await sequelize.query(
      `
        SELECT "sceneId"
        FROM "showroom_scenes"
        WHERE "sceneKey" = :sceneKey
          ${excludeSceneId ? 'AND "sceneId" <> :excludeSceneId' : ""}
        LIMIT 1
      `,
      {
        replacements: excludeSceneId ? { sceneKey: candidate, excludeSceneId } : { sceneKey: candidate },
        type: QueryTypes.SELECT,
      },
    );

    if (!(rows as any[])[0]) return candidate;
    suffix += 1;
    candidate = `${baseKey}-${suffix}`;
  }
}

async function getNextSceneSortOrder(transaction?: any) {
  const rows = await sequelize.query(
    `
      SELECT COALESCE(MAX("sortOrder"), -1) AS "maxSortOrder"
      FROM "showroom_scenes"
    `,
    {
      type: QueryTypes.SELECT,
      transaction,
    },
  );

  const maxSortOrder = Number((rows as any[])[0]?.maxSortOrder ?? -1);
  return maxSortOrder + 1;
}

async function validateIncomingSlots(slots: any[]) {
  for (const slot of slots) {
    const nextCategoryId = normalizeCategoryId(slot.allowedCategoryId);
    await validateCategoryIfNeeded(nextCategoryId);
  }
}

function normalizeIncomingSlots(slots: any[]) {
  return slots.map((slot, index) => ({
    slotId:
      typeof slot.slotId === "string" && slot.slotId.trim().length > 0 && !slot.slotId.startsWith("temp-")
        ? slot.slotId.trim()
        : null,
    label: normalizeSlotLabel(slot.label, index),
    allowedCategoryId: normalizeCategoryId(slot.allowedCategoryId),
    isActive: true,
  }));
}

async function loadSceneById(sceneId: string) {
  const rows = await sequelize.query(
    `
      SELECT
        s."sceneId",
        s."sceneKey",
        s."name",
        s."roomId",
        s."roomModelUrl",
        s."roomModelPublicId",
        s."roomModelMimeType",
        s."roomModelFileName",
        s."roomModelSizeBytes",
        s."thumbnailUrl",
        s."isActive",
        s."sortOrder",
        s."updatedAt",
        r."name" AS "roomName",
        r."description" AS "roomDescription",
        (
          SELECT COUNT(*)
          FROM "showroom_scene_slots" slot
          WHERE slot."sceneId" = s."sceneId"
        ) AS "positionsCount"
      FROM "showroom_scenes" s
      LEFT JOIN "rooms" r ON r."roomId" = s."roomId"
      WHERE s."sceneId" = :sceneId
      LIMIT 1
    `,
    {
      replacements: { sceneId },
      type: QueryTypes.SELECT,
    },
  );

  return (rows as any[])[0] ? normalizeSceneRow((rows as any[])[0]) : null;
}

async function loadSceneByKey(sceneKey: string, onlyStorefrontReady: boolean) {
  const rows = await sequelize.query(
    `
      SELECT
        s."sceneId",
        s."sceneKey",
        s."name",
        s."roomId",
        s."roomModelUrl",
        s."roomModelPublicId",
        s."roomModelMimeType",
        s."roomModelFileName",
        s."roomModelSizeBytes",
        s."thumbnailUrl",
        s."isActive",
        s."sortOrder",
        s."updatedAt",
        r."name" AS "roomName",
        r."description" AS "roomDescription",
        (
          SELECT COUNT(*)
          FROM "showroom_scene_slots" slot
          WHERE slot."sceneId" = s."sceneId"
        ) AS "positionsCount"
      FROM "showroom_scenes" s
      LEFT JOIN "rooms" r ON r."roomId" = s."roomId"
      WHERE s."sceneKey" = :sceneKey
        ${onlyStorefrontReady ? 'AND s."isActive" = true AND s."roomModelUrl" IS NOT NULL' : ""}
      LIMIT 1
    `,
    {
      replacements: { sceneKey },
      type: QueryTypes.SELECT,
    },
  );

  return (rows as any[])[0] ? normalizeSceneRow((rows as any[])[0]) : null;
}

async function loadSceneSlots(sceneId: string, includeInactive = false) {
  const rows = await sequelize.query(
    `
      SELECT
        s."slotId",
        s."sceneId",
        s."slotCode",
        s."label",
        s."allowedCategoryId",
        s."anchorPosition",
        s."anchorRotation",
        s."anchorScale",
        s."cameraFocus",
        s."isActive",
        c."name" AS "allowedCategoryName"
      FROM "showroom_scene_slots" s
      LEFT JOIN "categories" c ON c."categoryId" = s."allowedCategoryId"
      WHERE s."sceneId" = :sceneId
        ${includeInactive ? "" : 'AND s."isActive" = true'}
      ORDER BY s."slotCode" ASC
    `,
    {
      replacements: { sceneId },
      type: QueryTypes.SELECT,
    },
  );

  return (rows as any[]).map(normalizeSlotRow);
}

async function loadSceneSlotIds(sceneId: string) {
  const rows = await sequelize.query(
    `
      SELECT "slotId"
      FROM "showroom_scene_slots"
      WHERE "sceneId" = :sceneId
    `,
    {
      replacements: { sceneId },
      type: QueryTypes.SELECT,
    },
  );

  return new Set((rows as any[]).map((row) => String(row.slotId)));
}

async function loadSceneSlotsBySceneId(sceneId: string, transaction?: any) {
  const rows = await sequelize.query(
    `
      SELECT "slotId"
      FROM "showroom_scene_slots"
      WHERE "sceneId" = :sceneId
    `,
    {
      replacements: { sceneId },
      type: QueryTypes.SELECT,
      transaction,
    },
  );

  return new Set((rows as any[]).map((row) => String(row.slotId)));
}

async function loadAllScenesWithSlots() {
  const sceneRows = (await sequelize.query(
    `
      SELECT
        s."sceneId",
        s."sceneKey",
        s."name",
        s."roomId",
        s."roomModelUrl",
        s."roomModelPublicId",
        s."roomModelMimeType",
        s."roomModelFileName",
        s."roomModelSizeBytes",
        s."thumbnailUrl",
        s."isActive",
        s."sortOrder",
        s."updatedAt",
        r."name" AS "roomName",
        r."description" AS "roomDescription",
        (
          SELECT COUNT(*)
          FROM "showroom_scene_slots" slot
          WHERE slot."sceneId" = s."sceneId"
        ) AS "positionsCount"
      FROM "showroom_scenes" s
      LEFT JOIN "rooms" r ON r."roomId" = s."roomId"
      ORDER BY s."sortOrder" ASC, s."createdAt" ASC
    `,
    { type: QueryTypes.SELECT },
  )) as any[];

  const slotRows = (await sequelize.query(
    `
      SELECT
        s."slotId",
        s."sceneId",
        s."slotCode",
        s."label",
        s."allowedCategoryId",
        s."anchorPosition",
        s."anchorRotation",
        s."anchorScale",
        s."cameraFocus",
        s."isActive",
        c."name" AS "allowedCategoryName"
      FROM "showroom_scene_slots" s
      LEFT JOIN "categories" c ON c."categoryId" = s."allowedCategoryId"
      ORDER BY s."sceneId" ASC, s."slotCode" ASC
    `,
    { type: QueryTypes.SELECT },
  )) as any[];

  const slotsByScene = new Map<string, any[]>();
  for (const row of slotRows) {
    const sceneId = String(row.sceneId);
    if (!slotsByScene.has(sceneId)) slotsByScene.set(sceneId, []);
    slotsByScene.get(sceneId)!.push(normalizeSlotRow(row));
  }

  return sceneRows.map((sceneRow) => {
    const scene = normalizeSceneRow(sceneRow);
    return {
      ...scene,
      slots: slotsByScene.get(scene.sceneId) ?? [],
    };
  });
}

async function loadStorefrontScenes() {
  const rows = await sequelize.query(
    `
      SELECT
        s."sceneId",
        s."sceneKey",
        s."name",
        s."roomId",
        s."roomModelUrl",
        s."roomModelPublicId",
        s."roomModelMimeType",
        s."roomModelFileName",
        s."roomModelSizeBytes",
        s."thumbnailUrl",
        s."isActive",
        s."sortOrder",
        s."updatedAt",
        r."name" AS "roomName",
        r."description" AS "roomDescription",
        (
          SELECT COUNT(*)
          FROM "showroom_scene_slots" slot
          WHERE slot."sceneId" = s."sceneId"
        ) AS "positionsCount"
      FROM "showroom_scenes" s
      LEFT JOIN "rooms" r ON r."roomId" = s."roomId"
      WHERE s."isActive" = true
        AND s."roomModelUrl" IS NOT NULL
      ORDER BY s."sortOrder" ASC, s."createdAt" ASC
    `,
    { type: QueryTypes.SELECT },
  );

  return (rows as any[]).map(normalizeSceneRow);
}

async function loadEligibleProductsForScene(sceneId: string) {
  const rows = await sequelize.query(
    `
      SELECT DISTINCT
        p."productId",
        p."name",
        p."description",
        p."imageUrl",
        p."model3dUrl",
        p."categoryId",
        p."price",
        p."compareAtPrice",
        p."stock",
        p."status",
        c."name" AS "categoryName"
      FROM "products" p
      INNER JOIN "showroom_scene_slots" slot
        ON slot."sceneId" = :sceneId
       AND slot."isActive" = true
       AND slot."allowedCategoryId" = p."categoryId"
      LEFT JOIN "categories" c ON c."categoryId" = p."categoryId"
      WHERE p."status" = 'ACTIVE'
        AND p."model3dUrl" IS NOT NULL
      ORDER BY p."name" ASC
    `,
    {
      replacements: { sceneId },
      type: QueryTypes.SELECT,
    },
  );

  return (rows as any[]).map(normalizeEligibleProduct);
}

async function loadSavedSetupForScene(clerkId: string, sceneId: string) {
  const rows = await sequelize.query(
    `
      SELECT
        "setupId",
        "sceneId",
        "clerkId",
        "selectedBySlot",
        "updatedAt"
      FROM "showroom_saved_setups"
      WHERE "clerkId" = :clerkId
        AND "sceneId" = :sceneId
      LIMIT 1
    `,
    {
      replacements: { clerkId, sceneId },
      type: QueryTypes.SELECT,
    },
  );

  return (rows as any[])[0] ? normalizeSavedSetupRow((rows as any[])[0]) : null;
}

function sanitizeSelectedBySlot(selectedBySlot: Record<string, string>, slots: any[], eligibleProducts: any[]) {
  const activeSlots = new Map(slots.filter((slot) => slot.isActive).map((slot) => [slot.slotId, slot]));
  const productsById = new Map(eligibleProducts.map((product) => [product.productId, product]));
  const seenProducts = new Set<string>();
  const sanitized: Record<string, string> = {};

  for (const [slotId, productId] of Object.entries(selectedBySlot || {})) {
    const slot = activeSlots.get(slotId);
    const product = productsById.get(productId);
    if (!slot || !product) continue;
    if (slot.allowedCategoryId == null || slot.allowedCategoryId !== product.categoryId) continue;
    if (seenProducts.has(productId)) continue;
    sanitized[slotId] = productId;
    seenProducts.add(productId);
  }

  return sanitized;
}

async function validateCategoryIfNeeded(categoryId: number | null) {
  if (categoryId == null) return;
  const category = await Category.findByPk(categoryId);
  if (!category) {
    throw Object.assign(new Error("Category not found"), { status: 404 });
  }
}

async function validateRoomIfNeeded(roomId: number | null) {
  if (roomId == null) return;
  const room = await Room.findByPk(roomId);
  if (!room) {
    throw Object.assign(new Error("Room not found"), { status: 404 });
  }
}

export async function getGoldShowroomScenes() {
  const scenes = await loadStorefrontScenes();
  return { message: "Showroom scenes retrieved successfully", scenes };
}

export async function getGoldShowroomSceneByKey(sceneKey: string, clerkId?: string | null) {
  const scene = await loadSceneByKey(sceneKey, true);
  if (!scene) throw Object.assign(new Error("Showroom scene not found"), { status: 404 });

  const [slots, eligibleProducts, savedSetup] = await Promise.all([
    loadSceneSlots(scene.sceneId, false),
    loadEligibleProductsForScene(scene.sceneId),
    clerkId ? loadSavedSetupForScene(clerkId, scene.sceneId) : Promise.resolve(null),
  ]);

  const sanitizedSavedSelection = sanitizeSelectedBySlot(savedSetup?.selectedBySlot ?? {}, slots, eligibleProducts);

  return {
    message: "Showroom scene retrieved successfully",
    scene,
    slots,
    eligibleProducts,
    savedSetup: savedSetup
      ? {
          ...savedSetup,
          selectedBySlot: sanitizedSavedSelection,
        }
      : null,
  };
}

export async function saveGoldShowroomSceneSetup(
  clerkId: string | null | undefined,
  sceneKey: string,
  body: Record<string, unknown>,
) {
  if (!clerkId) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const scene = await loadSceneByKey(sceneKey, true);
  if (!scene) throw Object.assign(new Error("Showroom scene not found"), { status: 404 });

  const [slots, eligibleProducts, existingSetup] = await Promise.all([
    loadSceneSlots(scene.sceneId, false),
    loadEligibleProductsForScene(scene.sceneId),
    loadSavedSetupForScene(clerkId, scene.sceneId),
  ]);

  const selectedBySlot = sanitizeSelectedBySlot(
    normalizeSelectedBySlotPayload(body.selectedBySlot),
    slots,
    eligibleProducts,
  );

  if (existingSetup) {
    await sequelize.query(
      `
        UPDATE "showroom_saved_setups"
        SET
          "selectedBySlot" = CAST(:selectedBySlot AS jsonb),
          "updatedAt" = NOW()
        WHERE "setupId" = :setupId
      `,
      {
        replacements: {
          setupId: existingSetup.setupId,
          selectedBySlot: JSON.stringify(selectedBySlot),
        },
        type: QueryTypes.UPDATE,
      },
    );
  } else {
    await sequelize.query(
      `
        INSERT INTO "showroom_saved_setups" (
          "setupId",
          "clerkId",
          "sceneId",
          "selectedBySlot",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          :setupId,
          :clerkId,
          :sceneId,
          CAST(:selectedBySlot AS jsonb),
          NOW(),
          NOW()
        )
      `,
      {
        replacements: {
          setupId: randomUUID(),
          clerkId,
          sceneId: scene.sceneId,
          selectedBySlot: JSON.stringify(selectedBySlot),
        },
        type: QueryTypes.INSERT,
      },
    );
  }

  const savedSetup = await loadSavedSetupForScene(clerkId, scene.sceneId);
  return {
    message: "Showroom setup saved successfully",
    savedSetup: savedSetup
      ? {
          ...savedSetup,
          selectedBySlot,
        }
      : null,
  };
}

export async function getAdminShowroomScenes() {
  const scenes = await loadAllScenesWithSlots();
  return { message: "Admin showroom scenes retrieved successfully", scenes };
}

export async function getAdminShowroomSceneById(sceneId: string) {
  const scene = await loadSceneById(sceneId);
  if (!scene) {
    throw Object.assign(new Error("Showroom scene not found"), { status: 404 });
  }

  const slots = await loadSceneSlots(sceneId, true);
  return {
    message: "Admin showroom scene retrieved successfully",
    scene: {
      ...scene,
      slots,
      positionsCount: slots.length,
    },
  };
}

export async function createAdminShowroomScene(body: Record<string, unknown>, roomModelFile?: any) {
  const nextName = normalizeSceneName(body.name);
  if (!nextName) {
    throw Object.assign(new Error("Scene name is required"), { status: 400 });
  }
  const nextRoomId = normalizeRoomId(body.roomId);
  await validateRoomIfNeeded(nextRoomId);

  const incomingSlots = normalizeIncomingSlots(parseSlotsPayload(body.slots));
  await validateIncomingSlots(incomingSlots);

  let uploadedRoomModel: null | { secureUrl: string; publicId: string; bytes: number | null } = null;
  let sceneId = randomUUID();
  const persistedSlots = await buildPersistedSlots({
    slots: incomingSlots,
    sceneId,
    roomModelFile,
  });
  if (roomModelFile?.buffer) {
    uploadedRoomModel = await uploadShowroomRoomBuffer(roomModelFile.buffer, roomModelFile.originalname);
  }

  const transaction = await sequelize.transaction();
  try {
    const sceneKey = await ensureUniqueSceneKey(slugifySceneKey(nextName));
    const sortOrder = await getNextSceneSortOrder(transaction);
    const isActive = body.isActive === undefined ? true : normalizeBoolean(body.isActive);

    await sequelize.query(
      `
        INSERT INTO "showroom_scenes" (
          "sceneId",
          "sceneKey",
          "name",
          "roomId",
          "roomModelUrl",
          "roomModelPublicId",
          "roomModelMimeType",
          "roomModelFileName",
          "roomModelSizeBytes",
          "thumbnailUrl",
          "isActive",
          "sortOrder",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          :sceneId,
          :sceneKey,
          :name,
          :roomId,
          :roomModelUrl,
          :roomModelPublicId,
          :roomModelMimeType,
          :roomModelFileName,
          :roomModelSizeBytes,
          NULL,
          :isActive,
          :sortOrder,
          NOW(),
          NOW()
        )
      `,
      {
        replacements: {
          sceneId,
          sceneKey,
          name: nextName,
          roomId: nextRoomId,
          roomModelUrl: uploadedRoomModel?.secureUrl ?? null,
          roomModelPublicId: uploadedRoomModel?.publicId ?? null,
          roomModelMimeType: roomModelFile?.mimetype || (uploadedRoomModel ? "model/gltf-binary" : null),
          roomModelFileName: roomModelFile?.originalname || null,
          roomModelSizeBytes: uploadedRoomModel ? Number(roomModelFile?.size || uploadedRoomModel.bytes || 0) || null : null,
          isActive,
          sortOrder,
        },
        type: QueryTypes.INSERT,
        transaction,
      },
    );

    for (const slot of persistedSlots) {
      await sequelize.query(
        `
          INSERT INTO "showroom_scene_slots" (
            "slotId",
            "sceneId",
            "slotCode",
            "label",
            "allowedCategoryId",
            "anchorPosition",
            "anchorRotation",
            "anchorScale",
            "cameraFocus",
            "isActive",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            :slotId,
            :sceneId,
            :slotCode,
            :label,
            :allowedCategoryId,
            CAST(:anchorPosition AS jsonb),
            CAST(:anchorRotation AS jsonb),
            CAST(:anchorScale AS jsonb),
            CAST(:cameraFocus AS jsonb),
            :isActive,
            NOW(),
            NOW()
          )
        `,
        {
          replacements: {
            slotId: slot.slotId,
            sceneId,
            slotCode: slot.slotCode,
            label: slot.label,
            allowedCategoryId: slot.allowedCategoryId,
            anchorPosition: JSON.stringify(slot.anchorPosition),
            anchorRotation: JSON.stringify(slot.anchorRotation),
            anchorScale: JSON.stringify(slot.anchorScale),
            cameraFocus: JSON.stringify(slot.cameraFocus),
            isActive: slot.isActive,
          },
          type: QueryTypes.INSERT,
          transaction,
        },
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    if (uploadedRoomModel?.publicId) {
      await destroyCloudinaryAsset(uploadedRoomModel.publicId, "raw");
    }
    throw error;
  }

  const scenes = await loadAllScenesWithSlots();
  const createdScene = scenes.find((item) => item.sceneId === sceneId) ?? null;
  return { message: "Showroom scene created successfully", scene: createdScene };
}

export async function updateAdminShowroomScene(
  sceneId: string,
  body: Record<string, unknown>,
  roomModelFile?: any,
) {
  const scene = await loadSceneById(sceneId);
  if (!scene) throw Object.assign(new Error("Showroom scene not found"), { status: 404 });
  const existingSlots = await loadSceneSlots(sceneId, true);

  const slots = normalizeIncomingSlots(parseSlotsPayload(body.slots));
  await validateIncomingSlots(slots);

  const removeRoomModel = normalizeBoolean(body.removeRoomModel);
  let nextRoomModelUrl = scene.roomModelStorageUrl ?? scene.roomModelUrl;
  let nextRoomModelPublicId = scene.roomModelPublicId;
  let nextRoomModelMimeType = scene.roomModelMimeType;
  let nextRoomModelFileName = scene.roomModelFileName;
  let nextRoomModelSizeBytes = scene.roomModelSizeBytes;
  let uploadedReplacement: null | { secureUrl: string; publicId: string; bytes: number | null } = null;
  let oldRoomModelPublicIdToDestroy: string | null = null;

  if (roomModelFile?.buffer) {
    uploadedReplacement = await uploadShowroomRoomBuffer(roomModelFile.buffer, roomModelFile.originalname);
    oldRoomModelPublicIdToDestroy = scene.roomModelPublicId ?? null;
    nextRoomModelUrl = uploadedReplacement.secureUrl;
    nextRoomModelPublicId = uploadedReplacement.publicId;
    nextRoomModelMimeType = roomModelFile.mimetype || "model/gltf-binary";
    nextRoomModelFileName = roomModelFile.originalname || null;
    nextRoomModelSizeBytes = Number(roomModelFile.size || uploadedReplacement.bytes || 0) || null;
  } else if (removeRoomModel) {
    oldRoomModelPublicIdToDestroy = scene.roomModelPublicId ?? null;
    nextRoomModelUrl = null;
    nextRoomModelPublicId = null;
    nextRoomModelMimeType = null;
    nextRoomModelFileName = null;
    nextRoomModelSizeBytes = null;
  }

  const nextName = normalizeSceneName(body.name) || scene.name;
  const nextRoomId = body.roomId === undefined ? scene.roomId : normalizeRoomId(body.roomId);
  await validateRoomIfNeeded(nextRoomId);
  const nextIsActive = body.isActive === undefined ? scene.isActive : normalizeBoolean(body.isActive);
  const persistedSlots = await buildPersistedSlots({
    slots,
    sceneId,
    roomModelFile,
    roomModelUrl: roomModelFile?.buffer ? null : nextRoomModelUrl,
    existingSlots,
  });

  const transaction = await sequelize.transaction();
  try {
    const existingSlotIds = await loadSceneSlotsBySceneId(sceneId, transaction);
    await sequelize.query(
      `
        UPDATE "showroom_scenes"
        SET
          "name" = :name,
          "roomId" = :roomId,
          "roomModelUrl" = :roomModelUrl,
          "roomModelPublicId" = :roomModelPublicId,
          "roomModelMimeType" = :roomModelMimeType,
          "roomModelFileName" = :roomModelFileName,
          "roomModelSizeBytes" = :roomModelSizeBytes,
          "isActive" = :isActive,
          "updatedAt" = NOW()
        WHERE "sceneId" = :sceneId
      `,
      {
        replacements: {
          sceneId,
          name: nextName,
          roomId: nextRoomId,
          roomModelUrl: nextRoomModelUrl,
          roomModelPublicId: nextRoomModelPublicId,
          roomModelMimeType: nextRoomModelMimeType,
          roomModelFileName: nextRoomModelFileName,
          roomModelSizeBytes: nextRoomModelSizeBytes,
          isActive: nextIsActive,
        },
        type: QueryTypes.UPDATE,
        transaction,
      },
    );

    const keptSlotIds: string[] = [];
    for (const slot of persistedSlots) {
      const slotId = slot.slotId && existingSlotIds.has(slot.slotId) ? slot.slotId : randomUUID();
      keptSlotIds.push(slotId);

      if (existingSlotIds.has(slotId)) {
        await sequelize.query(
          `
            UPDATE "showroom_scene_slots"
            SET
              "slotCode" = :slotCode,
              "label" = :label,
              "allowedCategoryId" = :allowedCategoryId,
              "anchorPosition" = CAST(:anchorPosition AS jsonb),
              "anchorRotation" = CAST(:anchorRotation AS jsonb),
              "anchorScale" = CAST(:anchorScale AS jsonb),
              "cameraFocus" = CAST(:cameraFocus AS jsonb),
              "isActive" = :isActive,
              "updatedAt" = NOW()
            WHERE "sceneId" = :sceneId
              AND "slotId" = :slotId
          `,
          {
            replacements: {
              sceneId,
              slotId,
              slotCode: slot.slotCode,
              label: slot.label,
              allowedCategoryId: slot.allowedCategoryId,
              anchorPosition: JSON.stringify(slot.anchorPosition),
              anchorRotation: JSON.stringify(slot.anchorRotation),
              anchorScale: JSON.stringify(slot.anchorScale),
              cameraFocus: JSON.stringify(slot.cameraFocus),
              isActive: slot.isActive,
            },
            type: QueryTypes.UPDATE,
            transaction,
          },
        );
        continue;
      }

      await sequelize.query(
        `
          INSERT INTO "showroom_scene_slots" (
            "slotId",
            "sceneId",
            "slotCode",
            "label",
            "allowedCategoryId",
            "anchorPosition",
            "anchorRotation",
            "anchorScale",
            "cameraFocus",
            "isActive",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            :slotId,
            :sceneId,
            :slotCode,
            :label,
            :allowedCategoryId,
            CAST(:anchorPosition AS jsonb),
            CAST(:anchorRotation AS jsonb),
            CAST(:anchorScale AS jsonb),
            CAST(:cameraFocus AS jsonb),
            :isActive,
            NOW(),
            NOW()
          )
        `,
        {
          replacements: {
            slotId,
            sceneId,
            slotCode: slot.slotCode,
            label: slot.label,
            allowedCategoryId: slot.allowedCategoryId,
            anchorPosition: JSON.stringify(slot.anchorPosition),
            anchorRotation: JSON.stringify(slot.anchorRotation),
            anchorScale: JSON.stringify(slot.anchorScale),
            cameraFocus: JSON.stringify(slot.cameraFocus),
            isActive: slot.isActive,
          },
          type: QueryTypes.INSERT,
          transaction,
        },
      );
    }

    if (keptSlotIds.length > 0) {
      await sequelize.query(
        `
          DELETE FROM "showroom_scene_slots"
          WHERE "sceneId" = :sceneId
            AND "slotId" NOT IN (:keptSlotIds)
        `,
        {
          replacements: {
            sceneId,
            keptSlotIds,
          },
          type: QueryTypes.DELETE,
          transaction,
        },
      );
    } else {
      await sequelize.query(
        `
          DELETE FROM "showroom_scene_slots"
          WHERE "sceneId" = :sceneId
        `,
        {
          replacements: { sceneId },
          type: QueryTypes.DELETE,
          transaction,
        },
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    if (uploadedReplacement?.publicId) {
      await destroyCloudinaryAsset(uploadedReplacement.publicId, "raw");
    }
    throw error;
  }

  if (oldRoomModelPublicIdToDestroy && oldRoomModelPublicIdToDestroy !== nextRoomModelPublicId) {
    await destroyCloudinaryAsset(oldRoomModelPublicIdToDestroy, "raw");
  }

  const scenes = await loadAllScenesWithSlots();
  const updatedScene = scenes.find((item) => item.sceneId === sceneId) ?? null;
  return { message: "Showroom scene updated successfully", scene: updatedScene };
}

export async function deleteAdminShowroomScene(sceneId: string) {
  const scene = await loadSceneById(sceneId);
  if (!scene) {
    throw Object.assign(new Error("Showroom scene not found"), { status: 404 });
  }

  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(
      `
        DELETE FROM "showroom_scenes"
        WHERE "sceneId" = :sceneId
      `,
      {
        replacements: { sceneId },
        type: QueryTypes.DELETE,
        transaction,
      },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  if (scene.roomModelPublicId) {
    await destroyCloudinaryAsset(scene.roomModelPublicId, "raw");
  }

  return { message: "Showroom scene deleted successfully" };
}

export async function updateAdminShowroomSlot(sceneId: string, slotId: string, body: Record<string, unknown>) {
  const scene = await loadSceneById(sceneId);
  if (!scene) throw Object.assign(new Error("Showroom scene not found"), { status: 404 });

  const slotRows = await sequelize.query(
    `
      SELECT "slotId"
      FROM "showroom_scene_slots"
      WHERE "sceneId" = :sceneId
        AND "slotId" = :slotId
      LIMIT 1
    `,
    {
      replacements: { sceneId, slotId },
      type: QueryTypes.SELECT,
    },
  );

  if (!(slotRows as any[])[0]) {
    throw Object.assign(new Error("Showroom slot not found"), { status: 404 });
  }

  const nextCategoryId =
    body.allowedCategoryId === null || body.allowedCategoryId === "" || body.allowedCategoryId === undefined
      ? null
      : Number(body.allowedCategoryId);
  if (nextCategoryId != null && !Number.isInteger(nextCategoryId)) {
    throw Object.assign(new Error("Invalid category selection"), { status: 400 });
  }
  await validateCategoryIfNeeded(nextCategoryId);

  const nextIsActive = body.isActive === undefined ? true : normalizeBoolean(body.isActive);

  await sequelize.query(
    `
      UPDATE "showroom_scene_slots"
      SET
        "allowedCategoryId" = :allowedCategoryId,
        "isActive" = :isActive,
        "updatedAt" = NOW()
      WHERE "sceneId" = :sceneId
        AND "slotId" = :slotId
    `,
    {
      replacements: {
        sceneId,
        slotId,
        allowedCategoryId: nextCategoryId,
        isActive: nextIsActive,
      },
      type: QueryTypes.UPDATE,
    },
  );

  const slots = await loadSceneSlots(sceneId, true);
  const updatedSlot = slots.find((slot) => slot.slotId === slotId) ?? null;
  return { message: "Showroom slot updated successfully", slot: updatedSlot };
}
