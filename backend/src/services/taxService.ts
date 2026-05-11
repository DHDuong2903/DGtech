// @ts-nocheck
import { TaxSetting } from "../models/associationsModel.js";

export function serializeTaxSettings(row: any) {
  return {
    enableTax: !!row.enableTax,
    taxRate: Number(row.taxRate ?? 0.1),
    taxIncluded: row.taxIncluded !== false,
  };
}

export async function adminGetTaxConfig() {
  const row = await getTaxSettings();
  return serializeTaxSettings(row);
}

export async function adminUpdateTaxConfig(s: Record<string, unknown>) {
  if (!s || typeof s !== "object") {
    throw Object.assign(new Error("settings payload is required"), { status: 400 });
  }
  const row = await getTaxSettings();
  const patch: any = {};
  if (typeof s.enableTax === "boolean") patch.enableTax = s.enableTax;
  if (s.taxRate != null) {
    patch.taxRate = normalizeTaxRate(Number(s.taxRate));
  }
  if (typeof s.taxIncluded === "boolean") patch.taxIncluded = s.taxIncluded;
  await row.update(patch);
  return serializeTaxSettings(row);
}

function roundMoney(n: number) {
  return Math.round(Number(n) * 100) / 100;
}

export async function getTaxSettings(transaction?: any) {
  let row = await TaxSetting.findByPk(1, transaction ? { transaction } : undefined);
  if (!row) {
    row = await TaxSetting.create(
      {
        id: 1,
        enableTax: false,
        taxRate: 0.1,
        taxIncluded: true,
      },
      transaction ? { transaction } : undefined
    );
  }
  return row;
}

export function normalizeTaxRate(raw: unknown) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** VAT applies to line items only; shipping is not taxed. */
export function computeTaxBreakdown(params: {
  subtotal: number;
  shippingFee: number;
  enableTax: boolean;
  taxRate: number;
  taxIncluded: boolean;
}) {
  const subtotal = Math.max(0, roundMoney(params.subtotal));
  const shippingFee = Math.max(0, roundMoney(params.shippingFee));
  const taxRate = normalizeTaxRate(params.taxRate);
  const enableTax = !!params.enableTax;
  const taxIncluded = !!params.taxIncluded;

  if (!enableTax || taxRate <= 0) {
    return {
      itemsTaxAmount: 0,
      shippingTaxAmount: 0,
      taxAmount: 0,
      totalWithTax: roundMoney(subtotal + shippingFee),
    };
  }

  if (taxIncluded) {
    const itemsTaxAmount = roundMoney(subtotal - subtotal / (1 + taxRate));
    return {
      itemsTaxAmount,
      shippingTaxAmount: 0,
      taxAmount: itemsTaxAmount,
      totalWithTax: roundMoney(subtotal + shippingFee),
    };
  }

  const itemsTaxAmount = roundMoney(subtotal * taxRate);
  return {
    itemsTaxAmount,
    shippingTaxAmount: 0,
    taxAmount: itemsTaxAmount,
    totalWithTax: roundMoney(subtotal + shippingFee + itemsTaxAmount),
  };
}
