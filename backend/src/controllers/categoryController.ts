// @ts-nocheck
import {
  createCategory as createCategorySvc,
  updateCategory as updateCategorySvc,
  deleteCategory as deleteCategorySvc,
  getAllCategories as getAllCategoriesSvc,
} from "../services/categoryService.js";

export const createCategory = async (req: any, res: any) => {
  try {
    const { name, description } = req.body;
    const newCategory = await createCategorySvc(name, description);
    return res.status(201).json({ message: "Them category thanh cong", newCategory });
  } catch (e: any) {
    console.error("Loi khi goi createCategory", e);
    return res.status(e.status || 500).json({ message: e.message || "Loi he thong" });
  }
};

export const updateCategory = async (req: any, res: any) => {
  try {
    const { categoryId } = req.params;
    const { name, description } = req.body;
    const category = await updateCategorySvc(categoryId, name, description);
    return res.status(200).json({ message: "Cap nhat category thanh cong", category });
  } catch (e: any) {
    console.error("Loi khi goi updateCategory", e);
    return res.status(e.status || 500).json({ message: e.message || "Loi he thong" });
  }
};

export const deleteCategory = async (req: any, res: any) => {
  try {
    await deleteCategorySvc(req.params.categoryId);
    return res.status(200).json({ message: "Xoa category thanh cong" });
  } catch (e: any) {
    console.error("Loi khi goi deleteCategory", e);
    return res.status(e.status || 500).json({ message: e.message || "Loi he thong" });
  }
};

export const getAllCategories = async (req: any, res: any) => {
  try {
    const categories = await getAllCategoriesSvc();
    return res.status(200).json({ message: "Categories retrieved successfully", categories });
  } catch (e: any) {
    console.error("Error in getAllCategories", e);
    return res.status(e.status || 500).json({ message: e.message || "Internal server error" });
  }
};
