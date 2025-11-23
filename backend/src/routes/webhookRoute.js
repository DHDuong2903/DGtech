import express from "express";
import { handleSepayWebhook } from "../controllers/webhookController.js";

const router = express.Router();

// SePay webhook - use express.json() for JSON parsing
router.post("/sepay", express.json(), handleSepayWebhook);

export default router;
