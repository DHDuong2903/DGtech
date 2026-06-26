import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

/**
 * Generate embedding using Gemini API
 */
async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found in environment variables");
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
    const errorText = await response.text();
    throw new Error(`Gemini API failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (data.error?.message) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  if (!data.embedding?.values || !Array.isArray(data.embedding.values)) {
    throw new Error("Invalid embedding response from Gemini");
  }

  return data.embedding.values;
}

/**
 * Connect to database and insert embeddings
 */
async function insertEmbeddings(documents) {
  // Import database after dotenv is loaded
  const { default: pg } = await import("pg");
  const { Client } = pg;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  });

  await client.connect();
  console.log("✅ Connected to database");

  try {
    // Clear existing embeddings
    await client.query("DELETE FROM ai_knowledge_embeddings");
    console.log("🗑️  Cleared existing embeddings");

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      try {
        console.log(`[${i + 1}/${documents.length}] Processing: ${doc.id}`);

        // Generate embedding
        const embedding = await generateEmbedding(doc.content);
        console.log(`  ✓ Generated embedding (${embedding.length} dimensions)`);

        // Insert into database
        await client.query(
          `
          INSERT INTO ai_knowledge_embeddings
            (id, content, content_type, metadata, embedding, created_at, updated_at)
          VALUES
            ($1, $2, $3, $4, $5::vector, NOW(), NOW())
        `,
          [
            doc.id,
            doc.content,
            doc.contentType,
            JSON.stringify(doc.metadata || {}),
            `[${embedding.join(",")}]`,
          ],
        );

        console.log(`  ✓ Inserted into database`);
        successCount++;

        // Rate limiting: wait 150ms between requests
        if (i < documents.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      } catch (error) {
        console.error(`  ✗ Failed to process ${doc.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(``);
    console.log(`✅ Embedding complete!`);
    console.log(`  - Success: ${successCount}/${documents.length}`);
    console.log(`  - Errors: ${errorCount}/${documents.length}`);

    // Verify embeddings
    const countResult = await client.query(`
      SELECT content_type, COUNT(*) as count
      FROM ai_knowledge_embeddings
      GROUP BY content_type
      ORDER BY content_type
    `);

    console.log(``);
    console.log(`📊 Embeddings by type:`);
    for (const row of countResult.rows) {
      console.log(`  - ${row.content_type}: ${row.count}`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log("🚀 Starting knowledge base embedding...");
    console.log(``);

    // Load knowledge base
    const knowledgeBasePath = path.join(__dirname, "..", "data", "knowledge-base.json");
    const knowledgeBaseContent = await fs.readFile(knowledgeBasePath, "utf-8");
    const knowledgeBase = JSON.parse(knowledgeBaseContent);

    console.log(`📄 Loaded knowledge base: ${knowledgeBase.documentCount} documents`);
    console.log(``);

    // Generate embeddings and insert
    await insertEmbeddings(knowledgeBase.documents);

    console.log(``);
    console.log("✅ All done! Knowledge base is ready for semantic search.");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
