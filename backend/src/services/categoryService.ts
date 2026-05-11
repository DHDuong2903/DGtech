// @ts-nocheck
import { Category } from "../models/categoryModel.js";

export async function createCategory(name: string, description: string) {
  const existing = await Category.findOne({ where: { name } });
  if (existing) {
    throw Object.assign(new Error("Category already exists"), { status: 400 });
  }
  return Category.create({ name, description });
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
  return category;
}

export async function deleteCategory(categoryId: number) {
  const category = await Category.findByPk(categoryId);
  if (!category) {
    throw Object.assign(new Error("Category khong ton tai"), { status: 404 });
  }
  await category.destroy();
}

export async function getAllCategories() {
  const categories = await Category.findAll();
  if (categories.length === 0) {
    throw Object.assign(new Error("No categories found"), { status: 404 });
  }
  return categories;
}
