/**
 * OpenRouter LLM Adapter
 * Routes all VonWork AI features through OpenRouter using the stored API key.
 * Default model: openai/gpt-4o-mini for low-cost, high-volume work.
 * API key is read from ENV.openRouterApiKey (OPENROUTER_API_KEY env var).
 */

import { ENV } from "./_core/env";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  model?: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  responseFormat?: { type: "json_object" | "text" };
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  costUsd?: number;
}

// ─── Default models per VonWork feature type ─────────────────────────────────
// GPT-4o is the primary default; cheaper models are used for high-volume tasks.

export const FEATURE_MODELS: Record<string, { primary: string; fallback: string }> = {
  // High-volume conversational tasks default to a low-cost model.
  chat: {
    primary: "openai/gpt-4o-mini",
    fallback: "meta-llama/llama-3.1-8b-instruct",
  },
  // Receptionist / FAQ routing
  receptionist: {
    primary: "openai/gpt-4o-mini",
    fallback: "meta-llama/llama-3.1-8b-instruct",
  },
  // Sales conversations
  sales_closer: {
    primary: "openai/gpt-4o-mini",
    fallback: "openai/gpt-4o-mini",
  },
  // Outbound call scripts
  outbound_caller: {
    primary: "openai/gpt-4o-mini",
    fallback: "openai/gpt-4o-mini",
  },
  // Appointment setting — needs calendar reasoning
  appointment_setter: {
    primary: "openai/gpt-4o-mini",
    fallback: "openai/gpt-4o-mini",
  },
  // Customer service
  customer_service: {
    primary: "openai/gpt-4o-mini",
    fallback: "openai/gpt-4o-mini",
  },
  // Video sales agent — highest quality
  video_sales: {
    primary: "openai/gpt-4o",
    fallback: "openai/gpt-4o-mini",
  },
  // Presentation generation — needs structured output
  presentation: {
    primary: "openai/gpt-4o-mini",
    fallback: "openai/gpt-4o-mini",
  },
  // Knowledge base Q&A with RAG context
  knowledge_qa: {
    primary: "openai/gpt-4o-mini",
    fallback: "openai/gpt-4o-mini",
  },
  // Default fallback for any unspecified feature
  default: {
    primary: "openai/gpt-4o-mini",
    fallback: "openai/gpt-4o-mini",
  },
  website_rebuild: {
    primary: "openai/gpt-4o-mini",
    fallback: "meta-llama/llama-3.1-8b-instruct",
  },
  prospect_demo: {
    primary: "openai/gpt-4o-mini",
    fallback: "meta-llama/llama-3.1-8b-instruct",
  },
};

const ESTIMATED_COST_PER_MILLION_TOKENS: Record<string, number> = {
  "openai/gpt-4o-mini": 0.30,
  "openai/gpt-4o": 7.50,
  "meta-llama/llama-3.1-8b-instruct": 0.08,
};

export function resolveModelForFeature(feature: keyof typeof FEATURE_MODELS, quality: "efficient" | "premium" = "efficient") {
  const policy = FEATURE_MODELS[feature] ?? FEATURE_MODELS.default;
  return quality === "premium" && feature === "video_sales" ? policy.primary : policy.primary;
}

// ─── Credit costs per feature (credits per unit of usage) ────────────────────

export const DEFAULT_CREDIT_COSTS: Record<string, { credits: number; unit: string }> = {
  chat: { credits: 1, unit: "message" },
  receptionist: { credits: 2, unit: "minute" },
  outbound_caller: { credits: 3, unit: "minute" },
  video_sales: { credits: 5, unit: "minute" },
  appointment_setter: { credits: 2, unit: "booking" },
  customer_service: { credits: 1, unit: "message" },
  sales_closer: { credits: 3, unit: "message" },
  presentation: { credits: 10, unit: "generation" },
  knowledge_qa: { credits: 1, unit: "query" },
  voice_clone: { credits: 20, unit: "clone" },
  image_generation: { credits: 5, unit: "image" },
  document_analysis: { credits: 3, unit: "document" },
};

// ─── Resolve API key ──────────────────────────────────────────────────────────

function getApiKey(overrideKey?: string): string {
  const key = overrideKey ?? ENV.openRouterApiKey;
  if (!key) {
    throw new Error(
      "OpenRouter API key is not configured. Set OPENROUTER_API_KEY environment variable."
    );
  }
  return key;
}

// ─── Core chat completion function ───────────────────────────────────────────

export async function openRouterChat(
  options: OpenRouterOptions,
  /** Optional override key; if omitted, uses OPENROUTER_API_KEY from env */
  apiKey?: string
): Promise<OpenRouterResponse> {
  const key = getApiKey(apiKey);
  const model = options.model ?? FEATURE_MODELS.default.primary;

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vonwork-ai-tpdwgxnc.manus.space",
      // OpenRouter header values must be valid ByteString characters; keep this ASCII-only.
      "X-Title": "VonWork AI Workforce Platform",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      stream: options.stream ?? false,
      ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (!data.costUsd && data.usage) {
    const perMillion = ESTIMATED_COST_PER_MILLION_TOKENS[model] ?? 1;
    data.costUsd = (data.usage.total_tokens / 1_000_000) * perMillion;
  }

  return data;
}

// ─── List available models ────────────────────────────────────────────────────

export async function listOpenRouterModels(apiKey?: string) {
  const key = getApiKey(apiKey);

  const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${response.status}`);
  }

  const data = (await response.json()) as {
    data: Array<{
      id: string;
      name: string;
      context_length: number;
      pricing: { prompt: string; completion: string };
    }>;
  };

  return data.data
    .filter((m) => {
      const skip = ["embed", "image", "tts", "stt", "audio", "video", "speech", "whisper", "lyria", "imagine", "aura", "rerank", "safety"];
      return !skip.some((k) => m.id.toLowerCase().includes(k));
    })
    .map((m) => ({
      id: m.id,
      name: m.name,
      contextLength: m.context_length,
      inputPricePerM: parseFloat(m.pricing.prompt) * 1_000_000,
      outputPricePerM: parseFloat(m.pricing.completion) * 1_000_000,
      isFree: parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0,
    }))
    .sort((a, b) => a.inputPricePerM - b.inputPricePerM);
}

export type OpenRouterModel = Awaited<ReturnType<typeof listOpenRouterModels>>[number];
