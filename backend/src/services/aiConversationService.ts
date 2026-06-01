import { Op } from "sequelize";
import { AiConversation, AiConversationMessage } from "../models/associationsModel.js";
import { generateChatReply, type ChatHistoryMessage } from "./aiChatService.js";

const DEFAULT_CONVERSATION_TITLE = "New chat";
const MAX_CONTEXT_MESSAGES = 12;
const MAX_STORED_MESSAGES_PER_FETCH = 100;
const MAX_CONVERSATIONS_PER_USER = 5;

type ConversationActor = {
  userId?: string | null;
  guestSessionId?: string | null;
};

function buildOwnerWhere(actor: ConversationActor) {
  const userId = typeof actor.userId === "string" && actor.userId.trim() ? actor.userId.trim() : null;
  const guestSessionId =
    typeof actor.guestSessionId === "string" && actor.guestSessionId.trim() ? actor.guestSessionId.trim() : null;

  if (userId && guestSessionId) {
    return {
      [Op.or]: [{ clerkId: userId }, { guestSessionId }],
    };
  }
  if (userId) return { clerkId: userId };
  if (guestSessionId) return { guestSessionId };
  return null;
}

function requireConversationActor(actor: ConversationActor) {
  const ownerWhere = buildOwnerWhere(actor);
  if (!ownerWhere) {
    throw Object.assign(new Error("guestSessionId or authenticated user is required"), { status: 400 });
  }
  return ownerWhere;
}

function createConversationTitle(input: string) {
  const trimmed = String(input || "").replace(/\s+/g, " ").trim();
  if (!trimmed) return DEFAULT_CONVERSATION_TITLE;
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

function normalizeMessageRow(row: any) {
  return {
    messageId: row.messageId,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    intent: row.intent || null,
    model: row.model || null,
    metadata: row.metadata || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizeConversationRow(row: any, lastMessage?: any) {
  return {
    conversationId: row.conversationId,
    title: row.title,
    status: row.status,
    clerkId: row.clerkId || null,
    guestSessionId: row.guestSessionId || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastMessage: lastMessage
      ? {
          role: lastMessage.role,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
        }
      : null,
  };
}

async function findConversationOrThrow(conversationId: string, actor: ConversationActor) {
  const ownerWhere = requireConversationActor(actor);
  const conversation = await AiConversation.findOne({
    where: {
      conversationId,
      ...ownerWhere,
    },
  });

  if (!conversation) {
    throw Object.assign(new Error("Conversation not found"), { status: 404 });
  }

  return conversation;
}

async function enforceConversationLimit(actor: ConversationActor) {
  if (!actor.userId) return;
  const rows = await AiConversation.findAll({
    where: { clerkId: actor.userId },
    order: [["updatedAt", "DESC"]],
    attributes: ["conversationId"],
    offset: MAX_CONVERSATIONS_PER_USER,
  });

  const overflowIds = rows.map((row: any) => row.conversationId).filter(Boolean);
  if (!overflowIds.length) return;

  await AiConversation.destroy({
    where: {
      clerkId: actor.userId,
      conversationId: { [Op.in]: overflowIds },
    },
  });
}

async function findRecentHistory(conversationId: string): Promise<ChatHistoryMessage[]> {
  const rows = await AiConversationMessage.findAll({
    where: {
      conversationId,
      role: { [Op.in]: ["user", "assistant"] },
    },
    order: [["createdAt", "DESC"]],
    limit: MAX_CONTEXT_MESSAGES,
  });

  return rows
    .reverse()
    .map((row: any) => ({
      sender: (row.role === "assistant" ? "ai" : "user") as "ai" | "user",
      text: String(row.content || ""),
    }))
    .filter((item) => item.text.trim().length > 0);
}

async function loadLatestMessageByConversationId(conversationIds: string[]) {
  const uniqueIds = [...new Set(conversationIds.filter(Boolean))];
  const map = new Map<string, any>();
  if (!uniqueIds.length) return map;

  const rows = await AiConversationMessage.findAll({
    where: { conversationId: { [Op.in]: uniqueIds } },
    order: [["conversationId", "ASC"], ["createdAt", "DESC"]],
  });

  for (const row of rows as any[]) {
    const plain = row.get({ plain: true });
    if (!map.has(plain.conversationId)) {
      map.set(plain.conversationId, plain);
    }
  }

  return map;
}

export async function listAiConversations(actor: ConversationActor) {
  const ownerWhere = requireConversationActor(actor);
  const conversations = await AiConversation.findAll({
    where: ownerWhere,
    order: [["updatedAt", "DESC"]],
    limit: 20,
  });

  const latestMessageByConversationId = await loadLatestMessageByConversationId(
    conversations.map((row: any) => row.conversationId),
  );

  return conversations.map((row: any) => {
    const plain = row.get({ plain: true });
    return normalizeConversationRow(plain, latestMessageByConversationId.get(plain.conversationId));
  });
}

export async function createAiConversation(actor: ConversationActor) {
  requireConversationActor(actor);
  const payload = {
    clerkId: actor.userId || null,
    guestSessionId: actor.userId ? null : actor.guestSessionId || null,
    title: DEFAULT_CONVERSATION_TITLE,
    status: "ACTIVE",
  };
  const conversation = await AiConversation.create(payload);
  await enforceConversationLimit(actor);
  return normalizeConversationRow(conversation.get({ plain: true }));
}

export async function getAiConversationDetail(conversationId: string, actor: ConversationActor) {
  const conversation = await findConversationOrThrow(conversationId, actor);
  const messages = await AiConversationMessage.findAll({
    where: { conversationId },
    order: [["createdAt", "ASC"]],
    limit: MAX_STORED_MESSAGES_PER_FETCH,
  });

  return {
    conversation: normalizeConversationRow(conversation.get({ plain: true })),
    messages: messages.map((row: any) => normalizeMessageRow(row.get({ plain: true }))),
  };
}

export async function sendAiConversationMessage(params: ConversationActor & { conversationId?: string | null; message: string }) {
  const ownerWhere = requireConversationActor(params);
  const normalizedMessage = String(params.message || "").trim();
  if (!normalizedMessage) {
    throw Object.assign(new Error("Message is required"), { status: 400 });
  }

  let conversation: any;
  if (params.conversationId) {
    conversation = await findConversationOrThrow(params.conversationId, params);
  } else {
    conversation = await AiConversation.create({
      clerkId: params.userId || null,
      guestSessionId: params.userId ? null : params.guestSessionId || null,
      title: DEFAULT_CONVERSATION_TITLE,
      status: "ACTIVE",
    });
    await enforceConversationLimit(params);
  }

  const history = await findRecentHistory(conversation.conversationId);

  const userMessageRow = await AiConversationMessage.create({
    conversationId: conversation.conversationId,
    role: "user",
    content: normalizedMessage,
    metadata: {
      authenticated: !!params.userId,
    },
  });

  if (conversation.title === DEFAULT_CONVERSATION_TITLE) {
    await conversation.update({ title: createConversationTitle(normalizedMessage) });
  }

  const aiPayload = await generateChatReply(normalizedMessage, history, { userId: params.userId || null });

  const assistantMessageRow = await AiConversationMessage.create({
    conversationId: conversation.conversationId,
    role: "assistant",
    content: aiPayload.reply,
    intent: aiPayload.intent || null,
    model: aiPayload.model || null,
    metadata: {
      sourceTypes: aiPayload.sourceTypes || [],
      catalogEnabled: !!aiPayload.catalogEnabled,
      authenticated: !!params.userId,
    },
  });

  await conversation.update({ updatedAt: new Date() });

  const refreshedConversation = await AiConversation.findOne({
    where: {
      conversationId: conversation.conversationId,
      ...ownerWhere,
    },
  });

  return {
    conversation: normalizeConversationRow((refreshedConversation || conversation).get({ plain: true }), assistantMessageRow.get({ plain: true })),
    userMessage: normalizeMessageRow(userMessageRow.get({ plain: true })),
    assistantMessage: normalizeMessageRow(assistantMessageRow.get({ plain: true })),
  };
}

export async function deleteAiConversation(conversationId: string, actor: ConversationActor) {
  const conversation = await findConversationOrThrow(conversationId, actor);
  await conversation.destroy();
}
