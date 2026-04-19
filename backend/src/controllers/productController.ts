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
  getStorefrontUserTier,
} from "../services/discountCampaignResolveService.js";
import { uploadProductImageBuffer } from "../helpers/uploadProductImage.js";

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
    let variantsData = null;
    if (req.body.variants) {
      try {
        variantsData = typeof req.body.variants === "string" ? JSON.parse(req.body.variants) : req.body.variants;
      } catch (e) {
        console.error("Failed to parse variants:", e);
      }
    }

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

    let imageUrl = null;
    if (req.file?.buffer) {
      try {
        imageUrl = await uploadProductImageBuffer(req.file.buffer, req.file.mimetype);
      } catch (uploadErr: any) {
        console.error("Cloudinary product upload failed:", uploadErr);
        return res.status(502).json({
          error: "Upload anh len Cloudinary that bai",
          details: uploadErr?.message || String(uploadErr),
        });
      }
    }

    const status = normalizeProductStatus(req.body.status) ?? "ACTIVE";

    // Initial setup
    const product = await Product.create({
      name,
      description: description || "",
      price: parseFloat(price),
      compareAtPrice: null, // Always NULL on creation as per auto-sync logic
      imageUrl,
      stock: parseInt(stock) || 0,
      categoryId: parseInt(categoryId),
      status,
    });

    const productId = (product as any).productId;
    let finalPrice = parseFloat(price);
    let finalStock = parseInt(stock) || 0;
    let finalCompareAtPrice = null;

    if (variantsData && Array.isArray(variantsData) && variantsData.length > 0) {
      let sumStock = 0;
      let minPrice = Infinity;
      let minCompareAtPrice: number | null = null;

      for (const v of variantsData) {
        const vPrice = parseFloat(v.price) || 0;
        const vStock = parseInt(v.stock) || 0;
        const vComparePrice = null; // NULL on creation

        sumStock += vStock;
        if (vPrice < minPrice) {
          minPrice = vPrice;
          minCompareAtPrice = vComparePrice;
        }

        const variantPayload = {
          ...v,
          productId,
          price: vPrice,
          compareAtPrice: vComparePrice,
          stock: vStock,
          isDefault: false
        };
        if (!variantPayload.variantId) delete variantPayload.variantId;

        await ProductVariant.create(variantPayload);
      }
      finalPrice = minPrice === Infinity ? parseFloat(price) : minPrice;
      finalStock = sumStock;
      finalCompareAtPrice = minCompareAtPrice;
    } else {
      // Create default variant
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

    // Sync product cache if needed (if variants changed min price or sum stock)
    await product.update({
      price: finalPrice,
      stock: finalStock,
      compareAtPrice: finalCompareAtPrice
    });

    const productWithCategory = await getProductWithCategory(Product, productId);
    clearCompareAtPriceForMultiVariantProduct(productWithCategory);

    return res.status(201).json({
      message: "Them san pham moi thanh cong",
      newProduct: productWithCategory,
    });
  } catch (error: any) {
    console.error("Loi khi goi createProduct:", error);
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "San pham da ton tai" });
    }
    return res.status(500).json({
      error: "Loi he thong",
      details: error?.message || String(error),
    });
  }
};

export const updateProduct = async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const { name, description, price, compareAtPrice, stock, categoryId } = req.body;
    let variantsData = null;
    if (req.body.variants) {
      try {
        variantsData = typeof req.body.variants === "string" ? JSON.parse(req.body.variants) : req.body.variants;
      } catch (e) {
        console.error("Failed to parse variants:", e);
      }
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    let imageUrl = product.imageUrl;
    if (req.file?.buffer) {
      try {
        imageUrl = await uploadProductImageBuffer(req.file.buffer, req.file.mimetype);
      } catch (uploadErr: any) {
        console.error("Cloudinary product upload failed:", uploadErr);
        return res.status(502).json({
          error: "Upload anh len Cloudinary that bai",
          details: uploadErr?.message || String(uploadErr),
        });
      }
    }

    const nextStatus = normalizeProductStatus(req.body.status);

    // Initial values for cache sync
    let finalPrice = price ? parseFloat(price) : product.price;
    let finalCompareAtPrice = compareAtPrice !== undefined ? (compareAtPrice ? parseFloat(compareAtPrice) : null) : (product as any).compareAtPrice;
    let finalStock = stock !== undefined ? parseInt(stock) : product.stock;

    // Logic tư động tính toán compareAtPrice dựa trên sự thay đổi giá
    const calculateAutoCompareAtPrice = (newPrice: number, currentPrice: number, currentComparePrice: number | null) => {
      newPrice = parseFloat(newPrice.toString());
      currentPrice = parseFloat(currentPrice.toString());
      const currentComp = currentComparePrice ? parseFloat(currentComparePrice.toString()) : null;

      if (newPrice < currentPrice) {
        // Giá giảm: Lưu giá cũ vào compareAtPrice
        return (currentComp === null || currentComp <= currentPrice) ? currentPrice : currentComp;
      } else if (newPrice > currentPrice) {
        // Giá tăng: Nếu giá mới vẫn thấp hơn giá gốc cũ thì giữ giá gốc, ngược lại xóa discount
        if (currentComp !== null && newPrice < currentComp) {
          return currentComp;
        }
        return null;
      }
      return currentComp;
    };

    // Handle Variants Upsert
    if (variantsData && Array.isArray(variantsData)) {
      const existingVariants = await ProductVariant.findAll({ where: { productId } });
      const existingIds = existingVariants.map((v: any) => v.variantId);
      const updatedIds: string[] = [];

      const hasRealVariants = variantsData.length > 0;
      
      if (hasRealVariants) {
        // Xóa default variant cũ nếu có
        const defaultVar = existingVariants.find((v: any) => v.isDefault);
        if (defaultVar && !variantsData.some(v => v.variantId === defaultVar.variantId)) {
          await ProductVariant.destroy({ where: { variantId: (defaultVar as any).variantId } });
        }

        let sumStock = 0;
        let minPrice = Infinity;
        let minCompareAtPrice: number | null = null;

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
          if (vPrice < minPrice) {
            minPrice = vPrice;
            minCompareAtPrice = vComparePrice;
          } else if (vPrice === minPrice) {
            // Nếu giá bằng nhau, ưu tiên lấy comparePrice nào cao nhất (đang giảm sâu nhất)
            if (vComparePrice !== null && (minCompareAtPrice === null || vComparePrice > minCompareAtPrice)) {
              minCompareAtPrice = vComparePrice;
            }
          }

          const variantPayload = {
            ...v,
            productId,
            price: vPrice,
            compareAtPrice: vComparePrice,
            stock: vStock,
            isDefault: false
          };
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

        const toDelete = existingIds.filter(id => !updatedIds.includes(id));
        if (toDelete.length > 0) {
           await ProductVariant.destroy({ where: { variantId: { [Op.in]: toDelete } } });
        }
      } else {
        // Chuyển về sản phẩm đơn (default variant)
        let defaultVar = existingVariants.find((v: any) => v.isDefault);
        const newPrice = price ? parseFloat(price) : (defaultVar ? defaultVar.price : product.price);
        
        const autoCompare = calculateAutoCompareAtPrice(
          newPrice, 
          defaultVar ? defaultVar.price : product.price, 
          defaultVar ? defaultVar.compareAtPrice : (product as any).compareAtPrice
        );

        const payload = {
          productId,
          price: newPrice,
          compareAtPrice: autoCompare,
          stock: stock !== undefined ? parseInt(stock) : (defaultVar ? defaultVar.stock : product.stock),
          sku: defaultVar ? defaultVar.sku : `DEFAULT-${(productId as string).slice(0, 8)}`.toUpperCase(),
          attributes: {},
          isDefault: true
        };

        if (defaultVar) {
          await ProductVariant.update(payload, { where: { variantId: (defaultVar as any).variantId } });
        } else {
          await ProductVariant.create(payload);
        }

        finalPrice = payload.price;
        finalCompareAtPrice = payload.compareAtPrice;
        finalStock = payload.stock;

        await ProductVariant.destroy({ where: { productId, isDefault: false } });
      }
    } else {
      // Cập nhật basic fields (stock, price) cho simple product
      let defaultVar = await ProductVariant.findOne({ where: { productId, isDefault: true } });
      if (defaultVar) {
          const autoCompare = calculateAutoCompareAtPrice(finalPrice, defaultVar.price, defaultVar.compareAtPrice);
          await defaultVar.update({
            price: finalPrice,
            compareAtPrice: autoCompare,
            stock: finalStock
          });
          finalCompareAtPrice = autoCompare;
      } else {
          await ProductVariant.create({
            productId,
            isDefault: true,
            price: finalPrice,
            compareAtPrice: null,
            stock: finalStock,
            sku: `DEFAULT-${(productId as string).slice(0, 8)}`.toUpperCase(),
            attributes: {}
          });
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
      include: [
        {
          model: Category,
          as: "category",
        },
        {
          model: ProductVariant,
          as: "variants",
        }
      ],
    });

    if (!product) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    const admin = await userIsAdmin(req);
    if (product.status === "DRAFT" && !admin) {
      return res.status(404).json({ error: "San pham khong ton tai" });
    }

    clearCompareAtPriceForMultiVariantProduct(product);

    const tier = await getStorefrontUserTier(req.auth?.userId);
    await applyCampaignPricingToProductForStorefront(product, tier);

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

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const where = buildProductListWhere(req);
    where.status = "ACTIVE";

    // distinct: variants join would otherwise inflate count (one row per variant)
    const products = await Product.findAndCountAll({
      where,
      include: productIncludeOptions,
      order: [[sortBy, order]],
      limit: limitNum,
      offset,
      distinct: true,
      col: "productId",
    });

    products.rows.forEach((row) => clearCompareAtPriceForMultiVariantProduct(row));

    const tier = await getStorefrontUserTier(req.auth?.userId);
    for (const row of products.rows) {
      await applyCampaignPricingToProductForStorefront(row, tier);
    }

    return res.status(200).json({
      message: "Lay danh sach san pham thanh cong",
      totalItems: products.count,
      totalPages: Math.max(1, Math.ceil(products.count / limitNum)),
      currentPage: pageNum,
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

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const where = buildProductListWhere(req);
    const statusFilter = normalizeProductStatus(req.query.status);
    if (statusFilter) {
      where.status = statusFilter;
    }

    const products = await Product.findAndCountAll({
      where,
      include: productIncludeOptions,
      order: [[sortBy, order]],
      limit: limitNum,
      offset,
      distinct: true,
      col: "productId",
    });

    products.rows.forEach((row) => clearCompareAtPriceForMultiVariantProduct(row));

    return res.status(200).json({
      message: "Lay danh sach san pham thanh cong",
      totalItems: products.count,
      totalPages: Math.max(1, Math.ceil(products.count / limitNum)),
      currentPage: pageNum,
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
      include: productIncludeOptions,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    products.forEach((row) => clearCompareAtPriceForMultiVariantProduct(row));

    const tier = await getStorefrontUserTier(req.auth?.userId);
    for (const row of products) {
      await applyCampaignPricingToProductForStorefront(row, tier);
    }

    return res.status(200).json({
      message: "Lay danh sach san pham noi bat thanh cong",
      products,
    });
  } catch (error: any) {
    console.error("Loi khi goi getFeaturedProducts:", error);
    return res.status(500).json({ error: "Loi he thong", details: error?.message });
  }
};
