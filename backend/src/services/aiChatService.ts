import { buildCatalogContext } from "./aiCatalogContextService.js";
import {
  buildStructuredPolicyContext,
  shouldUseCompactPolicyContextOnly,
  type StructuredPolicyContextResult,
} from "./aiPolicyStructuredContextService.js";
import {
  buildWebsiteKnowledgeContext,
} from "./aiWebsiteKnowledgeService.js";
import { buildStructuredAiContext, type AiStructuredContextResult } from "./aiStructuredContextService.js";

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

  const linkLimit = catalogContext.isPromotionIntent ? 8 : 5;
  const seenProductIds = new Set<string>();
  return catalogContext.matchedProducts
    .filter((product) => product.productId && product.name)
    .filter((product) => {
      if (seenProductIds.has(product.productId)) return false;
      seenProductIds.add(product.productId);
      return true;
    })
    .slice(0, linkLimit)
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

  console.log("[AI Chat] Using website context retrieval");
  const websiteKnowledgeContext = await buildWebsiteKnowledgeContext(normalizedMessage, {
    recentUserMessages,
    userId: options?.userId,
  });

  const forcePromotionProducts = websiteKnowledgeContext.intent === "promotion_products";

  // Policy snapshots and catalog retrieval are independent after intent is known.
  const [policyStructuredContext, catalogContext]: [
    StructuredPolicyContextResult,
    Awaited<ReturnType<typeof buildCatalogContext>>,
  ] = await Promise.all([
    buildStructuredPolicyContext(websiteKnowledgeContext, {
      userId: options?.userId,
      sourceTypes: websiteKnowledgeContext.sourceTypes,
    }),
    buildCatalogContext(normalizedMessage, {
      recentUserMessages,
      userId: options?.userId,
      forcePromotionProducts,
    }),
  ]);

  // Keep catalog for promotion product discovery; only suppress for pure policy intents.
  const shouldSuppressCatalogContext =
    POLICY_ONLY_INTENTS.has(websiteKnowledgeContext.intent) &&
    !forcePromotionProducts &&
    !catalogContext.isPromotionIntent;

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

  console.log(
    `[AI Chat] Context summary: intent=${websiteKnowledgeContext.intent}, authenticated=${options?.userId ? "true" : "false"}, sourceTypes=${websiteKnowledgeContext.sourceTypes.join(",") || "none"}, catalogEnabled=${effectiveCatalogContext.shouldUseCatalogContext}, variantIntent=${effectiveCatalogContext.isVariantIntent}, searchTerms=${effectiveCatalogContext.searchTerms.join(",") || "none"}, matchedProducts=${effectiveCatalogContext.matchedProducts.length}, matchedCategories=${effectiveCatalogContext.matchedCategories.length}, answerMode=${structuredContext.answerMode}, retrievalConfidence=${structuredContext.retrievalConfidence}, clarify=${structuredContext.shouldAskClarifyingQuestion ? "true" : "false"}, policyTools=${policyStructuredContext.toolNames.join(",") || "none"}, catalogSuppressed=${shouldSuppressCatalogContext ? "true" : "false"}`,
  );

  console.log("[AI Chat] Step 4/6: Building Gemini contents payload");
  const intent = websiteKnowledgeContext.intent;
  const answerMode = structuredContext.answerMode;
  const wantsListFormat =
    effectiveCatalogContext.isPromotionIntent ||
    effectiveCatalogContext.isVariantIntent ||
    intent === "promotion_products" ||
    answerMode === "catalog_direct";

  const systemInstructions = [
    "Ban la tro ly tu van noi that cua DGTech (shop noi that / trang tri nha online).",
    "Tra loi bang tieng Viet (tru khi khach dung ngon ngu khac). Xung ho tu nhien: ban/toi.",
    "Giong: than thien, gon, nhu nhan vien tu van — khong nhu bao cao he thong hay checklist.",
    "",
    "=== TRONG TAM (QUAN TRONG NHAT) ===",
    "1) Tra loi thang vao cau hoi cua khach TRUOC (1-3 cau).",
    "2) Chi them thong tin lien quan truc tiep; khong chen shipping/voucher/membership/showroom neu khach khong hoi.",
    "3) Khong lap lai toan bo policy hay 'tom tat cua hang' trong moi cau tra loi.",
    "4) Neu thieu 1 chi tiet de tra loi chinh xac, hoi DUNG 1 cau ngan — khong liet ke nhieu cau hoi.",
    answerMode === "clarify"
      ? "5) answer_mode=clarify: chi hoi lam ro (dung clarification_question neu co), chua khang dinh san pham."
      : "5) Tra loi truc tiep; chi goi y them 1 buoc tiep theo neu that su huu ich (vd. xem trang san pham).",
    "",
    "=== NGUON SU THAT ===",
    "Uu tien khoi 'AI tool result' hon context dai. Khong bia san pham, gia, ton kho, don hang, policy.",
    "Khong bia doi/tra hang hay hoan tien neu context khong co. Khong noi da thao tac he thong thay khach.",
    "Khong lo field/DB/API/id noi bo (tru ma don khi tra cuu don). Dich context ky thuat thanh ngon ngu khach hang.",
    "retrieval_confidence=low: chi goi y, khong khang dinh chac chan.",
    "",
    "=== DINH DANG ===",
    "Khong dung markdown bold (**).",
    wantsListFormat
      ? "Khi liet ke san pham/bien the/uu dai: dung gach dau dong (-) ngan, moi muc 1-2 dong (ten, gia, diem noi bat)."
      : "Uu tien van xuoi ngan. Chi dung bullet khi co tu 3 muc song song (buoc, so sanh, danh sach).",
    "Tranh tieu de muc / section header kieu bao cao. Toi da ~120 tu neu cau hoi don gian; dai hon chi khi liet ke nhieu san pham.",
    "",
    "Vi du tot (hoi phi ship): 'Phi ship tinh theo tinh/thanh va phuong thuc luc checkout. Ban o tinh nao de minh noi cu the hon?'",
    "Vi du xau: mo dau bang danh sach tat ca tinh nang shop roi moi noi toi ship.",
    "",
    effectiveCatalogContext.shouldUseCatalogContext
      ? "Catalog trong context la nguon su that ve ten/gia/tinh trang. Uu tien 1-3 san pham sat nhat; chi liet ke dai khi khach hoi khuyen mai/danh sach."
      : "Khong co catalog trong turn nay — dung khang dinh san pham/gia cu the.",
    effectiveCatalogContext.isPromotionIntent
      ? "Khach hoi giam gia/campaign/bundle: liet ke tung muc co trong context (toi da 8) kem gia + ten chuong trinh; dung chi bao 'xem tren shop'."
      : null,
    effectiveCatalogContext.isVariantIntent
      ? "Khach hoi mau/size/bien the: liet ke bien the trong Focused variants."
      : null,
    intent === "order_support"
      ? "Ho tro don: chi dung don/ma trong context. Khong thay ma → xin ma don (UUID). Khong bia trang thai."
      : null,
    intent === "membership_policy"
      ? "Membership/showroom: tra loi dung hang + dieu kien trong context; Gold moi dung Showroom 3D."
      : null,
    options?.userId
      ? "User da dang nhap: co the dung hang/voucher/don cua CHINH user neu co trong context."
      : "Chua dang nhap: dung doan hang/voucher/don ca nhan.",
  ].filter((item): item is string => typeof item === "string" && item.length > 0);

  const contextParts = [
    structuredContext.contextText,
    policyStructuredContext.contextText,
    !shouldUseCompactPolicyContextOnly(websiteKnowledgeContext) ? websiteKnowledgeContext.contextText : "",
  ].filter(Boolean);
  const contents = [
    ...(contextParts.length > 0
      ? [
          {
            role: "user",
            parts: [
              {
                text: `Du lieu noi bo DGTech (chi de tra loi, khong trich nguyen van ky thuat):\n${contextParts.join("\n\n")}`,
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: "Da hieu. Toi se tra loi gon, dung trong tam cau hoi, va chi dung du lieu nay lam nguon su that.",
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
  const temperature =
    answerMode === "clarify" || intent === "order_support" || intent === "payment_policy" ? 0.35 : 0.65;
  const maxOutputTokens = effectiveCatalogContext.isPromotionIntent
    ? 1200
    : wantsListFormat
      ? 900
      : 560;
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
        temperature,
        maxOutputTokens,
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
