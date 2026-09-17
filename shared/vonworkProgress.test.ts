import { describe, expect, it } from "vitest";
import {
  calculateClaimScore,
  calculateEligibleCommission,
  getClaimStatus,
  getPerformanceMilestone,
} from "./vonworkProgress";

describe("VonWork progression helpers", () => {
  it("caps Claim Score at 1000 and ignores negative inputs", () => {
    expect(calculateClaimScore({ documentation: 500, verification: 400, education: 200, participation: -10, marketing: 50, production: 100 })).toBe(1000);
  });

  it("keeps score distinct from membership pricing", () => {
    expect(calculateClaimScore({ documentation: 0, verification: 0, education: 0, participation: 0, marketing: 0, production: 0 })).toBe(0);
  });

  it("maps qualifying-company milestones to five-point increments", () => {
    expect(getPerformanceMilestone(0)).toMatchObject({ nextTarget: 10, performanceRate: 0 });
    expect(getPerformanceMilestone(10)).toMatchObject({ nextTarget: 50, performanceRate: 5 });
    expect(getPerformanceMilestone(500)).toMatchObject({ nextTarget: null, performanceRate: 30 });
  });

  it("labels review readiness only when score and evidence are both sufficient", () => {
    expect(getClaimStatus(700, false)).toBe("VERIFIED");
    expect(getClaimStatus(700, true)).toBe("REVIEW READY");
    expect(getClaimStatus(850, true)).toBe("TRUST CONSIDERATION");
  });

  it("adds performance increments without exceeding the documented 60% ceiling", () => {
    expect(calculateEligibleCommission(30, 10)).toBe(35);
    expect(calculateEligibleCommission(30, 500)).toBe(60);
  });
});
