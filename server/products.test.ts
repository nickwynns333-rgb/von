import { PRODUCTS } from "./products";
import { describe, expect, it } from "vitest";

describe("VonWork product catalog", () => {
  it("keeps the public Starter and AI Video Pro offers at the approved values", () => {
    expect(PRODUCTS.starter.priceInCents).toBe(49900);
    expect(PRODUCTS.pro.priceInCents).toBe(99900);
    expect(PRODUCTS.enterprise.priceInCents).toBe(149700);
  });

  it("sets HFN own-use rates to exactly 50 percent of their public equivalents", () => {
    expect(PRODUCTS.hfn_starter.priceInCents).toBe(PRODUCTS.starter.priceInCents / 2);
    expect(PRODUCTS.hfn_pro.priceInCents).toBe(PRODUCTS.pro.priceInCents / 2);
    expect(PRODUCTS.hfn_starter.isHfnOwnUse).toBe(true);
    expect(PRODUCTS.hfn_starter.ownUseOnly).toBe(true);
    expect(PRODUCTS.hfn_pro.isHfnOwnUse).toBe(true);
    expect(PRODUCTS.hfn_pro.ownUseOnly).toBe(true);
  });

  it("marks all JoinForce offers as protected member products", () => {
    ["jf_starter", "jf_pro", "jf_seo_execution", "jf_geo_aeo", "jf_seo_bundle"].forEach((id) => {
      expect(PRODUCTS[id]?.isJoinForce).toBe(true);
    });
  });
});
