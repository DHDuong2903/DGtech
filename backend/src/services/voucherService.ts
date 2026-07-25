// @ts-nocheck
import { Op } from "sequelize";
import { User, UserVoucherRedemption, Voucher } from "../models/associationsModel.js";
import { buildShippingQuoteForProvince, normalizeShippingMethodCode } from "./shippingService.js";

const USER_TIERS = new Set(["bronze", "silver", "gold"]);
const VOUCHER_TYPES = new Set(["PERCENT_DISCOUNT", "FIXED_DISCOUNT", "FREE_SHIPPING"]);

function roundMoney(n: number) {
  return Math.round(Number(n) * 100) / 100;
}

export function normalizeVoucherType(raw: unknown) {
  const t = String(raw || "").trim().toUpperCase();
  return VOUCHER_TYPES.has(t) ? t : null;
}

export function normalizeAudience(raw: unknown) {
  const a = String(raw || "").trim().toUpperCase();
  return a === "TIER_USERS" ? "TIER_USERS" : "ALL_USERS";
}

export function normalizeTierTargets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const tier of raw) {
    const t = String(tier || "").trim().toLowerCase();
    if (USER_TIERS.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

export function calculateVoucherEstimatedSavings(voucher: any, baseSubtotal: number, baseShippingFee: number) {
  const subtotal = Math.max(0, roundMoney(baseSubtotal));
  const shippingFee = Math.max(0, roundMoney(baseShippingFee));
  const discountPercent = parseFloat(String(voucher.discountPercent ?? 0)) || 0;
  const discountAmount = parseFloat(String(voucher.discountAmount ?? 0)) || 0;
  const voucherType = String(voucher.voucherType || "");

  if (voucherType === "PERCENT_DISCOUNT") {
    return roundMoney((subtotal * Math.max(0, Math.min(100, discountPercent))) / 100);
  }
  if (voucherType === "FIXED_DISCOUNT") {
    return roundMoney(Math.min(subtotal, Math.max(0, discountAmount)));
  }
  if (voucherType === "FREE_SHIPPING") {
    return roundMoney(shippingFee);
  }
  return 0;
}

export async function resolveVoucherShippingFee(
  provinceCode: string | undefined,
  subtotal: number,
  shippingMethodCode: string | undefined
) {
  if (!provinceCode) return 0;
  try {
    const quote = await buildShippingQuoteForProvince(provinceCode, subtotal);
    const wantedCode = normalizeShippingMethodCode(shippingMethodCode);
    const selected =
      quote.options.find((o) => o.code === wantedCode) ||
      quote.options.find((o) => o.code === quote.defaultMethodCode) ||
      quote.options[0];
    return selected?.shippingFee ?? 0;
  } catch {
    return 0;
  }
}

export async function listEligibleVouchersForUser(params: {
  clerkId: string;
  subtotal: number;
  shippingFee?: number;
  provinceCode?: string;
  shippingMethodCode?: string;
}) {
  const { clerkId, subtotal, provinceCode, shippingMethodCode } = params;
  const user = await User.findByPk(clerkId, { attributes: ["clerkId", "tier"] });
  const userTier = String(user?.tier || "bronze").toLowerCase();
  const now = new Date();
  const baseShippingFee =
    params.shippingFee !== undefined
      ? Math.max(0, roundMoney(params.shippingFee))
      : await resolveVoucherShippingFee(provinceCode, subtotal, shippingMethodCode);

  const vouchers = await Voucher.findAll({
    where: {
      isActive: true,
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gte]: now } }],
    },
    order: [["createdAt", "DESC"]],
  });

  const results: any[] = [];
  for (const voucher of vouchers) {
    const audience = String(voucher.audience || "ALL_USERS");
    const tierTargets = Array.isArray(voucher.tierTargets) ? voucher.tierTargets : [];
    if (audience === "TIER_USERS" && !tierTargets.includes(userTier)) continue;

    const usedCount = await UserVoucherRedemption.count({
      where: { clerkId, voucherId: voucher.voucherId },
    });
    const maxUsesPerUser = Math.max(1, parseInt(String(voucher.maxUsesPerUser || 1), 10) || 1);
    if (usedCount >= maxUsesPerUser) continue;

    const estimatedSavings = calculateVoucherEstimatedSavings(voucher, subtotal, baseShippingFee);
    const voucherType = String(voucher.voucherType || "");
    // Keep FREE_SHIPPING visible on storefront even when current screen has no shipping fee context yet.
    if (estimatedSavings <= 0 && voucherType !== "FREE_SHIPPING") continue;
    results.push({
      voucherId: voucher.voucherId,
      name: voucher.name,
      voucherType,
      audience: voucher.audience,
      tierTargets: voucher.tierTargets || [],
      discountPercent: parseFloat(String(voucher.discountPercent ?? 0)) || 0,
      discountAmount: parseFloat(String(voucher.discountAmount ?? 0)) || 0,
      maxUsesPerUser,
      expiresAt: voucher.expiresAt,
      metadata: voucher.metadata || {},
      estimatedSavings,
      usedCount,
      remainingUses: Math.max(0, maxUsesPerUser - usedCount),
    });
  }

  return results.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
}
