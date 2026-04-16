// @ts-nocheck
import { Op } from "sequelize";
import {
  Cart,
  CartItem,
  Product,
  ProductVariant,
  ShippingProvinceZone,
  ShippingZone,
  ShippingMethod,
  ShippingRate,
  ShippingSetting,
} from "../models/associationsModel.js";
import { getProvinceName } from "../helpers/vnAddressHelper.js";

export const STANDARD_CODE = "standard";
export const EXPRESS_CODE = "express";

export const SYSTEM_ZONE_KEYS = [
  "warehouse",
  "north_near",
  "north_far",
  "central",
  "south",
] as const;

export class ShippingConfigError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ShippingConfigError";
  }
}

export async function loadSelectedCartLines(clerkId: string, selectedItems: string[], transaction?: any) {
  if (!selectedItems?.length) {
    throw new ShippingConfigError("Danh sách sản phẩm không hợp lệ", "INVALID_ITEMS");
  }
  const cart = await Cart.findOne({ where: { clerkId }, transaction });
  if (!cart) {
    throw new ShippingConfigError("Giỏ hàng trống", "NO_CART");
  }
  const cartItems = await CartItem.findAll({
    where: { cartItemId: { [Op.in]: selectedItems }, cartId: cart.cartId },
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["productId", "name", "price", "stock", "status"],
      },
      {
        model: ProductVariant,
        as: "variant",
        attributes: ["variantId", "price", "stock"],
      },
    ],
    transaction,
  });
  if (cartItems.length !== selectedItems.length) {
    throw new ShippingConfigError("Một số sản phẩm không thuộc giỏ hàng của bạn", "CART_MISMATCH");
  }
  return { cart, cartItems };
}

export function computeSubtotalFromLines(cartItems: any[]) {
  let subtotal = 0;
  for (const cartItem of cartItems) {
    const itemPrice = cartItem.variant ? cartItem.variant.price : cartItem.product.price;
    subtotal += Number(itemPrice) * cartItem.quantity;
  }
  return Math.round(subtotal * 100) / 100;
}

function roundMoney(n: number) {
  return Math.round(Number(n) * 100) / 100;
}

export function normalizeShippingMethodCode(code: string | undefined | null) {
  const c = typeof code === "string" ? code.trim().toLowerCase() : "";
  if (c === EXPRESS_CODE) return EXPRESS_CODE;
  return STANDARD_CODE;
}

/**
 * Base flat fee from DB (province → zone → method rate). Throws ShippingConfigError on config gaps.
 */
export async function calculateFlatShippingFeeForMethod(
  provinceCode: string,
  methodCode: string,
  transaction?: any,
) {
  const trimmed = typeof provinceCode === "string" ? provinceCode.trim() : "";
  if (!trimmed || !getProvinceName(trimmed)) {
    throw new ShippingConfigError("Mã tỉnh/thành không hợp lệ", "INVALID_PROVINCE");
  }

  const mapping = await ShippingProvinceZone.findOne({
    where: { provinceCode: trimmed },
    transaction,
  });
  if (!mapping) {
    throw new ShippingConfigError("Tỉnh/thành chưa được gán vùng giao hàng", "PROVINCE_UNMAPPED");
  }

  const zone = await ShippingZone.findByPk(mapping.zoneId, { transaction });
  if (!zone) {
    throw new ShippingConfigError("Cấu hình vùng giao hàng không hợp lệ", "ZONE_MISSING");
  }

  const method = await ShippingMethod.findOne({
    where: { zoneId: mapping.zoneId, code: methodCode },
    transaction,
  });
  if (!method) {
    throw new ShippingConfigError("Chưa cấu hình phương thức giao hàng cho vùng này", "METHOD_MISSING");
  }
  if (method.enabled === false) {
    throw new ShippingConfigError("Phương thức giao hàng không khả dụng", "METHOD_DISABLED");
  }

  const rate = await ShippingRate.findOne({
    where: { methodId: method.methodId },
    transaction,
  });
  if (!rate || rate.pricingType !== "flat") {
    throw new ShippingConfigError("Chưa cấu hình phí giao hàng cho vùng này", "RATE_MISSING");
  }

  const shippingFee = roundMoney(rate.amount);
  return {
    shippingFee,
    zoneId: zone.zoneId,
    zoneName: zone.name,
    zoneKey: zone.zoneKey || null,
    provinceCode: trimmed,
    methodName: method.name,
    methodEtaNote: method.customerEtaNote || null,
  };
}

/** @deprecated Prefer {@link calculateFlatShippingFeeForMethod} with explicit code. */
export async function calculateFlatShippingFee(provinceCode: string, transaction?: any) {
  return calculateFlatShippingFeeForMethod(provinceCode, STANDARD_CODE, transaction);
}

function applyDisplayAndFreeShip(params: {
  baseZoneFee: number;
  subtotal: number;
  settings: any;
  methodCode: string;
}) {
  const { baseZoneFee, subtotal, settings, methodCode } = params;
  const sub = roundMoney(subtotal);
  const minFree = roundMoney(settings.freeShippingMinSubtotal);
  const standardOnly = settings.freeShippingStandardOnly !== false;
  const freeEligible = !standardOnly || methodCode === STANDARD_CODE;
  const freeApplied =
    !!settings.freeShippingEnabled && sub >= minFree && freeEligible;

  let chargedShipping = baseZoneFee;
  if (freeApplied) {
    chargedShipping = 0;
  }

  const displayMode = settings.displayMode === "included" ? "included" : "separate";
  let shippingLabel = "zone_flat";
  if (displayMode === "included") {
    chargedShipping = 0;
    shippingLabel = "included_in_price";
  } else if (freeApplied) {
    shippingLabel = "free_over_threshold";
  }

  const totalPrice = roundMoney(sub + chargedShipping);

  return {
    subtotal: sub,
    baseZoneFee,
    shippingFee: chargedShipping,
    totalPrice,
    displayMode,
    freeShippingApplied: displayMode === "included" ? false : freeApplied,
    shippingLabel,
  };
}

export type ShippingQuoteOption = {
  code: string;
  name: string;
  customerEtaNote: string;
  enabled: boolean;
  baseZoneFee: number;
  shippingFee: number;
  totalPrice: number;
  freeShippingApplied: boolean;
  shippingLabel: string;
  displayMode: "separate" | "included";
};

/**
 * All enabled shipping options for a province (Standard / Express, …) with fees after rules.
 */
export async function buildShippingQuoteForProvince(
  provinceCode: string,
  subtotal: number,
  transaction?: any,
): Promise<{
  subtotal: number;
  zoneId: string | null;
  zoneName: string | null;
  zoneKey: string | null;
  provinceCode: string;
  displayMode: "separate" | "included";
  options: Omit<ShippingQuoteOption, "enabled">[];
  defaultMethodCode: string;
}> {
  const settings = await getShippingSettings(transaction);
  const trimmed = typeof provinceCode === "string" ? provinceCode.trim() : "";
  if (!trimmed || !getProvinceName(trimmed)) {
    throw new ShippingConfigError("Mã tỉnh/thành không hợp lệ", "INVALID_PROVINCE");
  }

  const sub = roundMoney(subtotal);
  let zoneId: string | null = null;
  let zoneName: string | null = null;
  let zoneKey: string | null = null;
  let provinceCodeResolved = trimmed;
  const rawOptions: ShippingQuoteOption[] = [];

  try {
    const mapping = await ShippingProvinceZone.findOne({
      where: { provinceCode: trimmed },
      transaction,
    });
    if (!mapping) {
      throw new ShippingConfigError("Tỉnh/thành chưa được gán vùng giao hàng", "PROVINCE_UNMAPPED");
    }

    const zone = await ShippingZone.findByPk(mapping.zoneId, { transaction });
    if (!zone) {
      throw new ShippingConfigError("Cấu hình vùng giao hàng không hợp lệ", "ZONE_MISSING");
    }

    const methods = await ShippingMethod.findAll({
      where: { zoneId: zone.zoneId },
      include: [{ model: ShippingRate, as: "rate" }],
      order: [
        ["sortOrder", "ASC"],
        ["code", "ASC"],
      ],
      transaction,
    });

    zoneId = zone.zoneId;
    zoneName = zone.name;
    zoneKey = zone.zoneKey || null;
    provinceCodeResolved = trimmed;

    for (const m of methods) {
      const rate = m.rate;
      if (!rate || rate.pricingType !== "flat") continue;
      const baseFee = roundMoney(rate.amount);
      const applied = applyDisplayAndFreeShip({
        baseZoneFee: baseFee,
        subtotal: sub,
        settings,
        methodCode: m.code,
      });
      rawOptions.push({
        code: m.code,
        name: m.name,
        customerEtaNote: m.customerEtaNote || "",
        enabled: m.enabled !== false,
        baseZoneFee: applied.baseZoneFee,
        shippingFee: applied.shippingFee,
        totalPrice: applied.totalPrice,
        freeShippingApplied: applied.freeShippingApplied,
        shippingLabel: applied.shippingLabel,
        displayMode: applied.displayMode,
      });
    }

    if (!rawOptions.length) {
      throw new ShippingConfigError("Chưa cấu hình phương thức giao hàng cho vùng này", "METHODS_EMPTY");
    }
  } catch (e) {
    if (e instanceof ShippingConfigError && e.code === "INVALID_PROVINCE") {
      throw e;
    }
    if (e instanceof ShippingConfigError && e.code === "METHODS_EMPTY") {
      throw e;
    }
    if (e instanceof ShippingConfigError && e.code === "NO_SHIPPING_METHOD") {
      throw e;
    }
    if (e instanceof ShippingConfigError) {
      const baseFee = roundMoney(settings.fallbackShippingAmount);
      zoneName = "Mặc định (fallback)";
      zoneId = null;
      zoneKey = null;
      provinceCodeResolved = trimmed;
      const applied = applyDisplayAndFreeShip({
        baseZoneFee: baseFee,
        subtotal: sub,
        settings,
        methodCode: STANDARD_CODE,
      });
      rawOptions.length = 0;
      rawOptions.push({
        code: STANDARD_CODE,
        name: "Tiêu chuẩn",
        customerEtaNote: "",
        enabled: true,
        baseZoneFee: applied.baseZoneFee,
        shippingFee: applied.shippingFee,
        totalPrice: applied.totalPrice,
        freeShippingApplied: applied.freeShippingApplied,
        shippingLabel: applied.shippingLabel,
        displayMode: applied.displayMode,
      });
    } else {
      throw e;
    }
  }

  const enabledOptions = rawOptions.filter((o) => o.enabled);
  if (!enabledOptions.length) {
    throw new ShippingConfigError("Không có phương thức giao hàng khả dụng", "NO_SHIPPING_METHOD");
  }

  const defaultMethodCode =
    enabledOptions.find((o) => o.code === STANDARD_CODE)?.code || enabledOptions[0].code;

  const options = enabledOptions.map(({ enabled: _e, ...rest }) => rest);

  return {
    subtotal: sub,
    zoneId,
    zoneName,
    zoneKey,
    provinceCode: provinceCodeResolved,
    displayMode: settings.displayMode === "included" ? "included" : "separate",
    options,
    defaultMethodCode,
  };
}

export async function getShippingSettings(transaction?: any) {
  const row = await ShippingSetting.findByPk(1, { transaction });
  if (!row) {
    throw new ShippingConfigError("Chưa khởi tạo cấu hình shipping (shipping_settings)", "SETTINGS_MISSING");
  }
  return row;
}

/**
 * Customer-facing shipping for one chosen method (standard | express).
 * Uses {@link buildShippingQuoteForProvince} so rules match quote API.
 */
export async function resolveShippingForCheckout(
  provinceCode: string,
  subtotal: number,
  opts?: { methodCode?: string; transaction?: any },
) {
  const bundle = await buildShippingQuoteForProvince(provinceCode, subtotal, opts?.transaction);
  const wanted = normalizeShippingMethodCode(opts?.methodCode);
  let opt = bundle.options.find((o) => o.code === wanted);
  if (!opt) {
    if (wanted !== STANDARD_CODE) {
      throw new ShippingConfigError("Phương thức giao hàng không khả dụng", "METHOD_UNAVAILABLE");
    }
    opt = bundle.options.find((o) => o.code === bundle.defaultMethodCode) || bundle.options[0];
  }
  if (!opt) {
    throw new ShippingConfigError("Không có phương thức giao hàng khả dụng", "NO_SHIPPING_METHOD");
  }

  return {
    subtotal: bundle.subtotal,
    baseZoneFee: opt.baseZoneFee,
    shippingFee: opt.shippingFee,
    totalPrice: opt.totalPrice,
    zoneId: bundle.zoneId,
    zoneName: bundle.zoneName,
    zoneKey: bundle.zoneKey,
    provinceCode: bundle.provinceCode,
    displayMode: opt.displayMode,
    freeShippingApplied: opt.freeShippingApplied,
    shippingLabel: opt.shippingLabel,
    shippingMethodCode: opt.code,
    shippingMethodName: opt.name,
    shippingMethodEtaNote: opt.customerEtaNote || null,
  };
}

export async function ensureZoneHasStandardPipeline(
  zoneId: string,
  transaction?: any,
  defaultFlatAmount = 0,
) {
  let method = await ShippingMethod.findOne({
    where: { zoneId, code: STANDARD_CODE },
    transaction,
  });
  if (!method) {
    method = await ShippingMethod.create(
      {
        zoneId,
        code: STANDARD_CODE,
        name: "Tiêu chuẩn",
        enabled: true,
        sortOrder: 0,
      },
      { transaction },
    );
  }
  let rate = await ShippingRate.findOne({ where: { methodId: method.methodId }, transaction });
  if (!rate) {
    rate = await ShippingRate.create(
      {
        methodId: method.methodId,
        pricingType: "flat",
        amount: defaultFlatAmount,
      },
      { transaction },
    );
  }
  return { method, rate };
}
