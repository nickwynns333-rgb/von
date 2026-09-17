import { describe, expect, it } from "vitest";
import {
  calculateCommission,
  calculateMultiLevelCommissions,
  getPartnerLevel,
  checkFraud,
  type CommissionPlanConfig,
} from "./commissionEngine";

describe("Commission Engine", () => {
  describe("calculateCommission", () => {
    it("calculates percentage commission correctly", () => {
      const plan: CommissionPlanConfig = { type: "percentage", rate: 30 };
      const result = calculateCommission(499, plan);
      expect(result.cashAmount).toBeCloseTo(149.7, 1);
      expect(result.creditAmount).toBe(0);
    });

    it("calculates fixed commission correctly", () => {
      const plan: CommissionPlanConfig = { type: "fixed", fixedAmount: 50 };
      const result = calculateCommission(499, plan);
      expect(result.cashAmount).toBe(50);
    });

    it("calculates hybrid commission (percentage + credits)", () => {
      const plan: CommissionPlanConfig = { type: "hybrid", rate: 20, creditReward: 500 };
      const result = calculateCommission(997, plan);
      expect(result.cashAmount).toBeCloseTo(199.4, 1);
      expect(result.creditAmount).toBe(500);
    });

    it("returns zero cash for missing rate on percentage type", () => {
      const plan: CommissionPlanConfig = { type: "percentage" };
      const result = calculateCommission(499, plan);
      expect(result.cashAmount).toBe(0);
    });

    it("returns credit reward for credit_reward type", () => {
      const plan: CommissionPlanConfig = { type: "credit_reward", creditReward: 1000 };
      const result = calculateCommission(499, plan);
      expect(result.cashAmount).toBe(0);
      expect(result.creditAmount).toBe(1000);
    });
  });

  describe("calculateMultiLevelCommissions", () => {
    it("returns empty array when disabled", () => {
      const result = calculateMultiLevelCommissions(499, {
        level1Rate: 10, level2Rate: 5, level3Rate: 2, enabled: false,
      });
      expect(result).toHaveLength(0);
    });

    it("returns 3 levels when enabled", () => {
      const result = calculateMultiLevelCommissions(499, {
        level1Rate: 10, level2Rate: 5, level3Rate: 2, enabled: true,
      });
      expect(result).toHaveLength(3);
      expect(result[0].level).toBe(1);
      expect(result[0].cashAmount).toBeCloseTo(49.9, 1);
    });
  });

  describe("getPartnerLevel", () => {
    it("returns bronze for new partners", () => {
      expect(getPartnerLevel(0, 0).name).toBe("bronze");
    });

    it("returns silver for 5+ subscribers and $1000+ MRR", () => {
      expect(getPartnerLevel(1000, 5).name).toBe("silver");
    });

    it("returns gold for 20+ subscribers and $5000+ MRR", () => {
      expect(getPartnerLevel(5000, 20).name).toBe("gold");
    });

    it("returns platinum for 50+ subscribers and $15000+ MRR", () => {
      expect(getPartnerLevel(15000, 50).name).toBe("platinum");
    });

    it("returns diamond for 150+ subscribers and $50000+ MRR", () => {
      expect(getPartnerLevel(50000, 150).name).toBe("diamond");
    });

    it("requires BOTH thresholds to advance level", () => {
      expect(getPartnerLevel(100, 20).name).toBe("bronze");
      expect(getPartnerLevel(5000, 2).name).toBe("bronze");
    });
  });

  describe("checkFraud", () => {
    it("detects self-referral", () => {
      const result = checkFraud({ partnerId: 1, partnerUserId: 42, referredUserId: 42 });
      expect(result.isFraud).toBe(true);
      expect(result.reason).toBe("self_referral");
    });

    it("detects suspicious IP pattern", () => {
      const result = checkFraud({
        partnerId: 1, partnerUserId: 1, ipAddress: "1.2.3.4",
        existingReferralIps: ["1.2.3.4", "1.2.3.4", "1.2.3.4", "1.2.3.4", "1.2.3.4"],
      });
      expect(result.isFraud).toBe(true);
      expect(result.reason).toBe("suspicious_pattern");
    });

    it("passes clean referral", () => {
      const result = checkFraud({
        partnerId: 1, partnerUserId: 1, referredUserId: 99,
        ipAddress: "5.6.7.8", existingReferralIps: ["1.2.3.4"],
      });
      expect(result.isFraud).toBe(false);
    });
  });
});
