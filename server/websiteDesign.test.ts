import { describe, expect, it } from "vitest";
import {
  buildPremiumFallbackHtml,
  buildPremiumWebsitePrompt,
  detectWebsiteIndustry,
  validateGeneratedWebsiteHtml,
} from "./websiteDesign";

const dentalSource = {
  title: "Northstar Dental | Family Dentistry",
  text: "Northstar Dental provides preventive dentistry, restorative care, and convenient appointments. Call (312) 867-0198 or email care@northstardental.example to connect with our office.",
  url: "https://northstardental.example",
  colorScheme: "auto" as const,
};

describe("premium Website Generator design contract", () => {
  it("selects an industry-adaptive visual direction", () => {
    expect(detectWebsiteIndustry(dentalSource).id).toBe("care");
    expect(detectWebsiteIndustry({ title: "Apex Roofing", text: "Roof repair and roof replacement" }).id).toBe("home-service");
  });

  it("builds a premium responsive fallback with truthful, accessible conversion elements", () => {
    const html = buildPremiumFallbackHtml("Northstar Dental", dentalSource);

    expect(validateGeneratedWebsiteHtml(html)).toEqual({ valid: true, reasons: [] });
    expect(html).toContain('data-vonwork-design="premium-v2"');
    expect(html).toContain('data-industry="care"');
    expect(html).toContain("prefers-reduced-motion");
    expect(html).toContain("vonwork-chat-panel");
    expect(html).toContain("AI Messaging — $199/month");
    expect(html).toContain("tel:3128670198");
    expect(html).not.toMatch(/testimonial|five[- ]star|rated 5/i);
  });

  it("escapes untrusted business names in the deterministic output", () => {
    const html = buildPremiumFallbackHtml('<script>alert("x")</script>', dentalSource);
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;");
  });

  it("requires premium structure before accepting AI-generated HTML", () => {
    expect(validateGeneratedWebsiteHtml("<!DOCTYPE html><html><body>Basic</body></html>").valid).toBe(false);
    const genericMarkedSite = `<!DOCTYPE html><html lang="en" data-vonwork-design="premium-v2"><head><meta name="viewport" content="width=device-width"><style>@media(prefers-reduced-motion:reduce){*{animation:none}}</style></head><body><main><section></section><section></section><section></section><section></section></main><div id="vonwork-chat-panel"></div></body></html>${" ".repeat(11_000)}`;
    expect(validateGeneratedWebsiteHtml(genericMarkedSite).reasons).toContain("insufficient-layout-variety");
  });

  it("accepts bespoke multi-grid layouts without requiring a literal bento class name", () => {
    const html = buildPremiumFallbackHtml("Northstar Dental", dentalSource).replaceAll("bento", "service-mosaic");
    expect(validateGeneratedWebsiteHtml(html)).toEqual({ valid: true, reasons: [] });
  });

  it("instructs AI generation to avoid fabricated reviews and generic layouts", () => {
    const prompt = buildPremiumWebsitePrompt(dentalSource);
    expect(prompt).toContain("distinctive, cinematic, high-converting");
    expect(prompt).toContain("Do NOT fabricate testimonials");
    expect(prompt).toContain('data-vonwork-design="premium-v2"');
  });
});
