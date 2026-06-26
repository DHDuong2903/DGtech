import { sequelize } from "../libs/db.js";
import { QueryTypes } from "sequelize";

const GEMINI_EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

type EmbeddingResponse = {
  embedding?: {
    values: number[];
  };
  error?: {
    code?: number;
    message?: string;
  };
};

type SemanticSearchResult = {
  content: string;
  contentType: string;
  metadata: any;
  similarity: number;
};

/**
 * Generate embedding vector for given text using Gemini API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured"), { status: 500 });
  }

  const response = await fetch(`${GEMINI_EMBEDDING_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw Object.assign(new Error(`Gemini embedding API failed: ${errorText}`), {
      status: response.status,
    });
  }

  const data = (await response.json()) as EmbeddingResponse;

  if (data.error?.message) {
    throw Object.assign(new Error(data.error.message), { status: 502 });
  }

  if (!data.embedding?.values || !Array.isArray(data.embedding.values)) {
    throw Object.assign(new Error("Invalid embedding response from Gemini"), { status: 502 });
  }

  return data.embedding.values;
}

/**
 * Perform semantic search using pgvector cosine similarity
 */
export async function semanticSearch(
  query: string,
  options?: {
    contentType?: string;
    limit?: number;
    minSimilarity?: number;
  },
): Promise<SemanticSearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const limit = options?.limit || 3;
  const minSimilarity = options?.minSimilarity || 0.5;

  // Format embedding as PostgreSQL vector
  const vectorString = `[${queryEmbedding.join(",")}]`;

  const whereClause = options?.contentType ? 'AND content_type = :contentType' : '';

  const results = await sequelize.query(
    `
    SELECT
      content,
      content_type as "contentType",
      metadata,
      1 - (embedding <=> :queryEmbedding::vector) as similarity
    FROM ai_knowledge_embeddings
    WHERE embedding IS NOT NULL
      ${whereClause}
      AND 1 - (embedding <=> :queryEmbedding::vector) > :minSimilarity
    ORDER BY embedding <=> :queryEmbedding::vector
    LIMIT :limit
  `,
    {
      replacements: {
        queryEmbedding: vectorString,
        contentType: options?.contentType,
        minSimilarity,
        limit,
      },
      type: QueryTypes.SELECT,
    },
  );

  return results as SemanticSearchResult[];
}

/**
 * Batch generate embeddings for multiple texts
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    try {
      const embedding = await generateEmbedding(text);
      embeddings.push(embedding);

      // Rate limiting: wait 100ms between requests to avoid hitting API limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to generate embedding for text: ${text.slice(0, 50)}...`, error);
      throw error;
    }
  }

  return embeddings;
}
