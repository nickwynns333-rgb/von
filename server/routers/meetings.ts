import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { aiMeetings, aiPresentations, aiAgents } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invokeLLM } from "../_core/llm";

export const meetingsRouter = router({
  // ─── Create a shareable meeting link ───────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      title: z.string().optional(),
      prospectEmail: z.string().email().optional(),
      prospectName: z.string().optional(),
      presentationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify agent belongs to user
      const agent = await db.select().from(aiAgents).where(
        and(eq(aiAgents.id, input.agentId), eq(aiAgents.userId, ctx.user.id))
      ).limit(1);
      if (!agent.length) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });

      const slug = nanoid(12);
      const roomName = `vonwork-${slug}`;

      await db.insert(aiMeetings).values({
        agentId: input.agentId,
        userId: ctx.user.id,
        slug,
        title: input.title ?? `Meeting with ${agent[0].name}`,
        prospectEmail: input.prospectEmail,
        prospectName: input.prospectName,
        presentationId: input.presentationId,
        livekitRoomName: roomName,
        status: "scheduled",
      });

      return {
        slug,
        meetingUrl: `/meet/${slug}`,
        roomName,
      };
    }),

  // ─── List user's meetings ───────────────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(aiMeetings)
      .where(eq(aiMeetings.userId, ctx.user.id))
      .orderBy(desc(aiMeetings.createdAt))
      .limit(50);
  }),

  // ─── Get meeting by slug (public — for prospect waiting room) ───────────────
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select({
          id: aiMeetings.id,
          slug: aiMeetings.slug,
          title: aiMeetings.title,
          status: aiMeetings.status,
          prospectName: aiMeetings.prospectName,
          agentName: aiAgents.name,
          agentAvatarUrl: aiAgents.avatarUrl,
          agentPersonality: aiAgents.personality,
          livekitRoomName: aiMeetings.livekitRoomName,
          presentationId: aiMeetings.presentationId,
        })
        .from(aiMeetings)
        .leftJoin(aiAgents, eq(aiMeetings.agentId, aiAgents.id))
        .where(eq(aiMeetings.slug, input.slug))
        .limit(1);

      return result[0] ?? null;
    }),

  // ─── Update meeting status ──────────────────────────────────────────────────
  updateStatus: protectedProcedure
    .input(z.object({
      slug: z.string(),
      status: z.enum(["scheduled", "waiting", "live", "ended", "cancelled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updates: Record<string, unknown> = { status: input.status };
      if (input.status === "live") updates.startedAt = new Date();
      if (input.status === "ended") updates.endedAt = new Date();

      await db
        .update(aiMeetings)
        .set(updates)
        .where(and(eq(aiMeetings.slug, input.slug), eq(aiMeetings.userId, ctx.user.id)));

      return { success: true };
    }),

  // ─── Generate AI presentation ───────────────────────────────────────────────
  generatePresentation: protectedProcedure
    .input(z.object({
      agentId: z.number().optional(),
      title: z.string(),
      prompt: z.string(),
      slideCount: z.number().min(3).max(20).default(8),
      theme: z.string().default("dark"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Use cheapest capable model for presentation generation
      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert presentation designer. Create compelling, concise sales presentations. 
            Return ONLY valid JSON with no markdown wrapping.`,
          },
          {
            role: "user",
            content: `Create a ${input.slideCount}-slide sales presentation titled "${input.title}".
            Context: ${input.prompt}
            
            Return JSON in this exact format:
            {
              "slides": [
                {
                  "title": "Slide title",
                  "content": "Main content (2-3 sentences or bullet points)",
                  "notes": "Speaker notes for the AI agent",
                  "imageUrl": null
                }
              ]
            }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "presentation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                slides: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      content: { type: "string" },
                      notes: { type: "string" },
                      imageUrl: { type: ["string", "null"] },
                    },
                    required: ["title", "content", "notes", "imageUrl"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["slides"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawMsg = llmResponse.choices[0]?.message?.content;
      const raw = typeof rawMsg === "string" ? rawMsg : "{}";
      let parsed: { slides: { title: string; content: string; notes: string; imageUrl?: string | null }[] };
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
      }

      const slides = parsed.slides.map((s) => ({
        title: s.title,
        content: s.content,
        notes: s.notes,
        imageUrl: s.imageUrl ?? undefined,
      }));

      const result = await db.insert(aiPresentations).values({
        userId: ctx.user.id,
        agentId: input.agentId,
        title: input.title,
        prompt: input.prompt,
        slides,
        theme: input.theme,
      });

      return {
        id: Number((result as any).insertId),
        title: input.title,
        slides,
        theme: input.theme,
      };
    }),

  // ─── List presentations ─────────────────────────────────────────────────────
  listPresentations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(aiPresentations)
      .where(and(eq(aiPresentations.userId, ctx.user.id), eq(aiPresentations.isActive, true)))
      .orderBy(desc(aiPresentations.createdAt));
  }),

  // ─── Get presentation by ID ─────────────────────────────────────────────────
  getPresentation: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(aiPresentations)
        .where(eq(aiPresentations.id, input.id))
        .limit(1);

      return result[0] ?? null;
    }),

  // ─── Chat with AI agent in meeting (OpenRouter) ─────────────────────────────
  chat: publicProcedure
    .input(z.object({
      slug: z.string(),
      message: z.string(),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).default([]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get meeting and agent
      const meetingResult = await db
        .select({
          systemPrompt: aiAgents.systemPrompt,
          agentName: aiAgents.name,
          personality: aiAgents.personality,
          tone: aiAgents.tone,
          model: aiAgents.model,
        })
        .from(aiMeetings)
        .leftJoin(aiAgents, eq(aiMeetings.agentId, aiAgents.id))
        .where(eq(aiMeetings.slug, input.slug))
        .limit(1);

      if (!meetingResult.length) throw new TRPCError({ code: "NOT_FOUND" });

      const agent = meetingResult[0];
      const systemPrompt = agent.systemPrompt ??
        `You are ${agent.agentName}, a ${agent.personality} AI sales agent with a ${agent.tone} tone. 
         Your goal is to help prospects understand VonWork's AI workforce solutions and guide them toward a purchase decision.
         Keep responses concise (2-3 sentences), conversational, and focused on value.`;

      const response = await invokeLLM({
        model: agent.model ?? "meta-llama/llama-3.1-8b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          ...input.history,
          { role: "user", content: input.message },
        ],
      });

      const rawContent = response.choices[0]?.message?.content;
      const reply = typeof rawContent === "string" ? rawContent : "I'm sorry, I didn't catch that. Could you repeat?";

      return { reply, agentName: agent.agentName };
    }),
});
