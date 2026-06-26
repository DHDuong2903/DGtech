import { buildCatalogContext } from "./aiCatalogContextService.js";
import {
  buildStructuredPolicyContext,
  shouldUseCompactPolicyContextOnly,
  type StructuredPolicyContextResult,
} from "./aiPolicyStructuredContextService.js";
import {
  buildWebsiteKnowledgeContext,
  detectAiIntent,
  type WebsiteKnowledgeContextResult,
} from "./aiWebsiteKnowledgeService.js";
import { buildStructuredAiContext, type AiStructuredContextResult } from "./aiStructuredContextService.js";
import { retrieveRelevantKnowledge, formatRagContextForLLM } from "./aiRagRetrievalService.js";

// Feature flag: set to true to use RAG, false to use legacy keyword-based
const USE_RAG_RETRIEVAL = process.env.USE_RAG_RETRIEVAL === "true";

export type ChatHistoryMessage = {
  sender: "user" | "ai";
  text: string;
};

type ChatProductLink = {
  productId: string;
  name: string;
  url: string;
};

type GeminiTextPart = {
  text: string;
};

type GeminiCandidate = {
  finishReason?: string;
  content?: {
    parts?: GeminiTextPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
  };
};

const GEMINI_MODEL = process.env.GEMINI_MODEL;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_HISTORY_MESSAGES = 12;
const POLICY_ONLY_INTENTS = new Set([
  "shipping_policy",
  "payment_policy",
  "membership_policy",
  "voucher_policy",
]);

function buildRagSourceTypes(ragRetrieval: Awaited<ReturnType<typeof retrieveRelevantKnowledge>>) {
  const staticSourceTypes = ragRetrieval.staticKnowledge.map((doc) => `rag_${doc.contentType}`);
  const dynamicSourceTypes = Object.entries(ragRetrieval.needsDynamicData)
    .filter(([, isNeeded]) => isNeeded)
    .map(([name]) => `dynamic_${name}`);

  return Array.from(new Set(["rag_semantic_search", ...staticSourceTypes, ...dynamicSourceTypes]));
}

function maskApiKey(apiKey: string) {
  if (apiKey.length <= 8) return `${apiKey.slice(0, 2)}***${apiKey.slice(-2)}`;
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function normalizeHistory(history: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item): item is ChatHistoryMessage =>
        !!item &&
        typeof item === "object" &&
        ((item as ChatHistoryMessage).sender === "user" || (item as ChatHistoryMessage).sender === "ai") &&
        typeof (item as ChatHistoryMessage).text === "string",
    )
    .map((item) => ({
      sender: item.sender,
      text: item.text.trim(),
    }))
    .filter((item) => item.text.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

function extractReply(payload: GeminiResponse): string {
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (text) return text;
  if (payload.error?.message) {
    throw Object.assign(new Error(payload.error.message), { status: 502 });
  }
  throw Object.assign(new Error("Gemini did not return a response"), { status: 502 });
}

function parseRetryAfterSeconds(message: string) {
  const match = message.match(/Please retry in\s+([\d.]+)s/i);
  if (!match) return undefined;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? Math.ceil(parsed) : undefined;
}

function normalizeReplyFormatting(reply: string) {
  let out = String(reply || "").replace(/\r\n/g, "\n").trim();

  out = out.replace(/\*\*(.*?)\*\*/g, "$1");
  out = out.replace(/__(.*?)__/g, "$1");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  out = out.replace(/\s+(?=(?:- |\d+\.\s))/g, "\n");

  if (!out.includes("\n")) {
    const sentences = out.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length >= 3) {
      out = sentences.join("\n");
    }
  }

  return out.trim();
}

function buildProductLinks(catalogContext: Awaited<ReturnType<typeof buildCatalogContext>>): ChatProductLink[] {
  if (!catalogContext.shouldUseCatalogContext || catalogContext.matchedProducts.length === 0) {
    return [];
  }

  const seenProductIds = new Set<string>();
  return catalogContext.matchedProducts
    .filter((product) => product.productId && product.name)
    .filter((product) => {
      if (seenProductIds.has(product.productId)) return false;
      seenProductIds.add(product.productId);
      return true;
    })
    .slice(0, 5)
    .map((product) => ({
      productId: product.productId,
      name: product.name,
      url: `/shop/${encodeURIComponent(product.productId)}`,
    }));
}

export async function generateChatReply(
  message: unknown,
  history: unknown,
  options?: {
    userId?: string | null;
  },
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured"), { status: 500 });
  }

  console.log(`[AI Chat] Gemini request with model=${GEMINI_MODEL}, apiKey=${maskApiKey(apiKey)}`);
  console.log("[AI Chat] Step 1/6: Validating incoming message");

  const normalizedMessage = typeof message === "string" ? message.trim() : "";
  if (!normalizedMessage) {
    throw Object.assign(new Error("Message is required"), { status: 400 });
  }

  console.log("[AI Chat] Step 2/6: Normalizing conversation history");
  const normalizedHistory = normalizeHistory(history);
  const recentUserMessages = normalizedHistory
    .filter((item) => item.sender === "user")
    .map((item) => item.text)
    .slice(-3);
  console.log(
    `[AI Chat] History prepared: messageLength=${normalizedMessage.length}, historyCount=${normalizedHistory.length}`,
  );

  console.log("[AI Chat] Step 3/6: Building website context from catalog data");

  let retrievalMode: "rag" | "legacy" = USE_RAG_RETRIEVAL ? "rag" : "legacy";
  let ragRetrieval: Awaited<ReturnType<typeof retrieveRelevantKnowledge>> | null = null;
  let websiteKnowledgeContext: WebsiteKnowledgeContextResult;
  let policyStructuredContext: StructuredPolicyContextResult = {
    contextText: "",
    toolNames: [],
  };

  if (USE_RAG_RETRIEVAL) {
    try {
      console.log("[AI Chat] Using RAG retrieval (semantic search)");
      ragRetrieval = await retrieveRelevantKnowledge(normalizedMessage, {
        userId: options?.userId,
        recentUserMessages,
      });

      websiteKnowledgeContext = {
        intent: detectAiIntent(normalizedMessage, { recentUserMessages }),
        sourceTypes: buildRagSourceTypes(ragRetrieval),
        contextText: formatRagContextForLLM(ragRetrieval),
      };
    } catch (error) {
      retrievalMode = "legacy";
      ragRetrieval = null;
      console.warn(
        `[AI Chat] RAG retrieval failed; falling back to legacy retrieval: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      websiteKnowledgeContext = await buildWebsiteKnowledgeContext(normalizedMessage, {
        recentUserMessages,
        userId: options?.userId,
      });
      policyStructuredContext = await buildStructuredPolicyContext(websiteKnowledgeContext, {
        userId: options?.userId,
        sourceTypes: websiteKnowledgeContext.sourceTypes,
      });
    }
  } else {
    console.log("[AI Chat] Using legacy keyword-based retrieval");
    websiteKnowledgeContext = await buildWebsiteKnowledgeContext(normalizedMessage, {
      recentUserMessages,
      userId: options?.userId,
    });
    policyStructuredContext = await buildStructuredPolicyContext(websiteKnowledgeContext, {
      userId: options?.userId,
      sourceTypes: websiteKnowledgeContext.sourceTypes,
    });
  }

  const catalogContext = await buildCatalogContext(normalizedMessage, {
    recentUserMessages,
    userId: options?.userId,
  });

  const shouldSuppressCatalogContext = retrievalMode === "rag"
    ? false // RAG handles this automatically
    : POLICY_ONLY_INTENTS.has(websiteKnowledgeContext.intent);

  const effectiveCatalogContext = shouldSuppressCatalogContext
    ? {
        ...catalogContext,
        shouldUseCatalogContext: false,
        matchedProducts: [],
        matchedCategories: [],
        contextText: "",
      }
    : catalogContext;

  const structuredContext: AiStructuredContextResult = buildStructuredAiContext(
    normalizedMessage,
    effectiveCatalogContext,
    websiteKnowledgeContext,
  );

  if (retrievalMode === "rag" && ragRetrieval) {
    console.log(
      `[AI Chat] RAG Context summary: retrievedDocs=${ragRetrieval.staticKnowledge.length}, ` +
      `dynamicData=${Object.keys(ragRetrieval.dynamicContext).join(",") || "none"}, ` +
      `catalogEnabled=${effectiveCatalogContext.shouldUseCatalogContext}, ` +
      `matchedProducts=${effectiveCatalogContext.matchedProducts.length}, ` +
      `answerMode=${structuredContext.answerMode}, ` +
      `retrievalConfidence=${structuredContext.retrievalConfidence}`
    );
  } else {
    console.log(
      `[AI Chat] Context summary: intent=${websiteKnowledgeContext.intent}, authenticated=${options?.userId ? "true" : "false"}, sourceTypes=${websiteKnowledgeContext.sourceTypes.join(",") || "none"}, catalogEnabled=${effectiveCatalogContext.shouldUseCatalogContext}, variantIntent=${effectiveCatalogContext.isVariantIntent}, searchTerms=${effectiveCatalogContext.searchTerms.join(",") || "none"}, matchedProducts=${effectiveCatalogContext.matchedProducts.length}, matchedCategories=${effectiveCatalogContext.matchedCategories.length}, answerMode=${structuredContext.answerMode}, retrievalConfidence=${structuredContext.retrievalConfidence}, clarify=${structuredContext.shouldAskClarifyingQuestion ? "true" : "false"}, policyTools=${policyStructuredContext.toolNames.join(",") || "none"}, catalogSuppressed=${shouldSuppressCatalogContext ? "true" : "false"}`,
    );
  }

  console.log("[AI Chat] Step 4/6: Building Gemini contents payload");
  const systemInstructions = [
    "You are DGTech AI Assistant for an e-commerce website named DGTech.",
    "Answer in Vietnamese by default unless the user clearly uses another language.",
    "Be concise, helpful, and commerce-support oriented.",
    "Help with products, orders, shipping, payment, promotions, and store guidance.",
    "If you do not know a specific store policy or order detail, say so clearly and avoid inventing facts.",
    "Do not claim to have performed actions in external systems.",
    "Treat the provided website knowledge context as source of truth for store capabilities, payment rules, shipping behavior, tax settings, and general store guidance.",
    "Treat any AI tool result block as higher priority than verbose context if they disagree.",
    "Never expose internal field names, database table names, schema names, raw identifiers, or implementation details to customers.",
    "Rewrite technical context into natural Vietnamese suitable for customers.",
    "If the AI tool result says answer_mode=clarify, ask exactly one short clarification question first and do not pretend to know the exact product yet.",
    "If retrieval_confidence=low, present uncertain results as suggestions only and avoid definitive claims unless the context explicitly confirms them.",
    "",
    "=== RESPONSE FORMATTING RULES ===",
    "Format your response for maximum clarity and readability:",
    "- Do not use markdown bold and do not wrap any data with **",
    "- Use bullet points with dashes (-) instead of one dense paragraph",
    "- Separate ideas with line breaks for better readability",
    "- Use numbered lists (1. 2. 3.) for steps or rankings",
    "- Use section headers with descriptive labels when organizing information",
    "- Keep paragraphs short - maximum 2-3 sentences per paragraph",
    "- Avoid long one-block answers; split content into short sections or bullet points",
    "Example of good formatting:",
    "  'Dịch vụ giao hàng của chúng tôi:'",
    "  '- Giao hàng tiêu chuẩn: 3-5 ngày (miễn phí từ 500K)'",
    "  '- Giao hàng nhanh: 1-2 ngày (phí tính theo địa điểm)'",
    "  '- Giao hàng Express: Cùng ngày (cho TP.HCM, Hà Nội)'",
    "",
    effectiveCatalogContext.shouldUseCatalogContext
      ? "When website catalog context is provided, treat it as the source of truth for product availability, pricing, and categories."
      : "No website catalog context was provided for this question, so avoid claiming exact product availability unless the user already gave that information.",
    effectiveCatalogContext.isVariantIntent
      ? "If the question asks about variants, types, colors, sizes, or attributes, answer from Focused product variants first and enumerate the concrete variants you see there."
      : "If Focused product variants are present, use them when they materially improve product-detail accuracy.",
    websiteKnowledgeContext.intent === "order_support"
      ? "For order-specific questions, explain the order flow and limitations clearly, but do not claim to see a user's private order unless that data is explicitly provided in context."
      : "If the user asks about store operations, policies, shipping, payment, or promotions, ground the answer in website knowledge context first.",
    options?.userId
      ? "Authenticated user context may be present. If so, you may use it to answer about the current signed-in user's own rank or recent orders."
      : "No authenticated user context is available in this request, so do not claim to know the user's private rank or order history.",
  ];
  const contextParts = [
    structuredContext.contextText,
    policyStructuredContext.contextText,
    retrievalMode === "rag" || !shouldUseCompactPolicyContextOnly(websiteKnowledgeContext)
      ? websiteKnowledgeContext.contextText
      : "",
  ].filter(Boolean);
  const contents = [
    ...(contextParts.length > 0
      ? [
          {
            role: "user",
            parts: [{ text: `Context du lieu website:\n${contextParts.join("\n\n")}` }],
          },
          {
            role: "model",
            parts: [
              {
                text: "Toi da nhan context du lieu website va se uu tien dung context nay lam nguon su that khi tra loi.",
              },
            ],
          },
        ]
      : []),
    ...normalizedHistory.map((item) => ({
      role: item.sender === "user" ? "user" : "model",
      parts: [{ text: item.text }],
    })),
    {
      role: "user",
      parts: [{ text: normalizedMessage }],
    },
  ];

  console.log("[AI Chat] Step 5/6: Sending request to Gemini API");
  const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: systemInstructions.join(" "),
          },
        ],
      },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 768,
      },
    }),
  });

  console.log(`[AI Chat] Gemini HTTP status=${response.status}`);
  const payload = (await response.json().catch(() => ({}))) as GeminiResponse;

  if (!response.ok) {
    const rawMessage = payload.error?.message || "Failed to get response from Gemini";
    const quotaExceeded =
      response.status === 429 &&
      /quota exceeded|rate limit|billing|free_tier_requests|input_token_count/i.test(rawMessage);

    throw Object.assign(new Error(rawMessage), {
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      code: quotaExceeded ? "GEMINI_QUOTA_EXCEEDED" : "GEMINI_API_ERROR",
      userMessage: quotaExceeded
        ? "AI chatbot tam thoi khong kha dung vi Gemini API key hien tai da het quota hoac chua duoc cap billing."
        : "AI chatbot tam thoi khong kha dung. Vui long thu lai sau.",
      retryAfterSeconds: parseRetryAfterSeconds(rawMessage),
    });
  }

  const reply = normalizeReplyFormatting(extractReply(payload));
  console.log(
    `[AI Chat] Gemini response finishReason=${payload.candidates?.[0]?.finishReason || "unknown"}, replyLength=${reply.length}, totalTokens=${payload.usageMetadata?.totalTokenCount ?? "n/a"}`,
  );
  console.log("[AI Chat] Step 6/6: Response extracted successfully");

  return {
    reply,
    model: GEMINI_MODEL,
    intent: websiteKnowledgeContext.intent,
    sourceTypes: websiteKnowledgeContext.sourceTypes,
    catalogEnabled: effectiveCatalogContext.shouldUseCatalogContext,
    productLinks: buildProductLinks(effectiveCatalogContext),
  };
}
