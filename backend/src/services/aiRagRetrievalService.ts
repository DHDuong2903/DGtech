import { semanticSearch } from "./aiEmbeddingService.js";
import {
  loadShippingPolicySnapshot,
  loadPaymentPolicySnapshot,
  loadMembershipPolicySnapshot,
  loadPromotionsSnapshot,
  loadAuthenticatedMembershipSnapshot,
  type ShippingPolicySnapshot,
  type PaymentPolicySnapshot,
  type MembershipPolicySnapshot,
  type PromotionsSnapshot,
  type AuthenticatedMembershipSnapshot,
} from "./aiPolicyStructuredContextService.js";

type RetrievedKnowledge = {
  content: string;
  contentType: string;
  metadata: any;
  similarity: number;
};

type DynamicContext = {
  shipping?: ShippingPolicySnapshot;
  payment?: PaymentPolicySnapshot;
  membership?: MembershipPolicySnapshot;
  membershipUser?: AuthenticatedMembershipSnapshot | null;
  promotions?: PromotionsSnapshot;
};

export type RagRetrievalResult = {
  staticKnowledge: RetrievedKnowledge[];
  dynamicContext: DynamicContext;
  needsDynamicData: {
    shipping: boolean;
    payment: boolean;
    membership: boolean;
    promotions: boolean;
  };
};

/**
 * Check if retrieved documents indicate need for membership data
 */
function needsMembershipData(retrievedDocs: RetrievedKnowledge[]): boolean {
  return retrievedDocs.some(
    (doc) =>
      doc.metadata?.policyArea === "membership" ||
      doc.metadata?.feature === "showroom" || // showroom requires gold membership
      doc.contentType === "feature" && doc.metadata?.membershipRequired,
  );
}

/**
 * Check if retrieved documents indicate need for shipping data
 */
function needsShippingData(retrievedDocs: RetrievedKnowledge[]): boolean {
  return retrievedDocs.some((doc) => doc.metadata?.policyArea === "shipping");
}

/**
 * Check if retrieved documents indicate need for payment data
 */
function needsPaymentData(retrievedDocs: RetrievedKnowledge[]): boolean {
  return retrievedDocs.some((doc) => doc.metadata?.policyArea === "payment");
}

/**
 * Check if retrieved documents indicate need for promotions data
 */
function needsPromotionsData(retrievedDocs: RetrievedKnowledge[]): boolean {
  return retrievedDocs.some(
    (doc) => doc.metadata?.policyArea === "voucher" || doc.metadata?.topic === "campaigns",
  );
}

/**
 * Main RAG retrieval function - combines semantic search with dynamic data
 */
export async function retrieveRelevantKnowledge(
  message: string,
  options?: {
    userId?: string | null;
    recentUserMessages?: string[];
  },
): Promise<RagRetrievalResult> {
  // Step 1: Semantic search for static knowledge
  const staticKnowledge = await semanticSearch(message, {
    limit: 3,
    minSimilarity: 0.5,
  });

  console.log(
    `[RAG] Retrieved ${staticKnowledge.length} relevant documents for query: "${message.slice(0, 50)}..."`,
  );
  if (staticKnowledge.length > 0) {
    console.log(
      `[RAG] Top match: ${staticKnowledge[0].contentType} - similarity: ${staticKnowledge[0].similarity.toFixed(3)}`,
    );
  }

  // Step 2: Determine what dynamic data is needed
  const needsShipping = needsShippingData(staticKnowledge);
  const needsPayment = needsPaymentData(staticKnowledge);
  const needsMembership = needsMembershipData(staticKnowledge);
  const needsPromotions = needsPromotionsData(staticKnowledge);

  console.log(
    `[RAG] Dynamic data needs: shipping=${needsShipping}, payment=${needsPayment}, membership=${needsMembership}, promotions=${needsPromotions}`,
  );

  // Step 3: Load dynamic data only if needed
  const dynamicContext: DynamicContext = {};

  if (needsShipping) {
    dynamicContext.shipping = await loadShippingPolicySnapshot();
  }

  if (needsPayment) {
    dynamicContext.payment = await loadPaymentPolicySnapshot();
  }

  if (needsMembership) {
    dynamicContext.membership = await loadMembershipPolicySnapshot();
    if (options?.userId) {
      dynamicContext.membershipUser = await loadAuthenticatedMembershipSnapshot(options.userId);
    }
  }

  if (needsPromotions) {
    dynamicContext.promotions = await loadPromotionsSnapshot();
  }

  return {
    staticKnowledge,
    dynamicContext,
    needsDynamicData: {
      shipping: needsShipping,
      payment: needsPayment,
      membership: needsMembership,
      promotions: needsPromotions,
    },
  };
}

/**
 * Format retrieved knowledge for LLM context
 */
export function formatRagContextForLLM(ragResult: RagRetrievalResult): string {
  const blocks: string[] = [];

  // Static knowledge from semantic search
  if (ragResult.staticKnowledge.length > 0) {
    blocks.push("=== RETRIEVED KNOWLEDGE ===");
    blocks.push("");
    ragResult.staticKnowledge.forEach((doc, index) => {
      blocks.push(`[Document ${index + 1}] Type: ${doc.contentType}, Relevance: ${(doc.similarity * 100).toFixed(1)}%`);
      blocks.push(doc.content);
      blocks.push("");
    });
  }

  // Dynamic data (formatted similar to structured policy context)
  if (Object.keys(ragResult.dynamicContext).length > 0) {
    blocks.push("=== DYNAMIC STORE DATA ===");
    blocks.push("");

    if (ragResult.dynamicContext.shipping) {
      const s = ragResult.dynamicContext.shipping;
      blocks.push("Shipping Policy:");
      blocks.push(`- Display mode: ${s.displayMode === "included" ? "Đã bao gồm trong giá" : "Tính riêng lúc checkout"}`);
      blocks.push(`- Free shipping enabled: ${s.freeShippingEnabled ? "Có" : "Không"}`);
      blocks.push(`- Free shipping threshold: ${s.freeShippingMinSubtotal.toLocaleString("vi-VN")} VND`);
      blocks.push(`- Enabled methods: ${s.enabledMethods.map((m) => m.name).join(", ") || "Không có"}`);
      blocks.push("");
    }

    if (ragResult.dynamicContext.payment) {
      const p = ragResult.dynamicContext.payment;
      blocks.push("Payment Policy:");
      blocks.push(`- Supported methods: ${p.supportedMethods.join(", ")}`);
      blocks.push(`- Tax enabled: ${p.enableTax ? "Có" : "Không"}`);
      blocks.push(`- Tax rate: ${(p.taxRate * 100).toFixed(2)}%`);
      blocks.push("");
    }

    if (ragResult.dynamicContext.membership) {
      const m = ragResult.dynamicContext.membership;
      blocks.push("Membership Policy:");
      blocks.push(`- Silver threshold: ${m.bronzeMax.toLocaleString("vi-VN")} VND`);
      blocks.push(`- Gold threshold: ${m.silverMax.toLocaleString("vi-VN")} VND`);
      blocks.push(`- Cancel penalty: ${m.cancelPenaltyUnit.toLocaleString("vi-VN")} VND per order`);

      if (ragResult.dynamicContext.membershipUser) {
        const u = ragResult.dynamicContext.membershipUser;
        blocks.push(`- Current user rank: ${u.currentRank}`);
        blocks.push(`- Progress to next: ${u.progressPercent}%`);
        blocks.push(`- Remaining to next rank: ${u.remainingToNext.toLocaleString("vi-VN")} VND`);
      }
      blocks.push("");
    }

    if (ragResult.dynamicContext.promotions) {
      const p = ragResult.dynamicContext.promotions;
      blocks.push("Active Promotions:");
      blocks.push(`- Active vouchers: ${p.activeVoucherCount}`);
      blocks.push(`- Voucher types: ${p.voucherTypes.join(", ") || "Không có"}`);
      if (p.campaignSummaries.length > 0) {
        blocks.push("- Active campaigns:");
        p.campaignSummaries.forEach((c) => {
          blocks.push(`  • ${c.name}: ${c.description} | ${c.scope} | Ends: ${c.endsAt}`);
        });
      }
      blocks.push("");
    }
  }

  return blocks.join("\n");
}
