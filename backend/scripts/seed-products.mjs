import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { sequelize } from "../src/libs/db.js";
import { cacheBumpVersion } from "../src/libs/cache.js";
import { Category, Product, ProductVariant } from "../src/models/associationsModel.js";

dotenv.config({ silent: true });

const DEFAULT_COUNT = 1000;
const DEFAULT_CATEGORY_COUNT = 8;
const PRODUCT_CHUNK_SIZE = 200;
const DEFAULT_RETRY_COUNT = 5;
const DEFAULT_RETRY_DELAY_MS = 2000;

const COLOR_POOL = ["Black", "White", "Gray", "Blue", "Green", "Brown", "Beige"];
const SIZE_POOL = ["S", "M", "L", "XL"];
const PRODUCT_ADJECTIVES = [
  "Modern",
  "Premium",
  "Compact",
  "Classic",
  "Urban",
  "Minimal",
  "Smart",
  "Comfort",
  "Flex",
  "Eco",
];
const PRODUCT_NOUNS = [
  "Chair",
  "Desk",
  "Lamp",
  "Shelf",
  "Cabinet",
  "Sofa",
  "Table",
  "Organizer",
  "Bench",
  "Stand",
];

function parseArgs(argv) {
  const parsed = {};
  for (const rawArg of argv) {
    if (!rawArg.startsWith("--")) continue;
    const eqIndex = rawArg.indexOf("=");
    if (eqIndex === -1) {
      parsed[rawArg.slice(2)] = "true";
      continue;
    }
    const key = rawArg.slice(2, eqIndex);
    const value = rawArg.slice(eqIndex + 1);
    parsed[key] = value;
  }
  return parsed;
}

function asPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampRatio(value, fallback) {
  const parsed = Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPrice(min = 99000, max = 4999000) {
  const value = randomInt(min, max);
  return Math.round(value / 1000) * 1000;
}

function maybeCompareAtPrice(price, enabled) {
  if (!enabled) return null;
  const delta = Math.max(10000, Math.round(price * (0.08 + Math.random() * 0.18)));
  return price + Math.round(delta / 1000) * 1000;
}

function buildDescription(productName, categoryName, hasVariants) {
  const variantText = hasVariants
    ? "Co nhieu phien ban de test bo loc, ton kho va gia theo bien the."
    : "Phu hop de test danh sach san pham, PDP va gio hang.";
  return `${productName} thuoc nhom ${categoryName}. Du lieu duoc sinh tu dong cho moi truong dev/test. ${variantText}`;
}

async function ensureCategories(targetCount) {
  const existing = await Category.findAll({
    order: [["categoryId", "ASC"]],
  });
  if (existing.length >= targetCount || existing.length > 0) {
    return existing;
  }

  const now = new Date();
  const payload = Array.from({ length: targetCount }, (_, index) => ({
    name: `Seed Category ${index + 1}`,
    description: `Danh muc tao tu dong phuc vu seed product ${index + 1}.`,
    createdAt: now,
    updatedAt: now,
  }));

  await Category.bulkCreate(payload);
  return Category.findAll({
    order: [["categoryId", "ASC"]],
  });
}

function resolveImageUrl(index, imageMode, singleImageUrl, imagePool) {
  if (imageMode === "single") return singleImageUrl || null;
  if (imageMode === "pool" && imagePool.length > 0) return imagePool[index % imagePool.length];
  return null;
}

function compactId(value) {
  return String(value).replace(/-/g, "").toUpperCase();
}

function buildSku(productId, variantTag) {
  const productPart = compactId(productId);
  const safeTag = String(variantTag).replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return `SKU-${productPart}-${safeTag}`;
}

function buildSingleVariant(productId, basePrice) {
  const stock = randomInt(0, 120);
  return {
    variantId: randomUUID(),
    productId,
    sku: buildSku(productId, "DEFAULT"),
    price: basePrice,
    compareAtPrice: maybeCompareAtPrice(basePrice, Math.random() < 0.35),
    stock,
    attributes: {},
    isDefault: true,
  };
}

function buildMultiVariants(productId) {
  const colorCount = randomInt(2, 3);
  const colors = [...COLOR_POOL].sort(() => Math.random() - 0.5).slice(0, colorCount);
  const sizeCount = Math.random() < 0.5 ? 1 : 2;
  const sizes = [...SIZE_POOL].sort(() => Math.random() - 0.5).slice(0, sizeCount);
  const variants = [];

  for (const color of colors) {
    for (const size of sizes) {
      const price = randomPrice(129000, 6299000);
      const skuTag = sizeCount > 1 ? `${color}-${size}` : `${color}-${size}-ONE`;
      variants.push({
        variantId: randomUUID(),
        productId,
        sku: buildSku(productId, skuTag),
        price,
        compareAtPrice: null,
        stock: randomInt(0, 45),
        attributes: sizeCount > 1 ? { color, size } : { color },
        isDefault: false,
      });
    }
  }

  const minPrice = Math.min(...variants.map((variant) => variant.price));
  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  return { variants, minPrice, totalStock };
}

function buildSeedRows(startIndex, count, categories, options) {
  const timestampSeed = Date.now();
  const products = [];
  const variants = [];

  for (let offset = 0; offset < count; offset += 1) {
    const index = startIndex + offset;
    const category = categories[index % categories.length];
    const productId = randomUUID();
    const productName = `${sample(PRODUCT_ADJECTIVES)} ${sample(PRODUCT_NOUNS)} ${index + 1}`;
    const isMultiVariant = Math.random() < options.multiVariantRatio;
    const status = Math.random() < options.draftRatio ? "DRAFT" : "ACTIVE";
    const imageUrl = resolveImageUrl(index, options.imageMode, options.singleImageUrl, options.imagePool);

    if (isMultiVariant) {
      const multi = buildMultiVariants(productId);
      products.push({
        productId,
        name: `${productName} ${timestampSeed}`,
        description: buildDescription(productName, category.name, true),
        price: multi.minPrice,
        compareAtPrice: null,
        imageUrl,
        stock: multi.totalStock,
        categoryId: category.categoryId,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      variants.push(...multi.variants);
      continue;
    }

    const basePrice = randomPrice();
    const singleVariant = buildSingleVariant(productId, basePrice);
    products.push({
      productId,
      name: `${productName} ${timestampSeed}`,
      description: buildDescription(productName, category.name, false),
      price: singleVariant.price,
      compareAtPrice: singleVariant.compareAtPrice,
      imageUrl,
      stock: singleVariant.stock,
      categoryId: category.categoryId,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    variants.push(singleVariant);
  }

  return { products, variants };
}

function isRetryableConnectionError(error) {
  const code = error?.original?.code || error?.parent?.code || error?.code;
  const message = String(error?.message || "");
  return code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ENETUNREACH" || /SequelizeConnectionError|timeout/i.test(message);
}

async function withRetry(action, label, attempts = DEFAULT_RETRY_COUNT, delayMs = DEFAULT_RETRY_DELAY_MS) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (!isRetryableConnectionError(error) || attempt === attempts) {
        throw error;
      }
      console.warn(`${label} failed on attempt ${attempt}/${attempts}. Retrying in ${delayMs}ms...`);
      await sleep(delayMs * attempt);
    }
  }
  throw lastError;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const count = asPositiveInt(args.count, DEFAULT_COUNT);
  const categoryCount = asPositiveInt(args.categoryCount, DEFAULT_CATEGORY_COUNT);
  const chunkSize = asPositiveInt(args.chunkSize, PRODUCT_CHUNK_SIZE);
  const retryCount = asPositiveInt(args.retryCount, DEFAULT_RETRY_COUNT);
  const draftRatio = clampRatio(args.draftRatio, 0);
  const multiVariantRatio = clampRatio(args.multiVariantRatio, 0.35);
  const imageMode = ["none", "single", "pool"].includes(args.imageMode) ? args.imageMode : "none";
  const singleImageUrl = args.imageUrl ? String(args.imageUrl).trim() : "";
  const imagePool = args.imagePool
    ? String(args.imagePool)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (imageMode === "single" && !singleImageUrl) {
    throw new Error("imageMode=single yeu cau --imageUrl=<url>");
  }
  if (imageMode === "pool" && imagePool.length === 0) {
    throw new Error("imageMode=pool yeu cau --imagePool=url1,url2,...");
  }

  await withRetry(() => sequelize.authenticate(), "Database authenticate", retryCount);
  console.log(`Database connected. Seeding ${count} products...`);

  const categories = await ensureCategories(categoryCount);
  if (categories.length === 0) {
    throw new Error("Khong the tao hoac tim thay category de seed product.");
  }

  let createdProducts = 0;
  let createdVariants = 0;

  for (let start = 0; start < count; start += chunkSize) {
    const chunkCount = Math.min(chunkSize, count - start);
    const { products, variants } = buildSeedRows(start, chunkCount, categories, {
      draftRatio,
      multiVariantRatio,
      imageMode,
      singleImageUrl,
      imagePool,
    });

    await withRetry(
      () =>
        sequelize.transaction(async (transaction) => {
          await Product.bulkCreate(products, { transaction });
          await ProductVariant.bulkCreate(variants, { transaction });
        }),
      `Seed chunk ${start + 1}-${start + chunkCount}`,
      retryCount,
    );

    createdProducts += products.length;
    createdVariants += variants.length;
    console.log(`Seeded ${createdProducts}/${count} products`);
  }

  await cacheBumpVersion("storefront-products");

  console.log(`Done. Created ${createdProducts} products and ${createdVariants} variants.`);
  console.log(`Image mode: ${imageMode}`);
}

main()
  .catch((error) => {
    console.error("Seed products failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
