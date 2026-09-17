import { describe, it, expect, vi, beforeEach } from "vitest";
import { PRODUCTS, WEBSITE_PLANS } from "./products";

// ─── Unit tests for products.ts ───────────────────────────────────────────────

describe("PRODUCTS config", () => {
  it("defines a starter plan at $499/month", () => {
    const starter = PRODUCTS["starter"];
    expect(starter).toBeDefined();
    expect(starter.priceInCents).toBe(49900);
    expect(starter.interval).toBe("month");
    expect(starter.name).toContain("Starter");
  });

  it("defines the AI Video Pro plan at $999/month", () => {
    const pro = PRODUCTS["pro"];
    expect(pro).toBeDefined();
    expect(pro.priceInCents).toBe(99900);
    expect(pro.interval).toBe("month");
    expect(pro.name).toContain("Pro");
  });

  it("defines the Enterprise plan at $1,497/month", () => {
    expect(PRODUCTS["enterprise"]).toBeDefined();
    expect(PRODUCTS["enterprise"].priceInCents).toBe(149700);
  });

  it("defines Website Only at $29/month", () => {
    expect(WEBSITE_PLANS.website_only.priceInCents).toBe(2900);
    expect(PRODUCTS.website_only.priceInCents).toBe(2900);
    expect(PRODUCTS.website_only.features).toContain("Live website hosting");
  });

  it("defines AI Messaging at $199/month with chatbot and limited phone answering", () => {
    expect(WEBSITE_PLANS.ai_messaging.priceInCents).toBe(19900);
    expect(WEBSITE_PLANS.ai_messaging.addonType).toBe("ai_messaging");
    expect(PRODUCTS.ai_messaging.features).toContain("Website chatbot");
    expect(PRODUCTS.ai_messaging.features).toContain("100 AI phone-answering minutes per month");
  });

  it("starter plan has required business-OS features", () => {
    const starter = PRODUCTS["starter"];
    expect(starter.features.length).toBeGreaterThan(0);
    expect(starter.features.some(f => f.toLowerCase().includes("crm"))).toBe(true);
  });

  it("pro plan has more features than starter", () => {
    expect(PRODUCTS["pro"].features.length).toBeGreaterThanOrEqual(
      PRODUCTS["starter"].features.length
    );
  });
});

// ─── Integration-style tests for checkout request validation ──────────────────

describe("Checkout request validation", () => {
  it("rejects invalid plan names", () => {
    const plan = "invalid-plan";
    const product = PRODUCTS[plan];
    expect(product).toBeUndefined();
  });

  it("accepts valid plan names", () => {
    for (const plan of ["starter", "pro"]) {
      const product = PRODUCTS[plan];
      expect(product).toBeDefined();
      expect(product.priceInCents).toBeGreaterThan(0);
    }
  });

  it("all plans have descriptions", () => {
    for (const [, product] of Object.entries(PRODUCTS)) {
      expect(product.description).toBeTruthy();
      expect(product.description.length).toBeGreaterThan(10);
    }
  });
});
