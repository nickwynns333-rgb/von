/**
 * SSE Streaming Chat Endpoint
 * POST /api/chat/stream
 * Streams LLM token-by-token via Server-Sent Events when the widget's agent
 * has enableStreaming = true in its config.
 */
import { Router } from "express";
import { getDb } from "./db";
import { chatWidgets, widgetConversations, aiAgents, knowledgeBases } from "../drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { searchKnowledgeBase } from "./knowledgeBase";
import { ENV } from "./_core/env";

export const streamingChatRouter = Router();

streamingChatRouter.post("/stream", async (req, res) => {
  const { widgetKey, sessionId, message, visitorName, visitorEmail, pageUrl } = req.body as {
    widgetKey: string;
    sessionId: string;
    message: string;
    visitorName?: string;
    visitorEmail?: string;
    pageUrl?: string;
  };

  if (!widgetKey || !sessionId || !message) {
    res.status(400).json({ error: "widgetKey, sessionId, and message are required" });
    return;
  }

  const db = await getDb();
  if (!db) { res.status(503).json({ error: "Database unavailable" }); return; }

  // Get widget
  const [widget] = await db
    .select()
    .from(chatWidgets)
    .where(and(eq(chatWidgets.widgetKey, widgetKey), eq(chatWidgets.isActive, true)))
    .limit(1);
  if (!widget) { res.status(404).json({ error: "Widget not found" }); return; }

  // Check if streaming is enabled for this agent
  let streamingEnabled = false;
  if (widget.agentId) {
    const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, widget.agentId)).limit(1);
    if (agent) {
      try {
        const cfg = typeof agent.config === "string" ? JSON.parse(agent.config) : (agent.config ?? {});
        streamingEnabled = cfg.enableStreaming !== false;
      } catch { streamingEnabled = true; }
    }
  }

  // Get or create conversation
  let [conversation] = await db
    .select()
    .from(widgetConversations)
    .where(and(eq(widgetConversations.widgetId, widget.id), eq(widgetConversations.sessionId, sessionId)))
    .limit(1);

  let messages: Array<{ role: string; content: string; timestamp: string }> = [];

  if (!conversation) {
    await db.insert(widgetConversations).values({
      widgetId: widget.id,
      sessionId,
      visitorName: visitorName ?? null,
      visitorEmail: visitorEmail ?? null,
      pageUrl: pageUrl ?? null,
      messages: JSON.stringify([]),
    });
    const [newConv] = await db
      .select()
      .from(widgetConversations)
      .where(and(eq(widgetConversations.widgetId, widget.id), eq(widgetConversations.sessionId, sessionId)))
      .limit(1);
    conversation = newConv;
  } else {
    try { messages = JSON.parse(conversation.messages || "[]"); } catch { messages = []; }
  }

  // Add user message
  messages.push({ role: "user", content: message, timestamp: new Date().toISOString() });

  // Build RAG context
  let ragContext = "";
  if (widget.agentId) {
    try {
      const [kb] = await db.select().from(knowledgeBases).where(eq(knowledgeBases.agentId, widget.agentId!)).limit(1);
      const results = kb ? await searchKnowledgeBase(kb.id, message, 3) : [];
      if (results.length > 0) {
        ragContext = "\n\nRelevant knowledge base context:\n" + results.map((r, i) => `[${i + 1}] ${r.content}`).join("\n\n");
      }
    } catch { /* KB search optional */ }
  }

  const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: `You are ${widget.botName}, a helpful AI assistant. Be concise, friendly, and helpful.${ragContext}` },
    ...messages.slice(-10).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  if (!streamingEnabled) {
    // Non-streaming fallback: call LLM and return JSON
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({ messages: llmMessages });
    const aiReply = (response as any)?.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't process that.";
    messages.push({ role: "assistant", content: aiReply, timestamp: new Date().toISOString() });
    await db.update(widgetConversations).set({ messages: JSON.stringify(messages), lastMessageAt: new Date(), creditsUsed: sql`creditsUsed + 1` }).where(eq(widgetConversations.id, conversation.id));
    await db.update(chatWidgets).set({ totalMessages: sql`totalMessages + 1` }).where(eq(chatWidgets.id, widget.id));
    res.json({ reply: aiReply, sessionId });
    return;
  }

  // SSE streaming mode
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let finished = false;
  res.on("close", () => { finished = true; });

  try {
    // Use OpenRouter if key is available, otherwise fall back to built-in Forge API
    const openRouterKey = ENV.openRouterApiKey;
    const apiUrl = openRouterKey
      ? "https://openrouter.ai/api/v1"
      : (ENV.forgeApiUrl || "https://forge.manus.im");
    const apiKey = openRouterKey || ENV.forgeApiKey;
    const extraHeaders: Record<string, string> = openRouterKey
      ? {
          "HTTP-Referer": "https://vonwork-ai-tpdwgxnc.manus.space",
          "X-Title": "VonWork \u2014 AI Workforce Platform",
        }
      : {};

    const upstream = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: openRouterKey ? "openai/gpt-4o" : undefined,
        messages: llmMessages,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      res.write(`data: ${JSON.stringify({ error: "LLM unavailable" })}\n\n`);
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let fullReply = "";
    let buffer = "";

    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const token = json?.choices?.[0]?.delta?.content;
          if (token) {
            fullReply += token;
            if (!finished) res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }

    if (!finished) res.write(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`);

    // Persist full reply
    messages.push({ role: "assistant", content: fullReply || "...", timestamp: new Date().toISOString() });
    await db.update(widgetConversations).set({ messages: JSON.stringify(messages), lastMessageAt: new Date(), creditsUsed: sql`creditsUsed + 1` }).where(eq(widgetConversations.id, conversation.id));
    await db.update(chatWidgets).set({ totalMessages: sql`totalMessages + 1` }).where(eq(chatWidgets.id, widget.id));

  } catch (err) {
    if (!finished) {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
    }
  } finally {
    if (!finished) res.end();
  }
});
