// @ts-nocheck
import { Category } from "../models/categoryModel.js";
import { cacheDelete, cacheGetJson, cacheSetJson } from "../libs/cache.js";
import { withDbRetry, isTransientDbError } from "../helpers/dbResilience.js";

const CATEGORY_CACHE_KEY = "storefront:categories:live";
const CATEGORY_STALE_CACHE_KEY = "storefront:categories:stale";
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;
const CATEGORY_STALE_TTL_MS = 60 * 60 * 1000;

export async function createCategory(name: string, description: string) {
  const existing = await Category.findOne({ where: { name } });
  if (existing) {
    throw Object.assign(new Error("Category already exists"), { status: 400 });
  }
  const created = await Category.create({ name, description });
  await Promise.all([
    cacheDelete(CATEGORY_CACHE_KEY),
    cacheDelete(CATEGORY_STALE_CACHE_KEY),
  ]);
  return created;
}

export async function updateCategory(
  categoryId: number,
  name: string,
  description: string
) {
  const category = await Category.findByPk(categoryId);
  if (!category) {
    throw Object.assign(new Error("Category does not exist"), { status: 404 });
  }
  await category.update({ name, description });
  await Promise.all([
    cacheDelete(CATEGORY_CACHE_KEY),
    cacheDelete(CATEGORY_STALE_CACHE_KEY),
  ]);
  return category;
}

export async function deleteCategory(categoryId: number) {
  const category = await Category.findByPk(categoryId);
  if (!category) {
    throw Object.assign(new Error("Category khong ton tai"), { status: 404 });
  }
  await category.destroy();
  await Promise.all([
    cacheDelete(CATEGORY_CACHE_KEY),
    cacheDelete(CATEGORY_STALE_CACHE_KEY),
  ]);
}

export async function getAllCategories() {
  const cached = await cacheGetJson<any[]>(CATEGORY_CACHE_KEY);
  if (cached) {
    return cached;
  }

  try {
    const categories = await withDbRetry(
      () =>
        Category.findAll({
          order: [["name", "ASC"]],
        }),
      { label: "getAllCategories" },
    );

    await Promise.all([
      cacheSetJson(CATEGORY_CACHE_KEY, categories, CATEGORY_CACHE_TTL_MS),
      cacheSetJson(CATEGORY_STALE_CACHE_KEY, categories, CATEGORY_STALE_TTL_MS),
    ]);

    return categories;
  } catch (error) {
    if (isTransientDbError(error)) {
      const stale = await cacheGetJson<any[]>(CATEGORY_STALE_CACHE_KEY);
      if (stale) {
        console.warn("getAllCategories: serving stale cache after DB error");
        return stale;
      }
    }
    throw error;
  }
}
