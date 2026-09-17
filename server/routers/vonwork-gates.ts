/**
 * VON WORK Gate Checker — Build Spec Document 3 of 4, Section 2
 *
 * Verifies three upstream gates before any privileged action:
 *   Gate 1: Humans First Network membership is ACTIVE
 *   Gate 2: JOINFORCE Proof of Loyalty is VERIFIED
 *   Gate 3: JOINFORCE level meets the configured qualifying level
 *
 * Fail-closed: if upstream is unavailable or cache is >48h old, access is denied.
 * Never reads wallet addresses, balances, or claim data.
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";

// ─── Level ordering ───────────────────────────────────────────────────────────

const JF_LEVEL_ORDER = ["PIONEER", "FOUNDER", "VANGUARD", "LEGACY"];

function levelMeetsRequirement(memberLevel: string | null, requiredLevel: string): boolean {
  if (!memberLevel) return false;
  const memberIdx = JF_LEVEL_ORDER.indexOf(memberLevel.toUpperCase());
  const requiredIdx = JF_LEVEL_ORDER.indexOf(requiredLevel.toUpperCase());
  if (memberIdx === -1 || requiredIdx === -1) return false;
  return memberIdx >= requiredIdx;
}

// ─── Gate Check Logic ─────────────────────────────────────────────────────────

interface GateResult {
  hfnStatus: string;
  jfProofOfLoyalty: string;
  jfLevel: string | null;
  jfCredentialValidUntil: string | null;
  qualifyingLevel: string;
  gate1Pass: boolean;
  gate2Pass: boolean;
  gate3Pass: boolean;
  allGatesPass: boolean;
  failedGates: string[];
  checkedAt: string;
  fromCache: boolean;
}

async function checkUpstreamGates(
  hfnMemberId: string,
  vwAccountId: number,
  source: string,
): Promise<GateResult> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  // Get config values
  const configRows = await db.execute(sql`SELECT \`key\`, value FROM vw_config WHERE \`key\` IN ('gate_cache_ttl_hours','qualifying_jf_level','hfn_api_url','jf_api_url')`);
  const configData = (Array.isArray((configRows as any)[0]) ? (configRows as any)[0] : configRows) as any[];
  const configMap: Record<string, string> = {};
  for (const row of configData) configMap[row.key] = row.value;
  const cacheTtlHours = parseInt(configMap["gate_cache_ttl_hours"] ?? "48", 10);
  const qualifyingLevel = (configMap["qualifying_jf_level"] ?? "PIONEER").toUpperCase();
  const hfnApiUrl = configMap["hfn_api_url"] ?? "https://humansfirstnetwork.com/api/v1/membership/status";
  const jfApiUrl = configMap["jf_api_url"] ?? "https://joinforce.example/api/v1/credential";

  // Check cache
  const cacheRows = await db.execute(sql`SELECT * FROM upstream_status WHERE vwAccountId = ${vwAccountId} AND expiresAt > NOW() ORDER BY checkedAt DESC LIMIT 1`);
  const cacheData = (Array.isArray((cacheRows as any)[0]) ? (cacheRows as any)[0] : cacheRows) as any[];

  if (cacheData[0]) {
    const cached = cacheData[0];
    const gate1Pass = cached.hfnStatus === "ACTIVE";
    const gate2Pass = cached.jfProofOfLoyalty === "VERIFIED";
    const gate3Pass = levelMeetsRequirement(cached.jfLevel, qualifyingLevel);
    const failedGates: string[] = [];
    if (!gate1Pass) failedGates.push("HUMANS_FIRST_MEMBERSHIP");
    if (!gate2Pass) failedGates.push("JOINFORCE_PROOF_OF_LOYALTY");
    if (!gate3Pass) failedGates.push(`JOINFORCE_LEVEL_${qualifyingLevel}`);
    return { hfnStatus: cached.hfnStatus, jfProofOfLoyalty: cached.jfProofOfLoyalty, jfLevel: cached.jfLevel, jfCredentialValidUntil: cached.jfCredentialValidUntil, qualifyingLevel, gate1Pass, gate2Pass, gate3Pass, allGatesPass: gate1Pass && gate2Pass && gate3Pass, failedGates, checkedAt: cached.checkedAt, fromCache: true };
  }

  // Live check
  let hfnStatus = "UNKNOWN";
  let jfProofOfLoyalty = "UNKNOWN";
  let jfLevel: string | null = null;
  let jfCredentialValidUntil: string | null = null;
  let jfRawResponse: string | null = null;

  // Gate 1: HFN
  try {
    const hfnApiKey = process.env.HFN_API_KEY ?? "";
    const hfnRes = await fetch(hfnApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${hfnApiKey}` }, body: JSON.stringify({ member_id: hfnMemberId }), signal: AbortSignal.timeout(8000) });
    if (hfnRes.ok) {
      const hfnData = await hfnRes.json() as any;
      hfnStatus = hfnData.status === "ACTIVE" ? "ACTIVE" : hfnData.status === "INACTIVE" ? "INACTIVE" : "NOT_FOUND";
    } else { hfnStatus = hfnRes.status === 404 ? "NOT_FOUND" : "ERROR"; }
  } catch { hfnStatus = "ERROR"; }

  // Gate 2+3: JOINFORCE
  try {
    const jfApiKey = process.env.JF_API_KEY ?? "";
    const jfRes = await fetch(jfApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jfApiKey}` }, body: JSON.stringify({ member_id: hfnMemberId }), signal: AbortSignal.timeout(8000) });
    if (jfRes.ok) {
      const jfData = await jfRes.json() as any;
      jfRawResponse = JSON.stringify(jfData);
      jfProofOfLoyalty = jfData.proof_of_loyalty === "VERIFIED" ? "VERIFIED" : "UNVERIFIED";
      jfLevel = jfData.level ?? null;
      jfCredentialValidUntil = jfData.credential_valid_until ?? null;
    } else { jfProofOfLoyalty = jfRes.status === 404 ? "NOT_FOUND" : "ERROR"; }
  } catch { jfProofOfLoyalty = "ERROR"; }

  const expiresAt = new Date(Date.now() + cacheTtlHours * 3600 * 1000);
  await db.execute(sql`INSERT INTO upstream_status (vwAccountId, hfnMemberId, hfnStatus, jfProofOfLoyalty, jfLevel, jfCredentialValidUntil, jfRawResponse, expiresAt, source) VALUES (${vwAccountId}, ${hfnMemberId}, ${hfnStatus}, ${jfProofOfLoyalty}, ${jfLevel}, ${jfCredentialValidUntil ? new Date(jfCredentialValidUntil) : null}, ${jfRawResponse}, ${expiresAt}, ${source})`);
  await db.execute(sql`UPDATE vw_accounts SET lastGateCheckAt = NOW() WHERE id = ${vwAccountId}`);

  const gate1Pass = hfnStatus === "ACTIVE";
  const gate2Pass = jfProofOfLoyalty === "VERIFIED";
  const gate3Pass = levelMeetsRequirement(jfLevel, qualifyingLevel);
  const failedGates: string[] = [];
  if (!gate1Pass) failedGates.push("HUMANS_FIRST_MEMBERSHIP");
  if (!gate2Pass) failedGates.push("JOINFORCE_PROOF_OF_LOYALTY");
  if (!gate3Pass) failedGates.push(`JOINFORCE_LEVEL_${qualifyingLevel}`);

  await db.execute(sql`INSERT INTO vw_audit_log (vwAccountId, action, actor, detail) VALUES (${vwAccountId}, 'GATE_CHECK', 'system', ${JSON.stringify({ hfnStatus, jfProofOfLoyalty, jfLevel, failedGates, source })})`);

  return { hfnStatus, jfProofOfLoyalty, jfLevel, jfCredentialValidUntil, qualifyingLevel, gate1Pass, gate2Pass, gate3Pass, allGatesPass: gate1Pass && gate2Pass && gate3Pass, failedGates, checkedAt: new Date().toISOString(), fromCache: false };
}

// ─── tRPC Router ─────────────────────────────────────────────────────────────

export const vonworkGatesRouter = router({

  getOrCreateAccount: protectedProcedure
    .input(z.object({ hfnMemberId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.execute(sql`SELECT * FROM vw_accounts WHERE userId = ${ctx.user.id} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      if (data[0]) return data[0];

      // Generate VW-BIZ ID
      const counterRows = await db.execute(sql`SELECT value FROM vw_config WHERE \`key\` = 'vw_biz_counter' LIMIT 1`);
      const counterData = (Array.isArray((counterRows as any)[0]) ? (counterRows as any)[0] : counterRows) as any[];
      const next = parseInt(counterData[0]?.value ?? "0", 10) + 1;
      await db.execute(sql`UPDATE vw_config SET value = ${String(next)} WHERE \`key\` = 'vw_biz_counter'`);
      const vwAccountId = `VW-BIZ-${String(next).padStart(8, "0")}`;

      await db.execute(sql`INSERT INTO vw_accounts (userId, vwAccountId, hfnMemberId, email, status, tier) VALUES (${ctx.user.id}, ${vwAccountId}, ${input.hfnMemberId ?? null}, ${ctx.user.email ?? ""}, 'PENDING', 'NONE')`);
      const newRows = await db.execute(sql`SELECT * FROM vw_accounts WHERE userId = ${ctx.user.id} LIMIT 1`);
      return ((Array.isArray((newRows as any)[0]) ? (newRows as any)[0] : newRows) as any[])[0];
    }),

  checkGates: protectedProcedure
    .input(z.object({ hfnMemberId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.execute(sql`SELECT * FROM vw_accounts WHERE userId = ${ctx.user.id} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      if (!data[0]) throw new TRPCError({ code: "NOT_FOUND", message: "VW account not found. Create account first." });
      const vwAccount = data[0];
      if (input.hfnMemberId && !vwAccount.hfnMemberId) {
        await db.execute(sql`UPDATE vw_accounts SET hfnMemberId = ${input.hfnMemberId} WHERE id = ${vwAccount.id}`);
      }
      const result = await checkUpstreamGates(input.hfnMemberId, vwAccount.id, "LOGIN");
      if (!result.allGatesPass && vwAccount.status === "ACTIVE") {
        await db.execute(sql`UPDATE vw_accounts SET status = 'SUSPENDED_UPSTREAM', suspendedReason = ${result.failedGates.join(", ")} WHERE id = ${vwAccount.id}`);
      }
      return result;
    }),

  getGateStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.execute(sql`SELECT * FROM vw_accounts WHERE userId = ${ctx.user.id} LIMIT 1`);
    const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    const vwAccount = data[0];
    if (!vwAccount) return null;

    const cacheRows = await db.execute(sql`SELECT * FROM upstream_status WHERE vwAccountId = ${vwAccount.id} ORDER BY checkedAt DESC LIMIT 1`);
    const cacheData = (Array.isArray((cacheRows as any)[0]) ? (cacheRows as any)[0] : cacheRows) as any[];

    const configRows = await db.execute(sql`SELECT value FROM vw_config WHERE \`key\` = 'qualifying_jf_level' LIMIT 1`);
    const configData = (Array.isArray((configRows as any)[0]) ? (configRows as any)[0] : configRows) as any[];
    const qualifyingLevel = configData[0]?.value ?? "PIONEER";

    const powRows = await db.execute(sql`SELECT status, powRef, validUntil FROM pow_submissions WHERE vwAccountId = ${vwAccount.id} AND status = 'VERIFIED' ORDER BY submittedAt DESC LIMIT 1`);
    const powData = (Array.isArray((powRows as any)[0]) ? (powRows as any)[0] : powRows) as any[];

    const agreementRows = await db.execute(sql`SELECT id FROM agreement_acceptances WHERE vwAccountId = ${vwAccount.id} ORDER BY acceptedAt DESC LIMIT 1`);
    const agreementData = (Array.isArray((agreementRows as any)[0]) ? (agreementRows as any)[0] : agreementRows) as any[];

    const upstream = cacheData[0];
    return {
      vwAccount,
      qualifyingLevel,
      gates: {
        hfnMembership: { status: upstream?.hfnStatus ?? "UNKNOWN", pass: upstream?.hfnStatus === "ACTIVE" },
        jfProofOfLoyalty: { status: upstream?.jfProofOfLoyalty ?? "UNKNOWN", pass: upstream?.jfProofOfLoyalty === "VERIFIED" },
        jfLevel: { level: upstream?.jfLevel ?? null, required: qualifyingLevel, pass: upstream?.jfLevel ? levelMeetsRequirement(upstream.jfLevel, qualifyingLevel) : false },
        pow: { status: powData[0]?.status ?? "NOT_STARTED", powRef: powData[0]?.powRef ?? null, pass: !!powData[0] },
        agreement: { accepted: !!agreementData[0], pass: !!agreementData[0] },
      },
      lastChecked: upstream?.checkedAt ?? null,
      cacheExpiresAt: upstream?.expiresAt ?? null,
    };
  }),

  submitPow: protectedProcedure
    .input(z.object({
      hfnMemberId: z.string().min(1),
      category: z.string().min(1),
      businessName: z.string().optional(),
      role: z.string().optional(),
      objectives: z.string().optional(),
      productsServices: z.string().optional(),
      contributionDescription: z.string().min(10),
      dateStart: z.string().optional(),
      dateEnd: z.string().optional(),
      isOngoing: z.boolean().default(false),
      referenceUrls: z.array(z.string()).optional(),
      transactionHashes: z.array(z.string()).optional(),
      walletAddress: z.string().optional(),
      witnessContact: z.string().optional(),
      attestationChecked: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.attestationChecked) throw new TRPCError({ code: "BAD_REQUEST", message: "You must check the attestation checkbox." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.execute(sql`SELECT * FROM vw_accounts WHERE userId = ${ctx.user.id} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      if (!data[0]) throw new TRPCError({ code: "NOT_FOUND", message: "VW account not found." });
      const vwAccount = data[0];

      const gates = await checkUpstreamGates(input.hfnMemberId, vwAccount.id, "POW_SUBMIT");
      if (!gates.gate1Pass || !gates.gate2Pass || !gates.gate3Pass) {
        throw new TRPCError({ code: "FORBIDDEN", message: `Gate check failed: ${gates.failedGates.join(", ")}` });
      }

      // Generate POW ref
      const counterRows = await db.execute(sql`SELECT value FROM vw_config WHERE \`key\` = 'pow_ref_counter' LIMIT 1`);
      const counterData = (Array.isArray((counterRows as any)[0]) ? (counterRows as any)[0] : counterRows) as any[];
      const next = parseInt(counterData[0]?.value ?? "0", 10) + 1;
      await db.execute(sql`UPDATE vw_config SET value = ${String(next)} WHERE \`key\` = 'pow_ref_counter'`);
      const powRef = `POW-${String(next).padStart(8, "0")}`;

      const configRows = await db.execute(sql`SELECT value FROM vw_config WHERE \`key\` = 'pow_reattestation_days' LIMIT 1`);
      const configData = (Array.isArray((configRows as any)[0]) ? (configRows as any)[0] : configRows) as any[];
      const reattestDays = parseInt(configData[0]?.value ?? "365", 10);
      const validUntil = new Date(Date.now() + reattestDays * 86400 * 1000);

      const refUrls = input.referenceUrls ? JSON.stringify(input.referenceUrls) : null;
      const txHashes = input.transactionHashes ? JSON.stringify(input.transactionHashes) : null;

      await db.execute(sql`INSERT INTO pow_submissions (powRef, vwAccountId, category, businessName, role, objectives, productsServices, contributionDescription, dateStart, dateEnd, isOngoing, referenceUrls, transactionHashes, walletAddress, witnessContact, attestationChecked, status, validUntil, reattestationCadenceDays) VALUES (${powRef}, ${vwAccount.id}, ${input.category}, ${input.businessName ?? null}, ${input.role ?? null}, ${input.objectives ?? null}, ${input.productsServices ?? null}, ${input.contributionDescription}, ${input.dateStart ?? null}, ${input.dateEnd ?? null}, ${input.isOngoing ? 1 : 0}, ${refUrls}, ${txHashes}, ${input.walletAddress ?? null}, ${input.witnessContact ?? null}, 1, 'SUBMITTED', ${validUntil}, ${reattestDays})`);

      await db.execute(sql`INSERT INTO pow_revisions (powRef, revisionNo, payload, changedBy) VALUES (${powRef}, 1, ${JSON.stringify(input)}, 'MEMBER')`);
      await db.execute(sql`INSERT INTO vw_audit_log (vwAccountId, action, actor, detail) VALUES (${vwAccount.id}, 'POW_SUBMIT', ${String(ctx.user.id)}, ${JSON.stringify({ powRef, category: input.category })})`);

      return { powRef, status: "SUBMITTED", validUntil: validUntil.toISOString() };
    }),

  listPowSubmissions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.execute(sql`SELECT * FROM vw_accounts WHERE userId = ${ctx.user.id} LIMIT 1`);
    const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    if (!data[0]) return [];
    const powRows = await db.execute(sql`SELECT * FROM pow_submissions WHERE vwAccountId = ${data[0].id} ORDER BY submittedAt DESC`);
    return (Array.isArray((powRows as any)[0]) ? (powRows as any)[0] : powRows) as any[];
  }),

  getPowSubmission: protectedProcedure
    .input(z.object({ powRef: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.execute(sql`SELECT * FROM vw_accounts WHERE userId = ${ctx.user.id} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      if (!data[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const powRows = await db.execute(sql`SELECT * FROM pow_submissions WHERE powRef = ${input.powRef} AND vwAccountId = ${data[0].id} LIMIT 1`);
      const powData = (Array.isArray((powRows as any)[0]) ? (powRows as any)[0] : powRows) as any[];
      if (!powData[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const revRows = await db.execute(sql`SELECT * FROM pow_revisions WHERE powRef = ${input.powRef} ORDER BY revisionNo ASC`);
      const reviewRows = await db.execute(sql`SELECT * FROM pow_reviews WHERE powRef = ${input.powRef} ORDER BY decidedAt DESC`);
      const evidenceRows = await db.execute(sql`SELECT id, filename, mimeType, sizeBytes, scanResult, uploadedAt FROM pow_evidence WHERE powRef = ${input.powRef}`);
      return {
        submission: powData[0],
        revisions: (Array.isArray((revRows as any)[0]) ? (revRows as any)[0] : revRows) as any[],
        reviews: (Array.isArray((reviewRows as any)[0]) ? (reviewRows as any)[0] : reviewRows) as any[],
        evidence: (Array.isArray((evidenceRows as any)[0]) ? (evidenceRows as any)[0] : evidenceRows) as any[],
      };
    }),

  adminListPow: protectedProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = input.status
        ? await db.execute(sql`SELECT ps.*, va.hfnMemberId, va.tier, u.email, u.name FROM pow_submissions ps JOIN vw_accounts va ON ps.vwAccountId = va.id JOIN users u ON va.userId = u.id WHERE ps.status = ${input.status} ORDER BY ps.submittedAt DESC LIMIT ${input.limit} OFFSET ${input.offset}`)
        : await db.execute(sql`SELECT ps.*, va.hfnMemberId, va.tier, u.email, u.name FROM pow_submissions ps JOIN vw_accounts va ON ps.vwAccountId = va.id JOIN users u ON va.userId = u.id ORDER BY ps.submittedAt DESC LIMIT ${input.limit} OFFSET ${input.offset}`);
      return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    }),

  adminReviewPow: protectedProcedure
    .input(z.object({ powRef: z.string(), decision: z.enum(["VERIFIED", "REJECTED", "MORE_INFO_REQUIRED", "ESCALATED"]), rationale: z.string().min(10), memberMessage: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`INSERT INTO pow_reviews (powRef, reviewerId, decision, rationale, memberMessage) VALUES (${input.powRef}, ${ctx.user.id}, ${input.decision}, ${input.rationale}, ${input.memberMessage ?? null})`);
      const newStatus = input.decision === "VERIFIED" ? "VERIFIED" : input.decision === "REJECTED" ? "REJECTED" : input.decision === "MORE_INFO_REQUIRED" ? "MORE_INFO_REQUIRED" : "MANUAL_REVIEW";
      await db.execute(sql`UPDATE pow_submissions SET status = ${newStatus} WHERE powRef = ${input.powRef}`);
      if (input.decision === "VERIFIED") {
        const powRows = await db.execute(sql`SELECT vwAccountId FROM pow_submissions WHERE powRef = ${input.powRef} LIMIT 1`);
        const powData = (Array.isArray((powRows as any)[0]) ? (powRows as any)[0] : powRows) as any[];
        if (powData[0]) await db.execute(sql`UPDATE vw_accounts SET status = 'ACTIVE' WHERE id = ${powData[0].vwAccountId} AND status = 'PENDING'`);
      }
      await db.execute(sql`INSERT INTO vw_audit_log (action, actor, detail) VALUES ('POW_REVIEW', ${String(ctx.user.id)}, ${JSON.stringify({ powRef: input.powRef, decision: input.decision })})`);
      return { success: true };
    }),

  saveBusinessInfo: protectedProcedure
    .input(z.object({ legalName: z.string().min(1), structure: z.string().optional(), jurisdiction: z.string().optional(), regNumber: z.string().optional(), principalAddress: z.string().optional(), signatoryName: z.string().optional(), signatoryRole: z.string().optional(), taxStatus: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.execute(sql`SELECT * FROM vw_accounts WHERE userId = ${ctx.user.id} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      if (!data[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const existing = await db.execute(sql`SELECT id FROM vw_businesses WHERE vwAccountId = ${data[0].id} LIMIT 1`);
      const existingData = (Array.isArray((existing as any)[0]) ? (existing as any)[0] : existing) as any[];
      if (existingData[0]) {
        await db.execute(sql`UPDATE vw_businesses SET legalName=${input.legalName}, structure=${input.structure ?? null}, jurisdiction=${input.jurisdiction ?? null}, regNumber=${input.regNumber ?? null}, principalAddress=${input.principalAddress ?? null}, signatoryName=${input.signatoryName ?? null}, signatoryRole=${input.signatoryRole ?? null}, taxStatus=${input.taxStatus ?? null} WHERE vwAccountId=${data[0].id}`);
      } else {
        await db.execute(sql`INSERT INTO vw_businesses (vwAccountId, legalName, structure, jurisdiction, regNumber, principalAddress, signatoryName, signatoryRole, taxStatus) VALUES (${data[0].id}, ${input.legalName}, ${input.structure ?? null}, ${input.jurisdiction ?? null}, ${input.regNumber ?? null}, ${input.principalAddress ?? null}, ${input.signatoryName ?? null}, ${input.signatoryRole ?? null}, ${input.taxStatus ?? null})`);
      }
      await db.execute(sql`INSERT INTO vw_audit_log (vwAccountId, action, actor, detail) VALUES (${data[0].id}, 'BUSINESS_INFO_SAVED', ${String(ctx.user.id)}, ${JSON.stringify({ legalName: input.legalName })})`);
      return { success: true };
    }),

  getAgreement: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.execute(sql`SELECT * FROM agreement_versions WHERE isActive = true ORDER BY effectiveFrom DESC LIMIT 1`);
    const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    if (!data[0]) throw new TRPCError({ code: "NOT_FOUND", message: "No active agreement version found." });
    return data[0];
  }),

  acceptAgreement: protectedProcedure
    .input(z.object({ versionId: z.string(), typedSignature: z.string().min(2), scrolledToEnd: z.boolean(), checkboxChecked: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!input.scrolledToEnd) throw new TRPCError({ code: "BAD_REQUEST", message: "You must scroll to the end of the agreement." });
      if (!input.checkboxChecked) throw new TRPCError({ code: "BAD_REQUEST", message: "You must check the agreement checkbox." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.execute(sql`SELECT * FROM vw_accounts WHERE userId = ${ctx.user.id} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      if (!data[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const ip = (ctx as any).req?.ip ?? null;
      const userAgent = (ctx as any).req?.headers?.["user-agent"] ?? null;
      await db.execute(sql`INSERT INTO agreement_acceptances (vwAccountId, versionId, ipAddress, userAgent, typedSignature, scrolledToEnd, checkboxChecked) VALUES (${data[0].id}, ${input.versionId}, ${ip}, ${userAgent}, ${input.typedSignature}, ${input.scrolledToEnd ? 1 : 0}, ${input.checkboxChecked ? 1 : 0})`);
      const powRows = await db.execute(sql`SELECT id FROM pow_submissions WHERE vwAccountId = ${data[0].id} AND status = 'VERIFIED' LIMIT 1`);
      const powData = (Array.isArray((powRows as any)[0]) ? (powRows as any)[0] : powRows) as any[];
      const bizRows = await db.execute(sql`SELECT id FROM vw_businesses WHERE vwAccountId = ${data[0].id} LIMIT 1`);
      const bizData = (Array.isArray((bizRows as any)[0]) ? (bizRows as any)[0] : bizRows) as any[];
      if (powData[0] && bizData[0]) {
        await db.execute(sql`UPDATE vw_accounts SET status = 'ACTIVE' WHERE id = ${data[0].id}`);
      }
      await db.execute(sql`INSERT INTO vw_audit_log (vwAccountId, action, actor, detail, ipAddress) VALUES (${data[0].id}, 'AGREEMENT_ACCEPTED', ${String(ctx.user.id)}, ${JSON.stringify({ versionId: input.versionId })}, ${ip})`);
      return { success: true, accountId: data[0].vwAccountId };
    }),

  getTierMatrix: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.execute(sql`SELECT * FROM tier_matrix ORDER BY tier, feature`);
    return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
  }),

  updateTierMatrix: protectedProcedure
    .input(z.object({ tier: z.enum(["PIONEER", "FOUNDER", "VANGUARD", "LEGACY"]), feature: z.string(), enabled: z.boolean(), quota: z.number().optional(), quotaUnit: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.execute(sql`SELECT id FROM tier_matrix WHERE tier = ${input.tier} AND feature = ${input.feature} LIMIT 1`);
      const existingData = (Array.isArray((existing as any)[0]) ? (existing as any)[0] : existing) as any[];
      if (existingData[0]) {
        await db.execute(sql`UPDATE tier_matrix SET enabled=${input.enabled ? 1 : 0}, quota=${input.quota ?? null}, quotaUnit=${input.quotaUnit ?? null}, updatedBy=${ctx.user.id} WHERE tier=${input.tier} AND feature=${input.feature}`);
      } else {
        await db.execute(sql`INSERT INTO tier_matrix (tier, feature, enabled, quota, quotaUnit, updatedBy) VALUES (${input.tier}, ${input.feature}, ${input.enabled ? 1 : 0}, ${input.quota ?? null}, ${input.quotaUnit ?? null}, ${ctx.user.id})`);
      }
      await db.execute(sql`INSERT INTO vw_audit_log (action, actor, detail) VALUES ('TIER_MATRIX_UPDATE', ${String(ctx.user.id)}, ${JSON.stringify({ tier: input.tier, feature: input.feature, enabled: input.enabled })})`);
      return { success: true };
    }),

  getConfig: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.execute(sql`SELECT * FROM vw_config ORDER BY \`key\``);
    return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
  }),

  updateConfig: protectedProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`UPDATE vw_config SET value = ${input.value}, updatedBy = ${ctx.user.id} WHERE \`key\` = ${input.key}`);
      await db.execute(sql`INSERT INTO vw_audit_log (action, actor, detail) VALUES ('CONFIG_UPDATE', ${String(ctx.user.id)}, ${JSON.stringify({ key: input.key, value: input.value })})`);
      return { success: true };
    }),
});
