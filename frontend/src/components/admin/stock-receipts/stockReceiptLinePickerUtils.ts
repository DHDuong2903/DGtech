import { productsApi } from "@/src/apis/productApi";
import type { StockReceipt, StockReceiptLine, StockReceiptLineInput } from "@/src/types";
import { variantList } from "@/src/components/admin/discount-campaigns/discountCampaignProductUi";
import type { RuleProductPickerConfirm } from "@/src/components/admin/discount-campaigns/DiscountCampaignRuleProductPickerModal";

export function attrsLabel(attrs: Record<string, string> | undefined) {
  if (!attrs || typeof attrs !== "object") return "";
  const parts = Object.entries(attrs).filter(([, v]) => v);
  if (!parts.length) return "";
  return parts.map(([k, v]) => `${k}: ${v}`).join(", ");
}

export function lineLabelFromReceipt(line: StockReceipt["lines"][0]): string {
  const v = line.variant;
  if (!v) return "";
  const productName = (v.product?.name ?? "").trim();
  const sku = (v.sku ?? "").trim();
  const variantPart = attrsLabel(v.attributes).trim();

  if (v.isDefault && !variantPart) {
    return productName || sku;
  }

  const parts: string[] = [];
  if (productName) parts.push(productName);
  if (sku) parts.push(sku);
  if (variantPart) parts.push(variantPart);
  return parts.join(" / ");
}

export async function linesFromPickerConfirm(
  r: RuleProductPickerConfirm,
  prevByVariantId: Map<string, StockReceiptLineInput>,
): Promise<{ inputs: StockReceiptLineInput[]; fullLines: StockReceiptLine[] }> {
  const inputs: StockReceiptLineInput[] = [];
  const fullLines: StockReceiptLine[] = [];
  const products = await Promise.all(r.productIds.map((id) => productsApi.getById(id)));

  for (const p of products) {
    const selected = r.variantByProduct[p.productId];
    if (!selected?.length) continue;
    const allV = variantList(p);
    for (const vid of selected) {
      const v = allV.find((x) => String(x.variantId) === String(vid));
      if (!v) continue;
      const prev = prevByVariantId.get(String(v.variantId));
      const quantity = prev?.quantity ?? 1;
      const unitCost = prev?.unitCost ?? 0;
      inputs.push({ variantId: String(v.variantId), quantity, unitCost });
      fullLines.push({
        variantId: String(v.variantId),
        quantity,
        unitCost,
        variant: {
          variantId: String(v.variantId),
          sku: v.sku,
          stock: typeof v.stock === "number" ? v.stock : 0,
          attributes: (v.attributes as Record<string, string>) || {},
          isDefault: !!v.isDefault,
          productId: p.productId,
          product: { productId: p.productId, name: p.name, status: p.status },
        },
      });
    }
  }
  return { inputs, fullLines };
}
