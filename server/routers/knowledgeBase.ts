/**
 * VonWork Knowledge Base tRPC Router
 * Handles CRUD for knowledge bases, document uploads, and semantic search.
 */

import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { knowledgeBases, kbDocuments, kbChunks } from "../../drizzle/schema";
import { searchKnowledgeBase, buildRagContext } from "../knowledgeBase";

export const knowledgeBaseRouter = router({
  // ─── List Knowledge Bases ────────────────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    return db
      .select()
      .from(knowledgeBases)
      .where(eq(knowledgeBases.userId, ctx.user.id))
      .orderBy(desc(knowledgeBases.createdAt));
  }),

  // ─── Get Single Knowledge Base ───────────────────────────────────────────────
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(and(eq(knowledgeBases.id, input.id), eq(knowledgeBases.userId, ctx.user.id)))
        .limit(1);

      if (!kb) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge base not found" });
      return kb;
    }),

  // ─── Create Knowledge Base ───────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        description: z.string().max(1000).optional(),
        agentId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(knowledgeBases).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        agentId: input.agentId ?? null,
      });

      const id = (result as any).insertId as number;
      const [kb] = await db.select().from(knowledgeBases).where(eq(knowledgeBases.id, id)).limit(1);
      return kb;
    }),

  // ─── Update Knowledge Base ───────────────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(256).optional(),
        description: z.string().max(1000).optional(),
        agentId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db
        .select()
        .from(knowledgeBases)
        .where(and(eq(knowledgeBases.id, input.id), eq(knowledgeBases.userId, ctx.user.id)))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(knowledgeBases)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.agentId !== undefined && { agentId: input.agentId }),
        })
        .where(eq(knowledgeBases.id, input.id));

      return { success: true };
    }),

  // ─── Delete Knowledge Base ───────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db
        .select()
        .from(knowledgeBases)
        .where(and(eq(knowledgeBases.id, input.id), eq(knowledgeBases.userId, ctx.user.id)))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      // Delete all chunks and documents first
      const docs = await db
        .select({ id: kbDocuments.id })
        .from(kbDocuments)
        .where(eq(kbDocuments.kbId, input.id));

      if (docs.length > 0) {
        const docIds = docs.map((d) => d.id);
        for (const docId of docIds) {
          await db.delete(kbChunks).where(eq(kbChunks.docId, docId));
        }
        await db.delete(kbDocuments).where(eq(kbDocuments.kbId, input.id));
      }

      await db.delete(knowledgeBases).where(eq(knowledgeBases.id, input.id));
      return { success: true };
    }),

  // ─── List Documents in a KB ──────────────────────────────────────────────────
  listDocuments: protectedProcedure
    .input(z.object({ kbId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify ownership
      const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(and(eq(knowledgeBases.id, input.kbId), eq(knowledgeBases.userId, ctx.user.id)))
        .limit(1);

      if (!kb) throw new TRPCError({ code: "NOT_FOUND" });

      return db
        .select()
        .from(kbDocuments)
        .where(eq(kbDocuments.kbId, input.kbId))
        .orderBy(desc(kbDocuments.createdAt));
    }),

  // ─── Get Document Chunks ─────────────────────────────────────────────────────
  getChunks: protectedProcedure
    .input(z.object({ docId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify ownership via document
      const [doc] = await db
        .select()
        .from(kbDocuments)
        .where(and(eq(kbDocuments.id, input.docId), eq(kbDocuments.userId, ctx.user.id)))
        .limit(1);

      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

      const chunks = await db
        .select({
          id: kbChunks.id,
          chunkIndex: kbChunks.chunkIndex,
          content: kbChunks.content,
          tokenCount: kbChunks.tokenCount,
          createdAt: kbChunks.createdAt,
          // Don't return the embedding vector (too large)
        })
        .from(kbChunks)
        .where(eq(kbChunks.docId, input.docId))
        .orderBy(kbChunks.chunkIndex);

      return chunks;
    }),

  // ─── Delete Document ─────────────────────────────────────────────────────────
  deleteDocument: protectedProcedure
    .input(z.object({ docId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [doc] = await db
        .select()
        .from(kbDocuments)
        .where(and(eq(kbDocuments.id, input.docId), eq(kbDocuments.userId, ctx.user.id)))
        .limit(1);

      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

      // Delete chunks
      await db.delete(kbChunks).where(eq(kbChunks.docId, input.docId));

      // Delete document
      await db.delete(kbDocuments).where(eq(kbDocuments.id, input.docId));

      // Update KB counts
      const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, doc.kbId))
        .limit(1);

      if (kb) {
        await db
          .update(knowledgeBases)
          .set({
            docCount: Math.max(0, (kb.docCount ?? 1) - 1),
            chunkCount: Math.max(0, (kb.chunkCount ?? 0) - (doc.chunkCount ?? 0)),
          })
          .where(eq(knowledgeBases.id, doc.kbId));
      }

      return { success: true };
    }),

  // ─── Semantic Search ─────────────────────────────────────────────────────────
  search: protectedProcedure
    .input(
      z.object({
        kbId: z.number(),
        query: z.string().min(1).max(1000),
        topK: z.number().min(1).max(20).default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify ownership
      const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(and(eq(knowledgeBases.id, input.kbId), eq(knowledgeBases.userId, ctx.user.id)))
        .limit(1);

      if (!kb) throw new TRPCError({ code: "NOT_FOUND" });

      const results = await searchKnowledgeBase(input.kbId, input.query, input.topK);
      return results;
    }),

  // ─── Assign KB to Agent ──────────────────────────────────────────────────────
  assignToAgent: protectedProcedure
    .input(z.object({ kbId: z.number(), agentId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(and(eq(knowledgeBases.id, input.kbId), eq(knowledgeBases.userId, ctx.user.id)))
        .limit(1);

      if (!kb) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(knowledgeBases)
        .set({ agentId: input.agentId })
        .where(eq(knowledgeBases.id, input.kbId));

      return { success: true };
    }),
});
