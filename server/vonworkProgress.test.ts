import { describe, expect, it } from "vitest";
import {
  calculateClaimScore,
  calculateEligibleCommission,
  DEFAULT_PROGRESSION_CONFIG,
  getClaimStatus,
  getPerformanceMilestone,
} from "../shared/vonworkProgress";

describe("VonWork progression helpers", () => {
  it("caps Claim Score at 1000 and ignores negative inputs", () => {
    expect(calculateClaimScore({ documentation: 500, verification: 400, education: 200, participation: -10, marketing: 50, production: 100 })).toBe(1000);
  });

  it("keeps score distinct from membership pricing", () => {
    expect(calculateClaimScore({ documentation: 0, verification: 0, education: 0, participation: 0, marketing: 0, production: 0 })).toBe(0);
  });

  it("maps qualifying-company milestones to five-point increments", () => {
    expect(getPerformanceMilestone(0)).toMatchObject({ nextTarget: 10, performanceRate: 0 });
    expect(getPerformanceMilestone(10)).toMatchObject({ nextTarget: 50, performanceRate: 10 });
    expect(getPerformanceMilestone(500)).toMatchObject({ nextTarget: null, performanceRate: 30 });
    expect(getPerformanceMilestone(501)).toMatchObject({ nextTarget: null, performanceRate: 30 });
  });

  it("labels review readiness only when score and evidence are both sufficient", () => {
    expect(getClaimStatus(700, false)).toBe("VERIFIED");
    expect(getClaimStatus(700, true)).toBe("REVIEW READY");
    expect(getClaimStatus(850, true)).toBe("TRUST CONSIDERATION");
  });

  it("adds performance increments without exceeding the documented 60% ceiling", () => {
    expect(calculateEligibleCommission(30, 10)).toBe(40);
    expect(calculateEligibleCommission(30, 500)).toBe(60);
    expect(calculateEligibleCommission(30, 501)).toBe(60);
  });

  it("supports administrator-defined progression configuration", () => {
    const config = {
      ...DEFAULT_PROGRESSION_CONFIG,
      claimScoreMax: 500,
      milestones: [{ threshold: 3, nextTarget: null, label: "3+ verified companies", incrementRate: 12 }],
    };
    expect(calculateClaimScore({ documentation: 400, verification: 300, education: 0, participation: 0, marketing: 0, production: 0 }, config)).toBe(500);
    expect(getPerformanceMilestone(3, config)).toMatchObject({ performanceRate: 12, nextTarget: null });
    expect(calculateEligibleCommission(30, 3, config)).toBe(42);
  });
});

import { classifyWebsiteAiEvidence } from "./routers/prospecting";

describe("website AI capability scan", () => {
  it("does not treat a missing website as proof that the business lacks AI", () => {
    expect(classifyWebsiteAiEvidence(null, null).status).toBe("NO_WEBSITE");
  });

  it("detects supported chat or AI experience markers", () => {
    const result = classifyWebsiteAiEvidence("https://example.com", '<script src="https://widget.intercom.io/widget.js"></script>');
    expect(result.status).toBe("HAS_AI_EXPERIENCE");
    expect(result.evidence).toContain("intercom");
  });

  it("reports no signal separately from unknown inspection", () => {
    expect(classifyWebsiteAiEvidence("https://example.com", "<html><body>Services</body></html>").status).toBe("NO_AI_SIGNAL");
    expect(classifyWebsiteAiEvidence("https://example.com", null).status).toBe("UNKNOWN");
  });
});
