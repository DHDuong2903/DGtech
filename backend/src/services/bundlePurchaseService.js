// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { QueryTypes } from "sequelize";

/** Orders that count toward maxPerUser (not abandoned bank transfer or cancelled). */
const ELIGIBLE_ORDER_STATUSES_SQL = `('PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED')`;

/**
 * Sum of bundle quantities already purchased by this user (eligible orders only).
 * @param {string} clerkId
 * @param {string} bundleId
 * @param {import("sequelize").Transaction | undefined} transaction
 */
export async function sumEligibleBundlePurchasesForUser(clerkId, bundleId, transaction) {
  if (!clerkId || !bundleId) return 0;
  const rows = await sequelize.query(
    `SELECT COALESCE(SUM(bp."quantity"), 0)::int AS total
     FROM "bundle_purchases" AS bp
     INNER JOIN "orders" AS o ON o."orderId" = bp."orderId"
     WHERE bp."clerkId" = :clerkId
       AND bp."bundleId" = :bundleId
       AND o."status" IN ${ELIGIBLE_ORDER_STATUSES_SQL}`,
    {
      replacements: { clerkId, bundleId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );
  const n = rows?.[0]?.total;
  return typeof n === "number" && Number.isFinite(n) ? n : parseInt(String(n ?? 0), 10) || 0;
}
