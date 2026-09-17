/**
 * VonWork Commission Calculation Engine
 * Handles all commission types: percentage, fixed, tiered, recurring, hybrid, multi-level
 */

export type CommissionType =
  | "percentage"
  | "fixed"
  | "percentage_bonus"
  | "tiered"
  | "recurring"
  | "one_time"
  | "credit_reward"
  | "hybrid";

export interface CommissionPlanConfig {
  type: CommissionType;
  rate?: number;          // percentage (e.g. 30 = 30%)
  fixedAmount?: number;   // fixed $ amount
  creditReward?: number;  // credits per sale
  tierConfig?: { minSales: number; rate: number }[];
  isRecurring?: boolean;
  recurringMonths?: number; // 0 = lifetime
}

export interface CommissionResult {
  cashAmount: number;   // $ amount
  creditAmount: number; // credits
  breakdown: string;    // human-readable explanation
}

/**
 * Calculate commission for a given sale amount and plan config
 */
export function calculateCommission(
  saleAmount: number,
  plan: CommissionPlanConfig,
  totalSalesCount: number = 0
): CommissionResult {
  let cashAmount = 0;
  let creditAmount = 0;
  let breakdown = "";

  switch (plan.type) {
    case "percentage": {
      const rate = plan.rate ?? 0;
      cashAmount = (saleAmount * rate) / 100;
      breakdown = `${rate}% of $${saleAmount.toFixed(2)} = $${cashAmount.toFixed(2)}`;
      break;
    }

    case "fixed": {
      cashAmount = plan.fixedAmount ?? 0;
      breakdown = `Fixed commission: $${cashAmount.toFixed(2)}`;
      break;
    }

    case "percentage_bonus": {
      const rate = plan.rate ?? 0;
      const bonus = plan.fixedAmount ?? 0;
      cashAmount = (saleAmount * rate) / 100 + bonus;
      breakdown = `${rate}% of $${saleAmount.toFixed(2)} + $${bonus.toFixed(2)} bonus = $${cashAmount.toFixed(2)}`;
      break;
    }

    case "tiered": {
      const tiers = plan.tierConfig ?? [];
      // Find the applicable tier based on total sales count
      const applicableTier = [...tiers]
        .sort((a, b) => b.minSales - a.minSales)
        .find((t) => totalSalesCount >= t.minSales);
      const rate = applicableTier?.rate ?? (plan.rate ?? 0);
      cashAmount = (saleAmount * rate) / 100;
      breakdown = `Tiered ${rate}% (${totalSalesCount} sales) of $${saleAmount.toFixed(2)} = $${cashAmount.toFixed(2)}`;
      break;
    }

    case "recurring": {
      const rate = plan.rate ?? 0;
      cashAmount = (saleAmount * rate) / 100;
      const months = plan.recurringMonths === 0 ? "lifetime" : `${plan.recurringMonths} months`;
      breakdown = `${rate}% recurring (${months}) of $${saleAmount.toFixed(2)} = $${cashAmount.toFixed(2)}/month`;
      break;
    }

    case "one_time": {
      const rate = plan.rate ?? 0;
      cashAmount = plan.fixedAmount ?? (saleAmount * rate) / 100;
      breakdown = `One-time commission: $${cashAmount.toFixed(2)}`;
      break;
    }

    case "credit_reward": {
      creditAmount = plan.creditReward ?? 0;
      breakdown = `${creditAmount.toLocaleString()} AI credits per sale`;
      break;
    }

    case "hybrid": {
      const rate = plan.rate ?? 0;
      creditAmount = plan.creditReward ?? 0;
      cashAmount = (saleAmount * rate) / 100 + (plan.fixedAmount ?? 0);
      breakdown = `${rate}% cash ($${cashAmount.toFixed(2)}) + ${creditAmount.toLocaleString()} credits`;
      break;
    }

    default:
      breakdown = "No commission applicable";
  }

  return {
    cashAmount: Math.round(cashAmount * 100) / 100,
    creditAmount,
    breakdown,
  };
}

/**
 * Calculate multi-level commissions (L1/L2/L3)
 */
export interface MultiLevelConfig {
  level1Rate: number;
  level2Rate: number;
  level3Rate: number;
  enabled: boolean;
}

export function calculateMultiLevelCommissions(
  saleAmount: number,
  config: MultiLevelConfig
): { level: number; cashAmount: number; breakdown: string }[] {
  if (!config.enabled) return [];

  return [
    {
      level: 1,
      cashAmount: Math.round((saleAmount * config.level1Rate) / 100 * 100) / 100,
      breakdown: `L1: ${config.level1Rate}% of $${saleAmount.toFixed(2)}`,
    },
    {
      level: 2,
      cashAmount: Math.round((saleAmount * config.level2Rate) / 100 * 100) / 100,
      breakdown: `L2: ${config.level2Rate}% of $${saleAmount.toFixed(2)}`,
    },
    {
      level: 3,
      cashAmount: Math.round((saleAmount * config.level3Rate) / 100 * 100) / 100,
      breakdown: `L3: ${config.level3Rate}% of $${saleAmount.toFixed(2)}`,
    },
  ].filter((c) => c.cashAmount > 0);
}

/**
 * Partner level advancement logic
 */
export const PARTNER_LEVELS = [
  { name: "bronze",   minMrr: 0,     minSubscribers: 0,  commissionRate: 20, bonusRate: 0 },
  { name: "silver",   minMrr: 1000,  minSubscribers: 5,  commissionRate: 25, bonusRate: 0 },
  { name: "gold",     minMrr: 5000,  minSubscribers: 20, commissionRate: 30, bonusRate: 0 },
  { name: "platinum", minMrr: 15000, minSubscribers: 50, commissionRate: 35, bonusRate: 2 },
  { name: "diamond",  minMrr: 50000, minSubscribers: 150, commissionRate: 40, bonusRate: 5 },
];

export function getPartnerLevel(mrr: number, subscribers: number): typeof PARTNER_LEVELS[0] {
  // Find highest level the partner qualifies for
  const qualified = PARTNER_LEVELS.filter(
    (l) => mrr >= l.minMrr && subscribers >= l.minSubscribers
  );
  return qualified[qualified.length - 1] ?? PARTNER_LEVELS[0];
}

export function getNextLevel(currentLevelName: string): typeof PARTNER_LEVELS[0] | null {
  const idx = PARTNER_LEVELS.findIndex((l) => l.name === currentLevelName);
  return idx >= 0 && idx < PARTNER_LEVELS.length - 1 ? PARTNER_LEVELS[idx + 1] : null;
}

/**
 * Fraud detection rules
 */
export interface FraudCheckInput {
  partnerId: number;
  referredUserId?: number;
  partnerUserId: number;
  ipAddress?: string;
  existingReferralIps?: string[];
}

export type FraudReason =
  | "self_referral"
  | "duplicate_account"
  | "vpn_abuse"
  | "suspicious_pattern";

export function checkFraud(input: FraudCheckInput): { isFraud: boolean; reason?: FraudReason; details?: string } {
  // Self-referral: partner refers themselves
  if (input.referredUserId && input.referredUserId === input.partnerUserId) {
    return {
      isFraud: true,
      reason: "self_referral",
      details: `Partner user ${input.partnerUserId} attempted to refer themselves`,
    };
  }

  // Suspicious IP pattern: same IP used for many referrals
  if (input.ipAddress && input.existingReferralIps) {
    const sameIpCount = input.existingReferralIps.filter((ip) => ip === input.ipAddress).length;
    if (sameIpCount >= 5) {
      return {
        isFraud: true,
        reason: "suspicious_pattern",
        details: `IP ${input.ipAddress} used for ${sameIpCount + 1} referrals`,
      };
    }
  }

  return { isFraud: false };
}

/**
 * Commission eligibility check
 */
export interface EligibilityConfig {
  payTiming: "immediate" | "after_refund_period" | "after_first_payment" | "monthly" | "weekly";
  refundPeriodDays?: number;
  minimumPayout?: number;
  requireManualApproval?: boolean;
}

export function getEligibleAt(saleDate: Date, config: EligibilityConfig): Date {
  const eligible = new Date(saleDate);

  switch (config.payTiming) {
    case "immediate":
      break;
    case "after_refund_period":
      eligible.setDate(eligible.getDate() + (config.refundPeriodDays ?? 30));
      break;
    case "after_first_payment":
      eligible.setDate(eligible.getDate() + 3); // 3 days for payment to clear
      break;
    case "monthly": {
      // First day of next month
      eligible.setMonth(eligible.getMonth() + 1);
      eligible.setDate(1);
      break;
    }
    case "weekly": {
      // Next Monday
      const day = eligible.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      eligible.setDate(eligible.getDate() + daysUntilMonday);
      break;
    }
  }

  return eligible;
}
