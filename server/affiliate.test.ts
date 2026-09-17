/**
 * Affiliate Program — unit tests
 * Tests the commission engine, partner level logic, and fraud detection.
 */
import { describe, it, expect } from "vitest";
import {
  calculateCommission,
  calculateMultiLevelCommissions,
  getPartnerLevel,
  getNextLevel,
  checkFraud,
  getEligibleAt,
  PARTNER_LEVELS,
  type CommissionPlanConfig,
  type FraudCheckInput,
  type EligibilityConfig,
} from "./commissionEngine";

// ─── Commission calculation ───────────────────────────────────────────────────
describe("Affiliate Commission Calculation", () => {
  it("calculates 20% recurring commission for bronze partner", () => {
    const plan: CommissionPlanConfig = { type: "percentage", rate: 20 };
    const result = calculateCommission(97, plan);
    expect(result.cashAmount).toBeCloseTo(19.4, 1);
    expect(result.creditAmount).toBe(0);
  });

  it("calculates 30% for agency reseller plan", () => {
    const plan: CommissionPlanConfig = { type: "percentage", rate: 30 };
    const result = calculateCommission(297, plan);
    expect(result.cashAmount).toBeCloseTo(89.1, 1);
  });

  it("calculates 40% for diamond partner", () => {
    const plan: CommissionPlanConfig = { type: "percentage", rate: 40 };
    const result = calculateCommission(497, plan);
    expect(result.cashAmount).toBeCloseTo(198.8, 1);
  });

  it("calculates fixed $50 signup bonus", () => {
    const plan: CommissionPlanConfig = { type: "fixed", fixedAmount: 50 };
    const result = calculateCommission(97, plan);
    expect(result.cashAmount).toBe(50);
  });

  it("calculates hybrid: 20% cash + 500 credits", () => {
    const plan: CommissionPlanConfig = { type: "hybrid", rate: 20, creditReward: 500 };
    const result = calculateCommission(297, plan);
    expect(result.cashAmount).toBeCloseTo(59.4, 1);
    expect(result.creditAmount).toBe(500);
  });

  it("returns zero for zero-amount transaction", () => {
    const plan: CommissionPlanConfig = { type: "percentage", rate: 25 };
    const result = calculateCommission(0, plan);
    expect(result.cashAmount).toBe(0);
  });

  it("credit_reward type returns only credits, no cash", () => {
    const plan: CommissionPlanConfig = { type: "credit_reward", creditReward: 1000 };
    const result = calculateCommission(97, plan);
    expect(result.cashAmount).toBe(0);
    expect(result.creditAmount).toBe(1000);
  });
});

// ─── Multi-level commissions ──────────────────────────────────────────────────
describe("Multi-Level Commission Distribution", () => {
  it("returns empty array when multi-level is disabled", () => {
    const result = calculateMultiLevelCommissions(100, {
      enabled: false,
      level1Rate: 10,
      level2Rate: 5,
      level3Rate: 2,
    });
    expect(result).toHaveLength(0);
  });

  it("distributes L1 and L2 commissions correctly", () => {
    const result = calculateMultiLevelCommissions(200, {
      enabled: true,
      level1Rate: 10,
      level2Rate: 5,
      level3Rate: 0,
    });
    // L3 is 0 so filtered out; L1 and L2 remain
    expect(result.length).toBeGreaterThanOrEqual(2);
    const l1 = result.find((r) => r.level === 1);
    const l2 = result.find((r) => r.level === 2);
    expect(l1?.cashAmount).toBeCloseTo(20, 1); // 10% of $200
    expect(l2?.cashAmount).toBeCloseTo(10, 1); // 5% of $200
  });

  it("filters out zero-rate levels", () => {
    const result = calculateMultiLevelCommissions(100, {
      enabled: true,
      level1Rate: 10,
      level2Rate: 0,
      level3Rate: 0,
    });
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe(1);
  });

  it("returns all 3 levels when all rates are non-zero", () => {
    const result = calculateMultiLevelCommissions(100, {
      enabled: true,
      level1Rate: 10,
      level2Rate: 5,
      level3Rate: 2,
    });
    expect(result).toHaveLength(3);
  });
});

// ─── Partner levels ───────────────────────────────────────────────────────────
describe("Partner Level Advancement", () => {
  it("all 5 levels are defined", () => {
    expect(PARTNER_LEVELS).toHaveLength(5);
    const names = PARTNER_LEVELS.map((l) => l.name);
    expect(names).toContain("bronze");
    expect(names).toContain("silver");
    expect(names).toContain("gold");
    expect(names).toContain("platinum");
    expect(names).toContain("diamond");
  });

  it("new partner with $0 MRR is bronze", () => {
    expect(getPartnerLevel(0, 0).name).toBe("bronze");
  });

  it("advances to silver at $1000 MRR + 5 subscribers", () => {
    expect(getPartnerLevel(1000, 5).name).toBe("silver");
  });

  it("advances to gold at $5000 MRR + 20 subscribers", () => {
    expect(getPartnerLevel(5000, 20).name).toBe("gold");
  });

  it("advances to platinum at $15000 MRR + 50 subscribers", () => {
    expect(getPartnerLevel(15000, 50).name).toBe("platinum");
  });

  it("advances to diamond at $50000 MRR + 150 subscribers", () => {
    expect(getPartnerLevel(50000, 150).name).toBe("diamond");
  });

  it("requires BOTH MRR and subscriber thresholds", () => {
    // High MRR but not enough subscribers → stays at lower level
    const level = getPartnerLevel(5000, 3);
    expect(["bronze", "silver"]).toContain(level.name);
  });

  it("getNextLevel returns null for diamond (top level)", () => {
    expect(getNextLevel("diamond")).toBeNull();
  });

  it("getNextLevel returns silver for bronze", () => {
    expect(getNextLevel("bronze")?.name).toBe("silver");
  });

  it("getNextLevel returns diamond for platinum", () => {
    expect(getNextLevel("platinum")?.name).toBe("diamond");
  });
});

// ─── Fraud detection ──────────────────────────────────────────────────────────
describe("Fraud Detection", () => {
  it("detects self-referral when referredUserId === partnerUserId", () => {
    const input: FraudCheckInput = {
      partnerId: 42,
      referredUserId: 99,
      partnerUserId: 99, // same as referredUserId → self-referral
      ipAddress: "1.2.3.4",
      existingReferralIps: [],
    };
    const result = checkFraud(input);
    expect(result.isFraud).toBe(true);
    expect(result.reason).toBe("self_referral");
  });

  it("detects suspicious IP pattern (5+ signups from same IP)", () => {
    const input: FraudCheckInput = {
      partnerId: 1,
      referredUserId: 99,
      partnerUserId: 1,
      ipAddress: "10.0.0.1",
      existingReferralIps: ["10.0.0.1", "10.0.0.1", "10.0.0.1", "10.0.0.1", "10.0.0.1"],
    };
    const result = checkFraud(input);
    expect(result.isFraud).toBe(true);
    expect(result.reason).toBe("suspicious_pattern");
  });

  it("passes clean referral with unique IPs", () => {
    const input: FraudCheckInput = {
      partnerId: 1,
      referredUserId: 99,
      partnerUserId: 1,
      ipAddress: "5.6.7.8",
      existingReferralIps: ["1.1.1.1", "2.2.2.2"],
    };
    const result = checkFraud(input);
    expect(result.isFraud).toBe(false);
  });

  it("passes when no existing referral IPs", () => {
    const input: FraudCheckInput = {
      partnerId: 5,
      referredUserId: 100,
      partnerUserId: 5,
      ipAddress: "9.9.9.9",
      existingReferralIps: [],
    };
    expect(checkFraud(input).isFraud).toBe(false);
  });
});

// ─── Eligibility / payout hold ────────────────────────────────────────────────
describe("Commission Eligibility Timing", () => {
  it("immediate payout returns same date", () => {
    const config: EligibilityConfig = { payTiming: "immediate" };
    const saleDate = new Date("2025-06-15T00:00:00Z");
    const eligible = getEligibleAt(saleDate, config);
    expect(eligible.toDateString()).toBe(saleDate.toDateString());
  });

  it("after_refund_period adds 30 days by default", () => {
    const config: EligibilityConfig = { payTiming: "after_refund_period", refundPeriodDays: 30 };
    const saleDate = new Date("2025-01-01T00:00:00Z");
    const eligible = getEligibleAt(saleDate, config);
    const diffDays = Math.round((eligible.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it("after_refund_period adds 60 days for high-risk plan", () => {
    const config: EligibilityConfig = { payTiming: "after_refund_period", refundPeriodDays: 60 };
    const saleDate = new Date("2025-03-01T00:00:00Z");
    const eligible = getEligibleAt(saleDate, config);
    expect(eligible > saleDate).toBe(true);
    const diffDays = Math.round((eligible.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(60);
  });

  it("monthly payout moves to first of next month", () => {
    const config: EligibilityConfig = { payTiming: "monthly" };
    const saleDate = new Date("2025-06-15T00:00:00Z");
    const eligible = getEligibleAt(saleDate, config);
    expect(eligible.getDate()).toBe(1);
    expect(eligible.getMonth()).toBe(6); // July (0-indexed)
  });

  it("after_first_payment adds 3 days", () => {
    const config: EligibilityConfig = { payTiming: "after_first_payment" };
    const saleDate = new Date("2025-06-15T00:00:00Z");
    const eligible = getEligibleAt(saleDate, config);
    const diffDays = Math.round((eligible.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(3);
  });
});
