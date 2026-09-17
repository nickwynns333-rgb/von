export type ClaimScoreInputs = {
  documentation: number;
  verification: number;
  education: number;
  participation: number;
  marketing: number;
  production: number;
  other?: number;
};

export type PerformanceMilestoneConfig = {
  threshold: number;
  nextTarget: number | null;
  label: string;
  incrementRate: number;
};

export type ProgressionConfig = {
  claimScoreMax: number;
  reviewReadyScore: number;
  trustConsiderationScore: number;
  maxBaseCommission: number;
  maxEligibleCommission: number;
  milestones: PerformanceMilestoneConfig[];
};

export const CLAIM_SCORE_MAX = 1000;
export const QUALIFYING_COMPANY_TARGET = 10;

export const DEFAULT_PROGRESSION_CONFIG: ProgressionConfig = {
  claimScoreMax: CLAIM_SCORE_MAX,
  reviewReadyScore: 700,
  trustConsiderationScore: 850,
  maxBaseCommission: 30,
  maxEligibleCommission: 60,
  milestones: [
    { threshold: 1, nextTarget: 10, label: "1–10 qualifying companies", incrementRate: 5 },
    { threshold: 10, nextTarget: 50, label: "10–50 qualifying companies", incrementRate: 5 },
    { threshold: 50, nextTarget: 100, label: "50–100 qualifying companies", incrementRate: 5 },
    { threshold: 100, nextTarget: 200, label: "100–200 qualifying companies", incrementRate: 5 },
    { threshold: 200, nextTarget: 500, label: "200–500 qualifying companies", incrementRate: 5 },
    { threshold: 500, nextTarget: null, label: "500+ qualifying companies", incrementRate: 5 },
  ],
};

export function calculateClaimScore(input: ClaimScoreInputs, config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG): number {
  const total = Object.values(input).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  return Math.min(Math.max(0, config.claimScoreMax), Math.round(total));
}

export function getPerformanceMilestone(qualifyingCompanies: number, config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG) {
  const count = Math.max(0, Math.floor(qualifyingCompanies));
  const milestones = [...config.milestones].sort((a, b) => a.threshold - b.threshold);
  const incrementsEarned = milestones.filter((milestone) => count >= milestone.threshold).reduce((sum, milestone) => sum + milestone.incrementRate, 0);
  const current = milestones.filter((milestone) => count >= milestone.threshold).at(-1);
  return {
    label: current?.label ?? "Start your first qualifying customer",
    nextTarget: count === 0 ? (milestones[0]?.nextTarget ?? QUALIFYING_COMPANY_TARGET) : (current?.nextTarget ?? null),
    incrementsEarned: milestones.filter((milestone) => count >= milestone.threshold).length,
    performanceRate: incrementsEarned,
  };
}

export function getClaimStatus(score: number, evidenceComplete: boolean, config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG): "BUILDING" | "VERIFIED" | "REVIEW READY" | "TRUST CONSIDERATION" {
  if (score >= config.trustConsiderationScore && evidenceComplete) return "TRUST CONSIDERATION";
  if (score >= config.reviewReadyScore && evidenceComplete) return "REVIEW READY";
  if (score >= config.reviewReadyScore - 300) return "VERIFIED";
  return "BUILDING";
}

export function calculateEligibleCommission(baseRate: number, qualifyingCompanies: number, config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG): number {
  const safeBase = Math.max(0, Math.min(config.maxBaseCommission, baseRate));
  return Math.min(config.maxEligibleCommission, safeBase + getPerformanceMilestone(qualifyingCompanies, config).performanceRate);
}
