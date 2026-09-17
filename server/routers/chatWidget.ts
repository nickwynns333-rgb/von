import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { chatWidgets, widgetConversations, creditTransactions } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invokeLLM } from "../_core/llm";
import { searchKnowledgeBase } from "../knowledgeBase";
import { knowledgeBases } from "../../drizzle/schema";

export const chatWidgetRouter = router({
  // ── Widget Management ──────────────────────────────────────────────────────

  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(chatWidgets)
      .where(eq(chatWidgets.userId, ctx.user.id))
      .orderBy(desc(chatWidgets.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const [widget] = await db
        .select()
        .from(chatWidgets)
        .where(and(eq(chatWidgets.id, input.id), eq(chatWidgets.userId, ctx.user.id)))
        .limit(1);
      return widget ?? null;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      agentId: z.number().optional(),
      greeting: z.string().default("Hi! How can I help you today?"),
      primaryColor: z.string().default("#6366f1"),
      accentColor: z.string().default("#22d3ee"),
      position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left"]).default("bottom-right"),
      botName: z.string().default("AI Assistant"),
      placeholder: z.string().default("Type a message..."),
      allowedDomains: z.string().optional(),
      collectEmail: z.boolean().default(false),
      collectName: z.boolean().default(false),
      showBranding: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const widgetKey = nanoid(24);

      const [result] = await db.insert(chatWidgets).values({
        userId: ctx.user.id,
        agentId: input.agentId ?? null,
        widgetKey,
        name: input.name,
        greeting: input.greeting,
        primaryColor: input.primaryColor,
        accentColor: input.accentColor,
        position: input.position,
        botName: input.botName,
        placeholder: input.placeholder,
        allowedDomains: input.allowedDomains ?? null,
        collectEmail: input.collectEmail,
        collectName: input.collectName,
        showBranding: input.showBranding,
      });

      return { success: true, id: (result as any).insertId, widgetKey };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      greeting: z.string().optional(),
      primaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left"]).optional(),
      botName: z.string().optional(),
      placeholder: z.string().optional(),
      allowedDomains: z.string().optional().nullable(),
      collectEmail: z.boolean().optional(),
      collectName: z.boolean().optional(),
      showBranding: z.boolean().optional(),
      isActive: z.boolean().optional(),
      agentId: z.number().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { id, ...updates } = input;
      await db
        .update(chatWidgets)
        .set(updates)
        .where(and(eq(chatWidgets.id, id), eq(chatWidgets.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .delete(chatWidgets)
        .where(and(eq(chatWidgets.id, input.id), eq(chatWidgets.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Embed Code Generation ──────────────────────────────────────────────────

  getEmbedCode: protectedProcedure
    .input(z.object({ widgetKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [widget] = await db
        .select()
        .from(chatWidgets)
        .where(and(eq(chatWidgets.widgetKey, input.widgetKey), eq(chatWidgets.userId, ctx.user.id)))
        .limit(1);
      if (!widget) throw new Error("Widget not found");

      const baseUrl = process.env.VITE_FRONTEND_FORGE_API_URL?.replace("/v1", "") ?? "https://your-vonwork-domain.com";

      const snippet = `<!-- VonWork Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['VonWorkWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','vw','${baseUrl}/widget.js'));
  vw('init', { key: '${widget.widgetKey}' });
</script>
<!-- End VonWork Chat Widget -->`;

      return { snippet, widgetKey: widget.widgetKey, baseUrl };
    }),

  // ── Conversation Management ────────────────────────────────────────────────

  listConversations: protectedProcedure
    .input(z.object({
      widgetId: z.number(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Verify widget belongs to user
      const [widget] = await db
        .select()
        .from(chatWidgets)
        .where(and(eq(chatWidgets.id, input.widgetId), eq(chatWidgets.userId, ctx.user.id)))
        .limit(1);
      if (!widget) return [];

      return db
        .select()
        .from(widgetConversations)
        .where(eq(widgetConversations.widgetId, input.widgetId))
        .orderBy(desc(widgetConversations.startedAt))
        .limit(input.limit);
    }),

  getWidgetStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { total: 0, active: 0, resolved: 0, totalMessages: 0 };

      // Get all widget IDs for this user first
      const userWidgets = await db
        .select({ id: chatWidgets.id })
        .from(chatWidgets)
        .where(eq(chatWidgets.userId, ctx.user.id));

      if (userWidgets.length === 0) return { total: 0, active: 0, resolved: 0, totalMessages: 0 };

      const widgetIdList = userWidgets.map((w) => w.id).join(',');
      const [stats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          active: sql<number>`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`,
          resolved: sql<number>`SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END)`,
          totalMessages: sql<number>`SUM(creditsUsed)`,
        })
        .from(widgetConversations)
        .where(sql`${widgetConversations.widgetId} IN (${sql.raw(widgetIdList)})`);

      return stats ?? { total: 0, active: 0, resolved: 0, totalMessages: 0 };
    }),

  // ── Public Widget Chat API (no auth required) ──────────────────────────────

  getWidgetConfig: publicProcedure
    .input(z.object({ widgetKey: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [widget] = await db
        .select({
          widgetKey: chatWidgets.widgetKey,
          greeting: chatWidgets.greeting,
          primaryColor: chatWidgets.primaryColor,
          accentColor: chatWidgets.accentColor,
          position: chatWidgets.position,
          botName: chatWidgets.botName,
          placeholder: chatWidgets.placeholder,
          collectEmail: chatWidgets.collectEmail,
          collectName: chatWidgets.collectName,
          showBranding: chatWidgets.showBranding,
          isActive: chatWidgets.isActive,
          agentId: chatWidgets.agentId,
        })
        .from(chatWidgets)
        .where(and(eq(chatWidgets.widgetKey, input.widgetKey), eq(chatWidgets.isActive, true)))
        .limit(1);

      if (!widget) throw new Error("Widget not found or inactive");
      return widget;
    }),

  sendMessage: publicProcedure
    .input(z.object({
      widgetKey: z.string(),
      sessionId: z.string(),
      message: z.string().min(1).max(2000),
      visitorName: z.string().optional(),
      visitorEmail: z.string().optional(),
      pageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Get widget
      const [widget] = await db
        .select()
        .from(chatWidgets)
        .where(and(eq(chatWidgets.widgetKey, input.widgetKey), eq(chatWidgets.isActive, true)))
        .limit(1);
      if (!widget) throw new Error("Widget not found");

      // Get or create conversation
      let [conversation] = await db
        .select()
        .from(widgetConversations)
        .where(and(
          eq(widgetConversations.widgetId, widget.id),
          eq(widgetConversations.sessionId, input.sessionId)
        ))
        .limit(1);

      let messages: Array<{ role: string; content: string; timestamp: string }> = [];

      if (!conversation) {
        // Create new conversation
        await db.insert(widgetConversations).values({
          widgetId: widget.id,
          sessionId: input.sessionId,
          visitorName: input.visitorName ?? null,
          visitorEmail: input.visitorEmail ?? null,
          pageUrl: input.pageUrl ?? null,
          messages: JSON.stringify([]),
        });

        const [newConv] = await db
          .select()
          .from(widgetConversations)
          .where(and(
            eq(widgetConversations.widgetId, widget.id),
            eq(widgetConversations.sessionId, input.sessionId)
          ))
          .limit(1);
        conversation = newConv;
      } else {
        try {
          messages = JSON.parse(conversation.messages || "[]");
        } catch {
          messages = [];
        }
      }

      // Add user message
      messages.push({ role: "user", content: input.message, timestamp: new Date().toISOString() });

      // Build RAG context if agent has knowledge base
      let ragContext = "";
      if (widget.agentId) {
        try {
          // Look up the knowledge base linked to this agent
          const [kb] = await db!
            .select()
            .from(knowledgeBases)
            .where(eq(knowledgeBases.agentId, widget.agentId))
            .limit(1);
          const results = kb ? await searchKnowledgeBase(kb.id, input.message, 3) : [];
          if (results.length > 0) {
            ragContext = "\n\nRelevant knowledge base context:\n" +
              results.map((r, i) => `[${i + 1}] ${r.content}`).join("\n\n");
          }
        } catch {
          // KB search optional
        }
      }

      // Build conversation history for LLM
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: `You are ${widget.botName}, a helpful AI assistant. Be concise, friendly, and helpful.${ragContext}`,
        },
        ...messages.slice(-10).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      // Get AI response
      const response = await invokeLLM({ messages: llmMessages });
      const aiReply = (response as any)?.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't process that. Please try again.";

      // Add assistant message
      messages.push({ role: "assistant", content: aiReply, timestamp: new Date().toISOString() });

      // Update conversation
      await db
        .update(widgetConversations)
        .set({
          messages: JSON.stringify(messages),
          lastMessageAt: new Date(),
          creditsUsed: sql`creditsUsed + 1`,
        })
        .where(eq(widgetConversations.id, conversation.id));

      // Update widget stats
      await db
        .update(chatWidgets)
        .set({ totalMessages: sql`totalMessages + 1` })
        .where(eq(chatWidgets.id, widget.id));

      return { reply: aiReply, sessionId: input.sessionId };
    }),
});
