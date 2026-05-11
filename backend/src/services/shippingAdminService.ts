// @ts-nocheck
import { sequelize } from "../libs/db.js";
import {
  ShippingZone,
  ShippingMethod,
  ShippingRate,
  ShippingProvinceZone,
  ShippingSetting,
} from "../models/associationsModel.js";
import { listProvinces } from "../helpers/vnAddressHelper.js";
import {
  loadSelectedCartLines,
  computeSubtotalFromLines,
  buildShippingQuoteForProvince,
  getShippingSettings,
  ShippingConfigError,
  SYSTEM_ZONE_KEYS,
  STANDARD_CODE,
  EXPRESS_CODE,
} from "./shippingService.js";
import { computeTaxBreakdown, getTaxSettings } from "./taxService.js";

export async function quoteShipping(
  clerkId: string,
  selectedItems: string[],
  provinceCode: string
) {
  if (!provinceCode || typeof provinceCode !== "string") {
    throw Object.assign(new Error("Missing province code (provinceCode)"), { status: 400 });
  }
  if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
    throw Object.assign(new Error("Please select at least one product"), { status: 400 });
  }

  const { cartItems } = await loadSelectedCartLines(clerkId, selectedItems);
  const subtotal = computeSubtotalFromLines(cartItems);
  const quote = await buildShippingQuoteForProvince(provinceCode, subtotal);
  const taxSettings = await getTaxSettings();
  const settingsSnapshot = {
    enableTax: !!taxSettings.enableTax,
    taxRate: Number(taxSettings.taxRate ?? 0),
    taxIncluded: taxSettings.taxIncluded !== false,
  };
  const optionsWithTax = quote.options.map((opt) => {
    const tax = computeTaxBreakdown({
      subtotal: quote.subtotal,
      shippingFee: Number(opt.shippingFee ?? 0),
      ...settingsSnapshot,
    });
    return {
      ...opt,
      itemsTaxAmount: tax.itemsTaxAmount,
      shippingTaxAmount: tax.shippingTaxAmount,
      taxAmount: tax.taxAmount,
      totalWithTax: tax.totalWithTax,
    };
  });

  return {
    subtotal: quote.subtotal,
    zoneId: quote.zoneId,
    zoneName: quote.zoneName,
    zoneKey: quote.zoneKey,
    provinceCode: quote.provinceCode,
    displayMode: quote.displayMode,
    options: optionsWithTax,
    defaultMethodCode: quote.defaultMethodCode,
    knownMethodCodes: [STANDARD_CODE, EXPRESS_CODE],
    taxSettings: settingsSnapshot,
  };
}

export async function adminGetShippingConfig() {
  const [zones, settings, pzRows] = await Promise.all([
    ShippingZone.findAll({
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
      include: [
        {
          model: ShippingMethod,
          as: "methods",
          include: [{ model: ShippingRate, as: "rate" }],
        },
      ],
    }),
    getShippingSettings(),
    ShippingProvinceZone.findAll(),
  ]);

  const provByCode = new Map(listProvinces().map((p) => [p.provinceCode, p]));
  const provincesByZoneId = new Map();
  for (const z of zones) {
    provincesByZoneId.set(z.zoneId, []);
  }
  for (const row of pzRows) {
    const list = provincesByZoneId.get(row.zoneId);
    const p = provByCode.get(row.provinceCode);
    if (list && p) {
      list.push({ provinceCode: p.provinceCode, provinceName: p.provinceName });
    }
  }

  const zonesOut = zones.map((z) => {
    const methods = (z.methods || [])
      .slice()
      .sort((a: any, b: any) => {
        const so = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
        if (so !== 0) return so;
        return String(a.code).localeCompare(String(b.code));
      })
      .map((m: any) => ({
        code: m.code,
        name: m.name,
        flatAmount: m.rate?.amount != null ? Number(m.rate.amount) : 0,
        enabled: m.enabled !== false,
        customerEtaNote: m.customerEtaNote || "",
        sortOrder: Number(m.sortOrder) || 0,
      }));
    return {
      zoneId: z.zoneId,
      zoneKey: z.zoneKey,
      name: z.name,
      sortOrder: z.sortOrder,
      provinces: provincesByZoneId.get(z.zoneId) || [],
      methods,
    };
  });

  return {
    zones: zonesOut,
    settings: {
      displayMode: settings.displayMode,
      freeShippingEnabled: settings.freeShippingEnabled,
      freeShippingMinSubtotal: Number(settings.freeShippingMinSubtotal),
      fallbackShippingAmount: Number(settings.fallbackShippingAmount),
      freeShippingStandardOnly: settings.freeShippingStandardOnly !== false,
      showFreeShippingProgressInCart: settings.showFreeShippingProgressInCart !== false,
    },
  };
}

export async function adminUpdateShippingConfig(body: Record<string, unknown>) {
  const transaction = await sequelize.transaction();
  try {
    const settingsRow = await ShippingSetting.findByPk(1, { transaction });
    if (!settingsRow) {
      await transaction.rollback();
      throw Object.assign(new Error("Missing shipping_settings"), { status: 500 });
    }

    const s = body?.settings as any;
    if (s && typeof s === "object") {
      if (s.displayMode === "separate" || s.displayMode === "included") {
        settingsRow.displayMode = s.displayMode;
      }
      if (typeof s.freeShippingEnabled === "boolean") {
        settingsRow.freeShippingEnabled = s.freeShippingEnabled;
      }
      if (s.freeShippingMinSubtotal != null && Number.isFinite(Number(s.freeShippingMinSubtotal))) {
        settingsRow.freeShippingMinSubtotal = Math.max(0, Number(s.freeShippingMinSubtotal));
      }
      if (s.fallbackShippingAmount != null && Number.isFinite(Number(s.fallbackShippingAmount))) {
        settingsRow.fallbackShippingAmount = Math.max(0, Number(s.fallbackShippingAmount));
      }
      if (typeof s.freeShippingStandardOnly === "boolean") {
        settingsRow.freeShippingStandardOnly = s.freeShippingStandardOnly;
      }
      if (typeof s.showFreeShippingProgressInCart === "boolean") {
        settingsRow.showFreeShippingProgressInCart = s.showFreeShippingProgressInCart;
      }
      await settingsRow.save({ transaction });
    }

    const zonesPayload = body?.zones as any[];
    if (Array.isArray(zonesPayload)) {
      for (const row of zonesPayload) {
        const key = typeof row?.zoneKey === "string" ? row.zoneKey.trim() : "";
        if (!SYSTEM_ZONE_KEYS.includes(key)) {
          await transaction.rollback();
          throw Object.assign(new Error(`Invalid zoneKey: ${key}`), { status: 400 });
        }
        const zone = await ShippingZone.findOne({ where: { zoneKey: key }, transaction });
        if (!zone) {
          await transaction.rollback();
          throw Object.assign(new Error(`Zone not found: ${key}`), { status: 404 });
        }

        const methodsPayload = Array.isArray(row?.methods) ? row.methods : null;
        if (methodsPayload && methodsPayload.length) {
          for (const mp of methodsPayload) {
            const code = typeof mp?.code === "string" ? mp.code.trim().toLowerCase() : "";
            if (!code) {
              await transaction.rollback();
              throw Object.assign(new Error(`Missing method code for zone ${key}`), { status: 400 });
            }
            const amount = Number(mp?.flatAmount);
            if (!Number.isFinite(amount) || amount < 0) {
              await transaction.rollback();
              throw Object.assign(new Error(`Invalid fee (${code}) for zone ${key}`), { status: 400 });
            }
            const method = await ShippingMethod.findOne({
              where: { zoneId: zone.zoneId, code },
              transaction,
            });
            if (!method) {
              await transaction.rollback();
              throw Object.assign(new Error(`Method ${code} not found for ${key}`), { status: 404 });
            }
            const rate = await ShippingRate.findOne({ where: { methodId: method.methodId }, transaction });
            if (!rate) {
              await transaction.rollback();
              throw Object.assign(new Error(`Missing rate for ${key} / ${code}`), { status: 500 });
            }
            if (typeof mp.enabled === "boolean") method.enabled = mp.enabled;
            if (typeof mp.customerEtaNote === "string") {
              method.customerEtaNote = mp.customerEtaNote.trim().slice(0, 255) || null;
            }
            if (typeof mp.name === "string" && mp.name.trim()) {
              method.name = mp.name.trim().slice(0, 128);
            }
            if (mp.sortOrder != null && Number.isFinite(Number(mp.sortOrder))) {
              method.sortOrder = Number(mp.sortOrder);
            }
            await method.save({ transaction });
            rate.amount = Math.round(amount * 100) / 100;
            await rate.save({ transaction });
          }
        } else {
          const amount = Number(row?.flatAmount);
          if (!Number.isFinite(amount) || amount < 0) {
            await transaction.rollback();
            throw Object.assign(new Error(`Invalid fee for zone ${key}`), { status: 400 });
          }
          const method = await ShippingMethod.findOne({
            where: { zoneId: zone.zoneId, code: "standard" },
            transaction,
          });
          if (!method) {
            await transaction.rollback();
            throw Object.assign(new Error(`Missing standard method for ${key}`), { status: 500 });
          }
          const rate = await ShippingRate.findOne({ where: { methodId: method.methodId }, transaction });
          if (!rate) {
            await transaction.rollback();
            throw Object.assign(new Error(`Missing rate for ${key}`), { status: 500 });
          }
          rate.amount = Math.round(amount * 100) / 100;
          await rate.save({ transaction });
        }
      }
    }

    await transaction.commit();
    return adminGetShippingConfig();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}
