import {
  createAiConversation,
  deleteAiConversation,
  getAiConversationDetail,
  listAiConversations,
  sendAiConversationMessage,
} from "../services/aiConversationService.js";

function resolveActor(req: any) {
  return {
    userId: req.auth?.userId || null,
    guestSessionId:
      typeof req.query?.guestSessionId === "string"
        ? req.query.guestSessionId
        : typeof req.body?.guestSessionId === "string"
          ? req.body.guestSessionId
          : null,
  };
}

export const listConversations = async (req: any, res: any) => {
  try {
    const conversations = await listAiConversations(resolveActor(req));
    return res.status(200).json({ conversations });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message || "Failed to load conversations" });
  }
};

export const createConversation = async (req: any, res: any) => {
  try {
    const conversation = await createAiConversation(resolveActor(req));
    return res.status(201).json({ conversation });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message || "Failed to create conversation" });
  }
};

export const getConversationDetail = async (req: any, res: any) => {
  try {
    const result = await getAiConversationDetail(req.params.conversationId, resolveActor(req));
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message || "Failed to load conversation" });
  }
};

export const sendConversationMessage = async (req: any, res: any) => {
  try {
    const result = await sendAiConversationMessage({
      ...resolveActor(req),
      conversationId: req.params.conversationId || req.body?.conversationId || null,
      message: req.body?.message,
    });
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(error.status || 500).json({
      error: error.message || "Failed to send message",
      code: error.code,
      userMessage: error.userMessage,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }
};

export const deleteConversation = async (req: any, res: any) => {
  try {
    await deleteAiConversation(req.params.conversationId, resolveActor(req));
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message || "Failed to delete conversation" });
  }
};
