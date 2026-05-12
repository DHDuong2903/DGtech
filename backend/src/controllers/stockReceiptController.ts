// @ts-nocheck
import {
  listStockReceipts,
  getStockReceiptById,
  createStockReceipt,
  updateStockReceipt,
  deleteStockReceipt,
  postStockReceipt,
  searchVariantsForReceipt,
  getStockReceiptReportSummary,
} from "../services/stockReceiptService.js";

export const searchVariants = async (req: any, res: any) => {
  try {
    const q = String(req.query.q || "");
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 40;
    const rows = await searchVariantsForReceipt(q, limit);
    return res.status(200).json({ variants: rows });
  } catch (error: any) {
    console.error("searchVariants", error);
    return res.status(error.status || 500).json({ error: error.message || "Error searching variants" });
  }
};

export const reportSummary = async (req: any, res: any) => {
  try {
    const summary = await getStockReceiptReportSummary(req.query);
    return res.status(200).json({ summary });
  } catch (error: any) {
    console.error("reportSummary", error);
    return res.status(error.status || 500).json({ error: error.message || "Error building report" });
  }
};

export const listReceipts = async (req: any, res: any) => {
  try {
    const result = await listStockReceipts(req.query);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("listReceipts", error);
    return res.status(500).json({ error: error.message || "Error listing receipts" });
  }
};

export const getReceipt = async (req: any, res: any) => {
  try {
    const receipt = await getStockReceiptById(req.params.receiptId);
    return res.status(200).json({ receipt });
  } catch (error: any) {
    console.error("getReceipt", error);
    return res.status(error.status || 500).json({ error: error.message || "Error loading receipt" });
  }
};

export const createReceipt = async (req: any, res: any) => {
  try {
    const receipt = await createStockReceipt(req.body, req.auth.userId);
    return res.status(201).json({ message: "Receipt created", receipt });
  } catch (error: any) {
    console.error("createReceipt", error);
    return res.status(error.status || 500).json({ error: error.message || "Error creating receipt" });
  }
};

export const updateReceipt = async (req: any, res: any) => {
  try {
    const receipt = await updateStockReceipt(req.params.receiptId, req.body);
    return res.status(200).json({ message: "Receipt updated", receipt });
  } catch (error: any) {
    console.error("updateReceipt", error);
    return res.status(error.status || 500).json({ error: error.message || "Error updating receipt" });
  }
};

export const deleteReceipt = async (req: any, res: any) => {
  try {
    await deleteStockReceipt(req.params.receiptId);
    return res.status(200).json({ message: "Receipt deleted" });
  } catch (error: any) {
    console.error("deleteReceipt", error);
    return res.status(error.status || 500).json({ error: error.message || "Error deleting receipt" });
  }
};

export const postReceipt = async (req: any, res: any) => {
  try {
    const receipt = await postStockReceipt(req.params.receiptId);
    return res.status(200).json({ message: "Receipt posted", receipt });
  } catch (error: any) {
    console.error("postReceipt", error);
    return res.status(error.status || 500).json({ error: error.message || "Error posting receipt" });
  }
};
