// @ts-nocheck
import { Category, Product } from "../models/associationsModel.js";
import { Op } from "sequelize";
import { getProductWithCategory, productIncludeOptions } from "../helpers/productHelper.js";

export const createProduct = async (req: any, res: any) => {
  try {
    const { name, description, price, stock, categoryId, isFeatured, isOnSale } = req.body;

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

    const newProduct = await Product.create({
      name,
      description: description || "",
      price: parseFloat(price),
      imageUrl,
      stock: parseInt(stock) || 0,
      categoryId: parseInt(categoryId),
      isFeatured: isFeatured === "true" || isFeatured === true,
      isOnSale: isOnSale === "true" || isOnSale === true,
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
    const { name, description, price, stock, categoryId, isFeatured, isOnSale } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    const imageUrl = req.file ? req.file.path : product.imageUrl;

    await product.update({
      name: name || product.name,
      description: description !== undefined ? description : product.description,
      price: price ? parseFloat(price) : product.price,
      imageUrl,
      stock: stock !== undefined ? parseInt(stock) : product.stock,
      categoryId: categoryId ? parseInt(categoryId) : product.categoryId,
      isFeatured:
        isFeatured !== undefined ? isFeatured === "true" || isFeatured === true : product.isFeatured,
      isOnSale:
        isOnSale !== undefined ? isOnSale === "true" || isOnSale === true : product.isOnSale,
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

    return res.status(200).json({ message: "Lay san pham thanh cong", product });
  } catch (error: any) {
    console.log("Loi khi goi getProductById", error);
    return res.status(500).json({ error: "Loi he thong" });
  }
};

export const getAllProducts = async (req: any, res: any) => {
  try {
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

export const toggleProductFeatured = async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const { isFeatured } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    await product.update({ isFeatured: isFeatured === "true" || isFeatured === true });

    const productWithCategory = await getProductWithCategory(Product, product.productId);

    return res.status(200).json({
      message: "Cap nhat trang thai noi bat thanh cong",
      product: productWithCategory,
    });
  } catch (error: any) {
    console.error("Loi khi goi toggleProductFeatured:", error);
    return res.status(500).json({ error: "Loi he thong", details: error?.message });
  }
};

export const toggleProductOnSale = async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const { isOnSale } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    await product.update({ isOnSale: isOnSale === "true" || isOnSale === true });

    const productWithCategory = await getProductWithCategory(Product, product.productId);

    return res.status(200).json({
      message: "Cap nhat trang thai giam gia thanh cong",
      product: productWithCategory,
    });
  } catch (error: any) {
    console.error("Loi khi goi toggleProductOnSale:", error);
    return res.status(500).json({ error: "Loi he thong", details: error?.message });
  }
};

export const getFeaturedProducts = async (req: any, res: any) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.findAll({
      where: { isFeatured: true },
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

export const getOnSaleProducts = async (req: any, res: any) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.findAll({
      where: { isOnSale: true },
      include: [productIncludeOptions],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    return res.status(200).json({
      message: "Lay danh sach san pham dang giam gia thanh cong",
      products,
    });
  } catch (error: any) {
    console.error("Loi khi goi getOnSaleProducts:", error);
    return res.status(500).json({ error: "Loi he thong", details: error?.message });
  }
};

