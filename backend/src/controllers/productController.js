import { Category, Product } from "../models/associationsModel.js";
import { Op } from "sequelize";

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, categoryId } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: "Thieu thong tin bat buoc" });
    }

    // Kiem tra categoryId co ton tai khong
    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ error: "Danh muc khong ton tai" });
    }

    // Kiem tra san pham da ton tai chua
    const existingProduct = await Product.findOne({ where: { name } });
    if (existingProduct) {
      return res.status(409).json({ error: "San pham da ton tai" });
    }

    // upload image neu co file - cloudinary tra ve url trong file.path
    const imageUrl = req.file ? req.file.path : null;

    // Tao san pham moi
    const newProduct = await Product.create({
      name,
      description: description || "",
      price: parseFloat(price),
      imageUrl,
      stock: parseInt(stock) || 0,
      categoryId: parseInt(categoryId),
    });

    // Fetch product with category info
    const productWithCategory = await Product.findByPk(newProduct.productId, {
      include: {
        model: Category,
        as: "category",
        attributes: ["categoryId", "name"],
      },
    });

    return res.status(201).json({
      message: "Them san pham moi thanh cong",
      newProduct: productWithCategory,
    });
  } catch (error) {
    console.error("Loi khi goi createProduct:", error);
    return res.status(500).json({ error: "Loi he thong", details: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description, price, stock, categoryId } = req.body;

    // Kiem tra san pham co ton tai khong
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    // Neu co anh moi thi dung anh moi, khong thi giu anh cu
    const imageUrl = req.file ? req.file.path : product.imageUrl;

    // Cap nhat thong tin san pham
    await product.update({
      name: name || product.name,
      description: description !== undefined ? description : product.description,
      price: price ? parseFloat(price) : product.price,
      imageUrl,
      stock: stock !== undefined ? parseInt(stock) : product.stock,
      categoryId: categoryId ? parseInt(categoryId) : product.categoryId,
    });

    // Fetch product with category info
    const productWithCategory = await Product.findByPk(product.productId, {
      include: {
        model: Category,
        as: "category",
        attributes: ["categoryId", "name"],
      },
    });

    return res.status(200).json({
      message: "Cap nhat san pham thanh cong",
      product: productWithCategory,
    });
  } catch (error) {
    console.error("Loi khi goi updateProduct:", error);
    return res.status(500).json({ error: "Loi he thong", details: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Kiem tra san pham co ton tai khong
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    await product.destroy();
    return res.status(200).json({ message: "Xoa san pham thanh cong" });
  } catch (error) {
    console.log("Loi khi goi deleteProduct", error);
    return res.status(500).json({ error: "Loi he thong" });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    // Kiem tra san pham co ton tai khong
    const product = await Product.findByPk(productId, {
      include: {
        model: Category,
        as: "category",
      },
    });

    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    return res.status(200).json({ message: "Lay san pham thanh cong", product });
  } catch (error) {
    console.log("Loi khi goi getProductById", error);
    return res.status(500).json({ error: "Loi he thong" });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    // Lay query params neu co
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      minStock,
      maxStock,
      order = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Tao dieu kien truy van where
    const where = {};

    // Tim gan dung theo ten
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    // Loc theo categoryId
    if (categoryId) {
      where.categoryId = categoryId;
    }

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

    // Truy van db de phan trang va sap xep
    const products = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "name"],
        },
      ],
      order: [[sortBy, order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.status(200).json({
      message: "Lay danh sach san pham thanh cong",
      totalItems: products.count,
      totalPages: Math.ceil(products.count / limit),
      currentPage: parseInt(page),
      data: products.rows,
    });
  } catch (error) {
    console.log("Loi khi goi getAllProducts", error);
    return res.status(500).json({ error: "Loi he thong" });
  }
};
