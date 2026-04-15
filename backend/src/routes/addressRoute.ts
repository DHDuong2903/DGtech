// @ts-nocheck
import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/addressController.js";
import { getVnProvinces, getVnWardsByProvince } from "../controllers/geoVnController.js";

const router = express.Router();

/** Public catalog (no auth) — same data as frontend `vnAddresses.ts` / server JSON. */
router.get("/geo/provinces", getVnProvinces);
router.get("/geo/provinces/:provinceCode/wards", getVnWardsByProvince);

router.use(requireAuth);

router.get("/", listAddresses);
router.post("/", createAddress);
router.patch("/:addressId/default", setDefaultAddress);
router.put("/:addressId", updateAddress);
router.delete("/:addressId", deleteAddress);

export default router;
