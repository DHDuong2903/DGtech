// @ts-nocheck
import { RankSetting } from "../models/rankSettingModel.js";

const DEFAULTS = {
  bronzeMax: 5_000_000,
  silverMax: 20_000_000,
  cancelPenaltyUnit: 500_000,
} as const;

function toNum(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function serializeRankSettings(row: any) {
  return {
    bronzeMax: toNum(row.bronzeMax, DEFAULTS.bronzeMax),
    silverMax: toNum(row.silverMax, DEFAULTS.silverMax),
    cancelPenaltyUnit: toNum(row.cancelPenaltyUnit, DEFAULTS.cancelPenaltyUnit),
  };
}

export async function getRankSettings() {
  let row = await RankSetting.findByPk(1);
  if (!row) {
    row = await RankSetting.create({
      id: 1,
      bronzeMax: DEFAULTS.bronzeMax,
      silverMax: DEFAULTS.silverMax,
      cancelPenaltyUnit: DEFAULTS.cancelPenaltyUnit,
    });
  }
  return row;
}

export async function adminGetRankConfig() {
  const row = await getRankSettings();
  return serializeRankSettings(row);
}

export async function adminUpdateRankConfig(input: Record<string, unknown>) {
  if (!input || typeof input !== "object") {
    throw Object.assign(new Error("settings payload is required"), { status: 400 });
  }
  const bronzeMax = Math.max(0, toNum(input.bronzeMax, NaN));
  const silverMax = Math.max(0, toNum(input.silverMax, NaN));
  const cancelPenaltyUnit = Math.max(0, toNum(input.cancelPenaltyUnit, NaN));

  if (!Number.isFinite(bronzeMax) || !Number.isFinite(silverMax) || !Number.isFinite(cancelPenaltyUnit)) {
    throw Object.assign(new Error("Invalid rank settings values"), { status: 400 });
  }
  if (silverMax <= bronzeMax) {
    throw Object.assign(new Error("Silver max must be greater than bronze max"), { status: 400 });
  }

  const row = await getRankSettings();
  await row.update({ bronzeMax, silverMax, cancelPenaltyUnit });
  return serializeRankSettings(row);
}
