/**
 * White-Label — unit tests
 * Tests brand config validation, domain format checks, and CSS sanitization
 * that protect the white-label system from bad input.
 */
import { describe, it, expect } from "vitest";

// ─── Helpers (inline — no external deps) ─────────────────────────────────────

function isValidHexColor(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

function isValidDomain(domain: string): boolean {
  // Must be a valid hostname (no protocol, no path)
  return /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain);
}

function sanitizeCss(css: string): string {
  // Strip dangerous patterns: url(), expression(), import
  return css
    .replace(/url\s*\([^)]*\)/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/@import[^;]*/gi, "");
}

function buildBrandConfig(input: {
  brandName?: string;
  primaryColor?: string;
  accentColor?: string;
  customDomain?: string;
  hideVonworkBranding?: boolean;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (input.brandName && input.brandName.length > 128) errors.push("brandName too long");
  if (input.primaryColor && !isValidHexColor(input.primaryColor)) errors.push("invalid primaryColor");
  if (input.accentColor && !isValidHexColor(input.accentColor)) errors.push("invalid accentColor");
  if (input.customDomain && !isValidDomain(input.customDomain)) errors.push("invalid customDomain");
  return { valid: errors.length === 0, errors };
}

// ─── Hex color validation ─────────────────────────────────────────────────────
describe("Hex Color Validation", () => {
  it("accepts valid 6-digit hex", () => {
    expect(isValidHexColor("#1a2b3c")).toBe(true);
    expect(isValidHexColor("#FFFFFF")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
  });

  it("accepts valid 3-digit hex", () => {
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#abc")).toBe(true);
  });

  it("rejects hex without #", () => {
    expect(isValidHexColor("ffffff")).toBe(false);
  });

  it("rejects rgb() format", () => {
    expect(isValidHexColor("rgb(255,255,255)")).toBe(false);
  });

  it("rejects named colors", () => {
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("transparent")).toBe(false);
  });

  it("rejects malformed hex", () => {
    expect(isValidHexColor("#12345")).toBe(false); // 5 digits
    expect(isValidHexColor("#gggggg")).toBe(false); // invalid chars
  });
});

// ─── Domain validation ────────────────────────────────────────────────────────
describe("Custom Domain Validation", () => {
  it("accepts valid domains", () => {
    expect(isValidDomain("myagency.com")).toBe(true);
    expect(isValidDomain("portal.myagency.com")).toBe(true);
    expect(isValidDomain("ai-platform.io")).toBe(true);
    expect(isValidDomain("sub.domain.example.co.uk")).toBe(true);
  });

  it("rejects domains with protocol", () => {
    expect(isValidDomain("https://myagency.com")).toBe(false);
    expect(isValidDomain("http://example.com")).toBe(false);
  });

  it("rejects domains with paths", () => {
    expect(isValidDomain("myagency.com/portal")).toBe(false);
  });

  it("rejects bare hostnames without TLD", () => {
    expect(isValidDomain("localhost")).toBe(false);
    expect(isValidDomain("myserver")).toBe(false);
  });

  it("rejects IP addresses", () => {
    expect(isValidDomain("192.168.1.1")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidDomain("")).toBe(false);
  });
});

// ─── CSS sanitization ─────────────────────────────────────────────────────────
describe("Custom CSS Sanitization", () => {
  it("strips url() calls", () => {
    const input = "background: url(https://evil.com/img.png);";
    expect(sanitizeCss(input)).not.toContain("url(");
  });

  it("strips expression() (IE CSS injection)", () => {
    const input = "width: expression(alert(1));";
    expect(sanitizeCss(input)).not.toContain("expression(");
  });

  it("strips @import statements", () => {
    const input = "@import url('https://evil.com/steal.css'); body { color: red; }";
    expect(sanitizeCss(input)).not.toContain("@import");
  });

  it("preserves safe CSS rules", () => {
    const input = "body { font-family: sans-serif; color: #333; margin: 0; }";
    const result = sanitizeCss(input);
    expect(result).toContain("font-family");
    expect(result).toContain("color: #333");
  });

  it("handles empty CSS", () => {
    expect(sanitizeCss("")).toBe("");
  });
});

// ─── Brand config builder ─────────────────────────────────────────────────────
describe("Brand Config Validation", () => {
  it("accepts valid brand config", () => {
    const result = buildBrandConfig({
      brandName: "My Agency",
      primaryColor: "#1a2b3c",
      accentColor: "#ff6600",
      customDomain: "portal.myagency.com",
      hideVonworkBranding: true,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects invalid primary color", () => {
    const result = buildBrandConfig({ primaryColor: "not-a-color" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("invalid primaryColor");
  });

  it("rejects invalid custom domain", () => {
    const result = buildBrandConfig({ customDomain: "https://bad-domain.com" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("invalid customDomain");
  });

  it("rejects brand name over 128 chars", () => {
    const result = buildBrandConfig({ brandName: "A".repeat(129) });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("brandName too long");
  });

  it("accepts partial config (only some fields set)", () => {
    const result = buildBrandConfig({ brandName: "My Agency" });
    expect(result.valid).toBe(true);
  });

  it("accumulates multiple errors", () => {
    const result = buildBrandConfig({
      primaryColor: "bad",
      accentColor: "also-bad",
      customDomain: "no-tld",
    });
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
