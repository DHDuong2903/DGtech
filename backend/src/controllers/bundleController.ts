// @ts-nocheck
import {
  listBundles as listBundlesSvc,
  getBundle as getBundleSvc,
  createBundle as createBundleSvc,
  updateBundle as updateBundleSvc,
  deleteBundle as deleteBundleSvc,
  getStorefrontBundlesByProduct as getStorefrontBundlesByProductSvc,
  findBundleWithRelations,
} from "../services/bundleService.js";

// Re-export for use in cartController
export { findBundleWithRelations };

export const listBundles = async (req: any, res: any) => {
  try {
    const bundles = await listBundlesSvc();
    return res.json({ bundles });
  } catch (error: any) {
    console.error("listBundles:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};

export const getBundle = async (req: any, res: any) => {
  try {
    const bundle = await getBundleSvc(req.params.bundleId);
    return res.json({ bundle });
  } catch (error: any) {
    console.error("getBundle:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};

export const createBundle = async (req: any, res: any) => {
  try {
    const bundle = await createBundleSvc(req.body);
    return res.status(201).json({ bundle });
  } catch (error: any) {
    console.error("createBundle:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};

export const updateBundle = async (req: any, res: any) => {
  try {
    const bundle = await updateBundleSvc(req.params.bundleId, req.body);
    return res.json({ bundle });
  } catch (error: any) {
    console.error("updateBundle:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};

export const deleteBundle = async (req: any, res: any) => {
  try {
    await deleteBundleSvc(req.params.bundleId);
    return res.json({ message: "Deleted" });
  } catch (error: any) {
    console.error("deleteBundle:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};

export const getStorefrontBundlesByProduct = async (req: any, res: any) => {
  try {
    const clerkId = req.auth?.userId || null;
    const bundles = await getStorefrontBundlesByProductSvc(req.params.productId, clerkId);
    return res.json({ bundles });
  } catch (error: any) {
    console.error("getStorefrontBundlesByProduct:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};
