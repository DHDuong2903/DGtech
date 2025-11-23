import express from "express";
import { handleSepayWebhook, handleClerkWebhook } from "../controllers/webhookController.js";

const router = express.Router();

// Clerk webhook - needs raw body for signature verification
router.post("/clerk", express.raw({ type: "application/json" }), handleClerkWebhook);

// SePay webhook - use express.json() for JSON parsing
router.post("/sepay", express.json(), handleSepayWebhook);

export default router;
