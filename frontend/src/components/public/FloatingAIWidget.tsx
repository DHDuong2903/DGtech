"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, History, MessageCirclePlus, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { aiChatApi } from "@/src/apis";
import type { AiConversationListItem, AiConversationMessage } from "@/src/types";
import { cn } from "@/src/lib/utils";

const GUEST_SESSION_STORAGE_KEY = "dgtech_ai_guest_session_id";

function ensureGuestSessionId() {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
  if (existing) return existing;
  const next = window.crypto?.randomUUID?.() || `guest-${Date.now()}`;
  window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, next);
  return next;
}

function formatConversationDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function introMessage(): AiConversationMessage {
  const now = new Date().toISOString();
  return {
    messageId: "intro",
    conversationId: "intro",
    role: "assistant",
    content: "Xin chao, toi la DGTech AI Assistant. Toi co the ho tro ban ve san pham, don hang va mua sam.",
    createdAt: now,
    updatedAt: now,
  };
}

export const FloatingAIWidget = () => {
  const { isSignedIn } = useUser();
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<AiConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const resolvedGuestSessionId = guestSessionId;
  const showHistorySidebar = isSignedIn;

  const displayedMessages = messages.length > 0 ? messages : [introMessage()];

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    setLoadError(null);
    try {
      const items = await aiChatApi.listConversations(resolvedGuestSessionId);
      setConversations(items);
      setActiveConversationId((prev) => prev || items[0]?.conversationId || null);
      setIsHistoryOpen(items.length > 0);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load conversations.");
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversationDetail = async (conversationId: string) => {
    setIsLoadingMessages(true);
    setLoadError(null);
    try {
      const detail = await aiChatApi.getConversationDetail(conversationId, resolvedGuestSessionId);
      setMessages(detail.messages);
      setConversations((prev) =>
        prev.map((item) => (item.conversationId === detail.conversation.conversationId ? detail.conversation : item)),
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load conversation.");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewChat = async () => {
    setLoadError(null);
    if (!isSignedIn) {
      setActiveConversationId(null);
      setMessages([]);
      return;
    }
    try {
      const conversation = await aiChatApi.createConversation(resolvedGuestSessionId);
      setConversations((prev) => [
        conversation,
        ...prev.filter((item) => item.conversationId !== conversation.conversationId),
      ]);
      setActiveConversationId(conversation.conversationId);
      setIsHistoryOpen(true);
      setMessages([]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not create a new chat.");
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    await loadConversationDetail(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!isSignedIn) return;
    setLoadError(null);
    try {
      await aiChatApi.deleteConversation(conversationId);
      const nextConversations = conversations.filter((item) => item.conversationId !== conversationId);
      setConversations(nextConversations);
      setIsHistoryOpen(nextConversations.length > 0);
      if (activeConversationId === conversationId) {
        const nextActiveId = nextConversations[0]?.conversationId || null;
        setActiveConversationId(nextActiveId);
        if (!nextActiveId) {
          setMessages([]);
        }
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not delete conversation.");
    }
  };

  const handleSendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isSending) return;

    const pendingUserMessage: AiConversationMessage = {
      messageId: `pending-user-${Date.now()}`,
      conversationId: activeConversationId || "pending",
      role: "user",
      content: trimmedInput,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, pendingUserMessage]);
    setInput("");
    setIsSending(true);
    setLoadError(null);

    try {
      if (!isSignedIn) {
        const reply = await aiChatApi.sendGuestMessage(
          trimmedInput,
          displayedMessages
            .filter((message) => message.messageId !== "intro")
            .map((message) => ({
              sender: message.role === "assistant" ? "ai" : "user",
              text: message.content,
            })),
        );

        setMessages((prev) => [
          ...prev.filter((message) => message.messageId !== pendingUserMessage.messageId),
          pendingUserMessage,
          {
            messageId: `guest-ai-${Date.now()}`,
            conversationId: "guest",
            role: "assistant",
            content: reply,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      } else {
        const result = await aiChatApi.sendMessage({
          conversationId: activeConversationId,
          message: trimmedInput,
          guestSessionId: resolvedGuestSessionId,
        });

        setActiveConversationId(result.conversation.conversationId);
        setMessages((prev) => [
          ...prev.filter((message) => message.messageId !== pendingUserMessage.messageId),
          result.userMessage,
          result.assistantMessage,
        ]);
        setConversations((prev) => [
          result.conversation,
          ...prev.filter((item) => item.conversationId !== result.conversation.conversationId),
        ]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Xin loi, hien tai toi chua the phan hoi.";
      setMessages((prev) => [
        ...prev.filter((message) => message.messageId !== pendingUserMessage.messageId),
        pendingUserMessage,
        {
          messageId: `error-${Date.now()}`,
          conversationId: activeConversationId || "pending",
          role: "assistant",
          content: errorMessage,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    setGuestSessionId(ensureGuestSessionId());
  }, []);

  useEffect(() => {
    if (!isOpen || !isSignedIn) return;
    void loadConversations();
  }, [isOpen, isSignedIn, guestSessionId]);

  useEffect(() => {
    setIsHistoryOpen(!!isSignedIn);
  }, [isSignedIn]);

  useEffect(() => {
    if (!isOpen || !isSignedIn || !activeConversationId) return;
    const hasSelectedConversation = conversations.some((item) => item.conversationId === activeConversationId);
    if (!hasSelectedConversation) return;
    void loadConversationDetail(activeConversationId);
  }, [activeConversationId, isOpen, isSignedIn]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [displayedMessages, isSending]);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4">
      {isOpen && (
        <div className="flex h-128 w-104 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">DGTech AI</h3>
              </div>
              <div className="flex items-center gap-1">
                {showHistorySidebar && (
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-8 w-8 cursor-pointer", isHistoryOpen && "bg-muted text-foreground")}
                  onClick={() => setIsHistoryOpen((prev) => !prev)}
                  aria-label="Toggle history"
                >
                    <History className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => void handleNewChat()}
                  aria-label="New chat"
                >
                  <MessageCirclePlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex flex-1">
              {showHistorySidebar && isHistoryOpen && (
                <aside className="flex w-24 flex-col border-r border-border bg-muted/20">
                  <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                    {isLoadingConversations ? (
                      <div className="px-2 py-3 text-xs text-muted-foreground">Loading chats...</div>
                    ) : conversations.length === 0 ? (
                      <div className="px-2 py-3 text-xs leading-relaxed text-muted-foreground">
                        No saved chats yet. Start a new one.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {conversations.map((conversation) => {
                          const isActive = conversation.conversationId === activeConversationId;
                          return (
                            <div
                              key={conversation.conversationId}
                              className={cn(
                                "group rounded-xl border px-2.5 py-2 transition-colors",
                                isActive
                                  ? "border-orange-400/60 bg-orange-50 text-foreground dark:bg-orange-950/20"
                                  : "border-transparent bg-background/80 hover:border-border hover:bg-background",
                              )}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => void handleSelectConversation(conversation.conversationId)}
                                  className="min-w-0 flex-1 cursor-pointer text-left"
                                >
                                  <div className="truncate text-xs font-medium">{conversation.title}</div>
                                  <div className="mt-1 text-[10px] text-muted-foreground">
                                    {formatConversationDate(conversation.updatedAt)}
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDeleteConversation(conversation.conversationId);
                                  }}
                                  className="cursor-pointer text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                                  aria-label="Delete conversation"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </aside>
              )}

              <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {isLoadingMessages ? (
                  <div className="text-sm text-muted-foreground">Loading messages...</div>
                ) : (
                  displayedMessages.map((message) => (
                    <div
                      key={message.messageId}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={cn(
                          "max-w-60 rounded-2xl px-3 py-2 text-sm leading-relaxed",
                          message.role === "user" ? "bg-orange-500 text-white" : "bg-muted text-foreground",
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))
                )}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="max-w-60 rounded-2xl bg-muted px-3 py-2 text-sm text-foreground">
                      Dang tra loi...
                    </div>
                  </div>
                )}
                {loadError && <div className="text-xs text-destructive">{loadError}</div>}
              </div>
            </div>

            <div className="border-t-2 border-orange-500/20 px-3 py-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ask DGTech AI..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleSendMessage()}
                  disabled={isSending}
                  className="border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  size="sm"
                  onClick={() => void handleSendMessage()}
                  disabled={isSending}
                  className="h-9 w-9 rounded-full bg-orange-500 p-0 hover:bg-orange-600 disabled:bg-orange-300"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative h-12 w-12 shrink-0 cursor-pointer transition-transform duration-300 ease-out hover:scale-110 active:scale-95"
      >
        <Image src="/logodg.png" alt="DGTech" fill className="object-contain" priority />
      </div>
    </div>
  );
};
