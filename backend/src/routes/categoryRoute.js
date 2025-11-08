import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { createCategory, deleteCategory, updateCategory, getAllCategories } from "../controllers/categoryController.js";

const router = express.Router();
router.use(requireAuth);

router.post("/", createCategory);
router.put("/:categoryId", updateCategory);
router.delete("/:categoryId", deleteCategory);
router.get("/", getAllCategories);

export default router;
