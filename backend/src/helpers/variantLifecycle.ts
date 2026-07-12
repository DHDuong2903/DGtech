// @ts-nocheck
import { Op } from "sequelize";
import { InventoryMovement, ProductVariant, StockReceiptLine } from "../models/associationsModel.js";

async function findVariantIdsWithInventoryHistory(variantIds: string[]): Promise<Set<string>> {
  if (!variantIds.length) return new Set();

  const [receiptRows, movementRows] = await Promise.all([
    StockReceiptLine.findAll({
      where: { variantId: { [Op.in]: variantIds } },
      attributes: ["variantId"],
      group: ["variantId"],
      raw: true,
    }),
    InventoryMovement.findAll({
      where: { variantId: { [Op.in]: variantIds } },
      attributes: ["variantId"],
      group: ["variantId"],
      raw: true,
    }),
  ]);

  const ids = new Set<string>();
  for (const row of [...receiptRows, ...movementRows]) {
    if (row?.variantId) ids.add(String(row.variantId));
  }
  return ids;
}

/**
 * Hard-delete variants with no inventory history; archive (soft-delete) the rest.
 */
export async function deactivateOrDestroyVariants(variantIds: string[]): Promise<void> {
  const unique = [...new Set(variantIds.filter(Boolean))];
  if (!unique.length) return;

  const referenced = await findVariantIdsWithInventoryHistory(unique);
  const toDeactivate = unique.filter((id) => referenced.has(id));
  const toDelete = unique.filter((id) => !referenced.has(id));

  if (toDeactivate.length) {
    await ProductVariant.update(
      { isActive: false, isDefault: false },
      { where: { variantId: { [Op.in]: toDeactivate } } },
    );
  }
  if (toDelete.length) {
    await ProductVariant.destroy({ where: { variantId: { [Op.in]: toDelete } } });
  }
}
