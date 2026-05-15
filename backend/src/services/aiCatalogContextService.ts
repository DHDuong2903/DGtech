import { Op } from "sequelize";
import { Category, Product, ProductVariant } from "../models/associationsModel.js";

type CatalogVariantRow = {
  variantId: string;
  sku?: string | null;
  price: number | string;
  compareAtPrice?: number | string | null;
  stock: number;
  isDefault: boolean;
  attributes?: Record<string, unknown> | null;
};

type CatalogProductRow = {
  productId: string;
  name: string;
  description?: string | null;
  price: number | string;
  stock: number;
  status: "ACTIVE" | "DRAFT";
  categoryId: number;
  category?: {
    categoryId: number;
    name: string;
  } | null;
  variants?: CatalogVariantRow[];
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
};

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

function formatVariantAttributes(attributes?: Record<string, unknown> | null) {
  if (!attributes || typeof attributes !== "object") return "Khong co attributes";

  const entries = Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${key}=${String(value)}`);

  return entries.length > 0 ? entries.join(", ") : "Khong co attributes";
}

function buildProductSummaryLine(product: CatalogProductRow, index: number) {
  const stockLabel = product.stock > 0 ? `Con hang (${product.stock})` : "Tam het hang";
  return [
    `${index + 1}. ${product.name}`,
    `category=${product.category?.name || "Khong ro"}`,
    `price=${formatPrice(product.price)}`,
    `stock=${stockLabel}`,
    `productId=${product.productId}`,
    `description=${buildDescriptionPreview(product.description)}`,
  ].join(" | ");
}

function buildVariantLines(product: CatalogProductRow) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length === 0) {
    return ["- Product nay khong co danh sach variant chi tiet trong context."];
  }

  return variants.map((variant, index) => {
    const stockLabel = variant.stock > 0 ? `Con hang (${variant.stock})` : "Tam het hang";
    const defaultLabel = variant.isDefault ? "default=true" : "default=false";
    const compareLabel =
      variant.compareAtPrice !== undefined && variant.compareAtPrice !== null
        ? `compareAtPrice=${formatPrice(variant.compareAtPrice)}`
        : "compareAtPrice=null";

    return [
      `- Variant ${index + 1}`,
      `variantId=${variant.variantId}`,
      `sku=${variant.sku || "null"}`,
      `price=${formatPrice(variant.price)}`,
      compareLabel,
      `stock=${stockLabel}`,
      defaultLabel,
      `attributes=${formatVariantAttributes(variant.attributes)}`,
    ].join(" | ");
  });
}

function buildCatalogContextText(
  searchTerms: string[],
  matchedProducts: CatalogProductRow[],
  matchedCategories: CatalogCategoryRow[],
  totalActiveProducts: number,
  totalCategories: number,
  isVariantIntent: boolean,
) {
  const productLines =
    matchedProducts.length > 0
      ? matchedProducts.map((product, index) => buildProductSummaryLine(product, index))
      : ["Khong tim thay san pham ACTIVE nao khop tu khoa hien tai trong catalog."];

  const categoryLines =
    matchedCategories.length > 0
      ? matchedCategories.map((category, index) => `${index + 1}. ${category.name} (categoryId=${category.categoryId})`)
      : ["Khong tim thay danh muc khop tu khoa hien tai."];

  const focusedProducts = isVariantIntent ? matchedProducts.slice(0, 3) : matchedProducts.slice(0, 1);
  const variantBlocks =
    focusedProducts.length > 0
      ? focusedProducts.flatMap((product, index) => [
          `Product focus ${index + 1}: ${product.name} (productId=${product.productId})`,
          ...buildVariantLines(product),
        ])
      : ["Khong co product focus nao de liet ke variant."];

  return [
    "Website catalog context tu DB hien tai:",
    `- Active product count: ${totalActiveProducts}`,
    `- Category count: ${totalCategories}`,
    `- Search terms: ${searchTerms.length > 0 ? searchTerms.join(", ") : "none"}`,
    `- Variant intent: ${isVariantIntent ? "true" : "false"}`,
    "Matched categories:",
    ...categoryLines,
    "Matched products:",
    ...productLines,
    "Focused product variants:",
    ...variantBlocks,
    "Business rules:",
    "- Chi duoc khang dinh shop co san pham neu no xuat hien trong Matched products.",
    "- Khi cau hoi hoi ve loai, mau, kich thuoc, bien the, attributes, phai uu tien doc muc Focused product variants.",
    "- Neu product co variants thi tra loi theo tung variant/attributes/gia/stock thay vi tra loi chung chung theo product tong.",
    "- Neu khong co san pham khop, phai noi ro khong tim thay trong du lieu website hien tai va hoi them tu khoa.",
    "- Khong doan ton kho, gia, danh muc, hay thuoc tinh ngoai phan context nay.",
  ].join("\n");
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

  const [totalActiveProducts, totalCategories] = await Promise.all([
    Product.count({ where: { status: "ACTIVE" } }),
    Category.count(),
  ]);

  if (searchTerms.length === 0) {
    return {
      shouldUseCatalogContext,
      isVariantIntent,
      searchTerms,
      matchedProducts: [],
      matchedCategories: [],
      contextText: buildCatalogContextText([], [], [], totalActiveProducts, totalCategories, isVariantIntent),
    };
  }

  const productTextClauses = searchTerms.flatMap((term) => [
    { name: { [Op.iLike]: `%${term}%` } },
    { description: { [Op.iLike]: `%${term}%` } },
  ]);

  const categoryNameClauses = searchTerms.map((term) => ({
    name: { [Op.iLike]: `%${term}%` },
  }));

  const [matchedCategoriesRows, matchedProductsByText] = await Promise.all([
    Category.findAll({
      where: { [Op.or]: categoryNameClauses },
      order: [["name", "ASC"]],
      limit: 6,
    }),
    Product.findAll({
      where: {
        status: "ACTIVE",
        [Op.or]: productTextClauses,
      },
      include: productInclude,
      order: [["updatedAt", "DESC"]],
      limit: 12,
    }),
  ]);

  const matchedCategories = matchedCategoriesRows.map((row) => row.get({ plain: true })) as CatalogCategoryRow[];
  const productMap = new Map<string, CatalogProductRow>();

  for (const row of matchedProductsByText) {
    const plain = row.get({ plain: true }) as CatalogProductRow;
    productMap.set(plain.productId, plain);
  }

  const matchedCategoryIds = matchedCategories.map((category) => category.categoryId);
  if (matchedCategoryIds.length > 0 && productMap.size < 12) {
    const categoryProducts = await Product.findAll({
      where: {
        status: "ACTIVE",
        categoryId: { [Op.in]: matchedCategoryIds },
      },
      include: productInclude,
      order: [["updatedAt", "DESC"]],
      limit: 12 - productMap.size,
    });

    for (const row of categoryProducts) {
      const plain = row.get({ plain: true }) as CatalogProductRow;
      productMap.set(plain.productId, plain);
    }
  }

  const matchedProducts = sortProductsByRelevance(Array.from(productMap.values()), message, searchTerms).slice(0, 8);

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
    ),
  };
}
