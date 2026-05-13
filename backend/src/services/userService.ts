// @ts-nocheck
import { Op } from "sequelize";
import { User } from "../models/userModel.js";
import { UserAddress } from "../models/userAddressModel.js";
import { Order } from "../models/orderModel.js";
import { getRankSettings, serializeRankSettings } from "./rankSettingService.js";

const SUCCESS_ORDER_STATUSES = ["DELIVERED", "COMPLETED"] as const;

function resolveRank(score: number, cfg: { bronzeMax: number; silverMax: number }): "bronze" | "silver" | "gold" {
  if (score >= cfg.silverMax) return "gold";
  if (score >= cfg.bronzeMax) return "silver";
  return "bronze";
}

function resolveNextRank(rank: "bronze" | "silver" | "gold"): "silver" | "gold" | null {
  if (rank === "bronze") return "silver";
  if (rank === "silver") return "gold";
  return null;
}

function resolveThreshold(rank: "bronze" | "silver" | "gold", cfg: { bronzeMax: number; silverMax: number }): number {
  if (rank === "silver") return cfg.bronzeMax;
  if (rank === "gold") return cfg.silverMax;
  return 0;
}

/** One query for all clerkIds, then pick default (else oldest) per user */
export async function loadPrimaryAddressByClerkId(clerkIds: string[]) {
  const map = new Map();
  const unique = [...new Set(clerkIds.filter(Boolean))];
  if (!unique.length) return map;

  const rows = await UserAddress.findAll({
    where: { clerkId: { [Op.in]: unique } },
    attributes: ["clerkId", "phone", "provinceName", "wardName", "addressLine", "isDefault", "createdAt"],
  });

  const grouped = new Map();
  for (const row of rows) {
    const id = row.clerkId;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(row.get({ plain: true }));
  }

  for (const id of unique) {
    const list = grouped.get(id);
    if (!list?.length) continue;
    list.sort((a: any, b: any) => {
      const ad = Boolean(a.isDefault);
      const bd = Boolean(b.isDefault);
      if (ad !== bd) return ad ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    map.set(id, list[0]);
  }
  return map;
}

export function userToAdminListPayload(userInstance: any, primaryAddr: any | null | undefined) {
  const j = userInstance.get({ plain: true });
  if (j.addresses != null) delete j.addresses;
  const addr = primaryAddr ?? null;
  const addressSummary = addr
    ? [addr.addressLine, addr.wardName, addr.provinceName].filter(Boolean).join(", ")
    : null;
  return {
    ...j,
    addressSummary,
    defaultAddressPhone: addr?.phone ?? null,
  };
}

async function buildTierByClerkId(clerkIds: string[]) {
  const map = new Map<string, "bronze" | "silver" | "gold">();
  const unique = [...new Set(clerkIds.filter(Boolean))];
  if (!unique.length) return map;

  const settings = serializeRankSettings(await getRankSettings());

  const [successRows, cancelRows] = await Promise.all([
    Order.findAll({
      where: { clerkId: { [Op.in]: unique }, status: { [Op.in]: SUCCESS_ORDER_STATUSES as unknown as string[] } },
      attributes: ["clerkId", [Order.sequelize.fn("SUM", Order.sequelize.col("totalPrice")), "successValue"]],
      group: ["clerkId"],
      raw: true,
    }),
    Order.findAll({
      where: { clerkId: { [Op.in]: unique }, status: "CANCELLED" },
      attributes: ["clerkId", [Order.sequelize.fn("COUNT", Order.sequelize.col("orderId")), "cancelOrderCount"]],
      group: ["clerkId"],
      raw: true,
    }),
  ]);

  const successById = new Map<string, number>();
  const cancelById = new Map<string, number>();

  for (const row of successRows as any[]) {
    successById.set(String(row.clerkId), Number(row.successValue || 0));
  }
  for (const row of cancelRows as any[]) {
    cancelById.set(String(row.clerkId), Number(row.cancelOrderCount || 0));
  }

  for (const clerkId of unique) {
    const successValue = successById.get(clerkId) || 0;
    const cancelCount = cancelById.get(clerkId) || 0;
    const score = Math.max(0, successValue - cancelCount * settings.cancelPenaltyUnit);
    map.set(clerkId, resolveRank(score, settings));
  }

  return map;
}

export async function getMe(clerkId: string) {
  const user = await User.findOne({ where: { clerkId } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  return user;
}

export async function getMyRank(clerkId: string) {
  const rankSettingRow = await getRankSettings();
  const settings = serializeRankSettings(rankSettingRow);

  const [successAgg, cancelCount] = await Promise.all([
    Order.sum("totalPrice", { where: { clerkId, status: { [Op.in]: SUCCESS_ORDER_STATUSES as unknown as string[] } } }),
    Order.count({ where: { clerkId, status: "CANCELLED" } }),
  ]);

  const successValue = Number(successAgg || 0);
  const penaltyValue = Number(cancelCount || 0) * settings.cancelPenaltyUnit;
  const score = Math.max(0, successValue - penaltyValue);
  const currentRank = resolveRank(score, settings);
  const nextRank = resolveNextRank(currentRank);

  const currentThreshold = resolveThreshold(currentRank, settings);
  const nextThreshold = nextRank ? resolveThreshold(nextRank, settings) : null;
  const remainingToNext = nextThreshold ? Math.max(0, nextThreshold - score) : 0;
  const range = nextThreshold ? nextThreshold - currentThreshold : 0;
  const normalized = range > 0 ? ((score - currentThreshold) / range) * 100 : 100;
  const progressPercent = Math.max(0, Math.min(100, Math.round(normalized)));

  return {
    currentRank,
    nextRank,
    score,
    successValue,
    cancelOrderCount: Number(cancelCount || 0),
    cancelPenaltyUnit: settings.cancelPenaltyUnit,
    penaltyValue,
    remainingToNext,
    progressPercent,
    thresholds: {
      bronzeMax: settings.bronzeMax,
      silverMax: settings.silverMax,
    },
  };
}

export async function getAllUsers() {
  const users = await User.findAll({ order: [["createdAt", "DESC"]] });
  const clerkIds = users.map((u: any) => u.clerkId);
  const [addrByClerk, tierByClerk] = await Promise.all([
    loadPrimaryAddressByClerkId(clerkIds),
    buildTierByClerkId(clerkIds),
  ]);
  return {
    users: users.map((u: any) => ({
      ...userToAdminListPayload(u, addrByClerk.get(u.clerkId)),
      tier: tierByClerk.get(u.clerkId) || "bronze",
    })),
    total: users.length,
  };
}

export async function updateUserRole(clerkId: string, role: string) {
  if (!["user", "admin"].includes(role)) {
    throw Object.assign(new Error("Invalid role"), { status: 400 });
  }
  const user = await User.findOne({ where: { clerkId } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  await user.update({ role });
  await user.reload();
  const [addrByClerk, tierByClerk] = await Promise.all([
    loadPrimaryAddressByClerkId([user.clerkId]),
    buildTierByClerkId([user.clerkId]),
  ]);
  return {
    ...userToAdminListPayload(user, addrByClerk.get(user.clerkId)),
    tier: tierByClerk.get(user.clerkId) || "bronze",
  };
}

export async function deleteUser(clerkId: string) {
  const user = await User.findOne({ where: { clerkId } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  await user.destroy();
}
