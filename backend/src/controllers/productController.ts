// @ts-nocheck
import { Category, Product } from "../models/associationsModel.js";
import { User } from "../models/userModel.js";
import { Op } from "sequelize";
import { getProductWithCategory, productIncludeOptions } from "../helpers/productHelper.js";

function normalizeProductStatus(value: unknown): "ACTIVE" | "DRAFT" | null {
  if (value === undefined || value === null || value === "") return null;
  const u = String(value).toUpperCase();
  if (u === "ACTIVE" || u === "DRAFT") return u;
  return null;
}

async function userIsAdmin(req: any): Promise<boolean> {
  if (!req.auth?.userId) return false;
  const user = await User.findOne({ where: { clerkId: req.auth.userId } });
  return user?.role === "admin";
}

export const createProduct = async (req: any, res: any) => {
  try {
    const { name, description, price, stock, categoryId } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: "Thieu thong tin bat buoc" });
    }

    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ error: "Danh muc khong ton tai" });
    }

    const existingProduct = await Product.findOne({ where: { name } });
    if (existingProduct) {
      return res.status(409).json({ error: "San pham da ton tai" });
    }

    const imageUrl = req.file ? req.file.path : null;
    const status = normalizeProductStatus(req.body.status) ?? "ACTIVE";

    const newProduct = await Product.create({
      name,
      description: description || "",
      price: parseFloat(price),
      imageUrl,
      stock: parseInt(stock) || 0,
      categoryId: parseInt(categoryId),
      status,
    });

    const productWithCategory = await getProductWithCategory(Product, newProduct.productId);

    return res.status(201).json({
      message: "Them san pham moi thanh cong",
      newProduct: productWithCategory,
    });
  } catch (error: any) {
    console.error("Loi khi goi createProduct:", error);
    return res.status(500).json({ error: "Loi he thong", details: error?.message });
  }
};

export const updateProduct = async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const { name, description, price, stock, categoryId } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    const imageUrl = req.file ? req.file.path : product.imageUrl;
    const nextStatus = normalizeProductStatus(req.body.status);

    await product.update({
      name: name || product.name,
      description: description !== undefined ? description : product.description,
      price: price ? parseFloat(price) : product.price,
      imageUrl,
      stock: stock !== undefined ? parseInt(stock) : product.stock,
      categoryId: categoryId ? parseInt(categoryId) : product.categoryId,
      status: nextStatus ?? product.status,
    });

    const productWithCategory = await getProductWithCategory(Product, product.productId);

    return res.status(200).json({
      message: "Cap nhat san pham thanh cong",
      product: productWithCategory,
    });
  } catch (error: any) {
    console.error("Loi khi goi updateProduct:", error);
    return res.status(500).json({ error: "Loi he thong", details: error?.message });
  }
};

export const deleteProduct = async (req: any, res: any) => {
  try {
    const { productId } = req.params;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    await product.destroy();
    return res.status(200).json({ message: "Xoa san pham thanh cong" });
  } catch (error: any) {
    console.log("Loi khi goi deleteProduct", error);
    return res.status(500).json({ error: "Loi he thong" });
  }
};

export const getProductById = async (req: any, res: any) => {
  try {
    const { productId } = req.params;

    const product = await Product.findByPk(productId, {
      include: {
        model: Category,
        as: "category",
      },
    });

    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    const admin = await userIsAdmin(req);
    if (product.status === "DRAFT" && !admin) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    return res.status(200).json({ message: "Lay san pham thanh cong", product });
  } catch (error: any) {
    console.log("Loi khi goi getProductById", error);
    return res.status(500).json({ error: "Loi he thong" });
  }
};

const buildProductListWhere = (req: any) => {
  const {
    search,
    categoryId,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
  } = req.query;

  const where: any = {};

  if (search) {
    where.name = { [Op.iLike]: `%${search}%` };
  }

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

  return where;
};

/** Public + shop: only ACTIVE products */
export const getAllProducts = async (req: any, res: any) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    const where = buildProductListWhere(req);
    where.status = "ACTIVE";

    const products = await Product.findAndCountAll({
      where,
      include: [productIncludeOptions],
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
  } catch (error: any) {
    console.log("Loi khi goi getAllProducts", error);
    return res.status(500).json({ error: "Loi he thong" });
  }
};

/** Admin inventory: all statuses; optional ?status=ACTIVE|DRAFT */
export const getAdminInventory = async (req: any, res: any) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    const where = buildProductListWhere(req);
    const statusFilter = normalizeProductStatus(req.query.status);
    if (statusFilter) {
      where.status = statusFilter;
    }

    const products = await Product.findAndCountAll({
      where,
      include: [productIncludeOptions],
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
  } catch (error: any) {
    console.log("Loi khi goi getAdminInventory", error);
    return res.status(500).json({ error: "Loi he thong" });
  }
};

export const getFeaturedProducts = async (req: any, res: any) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.findAll({
      where: { status: "ACTIVE" },
      include: [productIncludeOptions],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    return res.status(200).json({
      message: "Lay danh sach san pham noi bat thanh cong",
      products,
    });
  } catch (error: any) {
    console.error("Loi khi goi getFeaturedProducts:", error);
    return res.status(500).json({ error: "Loi he thong", details: error?.message });
  }
};
