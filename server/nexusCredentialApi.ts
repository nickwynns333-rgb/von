/**
 * VON WORK Outbound Credential API — Build Spec Document 3 of 4, Section 7
 *
 * Nexus Recovery Trust calls this endpoint to confirm Gate 3 of its own qualification chain.
 * Returns status only — NEVER sends evidence files, business financials, platform activity,
 * or AI usage data to Nexus.
 *
 * POST /api/v1/credential
 * Authorization: Bearer <Nexus API key>
 * { "member_id": "HFN-00000184" }
 */

import { Router } from "express";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

export function registerNexusCredentialApi(app: any) {
  const router = Router();

  router.post("/api/v1/credential", async (req, res) => {
    try {
      // Verify Nexus API key
      const authHeader = req.headers.authorization ?? "";
      const providedKey = authHeader.replace("Bearer ", "").trim();
      if (!providedKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable" });

      // Check if this API key is in credential_grants
      const keyHash = crypto.createHash("sha256").update(providedKey).digest("hex");
      const grantRows = await db.execute(sql`
        SELECT * FROM credential_grants
        WHERE apiKeyHash = ${keyHash}
          AND recipientSite = 'nexus'
          AND revokedAt IS NULL
        LIMIT 1
      `);
      const grantData = (Array.isArray((grantRows as any)[0]) ? (grantRows as any)[0] : grantRows) as any[];

      // In development/test mode, allow if NEXUS_API_KEY env matches
      const nexusApiKey = process.env.NEXUS_API_KEY ?? "";
      const isDevMode = process.env.NODE_ENV !== "production";
      const isValidKey = grantData[0] || (isDevMode && nexusApiKey && providedKey === nexusApiKey);

      if (!isValidKey) {
        return res.status(403).json({ error: "Invalid or revoked API key" });
      }

      // Get member_id from request
      const { member_id } = req.body;
      if (!member_id) {
        return res.status(400).json({ error: "member_id is required" });
      }

      // Look up VW account by HFN member ID
      const accountRows = await db.execute(sql`
        SELECT va.*, vb.legalName
        FROM vw_accounts va
        LEFT JOIN vw_businesses vb ON va.id = vb.vwAccountId
        WHERE va.hfnMemberId = ${member_id}
        LIMIT 1
      `);
      const accountData = (Array.isArray((accountRows as any)[0]) ? (accountRows as any)[0] : accountRows) as any[];
      const account = accountData[0];

      if (!account) {
        return res.json({
          member_id,
          proof_of_work: "NOT_FOUND",
          pow_reference: null,
          pow_verified_at: null,
          pow_valid_until: null,
          business_account: "NOT_FOUND",
          business_account_id: null,
          business_agreement_version: null,
          tier: "NONE",
          checked_at: new Date().toISOString(),
          signature: null,
        });
      }

      // Get latest verified POW
      const powRows = await db.execute(sql`
        SELECT powRef, submittedAt, validUntil
        FROM pow_submissions
        WHERE vwAccountId = ${account.id}
          AND status = 'VERIFIED'
        ORDER BY submittedAt DESC
        LIMIT 1
      `);
      const powData = (Array.isArray((powRows as any)[0]) ? (powRows as any)[0] : powRows) as any[];
      const pow = powData[0];

      // Get latest agreement acceptance
      const agreementRows = await db.execute(sql`
        SELECT aa.versionId
        FROM agreement_acceptances aa
        WHERE aa.vwAccountId = ${account.id}
        ORDER BY aa.acceptedAt DESC
        LIMIT 1
      `);
      const agreementData = (Array.isArray((agreementRows as any)[0]) ? (agreementRows as any)[0] : agreementRows) as any[];
      const agreement = agreementData[0];

      // Update last used timestamp for the grant
      if (grantData[0]) {
        await db.execute(sql`UPDATE credential_grants SET lastUsedAt = NOW() WHERE id = ${grantData[0].id}`);
      }

      // Build response — status only, no evidence files or platform data
      const responsePayload = {
        member_id,
        proof_of_work: pow ? "VERIFIED" : "NOT_VERIFIED",
        pow_reference: pow?.powRef ?? null,
        pow_verified_at: pow?.submittedAt ? new Date(pow.submittedAt).toISOString() : null,
        pow_valid_until: pow?.validUntil ? new Date(pow.validUntil).toISOString().split("T")[0] : null,
        business_account: account.status === "ACTIVE" ? "ACTIVE" : account.status,
        business_account_id: account.vwAccountId,
        business_agreement_version: agreement?.versionId ?? null,
        tier: account.tier,
        checked_at: new Date().toISOString(),
      };

      // Detached signature (HMAC-SHA256 of the payload using NEXUS_SIGNING_KEY)
      const signingKey = process.env.NEXUS_SIGNING_KEY ?? process.env.JWT_SECRET ?? "vonwork-signing-key";
      const payloadStr = JSON.stringify(responsePayload);
      const signature = crypto.createHmac("sha256", signingKey).update(payloadStr).digest("hex");

      // Audit log
      await db.execute(sql`
        INSERT INTO vw_audit_log (vwAccountId, action, actor, detail, ipAddress)
        VALUES (${account.id}, 'NEXUS_CREDENTIAL_CHECK', 'nexus', ${JSON.stringify({ member_id, pow: responsePayload.proof_of_work, tier: responsePayload.tier })}, ${req.ip ?? null})
      `);

      return res.json({ ...responsePayload, signature });
    } catch (err) {
      console.error("[Nexus Credential API] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.use(router);
}
