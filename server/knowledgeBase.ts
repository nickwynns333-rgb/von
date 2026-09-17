/**
 * VonWork Knowledge Base Service
 * Handles text extraction, chunking, embedding generation, and RAG search.
 *
 * Architecture:
 * - Text extraction: pdf-parse (PDF), mammoth (DOCX), plain text passthrough
 * - Chunking: 500-token chunks with 50-token overlap (approximated by word count)
 * - Embeddings: OpenRouter text-embedding-3-small (1536 dims)
 * - Similarity: Cosine similarity in JS (TiDB does not support pgvector)
 */

import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { kbChunks, kbDocuments, knowledgeBases } from "../drizzle/schema";
import { ENV } from "./_core/env";

// ─── Text Extraction ──────────────────────────────────────────────────────────

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf" || mimeType === "pdf") {
    const { default: pdfParse } = await import("pdf-parse") as any;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    mimeType === "docx"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text, markdown, CSV — return as-is
  return buffer.toString("utf-8");
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

const CHUNK_SIZE_WORDS = 400;   // ~500 tokens
const CHUNK_OVERLAP_WORDS = 40; // ~50 tokens

export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

export function chunkText(text: string): TextChunk[] {
  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  const words = normalized.split(/\s+/);
  const chunks: TextChunk[] = [];
  let i = 0;
  let chunkIndex = 0;

  while (i < words.length) {
    const end = Math.min(i + CHUNK_SIZE_WORDS, words.length);
    const chunkWords = words.slice(i, end);
    const content = chunkWords.join(" ");

    chunks.push({
      content,
      chunkIndex,
      tokenCount: Math.ceil(chunkWords.length * 1.3), // rough token estimate
    });

    chunkIndex++;
    i += CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;
    if (i >= words.length) break;
  }

  return chunks;
}

// ─── Embedding Generation ─────────────────────────────────────────────────────

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export async function generateEmbedding(text: string): Promise<number[]> {
  const { ENV } = await import("./_core/env");
  const apiKey = ENV.openRouterApiKey;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const response = await fetch(`${OPENROUTER_BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vonwork-ai-tpdwgxnc.manus.space",
      "X-Title": "VonWork — AI Workforce Platform",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // max input length
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

// ─── Cosine Similarity ────────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── RAG Search ───────────────────────────────────────────────────────────────

export interface SearchResult {
  chunkId: number;
  docId: number;
  content: string;
  similarity: number;
  chunkIndex: number;
}

export async function searchKnowledgeBase(
  kbId: number,
  query: string,
  topK = 5,
  minSimilarity = 0.3
): Promise<SearchResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Fetch all chunks for this KB that have embeddings
  const chunks = await db
    .select({
      id: kbChunks.id,
      docId: kbChunks.docId,
      content: kbChunks.content,
      embedding: kbChunks.embedding,
      chunkIndex: kbChunks.chunkIndex,
    })
    .from(kbChunks)
    .where(eq(kbChunks.kbId, kbId));

  // Compute cosine similarity for each chunk
  const scored = chunks
    .filter((c) => c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0)
    .map((c) => ({
      chunkId: c.id,
      docId: c.docId,
      content: c.content,
      chunkIndex: c.chunkIndex,
      similarity: cosineSimilarity(queryEmbedding, c.embedding as number[]),
    }))
    .filter((c) => c.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

// ─── Document Processing Pipeline ─────────────────────────────────────────────

export async function processDocument(
  docId: number,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Mark as processing
  await db
    .update(kbDocuments)
    .set({ status: "processing" })
    .where(eq(kbDocuments.id, docId));

  try {
    // 1. Extract text
    const text = await extractText(buffer, mimeType);
    if (!text.trim()) throw new Error("No text could be extracted from this document");

    // 2. Chunk the text
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error("Document produced no chunks");

    // 3. Get document info for kbId and userId
    const [doc] = await db
      .select()
      .from(kbDocuments)
      .where(eq(kbDocuments.id, docId))
      .limit(1);
    if (!doc) throw new Error("Document not found");

    // 4. Generate embeddings and insert chunks
    const chunkRows = [];
    for (const chunk of chunks) {
      let embedding: number[] | null = null;
      try {
        embedding = await generateEmbedding(chunk.content);
      } catch (e) {
        console.warn(`[KB] Embedding failed for chunk ${chunk.chunkIndex}:`, e);
      }

      chunkRows.push({
        docId,
        kbId: doc.kbId,
        userId: doc.userId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding,
        tokenCount: chunk.tokenCount,
      });
    }

    // Insert all chunks
    await db.insert(kbChunks).values(chunkRows);

    // 5. Update document status
    await db
      .update(kbDocuments)
      .set({
        status: "ready",
        charCount: text.length,
        chunkCount: chunks.length,
      })
      .where(eq(kbDocuments.id, docId));

    // 6. Update knowledge base aggregate counts
    const [kbRow] = await db
      .select()
      .from(knowledgeBases)
      .where(eq(knowledgeBases.id, doc.kbId))
      .limit(1);

    if (kbRow) {
      await db
        .update(knowledgeBases)
        .set({
          chunkCount: (kbRow.chunkCount ?? 0) + chunks.length,
          docCount: (kbRow.docCount ?? 0) + 1,
        })
        .where(eq(knowledgeBases.id, doc.kbId));
    }
  } catch (error: any) {
    await db
      .update(kbDocuments)
      .set({ status: "error", errorMessage: error.message ?? "Unknown error" })
      .where(eq(kbDocuments.id, docId));
    throw error;
  }
}

// ─── RAG Context Builder ──────────────────────────────────────────────────────

/**
 * Build a RAG context string from the top-K chunks for a given KB and query.
 * Returns empty string if no relevant chunks found.
 */
export async function buildRagContext(
  kbId: number,
  query: string,
  topK = 3
): Promise<string> {
  try {
    const results = await searchKnowledgeBase(kbId, query, topK, 0.25);
    if (results.length === 0) return "";

    const contextParts = results.map(
      (r, i) => `[Source ${i + 1}] (similarity: ${(r.similarity * 100).toFixed(0)}%)\n${r.content}`
    );

    return `\n\n--- Relevant Knowledge Base Context ---\n${contextParts.join("\n\n")}\n--- End Context ---\n`;
  } catch (e) {
    console.warn("[KB] RAG context build failed:", e);
    return "";
  }
}
