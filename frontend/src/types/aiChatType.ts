export type AiConversationMessageRole = "user" | "assistant" | "system";

export interface AiConversationMessage {
  messageId: string;
  conversationId: string;
  role: AiConversationMessageRole;
  content: string;
  intent?: string | null;
  model?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationListItem {
  conversationId: string;
  title: string;
  status: string;
  clerkId?: string | null;
  guestSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    role: AiConversationMessageRole;
    content: string;
    createdAt: string;
  } | null;
}

export interface AiConversationDetail {
  conversation: AiConversationListItem;
  messages: AiConversationMessage[];
}
