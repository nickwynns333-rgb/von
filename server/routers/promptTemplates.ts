import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { promptTemplates } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { eq } from "drizzle-orm";

export const promptTemplatesRouter = router({
  // List all system prompt templates (public — used in agent editor dropdown)
  list: publicProcedure
    .input(z.object({
      agentType: z.string().optional(),
      industry: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(promptTemplates);
      let filtered = rows;
      if (input?.agentType) {
        filtered = filtered.filter(r => r.agentType === input.agentType || r.agentType === "chat");
      }
      if (input?.industry && input.industry !== "all") {
        filtered = filtered.filter(r => r.industry === input.industry || r.industry === "general");
      }
      return filtered.map(r => ({
        id: r.id,
        name: r.name,
        industry: r.industry,
        agentType: r.agentType,
        content: r.content,
        isSystem: r.isSystem,
      }));
    }),

  // AI Prompt Builder — generates a custom system prompt from business description
  buildWithAI: protectedProcedure
    .input(z.object({
      businessName: z.string().min(1),
      industry: z.string().min(1),
      agentGoal: z.string().min(1), // e.g. "book appointments", "qualify leads", "answer FAQs"
      tone: z.enum(["professional", "friendly", "assertive", "empathetic", "casual"]).default("friendly"),
      agentName: z.string().optional(),
      additionalInstructions: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const systemMessage = `You are an expert AI prompt engineer specializing in business chatbots and voice agents. 
Your job is to write a high-quality system prompt for an AI agent based on the business details provided.

Rules for the system prompt you write:
- Start with "You are [agent name], a [role description] for [business name]."
- List 4-6 specific primary goals as short, clear bullet points
- Include tone and style instructions
- Add any constraints (what NOT to do)
- Keep it under 300 words
- Never use em dashes
- Make it feel conversational and human, not robotic
- End with a brief instruction about response length/style`;

      const userMessage = `Write a system prompt for an AI agent with these details:

Business Name: ${input.businessName}
Industry: ${input.industry}
Agent Name: ${input.agentName || "Alex"}
Primary Goal: ${input.agentGoal}
Tone: ${input.tone}
${input.additionalInstructions ? `Additional Instructions: ${input.additionalInstructions}` : ""}

Write only the system prompt text, nothing else.`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: systemMessage },
          { role: "user" as const, content: userMessage },
        ],
      });

      const raw = response.choices?.[0]?.message?.content ?? "";
      const content = typeof raw === "string" ? raw : "";
      return { prompt: content };
    }),

  // Save a custom prompt template (user-created)
  save: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(120),
      industry: z.string().default("general"),
      agentType: z.string().default("chat"),
      content: z.string().min(10),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(promptTemplates).values({
        name: input.name,
        industry: input.industry,
        agentType: input.agentType,
        content: input.content,
        isSystem: 0,
        createdAt: Date.now(),
      });
      return { success: true };
    }),
});
