import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { listOpenRouterModels, FEATURE_MODELS, openRouterChat, resolveModelForFeature } from "./openrouter";

// Patch ENV so tests don't need a real key
vi.mock("./_core/env", () => ({
  ENV: {
    openRouterApiKey: "test-api-key-mock",
    forgeApiKey: "",
    forgeApiUrl: "",
    appId: "",
    cookieSecret: "",
    databaseUrl: "",
    oAuthServerUrl: "",
    ownerOpenId: "",
    isProduction: false,
  },
}));

describe("OpenRouter adapter", () => {
  it("FEATURE_MODELS has entries for all agent types", () => {
    const requiredTypes = [
      "receptionist",
      "outbound_caller",
      "video_sales",
      "chat",
      "appointment_setter",
      "customer_service",
      "sales_closer",
      "website_rebuild",
      "prospect_demo",
      "default",
    ];
    for (const type of requiredTypes) {
      expect(FEATURE_MODELS).toHaveProperty(type);
      expect(FEATURE_MODELS[type]).toHaveProperty("primary");
      expect(FEATURE_MODELS[type]).toHaveProperty("fallback");
      expect(typeof FEATURE_MODELS[type].primary).toBe("string");
      expect(FEATURE_MODELS[type].primary.length).toBeGreaterThan(0);
    }
  });

  it("uses gpt-4o-mini for high-volume and website-prospecting tasks", () => {
    expect(FEATURE_MODELS.default.primary).toBe("openai/gpt-4o-mini");
    expect(FEATURE_MODELS.website_rebuild.primary).toBe("openai/gpt-4o-mini");
    expect(FEATURE_MODELS.prospect_demo.primary).toBe("openai/gpt-4o-mini");
    expect(resolveModelForFeature("website_rebuild")).toBe("openai/gpt-4o-mini");
  });

  it("listOpenRouterModels returns array when API key is present", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "openai/gpt-4o",
            name: "GPT-4o",
            context_length: 128000,
            pricing: { prompt: "0.000005", completion: "0.000015" },
          },
          {
            id: "openai/gpt-4o-mini",
            name: "GPT-4o Mini",
            context_length: 128000,
            pricing: { prompt: "0.00000015", completion: "0.0000006" },
          },
        ],
      }),
    });
    const originalFetch = global.fetch;
    global.fetch = mockFetch as typeof fetch;
    try {
      const models = await listOpenRouterModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      const first = models[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("isFree");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("openRouterChat throws when API returns error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Invalid API key",
    });
    const originalFetch = global.fetch;
    global.fetch = mockFetch as typeof fetch;
    try {
      await expect(
        openRouterChat({
          model: "openai/gpt-4o",
          messages: [{ role: "user", content: "hi" }],
        })
      ).rejects.toThrow("OpenRouter API error 401");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("openRouterChat uses GPT-4o mini as default model when none specified", async () => {
    let capturedBody: Record<string, unknown> = {};
    const mockFetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return {
        ok: true,
        json: async () => ({
          id: "chatcmpl-test",
          model: "openai/gpt-4o-mini",
          choices: [{ message: { role: "assistant", content: "42" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      };
    });
    const originalFetch = global.fetch;
    global.fetch = mockFetch as typeof fetch;
    try {
      const result = await openRouterChat({
        messages: [{ role: "user", content: "What is the meaning of life?" }],
      });
      expect(capturedBody.model).toBe("openai/gpt-4o-mini");
      expect(result.choices[0].message.content).toBe("42");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
