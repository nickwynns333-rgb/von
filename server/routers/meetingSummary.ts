/**
 * Meeting Summary Router
 * Generates AI-powered post-meeting summaries, action items, and CRM logs.
 * Uses the built-in LLM via invokeLLM.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { aiMeetings } from "../../drizzle/schema";

export const meetingSummaryRouter = router({
  /**
   * Generate a post-meeting summary from a transcript or notes.
   * Returns: summary, key points, action items, sentiment, follow-up suggestions.
   */
  generate: protectedProcedure
    .input(z.object({
      meetingId: z.number().optional(),
      transcript: z.string().min(10).max(20000),
      prospectName: z.string().optional(),
      prospectCompany: z.string().optional(),
      agentName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const systemPrompt = `You are an expert sales meeting analyst. Analyze the following meeting transcript and produce a structured summary in JSON format.

Return ONLY valid JSON with this exact structure:
{
  "summary": "2-3 sentence executive summary",
  "sentiment": "positive" | "neutral" | "negative",
  "interestLevel": "high" | "medium" | "low",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "objections": ["objection 1", "objection 2"],
  "actionItems": [
    { "task": "task description", "owner": "sales" | "prospect", "dueDate": "ASAP" | "1 week" | "1 month" }
  ],
  "nextSteps": "recommended next action",
  "dealProbability": 0-100,
  "estimatedValue": "dollar amount or null",
  "followUpMessage": "personalized follow-up email draft"
}`;

      const userMessage = `Meeting Transcript:
Prospect: ${input.prospectName ?? "Unknown"}
Company: ${input.prospectCompany ?? "Unknown"}
Agent: ${input.agentName ?? "AI Sales Agent"}

---
${input.transcript}
---

Generate the structured meeting summary.`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: userMessage },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "meeting_summary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                interestLevel: { type: "string", enum: ["high", "medium", "low"] },
                keyPoints: { type: "array", items: { type: "string" } },
                objections: { type: "array", items: { type: "string" } },
                actionItems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task: { type: "string" },
                      owner: { type: "string", enum: ["sales", "prospect"] },
                      dueDate: { type: "string" },
                    },
                    required: ["task", "owner", "dueDate"],
                    additionalProperties: false,
                  },
                },
                nextSteps: { type: "string" },
                dealProbability: { type: "number" },
                estimatedValue: { type: ["string", "null"] },
                followUpMessage: { type: "string" },
              },
              required: ["summary", "sentiment", "interestLevel", "keyPoints", "objections", "actionItems", "nextSteps", "dealProbability", "estimatedValue", "followUpMessage"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? {});
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI summary response" });
      }

      // If a meetingId was provided, save the summary to the meeting record
      if (input.meetingId) {
        try {
          const db = await getDb();
          if (db) {
            await db
              .update(aiMeetings)
              .set({
                summary: parsed.summary as string,
                status: "ended",
                endedAt: new Date(),
              })
              .where(eq(aiMeetings.id, input.meetingId));
          }
        } catch (e) {
          console.warn("[meetingSummary] Failed to save summary to meeting:", e);
        }
      }

      return { success: true, summary: parsed };
    }),

  /**
   * Get all meeting summaries for the current user.
   */
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select()
        .from(aiMeetings)
        .where(eq(aiMeetings.userId, ctx.user.id))
        .orderBy(desc(aiMeetings.createdAt))
        .limit(input.limit);
      return rows;
    }),

  /**
   * Get a single meeting with its summary.
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [meeting] = await db.select().from(aiMeetings).where(eq(aiMeetings.id, input.id)).limit(1);
      if (!meeting || meeting.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return meeting;
    }),
});
