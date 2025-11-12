import { Category } from "../models/categoryModel.js";

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Kiem tra xem category da ton tai chua
    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({ message: "Category da ton tai" });
    }

    // Tao category moi
    const newCategory = await Category.create({ name, description });
    return res.status(201).json({ message: "Them category thanh cong", newCategory });
  } catch (error) {
    console.log("Loi khi goi createCategory", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description } = req.body;

    // Tim category theo ID
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category khong ton tai" });
    }
    // Cap nhat thong tin category
    await category.update({ name, description });
    return res.status(200).json({ message: "Cap nhat category thanh cong", category });
  } catch (error) {
    console.log("Loi khi goi updateCategory", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    // Tim category theo ID
    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ message: "Category khong ton tai" });
    }

    // Xoa category
    await category.destroy();
    return res.status(200).json({ message: "Xoa category thanh cong" });
  } catch (error) {
    console.log("Loi khi goi deleteCategory", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();

    if (categories.length === 0) {
      return res.status(404).json({ message: "Khong co category nao" });
    }

    return res.status(200).json({ message: "Lay danh sach categories thanh cong", categories });
  } catch (error) {
    console.log("Loi khi goi getAllCategories", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const toggleCategoryHomepage = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { isActive } = req.body;

    // Tim category theo ID
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category khong ton tai" });
    }

    // Neu dang bat active, kiem tra so luong category active
    if (isActive) {
      const activeCount = await Category.count({
        where: { isActiveOnHomepage: true },
      });

      if (activeCount >= 4) {
        return res.status(400).json({ 
          message: "Chi duoc active toi da 4 categories tren homepage" 
        });
      }
    }

    // Cap nhat trang thai
    await category.update({ isActiveOnHomepage: isActive });
    return res.status(200).json({ 
      message: "Cap nhat trang thai thanh cong", 
      category 
    });
  } catch (error) {
    console.log("Loi khi goi toggleCategoryHomepage", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { isActiveOnHomepage: true },
      limit: 4,
    });

    return res.status(200).json({ 
      message: "Lay danh sach categories active thanh cong", 
      categories 
    });
  } catch (error) {
    console.log("Loi khi goi getActiveCategories", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};
