import { Op } from "sequelize";
import { Category, Product, ProductVariant } from "../models/associationsModel.js";
import { cacheGetJson, cacheSetJson } from "../libs/cache.js";
import {
  getStorefrontUserTier,
  resolveVariantPricingBatch,
  type VariantPricingContext,
} from "./discountCampaignResolveService.js";
import { isTransientDbError, withDbRetry } from "../helpers/dbResilience.js";

type CatalogVariantRow = {
  variantId: string;
  sku?: string | null;
  price: number | string;
  catalogPrice?: number | string | null;
  compareAtPrice?: number | string | null;
  stock: number;
  isDefault: boolean;
  attributes?: Record<string, unknown> | null;
  appliedCampaign?: {
    campaignId: string;
    name?: string | null;
  } | null;
};

type CatalogProductRow = {
  productId: string;
  name: string;
  description?: string | null;
  price: number | string;
  compareAtPrice?: number | string | null;
  stock: number;
  status: "ACTIVE" | "DRAFT";
  categoryId: number;
  category?: {
    categoryId: number;
    name: string;
  } | null;
  variants?: CatalogVariantRow[];
  appliedCampaigns?: Array<{
    campaignId: string;
    name?: string | null;
  }>;
};

type CatalogCategoryRow = {
  categoryId: number;
  name: string;
  description?: string | null;
};

export type CatalogContextResult = {
  shouldUseCatalogContext: boolean;
  isVariantIntent: boolean;
  searchTerms: string[];
  matchedProducts: CatalogProductRow[];
  matchedCategories: CatalogCategoryRow[];
  contextText: string;
};

type BuildCatalogContextOptions = {
  recentUserMessages?: string[];
  userId?: string | null;
};

const AI_CATALOG_SUMMARY_CACHE_KEY = "ai-catalog:summary:v1";
const AI_CATALOG_SUMMARY_STALE_CACHE_KEY = "ai-catalog:summary:stale:v1";
const AI_CATALOG_SUMMARY_CACHE_TTL_MS = 2 * 60 * 1000;
const AI_CATALOG_SUMMARY_STALE_TTL_MS = 15 * 60 * 1000;
const AI_CATALOG_FALLBACK_FEATURED_LIMIT = 6;

const CATALOG_HINT_PATTERNS = [
  /\bsan pham\b/i,
  /\bproduct\b/i,
  /\bdanh muc\b/i,
  /\bcategory\b/i,
  /\bgia\b/i,
  /\bbao nhieu\b/i,
  /\bcon hang\b/i,
  /\bton kho\b/i,
  /\bco\b.*\bkhong\b/i,
  /\bshop\b/i,
  /\bmua\b/i,
  /\bban\b/i,
  /\bhang\b/i,
];

const VARIANT_HINT_PATTERNS = [
  /\bvariant\b/i,
  /\bbien the\b/i,
  /\bthuoc tinh\b/i,
  /\bmau nao\b/i,
  /\bkich thuoc\b/i,
  /\bloai nao\b/i,
  /\bnhung loai nao\b/i,
  /\bco nhung loai nao\b/i,
  /\bco may loai\b/i,
];

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "ask",
  "assistant",
  "bao",
  "biet",
  "bot",
  "can",
  "cai",
  "cho",
  "co",
  "cua",
  "dgtech",
  "duoc",
  "gi",
  "giu",
  "giup",
  "hay",
  "hello",
  "help",
  "hien",
  "hieu",
  "hoi",
  "how",
  "kia",
  "khong",
  "la",
  "loai",
  "loi",
  "minh",
  "mot",
  "mua",
  "nao",
  "nay",
  "neu",
  "nhieu",
  "nua",
  "oi",
  "product",
  "san",
  "shop",
  "some",
  "the",
  "thi",
  "tim",
  "toi",
  "tra",
  "ve",
  "voi",
]);

function normalizeText(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanSearchableText(input: string) {
  return input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function extractSearchTerms(message: string) {
  const originalCleaned = cleanSearchableText(message);
  const rawTokens = originalCleaned.split(/\s+/).filter(Boolean);
  const deduped = new Map<string, string>();

  for (const token of rawTokens) {
    const normalizedToken = normalizeText(token);
    if (!deduped.has(normalizedToken)) {
      deduped.set(normalizedToken, token);
    }
  }

  return Array.from(deduped.entries())
    .filter(([normalizedToken, originalToken]) => normalizedToken.length >= 2 && originalToken.length >= 2)
    .filter(([normalizedToken]) => !SEARCH_STOP_WORDS.has(normalizedToken))
    .map(([, originalToken]) => originalToken)
    .slice(0, 10);
}

function looksLikeCatalogQuery(message: string, searchTerms: string[]) {
  const normalizedMessage = normalizeText(message);
  if (CATALOG_HINT_PATTERNS.some((pattern) => pattern.test(normalizedMessage))) {
    return true;
  }
  return searchTerms.length > 0;
}

function looksLikeVariantQuery(message: string) {
  const normalizedMessage = normalizeText(message);
  return VARIANT_HINT_PATTERNS.some((pattern) => pattern.test(normalizedMessage));
}

function buildDescriptionPreview(description?: string | null) {
  const cleaned = typeof description === "string" ? description.replace(/\s+/g, " ").trim() : "";
  if (!cleaned) return "Khong co mo ta";
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned;
}

function formatPrice(price: number | string) {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return String(price);
  return `${numeric.toLocaleString("vi-VN")} VND`;
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatVariantAttributes(attributes?: Record<string, unknown> | null) {
  if (!attributes || typeof attributes !== "object") return "Khong co attributes";

  const entries = Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${key}: ${String(value)}`);

  return entries.length > 0 ? entries.join(", ") : "Khong co attributes";
}

function formatStockStatus(stock: number) {
  return stock > 0 ? "Con hang" : "Tam het hang";
}

function buildCampaignLabel(
  campaigns?: Array<{
    campaignId: string;
    name?: string | null;
  }>,
) {
  if (!Array.isArray(campaigns) || campaigns.length === 0) return null;
  return campaigns
    .map((campaign) => campaign?.name?.trim() || campaign?.campaignId || "")
    .filter(Boolean)
    .join(", ");
}

function buildProductSummaryLine(product: CatalogProductRow, index: number) {
  const stockLabel = formatStockStatus(product.stock);
  const parts = [
    `${index + 1}. ${product.name}`,
    `- Danh muc: ${product.category?.name || "Khong ro"}`,
    `- Gia hien tai: ${formatPrice(product.price)}`,
    `- Tinh trang: ${stockLabel}`,
    `- Mo ta ngan: ${buildDescriptionPreview(product.description)}`,
  ];
  const compareAt = toFiniteNumber(product.compareAtPrice);
  const salePrice = toFiniteNumber(product.price);
  if (compareAt !== null && salePrice !== null && compareAt > salePrice) {
    parts.push(`- Gia goc truoc khi giam: ${formatPrice(compareAt)}`);
  }
  const campaignLabel = buildCampaignLabel(product.appliedCampaigns);
  if (campaignLabel) {
    parts.push(`- Khuyen mai dang ap dung: ${campaignLabel}`);
  }
  return parts.join("\n");
}

function buildVariantLines(product: CatalogProductRow) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length === 0) {
    return ["- Product nay khong co danh sach variant chi tiet trong context."];
  }

  return variants.map((variant, index) => {
    const stockLabel = formatStockStatus(variant.stock);
    const compareLabel =
      variant.compareAtPrice !== undefined && variant.compareAtPrice !== null
        ? `- Gia goc truoc khi giam: ${formatPrice(variant.compareAtPrice)}`
        : null;
    const catalogLabel =
      variant.catalogPrice !== undefined && variant.catalogPrice !== null
        ? `- Gia catalog goc: ${formatPrice(variant.catalogPrice)}`
        : null;
    const campaignLabel = variant.appliedCampaign?.name?.trim() || variant.appliedCampaign?.campaignId || null;

    const parts = [
      `- Phien ban ${index + 1}`,
      `  Gia hien tai: ${formatPrice(variant.price)}`,
      `  Tinh trang: ${stockLabel}`,
      `  Thuoc tinh: ${formatVariantAttributes(variant.attributes)}`,
    ];
    if (compareLabel) parts.push(`  ${compareLabel.slice(2)}`);
    if (catalogLabel) parts.push(`  ${catalogLabel.slice(2)}`);
    if (campaignLabel) parts.push(`  Khuyen mai dang ap dung: ${campaignLabel}`);
    if (variant.isDefault) parts.push("  Day la phien ban mac dinh.");
    return parts.join("\n");
  });
}

async function applyDiscountContextToProducts(products: CatalogProductRow[], userId?: string | null) {
  if (!products.length) return;

  const contexts = products.flatMap((product) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    return variants
      .map((variant): VariantPricingContext | null => {
        const catalogUnitPrice = toFiniteNumber(variant.price);
        if (!variant.variantId || catalogUnitPrice === null) return null;
        return {
          variantId: variant.variantId,
          productId: product.productId,
          categoryId: Number(product.categoryId),
          catalogUnitPrice,
        };
      })
      .filter((row): row is VariantPricingContext => row !== null);
  });

  if (!contexts.length) return;

  const tier = await getStorefrontUserTier(userId);
  const pricingMap = await resolveVariantPricingBatch(contexts, tier);

  for (const product of products) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    let minEff = Number.POSITIVE_INFINITY;
    let compareForMin: number | null = null;
    const campaigns = new Map<string, { campaignId: string; name?: string | null }>();

    for (const variant of variants) {
      const resolved = pricingMap.get(variant.variantId);
      if (!resolved) continue;

      const effectivePrice = toFiniteNumber(resolved.effectivePrice);
      const catalogPrice = toFiniteNumber(resolved.catalogPrice);
      if (effectivePrice === null || catalogPrice === null) continue;

      variant.price = effectivePrice;
      variant.catalogPrice = catalogPrice;
      variant.compareAtPrice = effectivePrice < catalogPrice ? catalogPrice : null;
      variant.appliedCampaign = resolved.campaignId
        ? {
            campaignId: resolved.campaignId,
            name: resolved.campaignName ?? null,
          }
        : null;

      if (resolved.campaignId) {
        campaigns.set(resolved.campaignId, {
          campaignId: resolved.campaignId,
          name: resolved.campaignName ?? null,
        });
      }

      if (effectivePrice < minEff) {
        minEff = effectivePrice;
        compareForMin = effectivePrice < catalogPrice ? catalogPrice : null;
      }
    }

    if (minEff !== Number.POSITIVE_INFINITY) {
      product.price = minEff;
      product.compareAtPrice = compareForMin !== null && compareForMin > minEff ? compareForMin : null;
    }
    product.appliedCampaigns = Array.from(campaigns.values());
  }
}

type CatalogSummarySnapshot = {
  totalActiveProducts: number;
  totalCategories: number;
  allCategories: CatalogCategoryRow[];
  fallbackFeaturedProducts: CatalogProductRow[];
  productIndex: CatalogProductIndexEntry[];
};

type CatalogProductIndexEntry = {
  productId: string;
  categoryId: number;
  normalizedName: string;
  normalizedDescription: string;
  normalizedCategoryName: string;
  normalizedVariantText: string;
  stock: number;
  hasRealVariants: boolean;
};

function buildNormalizedVariantIndexText(variants?: CatalogVariantRow[]) {
  if (!Array.isArray(variants) || variants.length === 0) return "";
  const values: string[] = [];
  for (const variant of variants) {
    if (variant?.sku) values.push(String(variant.sku));
    if (variant?.attributes && typeof variant.attributes === "object") {
      for (const [key, value] of Object.entries(variant.attributes)) {
        values.push(String(key));
        values.push(String(value));
      }
    }
  }
  return normalizeText(values.join(" "));
}

function toCatalogProductIndexEntry(product: CatalogProductRow): CatalogProductIndexEntry {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return {
    productId: product.productId,
    categoryId: Number(product.categoryId),
    normalizedName: normalizeText(product.name || ""),
    normalizedDescription: normalizeText(product.description || ""),
    normalizedCategoryName: normalizeText(product.category?.name || ""),
    normalizedVariantText: buildNormalizedVariantIndexText(variants),
    stock: Number(product.stock || 0),
    hasRealVariants: variants.some((variant) => !variant.isDefault),
  };
}

function scoreCatalogIndexEntry(entry: CatalogProductIndexEntry, normalizedMessage: string, searchTerms: string[]) {
  let score = 0;

  if (normalizedMessage && entry.normalizedName.includes(normalizedMessage)) score += 220;
  if (normalizedMessage && entry.normalizedCategoryName.includes(normalizedMessage)) score += 120;

  for (const term of searchTerms) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    if (entry.normalizedName.includes(normalizedTerm)) score += 30;
    if (entry.normalizedCategoryName.includes(normalizedTerm)) score += 18;
    if (entry.normalizedVariantText.includes(normalizedTerm)) score += 18;
    if (entry.normalizedDescription.includes(normalizedTerm)) score += 8;
  }

  if (entry.stock > 0) score += 4;
  if (entry.hasRealVariants) score += 6;
  return score;
}

function findMatchedCategoriesFromSummary(allCategories: CatalogCategoryRow[], searchTerms: string[]) {
  if (searchTerms.length === 0) return [];
  const scored = allCategories
    .map((category) => {
      const normalizedName = normalizeText(category.name || "");
      let score = 0;
      for (const term of searchTerms) {
        const normalizedTerm = normalizeText(term);
        if (normalizedName.includes(normalizedTerm)) score += 20;
      }
      return { category, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.category.name.localeCompare(right.category.name));

  return scored.slice(0, 6).map((item) => item.category);
}

function findProductIdsFromCatalogIndex(
  productIndex: CatalogProductIndexEntry[],
  message: string,
  searchTerms: string[],
  matchedCategoryIds: number[],
) {
  const normalizedMessage = normalizeText(message);
  const scored = productIndex
    .map((entry) => {
      let score = scoreCatalogIndexEntry(entry, normalizedMessage, searchTerms);
      if (matchedCategoryIds.includes(entry.categoryId)) score += 14;
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.entry.stock !== left.entry.stock) return right.entry.stock - left.entry.stock;
      return left.entry.productId.localeCompare(right.entry.productId);
    });

  return scored.slice(0, 12).map((item) => item.entry.productId);
}

async function loadCatalogSummarySnapshot() {
  const cached = await cacheGetJson<CatalogSummarySnapshot>(AI_CATALOG_SUMMARY_CACHE_KEY);
  if (cached) return cached;

  try {
    const totalActiveProducts = await withDbRetry(
      () => Product.count({ where: { status: "ACTIVE" } }),
      { label: "aiCatalog.totalActiveProducts" },
    );
    const totalCategories = await withDbRetry(() => Category.count(), { label: "aiCatalog.totalCategories" });
    const allCategoriesRows = await withDbRetry(
      () =>
        Category.findAll({
          order: [["name", "ASC"]],
        }),
      { label: "aiCatalog.allCategories" },
    );
    const fallbackFeaturedRows = await withDbRetry(
      () =>
        Product.findAll({
          where: { status: "ACTIVE" },
          include: productInclude,
          order: [["stock", "DESC"], ["updatedAt", "DESC"]],
          limit: AI_CATALOG_FALLBACK_FEATURED_LIMIT,
        }),
      { label: "aiCatalog.fallbackFeatured" },
    );

    const snapshot: CatalogSummarySnapshot = {
      totalActiveProducts,
      totalCategories,
      allCategories: allCategoriesRows.map((row: any) => row.get({ plain: true })) as CatalogCategoryRow[],
      fallbackFeaturedProducts: fallbackFeaturedRows.map((row: any) => row.get({ plain: true })) as CatalogProductRow[],
      productIndex: fallbackFeaturedRows.map((row: any) => row.get({ plain: true })),
    };

    const activeProductIndexRows = await withDbRetry(
      () =>
        Product.findAll({
          where: { status: "ACTIVE" },
          include: productInclude,
          order: [["updatedAt", "DESC"]],
        }),
      { label: "aiCatalog.productIndex" },
    );

    snapshot.productIndex = activeProductIndexRows.map((row: any) =>
      toCatalogProductIndexEntry(row.get({ plain: true }) as CatalogProductRow),
    );

    await Promise.all([
      cacheSetJson(AI_CATALOG_SUMMARY_CACHE_KEY, snapshot, AI_CATALOG_SUMMARY_CACHE_TTL_MS),
      cacheSetJson(AI_CATALOG_SUMMARY_STALE_CACHE_KEY, snapshot, AI_CATALOG_SUMMARY_STALE_TTL_MS),
    ]);
    return snapshot;
  } catch (error) {
    if (isTransientDbError(error)) {
      const stale = await cacheGetJson<CatalogSummarySnapshot>(AI_CATALOG_SUMMARY_STALE_CACHE_KEY);
      if (stale) {
        console.warn("loadCatalogSummarySnapshot: serving stale cache after DB error");
        return stale;
      }
    }
    throw error;
  }
}

function buildCatalogContextText(
  searchTerms: string[],
  matchedProducts: CatalogProductRow[],
  matchedCategories: CatalogCategoryRow[],
  totalActiveProducts: number,
  totalCategories: number,
  isVariantIntent: boolean,
  allCategories?: CatalogCategoryRow[],
  featuredProducts?: CatalogProductRow[],
) {
  const productLines =
    matchedProducts.length > 0
      ? matchedProducts.map((product, index) => buildProductSummaryLine(product, index))
      : ["Khong tim thay san pham ACTIVE nao khop tu khoa hien tai trong catalog."];

  const categoryLines =
    matchedCategories.length > 0
      ? matchedCategories.map((category, index) => `${index + 1}. ${category.name}`)
      : ["Khong tim thay danh muc khop tu khoa hien tai."];

  // Build all categories section if provided
  const allCategoriesLines = allCategories && allCategories.length > 0
    ? allCategories.map((category, index) => `${index + 1}. ${category.name}`)
    : [];

  // Build featured products section if provided
  const featuredProductsLines = featuredProducts && featuredProducts.length > 0
    ? featuredProducts.map((product, index) => buildProductSummaryLine(product, index))
    : [];

  const focusedProducts = isVariantIntent ? matchedProducts.slice(0, 3) : matchedProducts.slice(0, 1);
  const variantBlocks =
    focusedProducts.length > 0
      ? focusedProducts.flatMap((product, index) => [
          `San pham can tap trung ${index + 1}: ${product.name}`,
          ...buildVariantLines(product),
        ])
      : ["Khong co product focus nao de liet ke variant."];

  const contextLines: string[] = [
    "Thong tin catalog hien tai cua website:",
    `- So luong san pham dang ban: ${totalActiveProducts}`,
    `- So luong danh muc: ${totalCategories}`,
    `- Tu khoa AI dang doi chieu: ${searchTerms.length > 0 ? searchTerms.join(", ") : "khong co"}`,
    `- Cau hoi co can phan biet phien ban chi tiet khong: ${isVariantIntent ? "Co" : "Khong"}`,
  ];

  // Add all categories section if provided
  if (allCategoriesLines.length > 0) {
    contextLines.push(
      "",
      "Tat ca danh muc:",
      ...allCategoriesLines,
    );
  }

  // Add matched/featured sections
  if (matchedCategories.length > 0 || searchTerms.length > 0) {
    contextLines.push(
      "",
      "Danh muc lien quan:",
      ...categoryLines,
    );
  }

  if (featuredProductsLines.length > 0 && matchedProducts.length === 0) {
    contextLines.push(
      "",
      "San pham goi y de tham khao:",
      ...featuredProductsLines,
    );
  } else {
    contextLines.push(
      "",
      "San pham lien quan:",
      ...productLines,
    );
  }

  contextLines.push(
    "",
    "Chi tiet phien ban can uu tien doc:",
    ...variantBlocks,
    "",
    "Quy tac tra loi:",
    "- Chi duoc khang dinh shop co san pham neu no xuat hien trong phan san pham lien quan hoac san pham goi y.",
    "- Khi user hoi loai, mau, kich thuoc, phien ban hoac thuoc tinh, phai uu tien doc phan chi tiet phien ban can uu tien doc.",
    "- Neu san pham co nhieu phien ban, hay tra loi theo tung phien ban ve thuoc tinh, gia va tinh trang con hang/hết hang thay vi noi chung chung.",
    "- Khi co gia goc lon hon gia hien tai, hay hieu do la san pham dang co gia uu dai tren storefront.",
    "- Khi co ten khuyen mai dang ap dung, co the nhac ten khuyen mai do bang ngon ngu tu van ban hang. Khong nhac ten bien, field, schema hay cau truc du lieu noi bo.",
    "- Khong duoc noi so luong ton kho cu the cho khach. Chi duoc noi 'con hang' hoac 'tam het hang'.",
    "- Neu khong co san pham khop, phai noi ro chua tim thay trong du lieu website hien tai va goi y user noi them tu khoa hoac danh muc.",
    "- Khong doan ton kho, gia, danh muc hay thuoc tinh ngoai phan context nay.",
  );

  return contextLines.join("\n");
}

function scoreMatchedProduct(product: CatalogProductRow, originalMessage: string, searchTerms: string[]) {
  const normalizedMessage = normalizeText(originalMessage);
  const normalizedProductName = normalizeText(product.name || "");
  const normalizedDescription = normalizeText(product.description || "");

  let score = 0;
  if (normalizedMessage.includes(normalizedProductName)) score += 200;
  if (normalizedProductName.includes(normalizedMessage) && normalizedMessage.length >= 3) score += 120;

  for (const term of searchTerms) {
    const normalizedTerm = normalizeText(term);
    if (normalizedProductName.includes(normalizedTerm)) score += 25;
    if (normalizedDescription.includes(normalizedTerm)) score += 8;
    if (normalizeText(product.category?.name || "").includes(normalizedTerm)) score += 15;
  }

  if (Array.isArray(product.variants) && product.variants.some((variant) => !variant.isDefault)) score += 10;
  return score;
}

function sortProductsByRelevance(products: CatalogProductRow[], originalMessage: string, searchTerms: string[]) {
  return [...products].sort((left, right) => {
    const scoreDiff = scoreMatchedProduct(right, originalMessage, searchTerms) - scoreMatchedProduct(left, originalMessage, searchTerms);
    if (scoreDiff !== 0) return scoreDiff;
    return String(left.name || "").localeCompare(String(right.name || ""));
  });
}

const productInclude: any = [
  { model: Category, as: "category", attributes: ["categoryId", "name"] },
  {
    model: ProductVariant,
    as: "variants",
    attributes: ["variantId", "sku", "price", "compareAtPrice", "stock", "attributes", "isDefault"],
    separate: true,
    order: [["isDefault", "DESC"], ["createdAt", "ASC"]],
  },
];

function mergeSearchTerms(primaryTerms: string[], fallbackTerms: string[]) {
  const merged = new Map<string, string>();
  for (const term of [...primaryTerms, ...fallbackTerms]) {
    const normalized = normalizeText(term);
    if (!merged.has(normalized)) {
      merged.set(normalized, term);
    }
  }
  return Array.from(merged.values()).slice(0, 10);
}

export async function buildCatalogContext(
  message: string,
  options?: BuildCatalogContextOptions,
): Promise<CatalogContextResult> {
  const primarySearchTerms = extractSearchTerms(message);
  const isVariantIntent = looksLikeVariantQuery(message);
  const shouldBorrowHistoryTerms = isVariantIntent || primarySearchTerms.length <= 2;
  const fallbackSearchTerms = shouldBorrowHistoryTerms
    ? (options?.recentUserMessages || []).flatMap((item) => extractSearchTerms(item))
    : [];
  const searchTerms = mergeSearchTerms(primarySearchTerms, fallbackSearchTerms);
  const shouldUseCatalogContext = looksLikeCatalogQuery(message, searchTerms);

  if (!shouldUseCatalogContext) {
    return {
      shouldUseCatalogContext,
      isVariantIntent,
      searchTerms,
      matchedProducts: [],
      matchedCategories: [],
      contextText: "",
    };
  }

  const summary = await loadCatalogSummarySnapshot();
  const totalActiveProducts = summary.totalActiveProducts;
  const totalCategories = summary.totalCategories;
  const allCategories = summary.allCategories;

  if (searchTerms.length === 0) {
    const featuredProducts = summary.fallbackFeaturedProducts.map((row) => ({
      ...row,
      variants: Array.isArray(row.variants) ? row.variants.map((variant) => ({ ...variant })) : [],
    }));
    await applyDiscountContextToProducts(featuredProducts, options?.userId);
    return {
      shouldUseCatalogContext,
      isVariantIntent,
      searchTerms,
      matchedProducts: featuredProducts.slice(0, 5),
      matchedCategories: allCategories.slice(0, 5),
      contextText: buildCatalogContextText(
        [],
        [],
        allCategories.slice(0, 5),
        totalActiveProducts,
        totalCategories,
        isVariantIntent,
        allCategories,
        featuredProducts.slice(0, 5),
      ),
    };
  }

  const matchedCategories = findMatchedCategoriesFromSummary(allCategories, searchTerms);
  const matchedCategoryIds = matchedCategories.map((category) => category.categoryId);
  const matchedProductIds = findProductIdsFromCatalogIndex(summary.productIndex, message, searchTerms, matchedCategoryIds);
  const productMap = new Map<string, CatalogProductRow>();

  if (matchedProductIds.length > 0) {
    const matchedProductsRows = await withDbRetry(
      () =>
        Product.findAll({
          where: {
            status: "ACTIVE",
            productId: { [Op.in]: matchedProductIds },
          },
          include: productInclude,
          order: [["updatedAt", "DESC"]],
        }),
      { label: "aiCatalog.matchedProductsByIndex" },
    );
    for (const row of matchedProductsRows) {
      const plain = row.get({ plain: true }) as CatalogProductRow;
      productMap.set(plain.productId, plain);
    }
  }

  if (matchedCategoryIds.length > 0 && productMap.size < 8) {
    const categoryProducts = await withDbRetry(
      () =>
        Product.findAll({
          where: {
            status: "ACTIVE",
            categoryId: { [Op.in]: matchedCategoryIds },
          },
          include: productInclude,
          order: [["updatedAt", "DESC"]],
          limit: Math.max(1, 8 - productMap.size),
        }),
      { label: "aiCatalog.categoryProducts" },
    );
    for (const row of categoryProducts) {
      const plain = row.get({ plain: true }) as CatalogProductRow;
      productMap.set(plain.productId, plain);
    }
  }

  const matchedProducts = sortProductsByRelevance(Array.from(productMap.values()), message, searchTerms).slice(0, 8);
  await applyDiscountContextToProducts(matchedProducts, options?.userId);
  const featuredProducts =
    matchedProducts.length === 0
      ? summary.fallbackFeaturedProducts
          .map((row) => ({
            ...row,
            variants: Array.isArray(row.variants) ? row.variants.map((variant) => ({ ...variant })) : [],
          }))
          .slice(0, 5)
      : [];
  if (featuredProducts.length > 0) {
    await applyDiscountContextToProducts(featuredProducts, options?.userId);
  }

  return {
    shouldUseCatalogContext,
    isVariantIntent,
    searchTerms,
    matchedProducts,
    matchedCategories,
    contextText: buildCatalogContextText(
      searchTerms,
      matchedProducts,
      matchedCategories,
      totalActiveProducts,
      totalCategories,
      isVariantIntent,
      allCategories,
      featuredProducts,
    ),
  };
}
