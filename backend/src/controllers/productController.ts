// @ts-nocheck
import {
  createProduct as createProductSvc,
  updateProduct as updateProductSvc,
  deleteProduct as deleteProductSvc,
  getProductById as getProductByIdSvc,
  getAllProducts as getAllProductsSvc,
  getAdminInventory as getAdminInventorySvc,
  getFeaturedProducts as getFeaturedProductsSvc,
} from "../services/productService.js";
import { getHttpStatusForError, getPublicErrorMessage } from "../helpers/dbResilience.js";

export const createProduct = async (req: any, res: any) => {
  try {
    const newProduct = await createProductSvc(req.body, req.files);
    return res.status(201).json({ message: "Them san pham moi thanh cong", newProduct });
  } catch (error: any) {
    console.error("Loi khi goi createProduct:", error);
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "San pham da ton tai" });
    }
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Loi he thong"),
      details: error.details,
    });
  }
};

export const updateProduct = async (req: any, res: any) => {
  try {
    const product = await updateProductSvc(req.params.productId, req.body, req.files);
    return res.status(200).json({ message: "Cap nhat san pham thanh cong", product });
  } catch (error: any) {
    console.error("Loi khi goi updateProduct:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Loi he thong"),
      details: error.details,
    });
  }
};

export const deleteProduct = async (req: any, res: any) => {
  try {
    await deleteProductSvc(req.params.productId);
    return res.status(200).json({ message: "Xoa san pham thanh cong" });
  } catch (error: any) {
    console.error("Loi khi goi deleteProduct", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Loi he thong") });
  }
};

export const getProductById = async (req: any, res: any) => {
  try {
    const payload = await getProductByIdSvc(req.params.productId, req.auth?.userId);
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("Loi khi goi getProductById", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Loi he thong") });
  }
};

export const getAllProducts = async (req: any, res: any) => {
  try {
    const payload = await getAllProductsSvc(req.query, req.auth?.userId);
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("Loi khi goi getAllProducts", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Loi he thong") });
  }
};

export const getAdminInventory = async (req: any, res: any) => {
  try {
    const payload = await getAdminInventorySvc(req.query);
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("Loi khi goi getAdminInventory", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Loi he thong") });
  }
};

export const getFeaturedProducts = async (req: any, res: any) => {
  try {
    const payload = await getFeaturedProductsSvc(req.query.limit ?? 10, req.auth?.userId);
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("Loi khi goi getFeaturedProducts:", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Loi he thong") });
  }
};
