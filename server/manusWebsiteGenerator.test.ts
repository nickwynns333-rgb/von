import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
  listLLMModels: vi.fn(),
}));

import { invokeLLM, listLLMModels } from "./_core/llm";
import { buildPremiumFallbackHtml, type WebsiteSource } from "./websiteDesign";
import { generateWebsiteWithManus, reviseWebsiteWithManus } from "./manusWebsiteGenerator";

const source: WebsiteSource = {
  url: "https://northstarplumbing.example",
  title: "Northstar Plumbing",
  text: "Northstar Plumbing provides drain cleaning, water heater service, leak repair, and emergency plumbing. Call 312-444-0188 to request service.",
  colorScheme: "auto",
};

const creativeBrief = {
  industry: "Plumbing",
  audience: "Homeowners who need clear and responsive plumbing help",
  positioning: "A direct, capable local plumbing team",
  tone: "Confident, practical, reassuring",
  visualConcept: "Blueprint precision with warm service signals",
  heroEyebrow: "Local plumbing support",
  heroHeadline: "Get the water moving in the right direction.",
  heroSubheadline: "Explore verified services and request help from the Northstar team.",
  primaryAction: "Call 312-444-0188",
  secondaryAction: "Explore services",
  paletteDirection: "Deep navy, safety orange, warm cream",
  typographyDirection: "Condensed display with a highly legible sans serif",
  sectionSequence: ["hero", "services", "approach", "service areas", "contact"],
  approvedClaims: ["Drain cleaning", "Water heater service", "Leak repair", "Emergency plumbing"],
  prohibitedClaims: ["Ratings", "Reviews", "Awards", "Years in business", "Guaranteed response time"],
};

function llmResponse(content: string, model: string) {
  return {
    id: "test",
    created: 1,
    model,
    choices: [{ index: 0, message: { role: "assistant" as const, content }, finish_reason: "stop" }],
  };
}

describe("internal Manus website generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listLLMModels).mockResolvedValue({
      object: "list",
      data: [
        { id: "gpt-5-mini", object: "model", created: 1, owned_by: "openai" },
        { id: "claude-sonnet-4-6", object: "model", created: 1, owned_by: "anthropic" },
      ],
    });
  });

  it("uses a structured brief and accepts premium internal Manus HTML", async () => {
    const premiumHtml = buildPremiumFallbackHtml("Northstar Plumbing", source);
    vi.mocked(invokeLLM)
      .mockResolvedValueOnce(llmResponse(JSON.stringify(creativeBrief), "gpt-5-mini"))
      .mockResolvedValueOnce(llmResponse(premiumHtml, "claude-sonnet-4-6"));

    const result = await generateWebsiteWithManus("Northstar Plumbing", source);

    expect(result.status).toBe("MANUS_GENERATED");
    expect(result.engine).toBe("MANUS_INTERNAL");
    expect(result.model).toContain("claude-sonnet-4-6");
    expect(result.creativeBrief?.heroHeadline).toContain("water");
    expect(result.html).toContain('id="vonwork-preview-visibility"');
    expect(invokeLLM).toHaveBeenCalledTimes(2);
  });

  it("uses the deterministic premium renderer when the internal model fails", async () => {
    vi.mocked(invokeLLM)
      .mockResolvedValueOnce(llmResponse(JSON.stringify(creativeBrief), "gpt-5-mini"))
      .mockRejectedValueOnce(new Error("temporary internal model error"));

    const result = await generateWebsiteWithManus("Northstar Plumbing", source);

    expect(result.status).toBe("FALLBACK_DEMO");
    expect(result.engine).toBe("PREMIUM_FALLBACK");
    expect(result.html).toContain('data-vonwork-design="premium-v2"');
    expect(result.fallbackReason).toContain("temporary internal model error");
  });

  it("recovers from malformed brief JSON and still uses the internal design model", async () => {
    const premiumHtml = buildPremiumFallbackHtml("Northstar Plumbing", source);
    vi.mocked(invokeLLM)
      .mockResolvedValueOnce(llmResponse('{"industry":"Plumbing","headline":"unfinished', "claude-haiku-4-5"))
      .mockResolvedValueOnce(llmResponse(premiumHtml, "claude-sonnet-4-6"));

    const result = await generateWebsiteWithManus("Northstar Plumbing", source);

    expect(result.status).toBe("MANUS_GENERATED");
    expect(result.model).toContain("deterministic brief recovery");
    expect(result.model).toContain("claude-sonnet-4-6");
  });

  it("quality-gates internal Manus revision output", async () => {
    const premiumHtml = buildPremiumFallbackHtml("Northstar Plumbing", source);
    vi.mocked(invokeLLM).mockResolvedValueOnce(llmResponse(premiumHtml, "claude-sonnet-4-6"));

    const result = await reviseWebsiteWithManus({
      currentHtml: premiumHtml,
      instruction: "Make the hero more urgent while keeping the verified phone number.",
      source,
      creativeBrief,
    });

    expect(result.qualityStatus).toBe("accepted");
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.html).toContain("312-444-0188");
    expect(result.html).toContain('id="vonwork-preview-visibility"');
  });

  it("rejects a generic revision that drops the premium contract", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce(
      llmResponse("<!DOCTYPE html><html><body><h1>Generic</h1></body></html>", "claude-sonnet-4-6")
    );

    await expect(
      reviseWebsiteWithManus({
        currentHtml: buildPremiumFallbackHtml("Northstar Plumbing", source),
        instruction: "Make it generic",
        source,
        creativeBrief,
      })
    ).rejects.toThrow("premium quality review");
  });
});
