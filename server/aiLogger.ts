/**
 * AI Interaction Logger
 * Logs every LLM call with model, tokens, cost, latency, and user context.
 * Wrap any invokeLLM call with logAiInteraction() to capture telemetry.
 */
import { getDb } from "./db";
import { aiInteractionLogs } from "../drizzle/schema";

export interface AiLogEntry {
  userId?: number;
  agentId?: number;
  sessionId?: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  creditsDeducted?: number;
  feature?: string;
  latencyMs?: number;
  success?: boolean;
  errorMessage?: string;
}

export async function logAiInteraction(entry: AiLogEntry): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(aiInteractionLogs).values({
      userId: entry.userId ?? null,
      agentId: entry.agentId ?? null,
      sessionId: entry.sessionId ?? null,
      model: entry.model,
      promptTokens: entry.promptTokens ?? 0,
      completionTokens: entry.completionTokens ?? 0,
      totalTokens: entry.totalTokens ?? 0,
      costUsd: String(entry.costUsd ?? 0),
      creditsDeducted: entry.creditsDeducted ?? 0,
      feature: entry.feature ?? null,
      latencyMs: entry.latencyMs ?? null,
      success: entry.success === false ? 0 : 1,
      errorMessage: entry.errorMessage ?? null,
      createdAt: Date.now(),
    });
  } catch (err) {
    // Never throw — logging must not break the main flow
    console.error("[aiLogger] Failed to log interaction:", err);
  }
}

/**
 * Wraps an async LLM call and automatically logs the result.
 * Usage:
 *   const result = await withAiLogging({ userId, model: "gpt-4o", feature: "chat" }, () => invokeLLM(...));
 */
export async function withAiLogging<T extends { choices?: Array<{ message?: { content?: string } }> }>(
  meta: Omit<AiLogEntry, "latencyMs" | "success" | "errorMessage" | "totalTokens" | "promptTokens" | "completionTokens">,
  fn: () => Promise<T & { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const latencyMs = Date.now() - start;
    await logAiInteraction({
      ...meta,
      promptTokens: result.usage?.prompt_tokens ?? 0,
      completionTokens: result.usage?.completion_tokens ?? 0,
      totalTokens: result.usage?.total_tokens ?? 0,
      latencyMs,
      success: true,
    });
    return result;
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    await logAiInteraction({
      ...meta,
      latencyMs,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
