// @ts-nocheck
import { Category, Product, ProductVariant } from "../models/associationsModel.js";
import { User } from "../models/userModel.js";
import { Op } from "sequelize";
import {
  clearCompareAtPriceForMultiVariantProduct,
  getProductWithCategory,
  productIncludeOptions,
} from "../helpers/productHelper.js";
import {
  applyCampaignPricingToProductForStorefront,
  applyCampaignPricingBatch,
  getStorefrontUserTier,
} from "./discountCampaignResolveService.js";
import { cacheBumpVersion, cacheGetJson, cacheGetVersion, cacheSetJson } from "../libs/cache.js";
import { uploadProductImageBuffer } from "../helpers/uploadProductImage.js";

const STOREFRONT_PRODUCT_CACHE_NAMESPACE = "storefront-products";
const STOREFRONT_PRODUCT_LIST_CACHE_TTL_MS = 60000;
const STOREFRONT_PRODUCT_DETAIL_CACHE_TTL_MS = 60000;
const STOREFRONT_FEATURED_CACHE_TTL_MS = 30000;

export function normalizeProductStatus(value: unknown): "ACTIVE" | "DRAFT" | null {
  if (value === undefined || value === null || value === "") return null;
  const u = String(value).toUpperCase();
  if (u === "ACTIVE" || u === "DRAFT") return u;
  return null;
}

export async function isAdmin(clerkId: string | undefined): Promise<boolean> {
  if (!clerkId) return false;
  const user = await User.findOne({ where: { clerkId } });
  return user?.role === "admin";
}

export async function invalidateStorefrontProductCache() {
  await cacheBumpVersion(STOREFRONT_PRODUCT_CACHE_NAMESPACE);
}

export async function buildStorefrontProductCacheKey(kind: string, payload: Record<string, unknown>) {
  const version = await cacheGetVersion(STOREFRONT_PRODUCT_CACHE_NAMESPACE);
  return `${STOREFRONT_PRODUCT_CACHE_NAMESPACE}:${kind}:v${version}:${JSON.stringify(payload)}`;
}

export function serializeStorefrontProductSummary(row: any) {
  const plain = typeof row?.get === "function" ? row.get({ plain: true }) : row;
  if (!plain) return plain;
  const category = plain.category
    ? { categoryId: plain.category.categoryId, name: plain.category.name }
    : null;
  return {
    productId: plain.productId,
    name: plain.name,
    description: plain.description,
    imageUrl: plain.imageUrl,
    price: plain.price,
    compareAtPrice: plain.compareAtPrice,
    stock: plain.stock,
    status: plain.status,
    categoryId: plain.categoryId,
    category,
  };
}

export function buildProductListWhere(query: Record<string, unknown>) {
  const { search, q, categoryId, minPrice, maxPrice, minStock, maxStock } = query as any;
  const where: any = {};
  const searchTerm = search || q;
  if (searchTerm) where.name = { [Op.iLike]: `%${searchTerm}%` };
  if (categoryId) where.categoryId = categoryId;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
    if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
  }
  if (minStock || maxStock) {
    where.stock = {};
    if (minStock) where.stock[Op.gte] = parseInt(minStock);
    if (maxStock) where.stock[Op.lte] = parseInt(maxStock);
  }
  return where;
}

export async function createProduct(body: Record<string, unknown>, file?: any) {
  const { name, description, price, stock, categoryId } = body as any;
  let variantsData: any[] | null = null;
  if (body.variants) {
    try {
      variantsData = typeof body.variants === "string" ? JSON.parse(body.variants) : body.variants;
    } catch (e) {
      console.error("Failed to parse variants:", e);
    }
  }

  if (!name || !price || !categoryId) {
    throw Object.assign(new Error("Missing required information"), { status: 400 });
  }

  const category = await Category.findByPk(categoryId);
  if (!category) throw Object.assign(new Error("Category not found"), { status: 404 });

  const existingProduct = await Product.findOne({ where: { name } });
  if (existingProduct) throw Object.assign(new Error("Product already exists"), { status: 409 });

  let imageUrl: string | null = null;
  if (file?.buffer) {
    try {
      imageUrl = await uploadProductImageBuffer(file.buffer, file.mimetype);
    } catch (uploadErr: any) {
      throw Object.assign(new Error("Failed to upload image to Cloudinary"), {
        status: 502,
        details: uploadErr?.message || String(uploadErr),
      });
    }
  }

  const status = normalizeProductStatus(body.status) ?? "ACTIVE";
  const product = await Product.create({
    name,
    description: description || "",
    price: parseFloat(price),
    compareAtPrice: null,
    imageUrl,
    stock: parseInt(stock) || 0,
    categoryId: parseInt(categoryId),
    status,
  });

  const productId = (product as any).productId;
  let finalPrice = parseFloat(price);
  let finalStock = parseInt(stock) || 0;
  let finalCompareAtPrice: number | null = null;

  if (variantsData && Array.isArray(variantsData) && variantsData.length > 0) {
    let sumStock = 0, minPrice = Infinity, minCompareAtPrice: number | null = null;
    for (const v of variantsData) {
      const vPrice = parseFloat(v.price) || 0;
      const vStock = parseInt(v.stock) || 0;
      sumStock += vStock;
      if (vPrice < minPrice) { minPrice = vPrice; minCompareAtPrice = null; }
      const variantPayload = { ...v, productId, price: vPrice, compareAtPrice: null, stock: vStock, isDefault: false };
      if (!variantPayload.variantId) delete variantPayload.variantId;
      await ProductVariant.create(variantPayload);
    }
    finalPrice = minPrice === Infinity ? parseFloat(price) : minPrice;
    finalStock = sumStock;
    finalCompareAtPrice = minCompareAtPrice;
  } else {
    await ProductVariant.create({
      productId,
      isDefault: true,
      price: finalPrice,
      compareAtPrice: null,
      stock: finalStock,
      sku: `DEFAULT-${(productId as string).slice(0, 8)}`.toUpperCase(),
      attributes: {},
    });
  }

  await product.update({ price: finalPrice, stock: finalStock, compareAtPrice: finalCompareAtPrice });

  const productWithCategory = await getProductWithCategory(Product, productId);
  clearCompareAtPriceForMultiVariantProduct(productWithCategory);
  await invalidateStorefrontProductCache();
  return productWithCategory;
}

export async function updateProduct(productId: string, body: Record<string, unknown>, file?: any) {
  const { name, description, price, compareAtPrice, stock, categoryId } = body as any;
  let variantsData: any[] | null = null;
  if (body.variants) {
    try {
      variantsData = typeof body.variants === "string" ? JSON.parse(body.variants) : body.variants;
    } catch (e) {
      console.error("Failed to parse variants:", e);
    }
  }

  const product = await Product.findByPk(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { status: 404 });

  let imageUrl = product.imageUrl;
  if (file?.buffer) {
    try {
      imageUrl = await uploadProductImageBuffer(file.buffer, file.mimetype);
    } catch (uploadErr: any) {
      throw Object.assign(new Error("Failed to upload image to Cloudinary"), {
        status: 502,
        details: uploadErr?.message || String(uploadErr),
      });
    }
  }

  const nextStatus = normalizeProductStatus(body.status);
  let finalPrice = price ? parseFloat(price) : product.price;
  let finalCompareAtPrice =
    compareAtPrice !== undefined
      ? compareAtPrice ? parseFloat(compareAtPrice) : null
      : (product as any).compareAtPrice;
  let finalStock = stock !== undefined ? parseInt(stock) : product.stock;

  const calculateAutoCompareAtPrice = (newPrice: number, currentPrice: number, currentComparePrice: number | null) => {
    newPrice = parseFloat(newPrice.toString());
    currentPrice = parseFloat(currentPrice.toString());
    const currentComp = currentComparePrice ? parseFloat(currentComparePrice.toString()) : null;
    if (newPrice < currentPrice) return currentComp === null || currentComp <= currentPrice ? currentPrice : currentComp;
    else if (newPrice > currentPrice) {
      if (currentComp !== null && newPrice < currentComp) return currentComp;
      return null;
    }
    return currentComp;
  };

  if (variantsData && Array.isArray(variantsData)) {
    const existingVariants = await ProductVariant.findAll({ where: { productId } });
    const existingIds = existingVariants.map((v: any) => v.variantId);
    const updatedIds: string[] = [];
    const hasRealVariants = variantsData.length > 0;

    if (hasRealVariants) {
      const defaultVar = existingVariants.find((v: any) => v.isDefault);
      if (defaultVar && !variantsData.some((v) => v.variantId === defaultVar.variantId)) {
        await ProductVariant.destroy({ where: { variantId: (defaultVar as any).variantId } });
      }
      let sumStock = 0, minPrice = Infinity, minCompareAtPrice: number | null = null;
      for (const v of variantsData) {
        const vPrice = parseFloat(v.price) || 0;
        const vStock = parseInt(v.stock) || 0;
        let vComparePrice: number | null = null;
        const rawVc = v.compareAtPrice;
        if (rawVc !== undefined && rawVc !== null && String(rawVc).trim() !== "") {
          const parsed = parseFloat(String(rawVc));
          if (!Number.isNaN(parsed)) vComparePrice = parsed;
        }
        sumStock += vStock;
        if (vPrice < minPrice) { minPrice = vPrice; minCompareAtPrice = vComparePrice; }
        else if (vPrice === minPrice && vComparePrice !== null && (minCompareAtPrice === null || vComparePrice > minCompareAtPrice)) {
          minCompareAtPrice = vComparePrice;
        }
        const variantPayload = { ...v, productId, price: vPrice, compareAtPrice: vComparePrice, stock: vStock, isDefault: false };
        if (!variantPayload.variantId) delete variantPayload.variantId;
        if (v.variantId && existingIds.includes(v.variantId)) {
          await ProductVariant.update(variantPayload, { where: { variantId: v.variantId } });
          updatedIds.push(v.variantId);
        } else {
          const created = await ProductVariant.create(variantPayload);
          updatedIds.push((created as any).variantId);
        }
      }
      finalPrice = minPrice === Infinity ? 0 : minPrice;
      finalStock = sumStock;
      finalCompareAtPrice = minCompareAtPrice;
      const toDelete = existingIds.filter((id) => !updatedIds.includes(id));
      if (toDelete.length > 0) await ProductVariant.destroy({ where: { variantId: { [Op.in]: toDelete } } });
    } else {
      let defaultVar = existingVariants.find((v: any) => v.isDefault);
      const newPrice = price ? parseFloat(price) : defaultVar ? defaultVar.price : product.price;
      const autoCompare = calculateAutoCompareAtPrice(newPrice, defaultVar ? defaultVar.price : product.price, defaultVar ? defaultVar.compareAtPrice : (product as any).compareAtPrice);
      const payload = {
        productId, price: newPrice, compareAtPrice: autoCompare,
        stock: stock !== undefined ? parseInt(stock) : defaultVar ? defaultVar.stock : product.stock,
        sku: defaultVar ? defaultVar.sku : `DEFAULT-${(productId as string).slice(0, 8)}`.toUpperCase(),
        attributes: {}, isDefault: true,
      };
      if (defaultVar) await ProductVariant.update(payload, { where: { variantId: (defaultVar as any).variantId } });
      else await ProductVariant.create(payload);
      finalPrice = payload.price; finalCompareAtPrice = payload.compareAtPrice; finalStock = payload.stock;
      await ProductVariant.destroy({ where: { productId, isDefault: false } });
    }
  } else {
    let defaultVar = await ProductVariant.findOne({ where: { productId, isDefault: true } });
    if (defaultVar) {
      const autoCompare = calculateAutoCompareAtPrice(finalPrice, defaultVar.price, defaultVar.compareAtPrice);
      await defaultVar.update({ price: finalPrice, compareAtPrice: autoCompare, stock: finalStock });
      finalCompareAtPrice = autoCompare;
    } else {
      await ProductVariant.create({ productId, isDefault: true, price: finalPrice, compareAtPrice: null, stock: finalStock, sku: `DEFAULT-${(productId as string).slice(0, 8)}`.toUpperCase(), attributes: {} });
      finalCompareAtPrice = null;
    }
  }

  await product.update({
    name: name || product.name,
    description: description !== undefined ? description : product.description,
    price: finalPrice,
    compareAtPrice: finalCompareAtPrice,
    imageUrl,
    stock: finalStock,
    categoryId: categoryId ? parseInt(categoryId) : product.categoryId,
    status: nextStatus ?? product.status,
  });

  const productWithCategory = await getProductWithCategory(Product, product.productId);
  clearCompareAtPriceForMultiVariantProduct(productWithCategory);
  await invalidateStorefrontProductCache();
  return productWithCategory;
}

export async function deleteProduct(productId: string) {
  const product = await Product.findByPk(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { status: 404 });
  await product.destroy();
  await invalidateStorefrontProductCache();
}

export async function getProductById(productId: string, clerkId?: string) {
  const tier = await getStorefrontUserTier(clerkId);
  const cacheKey = await buildStorefrontProductCacheKey("detail", { productId, tier });
  const cached = await cacheGetJson<any>(cacheKey);
  if (cached) return cached;

  const product = await Product.findByPk(productId, {
    include: [
      { model: Category, as: "category" },
      { model: ProductVariant, as: "variants" },
    ],
  });
  if (!product) throw Object.assign(new Error("San pham khong ton tai"), { status: 404 });

  const adminUser = await isAdmin(clerkId);
  if (product.status === "DRAFT" && !adminUser) {
    throw Object.assign(new Error("Product not found"), { status: 404 });
  }

  clearCompareAtPriceForMultiVariantProduct(product);
  await applyCampaignPricingToProductForStorefront(product, tier);

  const payload = { message: "Product retrieved successfully", product: product.get({ plain: true }) };
  if (product.status !== "DRAFT") {
    await cacheSetJson(cacheKey, payload, STOREFRONT_PRODUCT_DETAIL_CACHE_TTL_MS);
  }
  return payload;
}

export async function getAllProducts(query: Record<string, unknown>, clerkId?: string) {
  const { page = 1, limit = 10, sortBy = "createdAt", order = "DESC" } = query as any;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
  const offset = (pageNum - 1) * limitNum;
  const tier = await getStorefrontUserTier(clerkId);
  const cacheKey = await buildStorefrontProductCacheKey("list", {
    page: pageNum, limit: limitNum, sortBy, order, tier,
    search: query.search ?? null, categoryId: query.categoryId ?? null,
    minPrice: query.minPrice ?? null, maxPrice: query.maxPrice ?? null,
    minStock: query.minStock ?? null, maxStock: query.maxStock ?? null,
  });

  const cached = await cacheGetJson<any>(cacheKey);
  if (cached) return cached;

  const where = buildProductListWhere(query);
  where.status = "ACTIVE";

  const products = await Product.findAndCountAll({
    where, include: productIncludeOptions, order: [[sortBy, order]],
    limit: limitNum, offset, distinct: true, col: "productId",
  });

  products.rows.forEach((row) => clearCompareAtPriceForMultiVariantProduct(row));
  await applyCampaignPricingBatch(products.rows, tier);

  const payload = {
    message: "Product list retrieved successfully",
    totalItems: products.count,
    totalPages: Math.max(1, Math.ceil(products.count / limitNum)),
    currentPage: pageNum,
    data: products.rows.map((row) => serializeStorefrontProductSummary(row)),
  };
  await cacheSetJson(cacheKey, payload, STOREFRONT_PRODUCT_LIST_CACHE_TTL_MS);
  return payload;
}

export async function getAdminInventory(query: Record<string, unknown>) {
  const { page = 1, limit = 10, sortBy = "createdAt", order = "DESC" } = query as any;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const where = buildProductListWhere(query);
  const statusFilter = normalizeProductStatus(query.status);
  if (statusFilter) where.status = statusFilter;

  const products = await Product.findAndCountAll({
    where, include: productIncludeOptions, order: [[sortBy, order]],
    limit: limitNum, offset, distinct: true, col: "productId",
  });
  products.rows.forEach((row) => clearCompareAtPriceForMultiVariantProduct(row));

  return {
    message: "Inventory retrieved successfully",
    totalItems: products.count,
    totalPages: Math.max(1, Math.ceil(products.count / limitNum)),
    currentPage: pageNum,
    data: products.rows,
  };
}

export async function getFeaturedProducts(limit: number, clerkId?: string) {
  const pageLimit = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 10));
  const tier = await getStorefrontUserTier(clerkId);
  const cacheKey = await buildStorefrontProductCacheKey("featured", { limit: pageLimit, tier });
  const cached = await cacheGetJson<any>(cacheKey);
  if (cached) return cached;

  const products = await Product.findAll({
    where: { status: "ACTIVE" },
    include: productIncludeOptions,
    order: [Product.sequelize.fn("RANDOM")],
    limit: pageLimit,
  });
  products.forEach((row) => clearCompareAtPriceForMultiVariantProduct(row));
  await applyCampaignPricingBatch(products, tier);

  const payload = {
    message: "Featured products retrieved successfully",
    products: products.map((row) => serializeStorefrontProductSummary(row)),
  };
  await cacheSetJson(cacheKey, payload, STOREFRONT_FEATURED_CACHE_TTL_MS);
  return payload;
}
