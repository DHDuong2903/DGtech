import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import axios from "axios";
import type { AiChatProductLink, AiConversationDetail, AiConversationListItem, AiConversationMessage } from "../types";

type ChatMessagePayload = {
  sender: "user" | "ai";
  text: string;
};

type ChatApiErrorResponse = {
  error?: string;
  code?: string;
  userMessage?: string;
  retryAfterSeconds?: number;
};

type GuestChatResponse = {
  reply: string;
  productLinks?: AiChatProductLink[];
};

type ConversationListResponse = {
  conversations: AiConversationListItem[];
};

type ConversationCreateResponse = {
  conversation: AiConversationListItem;
};

type ConversationDetailResponse = AiConversationDetail;

type ConversationSendMessageResponse = {
  conversation: AiConversationListItem;
  userMessage: AiConversationMessage;
  assistantMessage: AiConversationMessage;
};

function withGuestSessionId<T extends Record<string, unknown>>(payload: T, guestSessionId?: string | null) {
  if (!guestSessionId) return payload;
  return {
    ...payload,
    guestSessionId,
  };
}

export const aiChatApi = {
  sendGuestMessage: async (message: string, history: ChatMessagePayload[]): Promise<GuestChatResponse> => {
    try {
      const { data } = await axiosInstance.post<GuestChatResponse>(`${API_ROUTE.AI}/chat`, {
        message,
        history,
      });
      return {
        reply: data.reply,
        productLinks: data.productLinks || [],
      };
    } catch (error) {
      if (axios.isAxiosError<ChatApiErrorResponse>(error)) {
        const apiError = error.response?.data;
        const retryHint =
          apiError?.retryAfterSeconds && apiError.retryAfterSeconds > 0
            ? ` Thu lai sau khoang ${apiError.retryAfterSeconds} giay.`
            : "";

        throw new Error(apiError?.userMessage ? `${apiError.userMessage}${retryHint}` : apiError?.error || error.message);
      }

      throw error;
    }
  },

  listConversations: async (guestSessionId?: string | null): Promise<AiConversationListItem[]> => {
    try {
      const { data } = await axiosInstance.get<ConversationListResponse>(`${API_ROUTE.AI}/conversations`, {
        params: guestSessionId ? { guestSessionId } : undefined,
      });
      return data.conversations || [];
    } catch (error) {
      if (axios.isAxiosError<ChatApiErrorResponse>(error)) {
        const apiError = error.response?.data;
        throw new Error(apiError?.userMessage || apiError?.error || error.message);
      }
      throw error;
    }
  },

  createConversation: async (guestSessionId?: string | null): Promise<AiConversationListItem> => {
    try {
      const { data } = await axiosInstance.post<ConversationCreateResponse>(
        `${API_ROUTE.AI}/conversations`,
        withGuestSessionId({}, guestSessionId),
      );
      return data.conversation;
    } catch (error) {
      if (axios.isAxiosError<ChatApiErrorResponse>(error)) {
        const apiError = error.response?.data;
        throw new Error(apiError?.userMessage || apiError?.error || error.message);
      }
      throw error;
    }
  },

  getConversationDetail: async (
    conversationId: string,
    guestSessionId?: string | null,
  ): Promise<AiConversationDetail> => {
    try {
      const { data } = await axiosInstance.get<ConversationDetailResponse>(`${API_ROUTE.AI}/conversations/${conversationId}`, {
        params: guestSessionId ? { guestSessionId } : undefined,
      });
      return data;
    } catch (error) {
      if (axios.isAxiosError<ChatApiErrorResponse>(error)) {
        const apiError = error.response?.data;
        throw new Error(apiError?.userMessage || apiError?.error || error.message);
      }
      throw error;
    }
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    try {
      await axiosInstance.delete(`${API_ROUTE.AI}/conversations/${conversationId}`);
    } catch (error) {
      if (axios.isAxiosError<ChatApiErrorResponse>(error)) {
        const apiError = error.response?.data;
        throw new Error(apiError?.userMessage || apiError?.error || error.message);
      }
      throw error;
    }
  },

  sendMessage: async (params: {
    conversationId?: string | null;
    message: string;
    guestSessionId?: string | null;
  }): Promise<ConversationSendMessageResponse> => {
    const endpoint = params.conversationId
      ? `${API_ROUTE.AI}/conversations/${params.conversationId}/messages`
      : `${API_ROUTE.AI}/messages`;

    try {
      const { data } = await axiosInstance.post<ConversationSendMessageResponse>(
        endpoint,
        withGuestSessionId(
          {
            message: params.message,
            ...(params.conversationId ? {} : { conversationId: null }),
          },
          params.guestSessionId,
        ),
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError<ChatApiErrorResponse>(error)) {
        const apiError = error.response?.data;
        const retryHint =
          apiError?.retryAfterSeconds && apiError.retryAfterSeconds > 0
            ? ` Thu lai sau khoang ${apiError.retryAfterSeconds} giay.`
            : "";

        throw new Error(apiError?.userMessage ? `${apiError.userMessage}${retryHint}` : apiError?.error || error.message);
      }

      throw error;
    }
  },
};
