import { generateChatReply } from "../services/aiChatService.js";

export const chatWithAi = async (req: any, res: any) => {
  try {
    console.log("[AI Chat] Incoming request received");
    const payload = await generateChatReply(req.body?.message, req.body?.history, {
      userId: req.auth?.userId || null,
    });
    console.log("[AI Chat] Sending response back to client");
    return res.status(200).json({
      message: "AI response generated successfully",
      ...payload,
    });
  } catch (error: any) {
    console.error("Loi khi goi chatWithAi:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Loi he thong",
      code: error.code,
      userMessage: error.userMessage,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }
};
