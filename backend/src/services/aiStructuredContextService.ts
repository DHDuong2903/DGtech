import type { CatalogContextResult } from "./aiCatalogContextService.js";
import type { WebsiteKnowledgeContextResult } from "./aiWebsiteKnowledgeService.js";

type RetrievalConfidence = "high" | "medium" | "low" | "none";
type AnswerMode = "clarify" | "catalog_direct" | "policy_direct" | "general";

export type AiStructuredContextResult = {
  answerMode: AnswerMode;
  retrievalConfidence: RetrievalConfidence;
  shouldAskClarifyingQuestion: boolean;
  clarificationQuestion: string | null;
  contextText: string;
};

type CatalogProduct = CatalogContextResult["matchedProducts"][number];
type CatalogCategory = CatalogContextResult["matchedCategories"][number];

function normalizeText(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatPrice(price: number | string) {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return String(price);
  return `${numeric.toLocaleString("vi-VN")} VND`;
}

function formatStock(stock: number) {
  return Number(stock) > 0 ? "Con hang" : "Tam het hang";
}

function formatVariantSummary(product: CatalogProduct) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length === 0) {
    return ["- Bien the: khong co du lieu chi tiet."];
  }

  return variants.slice(0, 4).map((variant, index) => {
    const attributes =
      variant.attributes && typeof variant.attributes === "object"
        ? Object.entries(variant.attributes)
            .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
            .map(([key, value]) => `${key}: ${String(value)}`)
            .join(", ")
        : "";

    const parts = [
      `- Bien the ${index + 1}: ${attributes || "Khong co mo ta thuoc tinh"}`,
      `  Gia: ${formatPrice(variant.price)}`,
      `  Tinh trang: ${formatStock(variant.stock)}`,
    ];

    if (variant.compareAtPrice !== undefined && variant.compareAtPrice !== null) {
      parts.push(`  Gia goc: ${formatPrice(variant.compareAtPrice)}`);
    }

    if (variant.isDefault) {
      parts.push("  Mac dinh: Co");
    }

    return parts.join("\n");
  });
}

function isExactProductMatch(message: string, product: CatalogProduct) {
  const normalizedMessage = normalizeText(message);
  const normalizedName = normalizeText(product.name || "");

  if (!normalizedMessage || !normalizedName) return false;
  return normalizedMessage.includes(normalizedName) || normalizedName.includes(normalizedMessage);
}

function hasStrongTermCoverage(product: CatalogProduct, searchTerms: string[]) {
  if (searchTerms.length === 0) return false;

  const haystack = normalizeText(
    [
      product.name || "",
      product.description || "",
      product.category?.name || "",
      ...(Array.isArray(product.variants)
        ? product.variants.flatMap((variant) => {
            const values = [variant.sku || ""];
            if (variant.attributes && typeof variant.attributes === "object") {
              values.push(
                ...Object.entries(variant.attributes).flatMap(([key, value]) => [String(key), String(value)]),
              );
            }
            return values;
          })
        : []),
    ].join(" "),
  );

  const coveredTerms = searchTerms.filter((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm.length >= 2 && haystack.includes(normalizedTerm);
  });

  return coveredTerms.length >= Math.max(1, Math.ceil(searchTerms.length / 2));
}

function determineRetrievalConfidence(message: string, catalogContext: CatalogContextResult): RetrievalConfidence {
  if (!catalogContext.shouldUseCatalogContext) return "none";
  if (catalogContext.matchedProducts.length === 0) return "low";

  const exactMatches = catalogContext.matchedProducts.filter((product) => isExactProductMatch(message, product)).length;
  if (exactMatches > 0) return "high";

  const topProduct = catalogContext.matchedProducts[0];
  if (topProduct && hasStrongTermCoverage(topProduct, catalogContext.searchTerms)) {
    return catalogContext.matchedProducts.length <= 3 ? "medium" : "low";
  }

  return "low";
}

function buildCategoryLabel(categories: CatalogCategory[]) {
  if (categories.length === 0) return "Khong co";
  return categories
    .slice(0, 5)
    .map((category) => category.name)
    .join(", ");
}

function buildClarificationQuestion(message: string, catalogContext: CatalogContextResult, confidence: RetrievalConfidence) {
  if (!catalogContext.shouldUseCatalogContext) return null;

  const searchTermsLabel =
    catalogContext.searchTerms.length > 0 ? catalogContext.searchTerms.slice(0, 4).join(", ") : "tu khoa hien tai";

  if (catalogContext.matchedProducts.length === 0) {
    if (catalogContext.matchedCategories.length > 0) {
      return `Toi chua thay san pham khop ro rang. Ban muon xem san pham nao trong nhom ${buildCategoryLabel(
        catalogContext.matchedCategories,
      )}?`;
    }

    return `Toi chua tim thay san pham khop ro rang voi ${searchTermsLabel}. Ban co the noi ro hon ten san pham, mau, loai hoac muc gia?`;
  }

  if (catalogContext.isVariantIntent && confidence !== "high" && catalogContext.matchedProducts.length > 2) {
    const names = catalogContext.matchedProducts
      .slice(0, 3)
      .map((product) => product.name)
      .join(", ");
    return `Toi dang thay nhieu san pham co the phu hop: ${names}. Ban dang muon hoi cu the san pham nao?`;
  }

  if (confidence === "low" && catalogContext.matchedProducts.length >= 4) {
    const categoriesLabel = buildCategoryLabel(catalogContext.matchedCategories);
    return `Toi dang co vai ket qua gan dung trong ${categoriesLabel}. Ban muon xem ky hon theo ten san pham, danh muc hay mau/phien ban?`;
  }

  if (normalizeText(message).length <= 4 && catalogContext.matchedProducts.length > 1) {
    return "Ban co the noi ro hon ten san pham hoac danh muc ban dang tim de toi tra loi chinh xac hon?";
  }

  return null;
}

function buildProductBlocks(products: CatalogProduct[]) {
  if (products.length === 0) {
    return ["- Khong co san pham duoc xac nhan la match manh o turn nay."];
  }

  return products.slice(0, 3).flatMap((product, index) => {
    const lines = [
      `${index + 1}. ${product.name}`,
      `- Danh muc: ${product.category?.name || "Khong ro"}`,
      `- Gia hien tai: ${formatPrice(product.price)}`,
      `- Tinh trang: ${formatStock(product.stock)}`,
    ];

    if (product.compareAtPrice !== undefined && product.compareAtPrice !== null) {
      lines.push(`- Gia goc: ${formatPrice(product.compareAtPrice)}`);
    }

    return [...lines, ...formatVariantSummary(product)];
  });
}

function buildStructuredCatalogToolBlock(
  catalogContext: CatalogContextResult,
  answerMode: AnswerMode,
  confidence: RetrievalConfidence,
  clarificationQuestion: string | null,
) {
  if (!catalogContext.shouldUseCatalogContext) return "";

  return [
    "AI tool result: search_catalog",
    `- answer_mode: ${answerMode}`,
    `- retrieval_confidence: ${confidence}`,
    `- variant_intent: ${catalogContext.isVariantIntent ? "yes" : "no"}`,
    `- search_terms: ${catalogContext.searchTerms.length > 0 ? catalogContext.searchTerms.join(", ") : "khong co"}`,
    `- matched_categories: ${buildCategoryLabel(catalogContext.matchedCategories)}`,
    `- matched_products_count: ${catalogContext.matchedProducts.length}`,
    clarificationQuestion ? `- clarification_question: ${clarificationQuestion}` : "- clarification_question: khong can",
    "",
    "Top confirmed products:",
    ...buildProductBlocks(catalogContext.matchedProducts),
    "",
    "Tool response contract:",
    clarificationQuestion
      ? "- Vi query hien tai chua du ro, uu tien dat dung 1 cau hoi lam ro thay vi khang dinh qua som."
      : "- Neu khong can hoi lai, tra loi truc tiep tu cac san pham da duoc xac nhan o tren.",
    "- Khong duoc bien cac ket qua gan dung thanh khang dinh tuyet doi.",
    "- Neu chi co goi y gan dung, phai noi ro do la goi y tham khao tu catalog hien tai.",
  ].join("\n");
}

function buildStructuredPolicyToolBlock(websiteKnowledgeContext: WebsiteKnowledgeContextResult, answerMode: AnswerMode) {
  return [
    "AI tool result: store_policy_router",
    `- answer_mode: ${answerMode}`,
    `- detected_intent: ${websiteKnowledgeContext.intent}`,
    `- source_types: ${websiteKnowledgeContext.sourceTypes.join(", ") || "none"}`,
    "- uu tien tra loi theo policy context cua website neu cau hoi lien quan van chuyen, thanh toan, membership, voucher hoac don hang.",
    "- neu policy context khong xac nhan duoc mot chi tiet, phai noi chua co thong tin thay vi tu suy doan.",
  ].join("\n");
}

export function buildStructuredAiContext(
  message: string,
  catalogContext: CatalogContextResult,
  websiteKnowledgeContext: WebsiteKnowledgeContextResult,
): AiStructuredContextResult {
  const retrievalConfidence = determineRetrievalConfidence(message, catalogContext);
  const clarificationQuestion = buildClarificationQuestion(message, catalogContext, retrievalConfidence);
  const shouldAskClarifyingQuestion = Boolean(clarificationQuestion);

  let answerMode: AnswerMode = "general";
  if (shouldAskClarifyingQuestion) {
    answerMode = "clarify";
  } else if (catalogContext.shouldUseCatalogContext) {
    answerMode = "catalog_direct";
  } else if (websiteKnowledgeContext.intent !== "general_support") {
    answerMode = "policy_direct";
  }

  const blocks = [
    buildStructuredPolicyToolBlock(websiteKnowledgeContext, answerMode),
    buildStructuredCatalogToolBlock(catalogContext, answerMode, retrievalConfidence, clarificationQuestion),
  ].filter(Boolean);

  return {
    answerMode,
    retrievalConfidence,
    shouldAskClarifyingQuestion,
    clarificationQuestion,
    contextText: blocks.join("\n\n"),
  };
}
