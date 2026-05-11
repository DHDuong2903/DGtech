// @ts-nocheck
import {
  listVouchers as listVouchersSvc,
  getVoucherById as getVoucherByIdSvc,
  createVoucher as createVoucherSvc,
  updateVoucher as updateVoucherSvc,
  deleteVoucher as deleteVoucherSvc,
} from "../services/voucherCrudService.js";

export const listVouchers = async (_req: any, res: any) => {
  try {
    const vouchers = await listVouchersSvc();
    return res.json({ vouchers });
  } catch (error: any) {
    console.error("listVouchers:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};

export const getVoucherById = async (req: any, res: any) => {
  try {
    const voucher = await getVoucherByIdSvc(req.params.voucherId);
    return res.json({ voucher });
  } catch (error: any) {
    console.error("getVoucherById:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};

export const createVoucher = async (req: any, res: any) => {
  try {
    const voucher = await createVoucherSvc(req.body || {});
    return res.status(201).json({ voucher });
  } catch (error: any) {
    console.error("createVoucher:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};

export const updateVoucher = async (req: any, res: any) => {
  try {
    const voucher = await updateVoucherSvc(req.params.voucherId, req.body || {});
    return res.json({ voucher });
  } catch (error: any) {
    console.error("updateVoucher:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};

export const deleteVoucher = async (req: any, res: any) => {
  try {
    await deleteVoucherSvc(req.params.voucherId);
    return res.json({ message: "Deleted" });
  } catch (error: any) {
    console.error("deleteVoucher:", error);
    return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
  }
};
