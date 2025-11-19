import express from "express";
import { handleClerkWebhook } from "../controllers/webhookController.js";
import { verifyClerkSignature } from "../middlewares/verifyClerkSignature.js";

const router = express.Router();

router.post("/clerk", express.raw({ type: "application/json" }), verifyClerkSignature, handleClerkWebhook);

export default router;
