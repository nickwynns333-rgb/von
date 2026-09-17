import { describe, it, expect } from "vitest";
import { chunkText, cosineSimilarity, extractText } from "./knowledgeBase";

// ─── Text Chunking Tests ──────────────────────────────────────────────────────

describe("chunkText", () => {
  it("returns empty array for empty string", () => {
    expect(chunkText("")).toHaveLength(0);
    expect(chunkText("   ")).toHaveLength(0);
  });

  it("returns a single chunk for short text", () => {
    const text = "Hello world. This is a short document.";
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toContain("Hello world");
  });

  it("splits long text into multiple chunks", () => {
    // Generate ~1000 words
    const words = Array.from({ length: 1000 }, (_, i) => `word${i}`);
    const text = words.join(" ");
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should have content
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
  });

  it("assigns sequential chunkIndex values", () => {
    const words = Array.from({ length: 900 }, (_, i) => `word${i}`);
    const text = words.join(" ");
    const chunks = chunkText(text);
    chunks.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i);
    });
  });

  it("preserves content across chunks (no data loss)", () => {
    const words = Array.from({ length: 500 }, (_, i) => `unique${i}`);
    const text = words.join(" ");
    const chunks = chunkText(text);
    const allContent = chunks.map((c) => c.content).join(" ");
    // All words should appear somewhere in the chunks
    expect(allContent).toContain("unique0");
    expect(allContent).toContain("unique499");
  });

  it("normalizes excessive whitespace", () => {
    const text = "Hello   world\n\n\n\nFoo   bar";
    const chunks = chunkText(text);
    expect(chunks[0].content).not.toMatch(/\n{3,}/);
  });
});

// ─── Cosine Similarity Tests ──────────────────────────────────────────────────

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("returns 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  it("handles high-dimensional vectors (1536 dims)", () => {
    const a = Array.from({ length: 1536 }, () => Math.random() - 0.5);
    const b = Array.from({ length: 1536 }, () => Math.random() - 0.5);
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });

  it("similar vectors have higher similarity than dissimilar ones", () => {
    const base = [1, 1, 1, 0, 0];
    const similar = [1, 1, 0.9, 0.1, 0];
    const dissimilar = [0, 0, 0, 1, 1];
    expect(cosineSimilarity(base, similar)).toBeGreaterThan(cosineSimilarity(base, dissimilar));
  });
});

// ─── Text Extraction Tests ────────────────────────────────────────────────────

describe("extractText", () => {
  it("extracts plain text from text/plain buffer", async () => {
    const text = "Hello, this is a plain text document.";
    const buffer = Buffer.from(text, "utf-8");
    const result = await extractText(buffer, "text/plain");
    expect(result).toBe(text);
  });

  it("extracts text from text/markdown buffer", async () => {
    const md = "# Title\n\nSome **bold** content.";
    const buffer = Buffer.from(md, "utf-8");
    const result = await extractText(buffer, "text/markdown");
    expect(result).toContain("Title");
    expect(result).toContain("bold");
  });

  it("extracts text from text/csv buffer", async () => {
    const csv = "name,age\nAlice,30\nBob,25";
    const buffer = Buffer.from(csv, "utf-8");
    const result = await extractText(buffer, "text/csv");
    expect(result).toContain("Alice");
    expect(result).toContain("Bob");
  });
});
