// @ts-nocheck
import express from "express";
import { createRoom, deleteRoom, getAllRooms, updateRoom } from "../controllers/roomController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = express.Router();

router.get("/", getAllRooms);

router.use(requireAuth, requireAdmin);
router.post("/", createRoom);
router.put("/:roomId", updateRoom);
router.delete("/:roomId", deleteRoom);

export default router;
