// @ts-nocheck
import express from "express";
import { chatWithAi } from "../controllers/aiChatController.js";
import {
  createConversation,
  deleteConversation,
  getConversationDetail,
  listConversations,
  sendConversationMessage,
} from "../controllers/aiConversationController.js";
import { optionalAuth } from "../middlewares/optionalAuth.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

router.post("/chat", optionalAuth, chatWithAi);
router.get("/conversations", requireAuth, listConversations);
router.post("/conversations", requireAuth, createConversation);
router.get("/conversations/:conversationId", requireAuth, getConversationDetail);
router.delete("/conversations/:conversationId", requireAuth, deleteConversation);
router.post("/conversations/:conversationId/messages", requireAuth, sendConversationMessage);
router.post("/messages", requireAuth, sendConversationMessage);

export default router;
