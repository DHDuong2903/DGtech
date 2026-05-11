// @ts-nocheck
import {
  listAddresses as listAddressesSvc,
  createAddress as createAddressSvc,
  updateAddress as updateAddressSvc,
  deleteAddress as deleteAddressSvc,
  setDefaultAddress as setDefaultAddressSvc,
} from "../services/addressService.js";

export const listAddresses = async (req: any, res: any) => {
  try {
    const addresses = await listAddressesSvc(req.auth.userId);
    return res.status(200).json({ addresses });
  } catch (e: any) {
    console.error("listAddresses", e);
    return res.status(e.status || 500).json({ error: e.message });
  }
};

export const createAddress = async (req: any, res: any) => {
  try {
    const address = await createAddressSvc(req.auth.userId, req.body);
    return res.status(201).json({ address });
  } catch (e: any) {
    console.error("createAddress", e);
    return res.status(e.status || 500).json({ error: e.message });
  }
};

export const updateAddress = async (req: any, res: any) => {
  try {
    const address = await updateAddressSvc(req.auth.userId, req.params.addressId, req.body);
    return res.status(200).json({ address });
  } catch (e: any) {
    console.error("updateAddress", e);
    return res.status(e.status || 500).json({ error: e.message });
  }
};

export const deleteAddress = async (req: any, res: any) => {
  try {
    await deleteAddressSvc(req.auth.userId, req.params.addressId);
    return res.status(200).json({ message: "Address deleted" });
  } catch (e: any) {
    console.error("deleteAddress", e);
    return res.status(e.status || 500).json({ error: e.message });
  }
};

export const setDefaultAddress = async (req: any, res: any) => {
  try {
    const address = await setDefaultAddressSvc(req.auth.userId, req.params.addressId);
    return res.status(200).json({ address });
  } catch (e: any) {
    console.error("setDefaultAddress", e);
    return res.status(e.status || 500).json({ error: e.message });
  }
};
