import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { userMemory, memoryInteractions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { openRouterChat } from "../openrouter";

// ─── Memory Router (OpenWolf-style user memory brain) ─────────────────────────
export const memoryRouter = router({
  // Get or initialize user memory
  getMemory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [memory] = await db
      .select()
      .from(userMemory)
      .where(eq(userMemory.userId, ctx.user.id))
      .limit(1);

    return memory ?? null;
  }),

  // Update user memory profile (business context, goals, etc.)
  updateProfile: protectedProcedure
    .input(z.object({
      businessName: z.string().max(128).optional(),
      industry: z.string().max(64).optional(),
      goals: z.string().optional(), // JSON array string
      preferences: z.string().optional(), // JSON string
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = Date.now();
      const existing = await db
        .select()
        .from(userMemory)
        .where(eq(userMemory.userId, ctx.user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(userMemory).values({
          userId: ctx.user.id,
          businessName: input.businessName,
          industry: input.industry,
          goals: input.goals,
          preferences: input.preferences,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db.update(userMemory)
          .set({
            businessName: input.businessName ?? existing[0].businessName,
            industry: input.industry ?? existing[0].industry,
            goals: input.goals ?? existing[0].goals,
            preferences: input.preferences ?? existing[0].preferences,
            updatedAt: now,
          })
          .where(eq(userMemory.userId, ctx.user.id));
      }

      return { success: true };
    }),

  // Log an AI interaction to memory
  logInteraction: protectedProcedure
    .input(z.object({
      agentId: z.number().optional(),
      agentName: z.string().optional(),
      userMessage: z.string(),
      agentResponse: z.string(),
      topicTags: z.array(z.string()).optional(),
      sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = Date.now();

      // Log the interaction
      await db.insert(memoryInteractions).values({
        userId: ctx.user.id,
        agentId: input.agentId,
        agentName: input.agentName,
        userMessage: input.userMessage,
        agentResponse: input.agentResponse,
        topicTags: input.topicTags ? JSON.stringify(input.topicTags) : null,
        sentiment: input.sentiment ?? "neutral",
        createdAt: now,
      });

      // Update interaction count and last active
      const existing = await db
        .select()
        .from(userMemory)
        .where(eq(userMemory.userId, ctx.user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(userMemory).values({
          userId: ctx.user.id,
          interactionCount: 1,
          lastActiveAt: now,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const currentCount = existing[0].interactionCount ?? 0;
        await db.update(userMemory)
          .set({
            interactionCount: currentCount + 1,
            lastActiveAt: now,
            updatedAt: now,
          })
          .where(eq(userMemory.userId, ctx.user.id));
      }

      return { success: true };
    }),

  // Get recent interaction history
  getInteractions: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return db
        .select()
        .from(memoryInteractions)
        .where(eq(memoryInteractions.userId, ctx.user.id))
        .orderBy(desc(memoryInteractions.createdAt))
        .limit(input.limit);
    }),

  // Generate/refresh context digest using AI
  refreshDigest: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Get last 20 interactions
    const interactions = await db
      .select()
      .from(memoryInteractions)
      .where(eq(memoryInteractions.userId, ctx.user.id))
      .orderBy(desc(memoryInteractions.createdAt))
      .limit(20);

    const [memory] = await db
      .select()
      .from(userMemory)
      .where(eq(userMemory.userId, ctx.user.id))
      .limit(1);

    if (interactions.length === 0) {
      return { digest: null };
    }

    const interactionSummary = interactions
      .slice(0, 10)
      .map(i => `User: ${i.userMessage.slice(0, 100)}\nAI: ${i.agentResponse.slice(0, 100)}`)
      .join("\n---\n");

    const response = await openRouterChat({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a memory summarizer. Create a concise context digest (2-3 sentences) about this user based on their AI interactions. Focus on: their business/role, what they're trying to accomplish, their preferences, and any patterns you notice.",
        },
        {
          role: "user",
          content: `User profile: ${JSON.stringify({ businessName: memory?.businessName, industry: memory?.industry, goals: memory?.goals })}\n\nRecent interactions:\n${interactionSummary}\n\nCreate a context digest for this user.`,
        },
      ],
      temperature: 0.3,
    });

    const digest = response.choices[0]?.message?.content ?? "";
    const now = Date.now();

    if (memory) {
      await db.update(userMemory)
        .set({ contextDigest: digest, updatedAt: now })
        .where(eq(userMemory.userId, ctx.user.id));
    } else {
      await db.insert(userMemory).values({
        userId: ctx.user.id,
        contextDigest: digest,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { digest };
  }),

  // Get context digest to inject into agent system prompts
  getContextDigest: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const [memory] = await db
      .select({ contextDigest: userMemory.contextDigest, interactionCount: userMemory.interactionCount })
      .from(userMemory)
      .where(eq(userMemory.userId, ctx.user.id))
      .limit(1);

    return memory ?? null;
  }),

  // Reset memory (clear all interactions and digest)
  resetMemory: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    await db.update(userMemory)
      .set({
        contextDigest: null,
        interactionCount: 0,
        topicsDiscussed: null,
        corrections: null,
        doNotRepeat: null,
        updatedAt: Date.now(),
      })
      .where(eq(userMemory.userId, ctx.user.id));

    return { success: true };
  }),
});
