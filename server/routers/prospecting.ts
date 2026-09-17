import { z } from "zod";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { makeRequest, type PlaceDetailsResult, type PlacesSearchResult } from "../_core/map";
import { openRouterChat } from "../openrouter";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const CLIENT_IMPORT_MAX_ROWS = 500;
export const STAGED_CAMPAIGNS_START_IN_TEST_MODE = true;
export const PRESENTATION_TRACKED_EVENTS = ["OPENED", "QUESTION_ASKED", "CONTACT_CAPTURED", "FOLLOW_UP_PREPARED"] as const;

function rowsOf(result: unknown): any[] {
  return (Array.isArray((result as any)?.[0]) ? (result as any)[0] : result) as any[];
}

function cleanHtml(value: string) {
  return value.replace(/^```html\s*/i, "").replace(/\s*```$/i, "").trim();
}

export function fallbackDemo(prospect: any) {
  const location = prospect.formattedAddress ? `<p>${prospect.formattedAddress}</p>` : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${prospect.businessName}</title><style>body{margin:0;font-family:Inter,Arial,sans-serif;color:#0f172a;background:#f8fafc}.notice{background:#1d4ed8;color:#fff;text-align:center;padding:11px;font-size:13px;font-weight:700}.hero{padding:100px 24px;text-align:center;background:linear-gradient(135deg,#eff6ff,#fff)}h1{font-size:clamp(38px,7vw,76px);margin:0 auto 20px;max-width:900px}.lead{font-size:20px;color:#475569;max-width:650px;margin:0 auto 30px}.button{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:15px 24px;border-radius:12px;font-weight:800}.section{padding:64px 24px;max-width:1000px;margin:auto}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}.card{background:#fff;border:1px solid #dbeafe;border-radius:16px;padding:24px;box-shadow:0 8px 30px rgba(15,23,42,.06)}footer{background:#0f172a;color:#cbd5e1;padding:30px;text-align:center}</style></head><body><div class="notice">Private VonWork AI concept demo — not yet the business's live website</div><section class="hero"><h1>${prospect.businessName}</h1><p class="lead">A clearer, faster, mobile-first website designed to help local customers choose your business with confidence.</p><a class="button" href="#contact">Request Service</a></section><section class="section"><h2>Why customers choose us</h2><div class="cards"><div class="card"><h3>Professional service</h3><p>Clear information and a customer-first experience from first question to completed job.</p></div><div class="card"><h3>Easy booking</h3><p>Give visitors a simple way to request service, book a time, or ask a question.</p></div><div class="card"><h3>Built for mobile</h3><p>Fast, accessible design that works across phones, tablets, and desktop computers.</p></div></div></section><section class="section" id="contact"><h2>Contact ${prospect.businessName}</h2>${location}<p>${prospect.phone ?? "Contact details can be added after approval."}</p></section><footer>Private concept prepared by VonWork AI</footer></body></html>`;
}

function createPresentationScript(prospect: any, demoUrl: string) {
  return `Welcome to a private VonWork concept presentation for ${prospect.businessName}. This is a preview, not a live site. Start by showing the refreshed mobile-first homepage, then explain the conversion improvements: clear services, simple booking, a trust-first layout, and optional AI chat. Share the demo link: ${demoUrl}. Ask the owner what they would change, then offer only the add-ons relevant to their goals: booking calendar, AI chat, SEO, GEO/AEO, video, or a custom AI representative. Do not promise rankings, guaranteed revenue, or automatic results.`;
}

function normalizePhone(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

function normalizeDomain(value?: string | null) {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./, "") || null;
  } catch {
    const fromEmail = raw.includes("@") ? raw.split("@").pop() : null;
    return fromEmail?.replace(/^www\./, "") || null;
  }
}

function normalizeNameAddress(name?: string | null, address?: string | null) {
  const clean = `${name ?? ""}|${address ?? ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean || null;
}

export type WebsiteAiScanStatus = "NO_WEBSITE" | "HAS_AI_EXPERIENCE" | "NO_AI_SIGNAL" | "UNKNOWN";

const AI_EXPERIENCE_MARKERS = [
  "intercom", "drift.com", "tawk.to", "crisp.chat", "chatwoot", "zendesk", "hubspot chat",
  "livechat", "qualified.com", "manychat", "botpress", "dialogflow", "openai", "chatgpt",
  "powered by vonwork", "ai assistant", "virtual assistant", "chat with us", "live chat",
];

export function classifyWebsiteAiEvidence(websiteUrl: string | null | undefined, html: string | null | undefined): { status: WebsiteAiScanStatus; evidence: string[] } {
  if (!websiteUrl) return { status: "NO_WEBSITE", evidence: ["No official website URL was supplied by the source."] };
  const content = (html ?? "").toLowerCase();
  if (!content) return { status: "UNKNOWN", evidence: ["The website could not be inspected safely."] };
  const evidence = AI_EXPERIENCE_MARKERS.filter((marker) => content.includes(marker));
  return evidence.length
    ? { status: "HAS_AI_EXPERIENCE", evidence: evidence.slice(0, 5) }
    : { status: "NO_AI_SIGNAL", evidence: ["No supported AI/chat experience marker was found in the fetched page."] };
}

async function scanWebsiteAi(url: string | null | undefined) {
  if (!url) return classifyWebsiteAiEvidence(url, null);
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; VonWorkBot/1.0)" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { status: "UNKNOWN" as const, evidence: [`Website responded with HTTP ${response.status}; absence of AI cannot be concluded.`] };
    const html = (await response.text()).slice(0, 250000);
    return classifyWebsiteAiEvidence(url, html);
  } catch {
    return { status: "UNKNOWN" as const, evidence: ["Website inspection timed out or failed; absence of AI cannot be concluded."] };
  }
}

function mergeRawSourceData(value: unknown, patch: Record<string, unknown>) {
  let current: Record<string, unknown> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) current = value as Record<string, unknown>;
  return JSON.stringify({ ...current, ...patch });
}

const clientImportRow = z.object({
  businessName: z.string().min(1).max(255),
  industry: z.string().max(160).optional(),
  formattedAddress: z.string().max(3000).optional(),
  phone: z.string().max(64).optional(),
  email: z.string().email().max(320).optional().or(z.literal("")),
  decisionMakerName: z.string().max(255).optional(),
  decisionMakerEmail: z.string().email().max(320).optional().or(z.literal("")),
  officialWebsite: z.string().max(1024).optional(),
  sourceRecordId: z.string().max(255).optional(),
});

const prospectInput = z.object({
  industry: z.string().min(2).max(160),
  locationQuery: z.string().min(2).max(255),
  maxResults: z.number().int().min(1).max(20).default(20),
});

export const prospectingRouter = router({
  importClientRows: protectedProcedure
    .input(z.object({
      name: z.string().min(2).max(255),
      sourceType: z.enum(["CSV", "DATABASE_EXPORT", "MANUAL"]).default("CSV"),
      sourceAttribution: z.string().min(2).max(255),
      declaredBusinessPurpose: z.string().min(20).max(2000),
      consentDeclaration: z.literal(true),
      rows: z.array(clientImportRow).min(1).max(CLIENT_IMPORT_MAX_ROWS),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const importResult = await db.execute(sql`
        INSERT INTO prospect_imports (userId, name, sourceType, sourceAttribution, declaredBusinessPurpose, consentDeclaration, status, rowsReceived)
        VALUES (${ctx.user.id}, ${input.name}, ${input.sourceType}, ${input.sourceAttribution}, ${input.declaredBusinessPurpose}, true, 'PROCESSING', ${input.rows.length})
      `);
      const importId = (importResult as any).insertId ?? (importResult as any)?.[0]?.insertId;
      const listResult = await db.execute(sql`
        INSERT INTO prospect_lists (userId, name, sourceType, industry, locationQuery)
        VALUES (${ctx.user.id}, ${input.name}, ${input.sourceType}, NULL, NULL)
      `);
      const listId = (listResult as any).insertId ?? (listResult as any)?.[0]?.insertId;
      const existingRows = rowsOf(await db.execute(sql`
        SELECT businessName, formattedAddress, phone, email, officialWebsite, normalizedPhone, normalizedDomain, normalizedNameAddress
        FROM business_prospects WHERE userId=${ctx.user.id}
      `));
      const suppressions = rowsOf(await db.execute(sql`
        SELECT normalizedValue FROM prospect_suppressions WHERE userId=${ctx.user.id}
      `));

      const existingKeys = new Set<string>();
      for (const row of existingRows) {
        const phone = row.normalizedPhone || normalizePhone(row.phone);
        const domain = row.normalizedDomain || normalizeDomain(row.officialWebsite ?? row.email);
        const nameAddress = row.normalizedNameAddress || normalizeNameAddress(row.businessName, row.formattedAddress);
        if (phone) existingKeys.add(`phone:${phone}`);
        if (domain) existingKeys.add(`domain:${domain}`);
        if (nameAddress) existingKeys.add(`nameAddress:${nameAddress}`);
      }
      const suppressionValues = new Set<string>(suppressions.map((row) => String(row.normalizedValue ?? "").toLowerCase().trim()).filter(Boolean));

      let accepted = 0;
      let duplicates = 0;
      let suppressed = 0;
      for (let index = 0; index < input.rows.length; index += 1) {
        const row = input.rows[index];
        const phone = normalizePhone(row.phone);
        const domain = normalizeDomain(row.officialWebsite || row.email || row.decisionMakerEmail);
        const nameAddress = normalizeNameAddress(row.businessName, row.formattedAddress);
        const keys = [phone ? `phone:${phone}` : null, domain ? `domain:${domain}` : null, nameAddress ? `nameAddress:${nameAddress}` : null].filter(Boolean) as string[];
        if (keys.some((key) => existingKeys.has(key))) {
          duplicates += 1;
          continue;
        }
        const isSuppressed = [phone, row.email?.toLowerCase(), row.decisionMakerEmail?.toLowerCase(), domain, row.businessName.toLowerCase()].filter(Boolean).some((value) => suppressionValues.has(String(value).toLowerCase()));
        const sourceRecordId = row.sourceRecordId?.trim() || `client-${importId}-${index + 1}`;
        await db.execute(sql`
          INSERT INTO business_prospects (
            userId, importId, source, sourceRecordId, sourceAttribution, businessName, industry, formattedAddress,
            phone, email, decisionMakerName, decisionMakerEmail, officialWebsite, normalizedPhone, normalizedDomain,
            normalizedNameAddress, websiteStatus, reviewStatus, isDoNotContact, consentStatus, rawSourceData
          ) VALUES (
            ${ctx.user.id}, ${importId}, 'CSV', ${sourceRecordId}, ${input.sourceAttribution}, ${row.businessName}, ${row.industry ?? null}, ${row.formattedAddress ?? null},
            ${row.phone ?? null}, ${row.email || null}, ${row.decisionMakerName ?? null}, ${row.decisionMakerEmail || null}, ${row.officialWebsite ?? null}, ${phone}, ${domain},
            ${nameAddress}, ${row.officialWebsite ? 'PRESENT' : 'UNVERIFIED'}, ${isSuppressed ? 'SUPPRESSED' : 'REVIEW_READY'}, ${isSuppressed}, 'NOT_RECORDED',
            ${JSON.stringify({ source: "CLIENT_IMPORT", importName: input.name, rowIndex: index + 1 })}
          )
        `);
        keys.forEach((key) => existingKeys.add(key));
        if (isSuppressed) suppressed += 1;
        else accepted += 1;
      }
      await db.execute(sql`INSERT INTO prospect_list_members (listId, userId, prospectId) SELECT ${listId}, ${ctx.user.id}, id FROM business_prospects WHERE userId=${ctx.user.id} AND importId=${importId}`);
      await db.execute(sql`
        UPDATE prospect_imports
        SET status='COMPLETED', rowsAccepted=${accepted}, rowsDuplicates=${duplicates}, rowsSuppressed=${suppressed}, completedAt=NOW()
        WHERE id=${importId} AND userId=${ctx.user.id}
      `);
      return { importId, listId, listName: input.name, rowsReceived: input.rows.length, accepted, duplicates, suppressed };
    }),

  listImports: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.execute(sql`SELECT * FROM prospect_imports WHERE userId=${ctx.user.id} ORDER BY createdAt DESC LIMIT 50`);
    return rowsOf(rows);
  }),

  scanWebsiteAiCapability: protectedProcedure
    .input(z.object({ prospectId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = rowsOf(await db.execute(sql`SELECT id, officialWebsite, rawSourceData FROM business_prospects WHERE id=${input.prospectId} AND userId=${ctx.user.id} LIMIT 1`));
      const prospect = rows[0];
      if (!prospect) throw new TRPCError({ code: "NOT_FOUND", message: "Prospect not found." });
      const scan = await scanWebsiteAi(prospect.officialWebsite);
      await db.execute(sql`UPDATE business_prospects SET rawSourceData=${mergeRawSourceData(prospect.rawSourceData, { websiteAiScan: { ...scan, scannedAt: new Date().toISOString() } })} WHERE id=${input.prospectId} AND userId=${ctx.user.id}`);
      return { prospectId: input.prospectId, ...scan };
    }),

  estimateCampaignUsage: protectedProcedure
    .input(z.object({ prospectCount: z.number().int().min(0).max(500), demoCount: z.number().int().min(0).max(500), averagePresentationQuestions: z.number().int().min(0).max(50).default(3) }))
    .query(({ input }) => {
      // Conservative planning estimates using the configured gpt-4o-mini policy.
      // They exclude approved place-data, telecom, email/SMS, GPU, and payment-provider charges.
      const demoTokens = input.demoCount * 4_500;
      const presentationTokens = input.prospectCount * input.averagePresentationQuestions * 700;
      const scriptTokens = input.prospectCount ? 1_500 : 0;
      const totalTokens = demoTokens + presentationTokens + scriptTokens;
      const estimatedOpenRouterUsd = Math.round((totalTokens / 1_000_000) * 0.30 * 10_000) / 10_000;
      return {
        model: "openai/gpt-4o-mini",
        totalTokens,
        estimatedOpenRouterUsd,
        estimatesOnly: true,
        exclusions: ["approved place-data provider usage", "telephony minutes", "SMS/email delivery", "video/avatar provider usage", "GPU hosting"],
      };
    }),

  stageReviewedCampaign: protectedProcedure
    .input(z.object({
      name: z.string().min(3).max(255),
      script: z.string().min(40).max(10000),
      voiceId: z.string().default("nova"),
      callsPerHour: z.number().int().min(1).max(300).default(20),
      maxConcurrent: z.number().int().min(1).max(20).default(1),
      scheduleStartHour: z.number().int().min(0).max(23).default(9),
      scheduleEndHour: z.number().int().min(0).max(23).default(17),
      scheduleTimezone: z.string().default("America/New_York"),
      prospectIds: z.array(z.number()).min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const requested = new Set(input.prospectIds);
      const available = rowsOf(await db.execute(sql`SELECT * FROM business_prospects WHERE userId=${ctx.user.id} AND reviewStatus IN ('APPROVED','DEMO_CREATED')`));
      const prospects = available.filter((prospect) => requested.has(Number(prospect.id)));
      if (!prospects.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Select at least one approved prospect before staging a campaign." });

      const campaignResult = await db.execute(sql`
        INSERT INTO campaign_runs (userId, packageId, name, status, callScript, callsTotal, testMode, outreachApprovalStatus)
        VALUES (${ctx.user.id}, 1, ${input.name}, 'draft', ${input.script}, 0, ${STAGED_CAMPAIGNS_START_IN_TEST_MODE}, 'DRAFT')
      `);
      const campaignId = (campaignResult as any).insertId ?? (campaignResult as any)?.[0]?.insertId;
      await db.execute(sql`
        UPDATE campaign_runs SET voiceId=${input.voiceId}, callsPerHour=${input.callsPerHour}, maxConcurrent=${input.maxConcurrent},
          scheduleStartHour=${input.scheduleStartHour}, scheduleEndHour=${input.scheduleEndHour}, scheduleTimezone=${input.scheduleTimezone}, aiScript=${input.script}
        WHERE id=${campaignId} AND userId=${ctx.user.id}
      `);

      let consentedLeads = 0;
      let permissionNeeded = 0;
      for (const prospect of prospects) {
        const consented = prospect.consentStatus === "OPTED_IN" && !prospect.isDoNotContact && !!prospect.phone;
        await db.execute(sql`
          INSERT INTO prospect_campaign_links (userId, prospectId, campaignId, status, consentSnapshot, notes)
          VALUES (${ctx.user.id}, ${prospect.id}, ${campaignId}, ${consented ? 'STAGED' : 'CONTACT_PERMISSION_REQUIRED'}, ${JSON.stringify({ consentStatus: prospect.consentStatus, isDoNotContact: !!prospect.isDoNotContact, stagedAt: new Date().toISOString() })}, ${consented ? 'Staged in test mode pending final outbound approval.' : 'Contact permission or a verified phone is required before this record can be added to a calling queue.'})
        `);
        if (!consented) { permissionNeeded += 1; continue; }
        await db.execute(sql`
          INSERT INTO campaign_leads (campaignId, businessName, phone, address, email, decisionMakerName, callStatus, notes)
          VALUES (${campaignId}, ${prospect.businessName}, ${prospect.phone}, ${prospect.formattedAddress ?? null}, ${prospect.decisionMakerEmail ?? prospect.email ?? null}, ${prospect.decisionMakerName ?? null}, 'pending', ${`Prospect ${prospect.id}; consent verified at campaign staging.`})
        `);
        consentedLeads += 1;
      }
      await db.execute(sql`UPDATE campaign_runs SET callsTotal=${consentedLeads} WHERE id=${campaignId} AND userId=${ctx.user.id}`);
      return { campaignId, totalReviewed: prospects.length, consentedLeads, permissionNeeded, testMode: true };
    }),

  updateDecisionMaker: protectedProcedure
    .input(z.object({ prospectId: z.number(), decisionMakerName: z.string().min(2).max(255), decisionMakerEmail: z.string().email().max(320).optional(), confirmedOptInForVoice: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`
        UPDATE business_prospects SET decisionMakerName=${input.decisionMakerName}, decisionMakerEmail=${input.decisionMakerEmail ?? null},
          consentStatus=${input.confirmedOptInForVoice ? 'OPTED_IN' : 'NOT_RECORDED'}, consentCapturedAt=${input.confirmedOptInForVoice ? new Date() : null}
        WHERE id=${input.prospectId} AND userId=${ctx.user.id} AND isDoNotContact=false
      `);
      return { success: true };
    }),

  discoverGooglePlaces: protectedProcedure
    .input(prospectInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const runResult = await db.execute(sql`
        INSERT INTO prospecting_runs (userId, source, industry, locationQuery, maxResults, status, startedAt)
        VALUES (${ctx.user.id}, 'GOOGLE_PLACES', ${input.industry}, ${input.locationQuery}, ${input.maxResults}, 'RUNNING', NOW())
      `);
      const runId = (runResult as any).insertId ?? (runResult as any)?.[0]?.insertId;
      const listResult = await db.execute(sql`
        INSERT INTO prospect_lists (userId, name, sourceType, industry, locationQuery)
        VALUES (${ctx.user.id}, ${`${input.industry} — ${input.locationQuery}`}, 'GOOGLE_PLACES', ${input.industry}, ${input.locationQuery})
      `);
      const listId = (listResult as any).insertId ?? (listResult as any)?.[0]?.insertId;
      try {
        const search = await makeRequest<PlacesSearchResult>("/maps/api/place/textsearch/json", { query: `${input.industry} in ${input.locationQuery}` });
        const places = (search.results ?? []).slice(0, input.maxResults);
        let missingWebsiteCount = 0;
        for (const place of places) {
          let detail: PlaceDetailsResult["result"] | null = null;
          try {
            const details = await makeRequest<PlaceDetailsResult>("/maps/api/place/details/json", {
              place_id: place.place_id,
              fields: "place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total",
            });
            detail = details.result ?? null;
          } catch {
            // Preserve the discovery record as unverified when detail lookup is unavailable.
          }
          const websiteStatus = detail?.website ? "PRESENT" : detail ? "MISSING_SIGNAL" : "UNVERIFIED";
          if (websiteStatus === "MISSING_SIGNAL") missingWebsiteCount += 1;
          const existing = rowsOf(await db.execute(sql`SELECT id FROM business_prospects WHERE userId = ${ctx.user.id} AND source = 'GOOGLE_PLACES' AND sourceRecordId = ${place.place_id} LIMIT 1`));
          const rawSourceData = JSON.stringify({ place, detail });
          const sourceExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          if (existing[0]) {
            await db.execute(sql`
              UPDATE business_prospects SET runId=${runId}, sourceAttribution='Google Places', sourceExpiresAt=${sourceExpiresAt}, businessName=${detail?.name ?? place.name}, industry=${input.industry}, formattedAddress=${detail?.formatted_address ?? place.formatted_address}, phone=${detail?.formatted_phone_number ?? null}, officialWebsite=${detail?.website ?? null}, websiteStatus=${websiteStatus}, rating=${detail?.rating ?? place.rating ?? null}, ratingCount=${detail?.user_ratings_total ?? place.user_ratings_total ?? null}, rawSourceData=${rawSourceData}, reviewStatus='REVIEW_READY'
              WHERE id=${existing[0].id}
            `);
          } else {
            await db.execute(sql`
              INSERT INTO business_prospects (userId, runId, source, sourceRecordId, sourceAttribution, sourceExpiresAt, businessName, industry, formattedAddress, phone, officialWebsite, websiteStatus, rating, ratingCount, rawSourceData, reviewStatus)
              VALUES (${ctx.user.id}, ${runId}, 'GOOGLE_PLACES', ${place.place_id}, 'Google Places', ${sourceExpiresAt}, ${detail?.name ?? place.name}, ${input.industry}, ${detail?.formatted_address ?? place.formatted_address}, ${detail?.formatted_phone_number ?? null}, ${detail?.website ?? null}, ${websiteStatus}, ${detail?.rating ?? place.rating ?? null}, ${detail?.user_ratings_total ?? place.user_ratings_total ?? null}, ${rawSourceData}, 'REVIEW_READY')
            `);
          }
        }
        await db.execute(sql`INSERT INTO prospect_list_members (listId, userId, prospectId) SELECT ${listId}, ${ctx.user.id}, id FROM business_prospects WHERE userId=${ctx.user.id} AND runId=${runId}`);
        await db.execute(sql`UPDATE prospecting_runs SET status='COMPLETED', discoveredCount=${places.length}, missingWebsiteCount=${missingWebsiteCount}, completedAt=NOW() WHERE id=${runId}`);
        return { runId, listId, listName: `${input.industry} — ${input.locationQuery}`, discoveredCount: places.length, missingWebsiteCount };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Discovery failed";
        await db.execute(sql`UPDATE prospecting_runs SET status='FAILED', errorMessage=${message}, completedAt=NOW() WHERE id=${runId}`);
        throw new TRPCError({ code: "BAD_GATEWAY", message: "Official place discovery could not be completed. Please try a narrower search." });
      }
    }),

  listProspectLists: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return rowsOf(await db.execute(sql`
      SELECT l.*, COUNT(m.id) AS prospectCount,
        SUM(CASE WHEN p.reviewStatus IN ('APPROVED','DEMO_CREATED','OUTREACH_APPROVED') AND p.isDoNotContact=false THEN 1 ELSE 0 END) AS eligibleCount
      FROM prospect_lists l
      LEFT JOIN prospect_list_members m ON m.listId=l.id AND m.userId=${ctx.user.id}
      LEFT JOIN business_prospects p ON p.id=m.prospectId AND p.userId=${ctx.user.id}
      WHERE l.userId=${ctx.user.id}
      GROUP BY l.id ORDER BY l.createdAt DESC LIMIT 100
    `));
  }),
  getProspectListMembers: protectedProcedure
    .input(z.object({ listId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = rowsOf(await db.execute(sql`
        SELECT p.* FROM prospect_list_members m
        INNER JOIN business_prospects p ON p.id=m.prospectId AND p.userId=${ctx.user.id}
        WHERE m.listId=${input.listId} AND m.userId=${ctx.user.id}
        ORDER BY p.updatedAt DESC
      `));
      return rows;
    }),
  listProspects: protectedProcedure
    .input(z.object({ filter: z.enum(["ALL", "MISSING_WEBSITE", "REVIEW_READY", "APPROVED", "SUPPRESSED"]).default("ALL") }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const condition = input.filter === "MISSING_WEBSITE" ? sql`websiteStatus = 'MISSING_SIGNAL'` : input.filter === "REVIEW_READY" ? sql`reviewStatus = 'REVIEW_READY'` : input.filter === "APPROVED" ? sql`reviewStatus IN ('APPROVED','DEMO_CREATED','OUTREACH_APPROVED')` : input.filter === "SUPPRESSED" ? sql`reviewStatus = 'SUPPRESSED'` : sql`1 = 1`;
      const rows = await db.execute(sql`
        SELECT p.*,
          d.id AS demoId, d.demoSlug, d.status AS websiteCreatorStatus, d.expiresAt AS demoExpiresAt,
          pr.id AS presentationId, pr.presentationSlug, pr.status AS presentationCreatorStatus, pr.expiresAt AS presentationExpiresAt,
          (SELECT COUNT(*) FROM prospect_presentation_events ev WHERE ev.presentationId=pr.id AND ev.eventType='OPENED') AS presentationViews,
          (SELECT COUNT(*) FROM prospect_presentation_events ev WHERE ev.presentationId=pr.id AND ev.eventType='QUESTION_ASKED') AS presentationQuestions,
          (SELECT COUNT(*) FROM prospect_followup_preparations fu WHERE fu.presentationId=pr.id AND fu.status='PENDING_REVIEW') AS pendingFollowUps
        FROM business_prospects p
        LEFT JOIN prospect_demos d ON d.id=(SELECT latest_demo.id FROM prospect_demos latest_demo WHERE latest_demo.prospectId=p.id AND latest_demo.userId=${ctx.user.id} ORDER BY latest_demo.generatedAt DESC LIMIT 1)
        LEFT JOIN prospect_presentations pr ON pr.id=(SELECT latest_presentation.id FROM prospect_presentations latest_presentation WHERE latest_presentation.prospectId=p.id AND latest_presentation.userId=${ctx.user.id} ORDER BY latest_presentation.createdAt DESC LIMIT 1)
        WHERE p.userId=${ctx.user.id} AND ${condition}
        ORDER BY p.updatedAt DESC LIMIT 200
      `);
      return rowsOf(rows);
    }),

  updateProspectReview: protectedProcedure
    .input(z.object({ prospectId: z.number(), decision: z.enum(["APPROVED", "REJECTED"]), notes: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`UPDATE business_prospects SET reviewStatus=${input.decision}, reviewerNotes=${input.notes ?? null} WHERE id=${input.prospectId} AND userId=${ctx.user.id} AND isDoNotContact=false`);
      return { success: true };
    }),

  suppressProspect: protectedProcedure
    .input(z.object({ prospectId: z.number(), reason: z.string().min(3).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = rowsOf(await db.execute(sql`SELECT businessName, phone, officialWebsite FROM business_prospects WHERE id=${input.prospectId} AND userId=${ctx.user.id} LIMIT 1`));
      const prospect = rows[0];
      if (!prospect) throw new TRPCError({ code: "NOT_FOUND" });
      await db.execute(sql`UPDATE business_prospects SET isDoNotContact=true, reviewStatus='SUPPRESSED' WHERE id=${input.prospectId} AND userId=${ctx.user.id}`);
      await db.execute(sql`INSERT INTO prospect_suppressions (userId, normalizedValue, type, reason, source) VALUES (${ctx.user.id}, ${prospect.phone ?? prospect.businessName}, ${prospect.phone ? 'PHONE' : 'BUSINESS'}, ${input.reason}, 'USER_REVIEW')`);
      return { success: true };
    }),

  createPrivateDemo: protectedProcedure
    .input(z.object({ prospectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = rowsOf(await db.execute(sql`SELECT * FROM business_prospects WHERE id=${input.prospectId} AND userId=${ctx.user.id} LIMIT 1`));
      const prospect = rows[0];
      if (!prospect) throw new TRPCError({ code: "NOT_FOUND" });
      if (prospect.isDoNotContact || prospect.reviewStatus !== "APPROVED") throw new TRPCError({ code: "FORBIDDEN", message: "Approve the prospect after review before creating a private demo." });
      if (prospect.websiteStatus !== "MISSING_SIGNAL") throw new TRPCError({ code: "BAD_REQUEST", message: "A private demo is available only after the official-website check is reviewed as a missing-website signal." });
      let generatedHtml = fallbackDemo(prospect);
      try {
        const response = await openRouterChat({
          model: "openai/gpt-4o-mini",
          temperature: 0.35,
          maxTokens: 4500,
          messages: [{ role: "user", content: `Create a complete, mobile-first HTML concept website for ${prospect.businessName}, a ${prospect.industry ?? "local business"} in ${prospect.formattedAddress ?? "its local market"}. This is a private sales demo, not a live site. Return only safe complete HTML with inline CSS. Include a clearly visible demo notice saying it is private and not the business's live site. Do not invent awards, reviews, guarantees, licensing, prices, staff, or medical/legal/financial claims. Include generic editable services, contact CTA, optional booking placeholder, and an AI chat upgrade placeholder.` }],
        });
        const candidate = cleanHtml(response.choices[0]?.message?.content ?? "");
        if (candidate.includes("<html") || candidate.includes("<!DOCTYPE")) generatedHtml = candidate;
      } catch {
        // A usable private demo is still created with the safe template when the model is unavailable.
      }
      const demoSlug = `demo-${nanoid(10).toLowerCase()}`;
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const result = await db.execute(sql`
        INSERT INTO prospect_demos (userId, prospectId, demoSlug, generatedHtml, title, status, expiresAt)
        VALUES (${ctx.user.id}, ${input.prospectId}, ${demoSlug}, ${generatedHtml}, ${`${prospect.businessName} — Private Concept`}, 'READY_FOR_REVIEW', ${expiresAt})
      `);
      const demoId = (result as any).insertId ?? (result as any)?.[0]?.insertId;
      await db.execute(sql`UPDATE business_prospects SET reviewStatus='DEMO_CREATED' WHERE id=${input.prospectId} AND userId=${ctx.user.id}`);
      return { demoId, demoSlug, expiresAt };
    }),

  approveDemoForShare: protectedProcedure
    .input(z.object({ demoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`UPDATE prospect_demos SET status='APPROVED_FOR_SHARE', approvedAt=NOW(), approvedBy=${ctx.user.id} WHERE id=${input.demoId} AND userId=${ctx.user.id} AND status='READY_FOR_REVIEW'`);
      return { success: true };
    }),

  listDemos: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.execute(sql`
      SELECT d.*, p.businessName, p.isDoNotContact
      FROM prospect_demos d JOIN business_prospects p ON p.id=d.prospectId
      WHERE d.userId=${ctx.user.id}
      ORDER BY d.generatedAt DESC LIMIT 100
    `);
    return rowsOf(rows);
  }),

  createPresentation: protectedProcedure
    .input(z.object({ demoId: z.number(), origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = rowsOf(await db.execute(sql`SELECT d.*, p.businessName, p.isDoNotContact FROM prospect_demos d JOIN business_prospects p ON p.id=d.prospectId WHERE d.id=${input.demoId} AND d.userId=${ctx.user.id} LIMIT 1`));
      const demo = rows[0];
      if (!demo) throw new TRPCError({ code: "NOT_FOUND" });
      if (demo.status !== "APPROVED_FOR_SHARE" || demo.isDoNotContact) throw new TRPCError({ code: "FORBIDDEN", message: "Approve the private demo and confirm the prospect is not suppressed before creating a shareable presentation." });
      const presentationSlug = `present-${nanoid(10).toLowerCase()}`;
      const origin = new URL(input.origin).origin;
      const demoUrl = `${origin}/prospect-demo/${demo.demoSlug}`;
      const script = createPresentationScript(demo, demoUrl);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const result = await db.execute(sql`INSERT INTO prospect_presentations (userId, prospectId, demoId, presentationSlug, script, status, expiresAt) VALUES (${ctx.user.id}, ${demo.prospectId}, ${input.demoId}, ${presentationSlug}, ${script}, 'APPROVED', ${expiresAt})`);
      const presentationId = (result as any).insertId ?? (result as any)?.[0]?.insertId;
      return { presentationId, presentationSlug, presentationUrl: `${origin}/prospect-presentation/${presentationSlug}`, demoUrl };
    }),

  createOutreachDraft: protectedProcedure
    .input(z.object({ prospectId: z.number(), demoId: z.number().optional(), channel: z.enum(["EMAIL", "MANUAL_CALL", "AI_PRESENTATION", "AI_VOICE"]), content: z.string().min(20).max(10000), subject: z.string().max(255).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = rowsOf(await db.execute(sql`SELECT isDoNotContact, consentStatus, businessName FROM business_prospects WHERE id=${input.prospectId} AND userId=${ctx.user.id} LIMIT 1`));
      const prospect = rows[0];
      if (!prospect) throw new TRPCError({ code: "NOT_FOUND" });
      if (prospect.isDoNotContact) throw new TRPCError({ code: "FORBIDDEN", message: "This prospect is suppressed and cannot be prepared for outreach." });
      if (input.channel === "AI_VOICE" && prospect.consentStatus !== "OPTED_IN") throw new TRPCError({ code: "FORBIDDEN", message: "AI voice outreach is unavailable until documented voice-call consent is recorded." });
      const consentSnapshot = JSON.stringify({ consentStatus: prospect.consentStatus, isDoNotContact: !!prospect.isDoNotContact, checkedAt: new Date().toISOString() });
      const result = await db.execute(sql`INSERT INTO prospect_outreach_reviews (userId, prospectId, demoId, channel, proposedSubject, proposedContent, status, consentSnapshot) VALUES (${ctx.user.id}, ${input.prospectId}, ${input.demoId ?? null}, ${input.channel}, ${input.subject ?? null}, ${input.content}, 'PENDING_REVIEW', ${consentSnapshot})`);
      return { outreachId: (result as any).insertId ?? (result as any)?.[0]?.insertId, status: "PENDING_REVIEW" };
    }),

  preparePresentationFollowUp: protectedProcedure
    .input(z.object({
      presentationId: z.number(),
      channel: z.enum(["EMAIL", "SMS"]),
      recipientName: z.string().min(2).max(255),
      recipientAddress: z.string().min(7).max(320),
      origin: z.string().url(),
      contactPermissionConfirmed: z.literal(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = rowsOf(await db.execute(sql`
        SELECT pr.id, pr.presentationSlug, pr.prospectId, p.businessName, p.isDoNotContact, p.consentStatus
        FROM prospect_presentations pr JOIN business_prospects p ON p.id=pr.prospectId
        WHERE pr.id=${input.presentationId} AND pr.userId=${ctx.user.id} LIMIT 1
      `));
      const presentation = rows[0];
      if (!presentation || presentation.isDoNotContact) throw new TRPCError({ code: "FORBIDDEN", message: "This record is unavailable for follow-up preparation." });
      if (input.channel === "SMS" && presentation.consentStatus !== "OPTED_IN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "SMS preparation requires a documented opt-in for this prospect." });
      }
      const presentationUrl = `${new URL(input.origin).origin}/prospect-presentation/${presentation.presentationSlug}`;
      const subject = input.channel === "EMAIL" ? `Private website concept for ${presentation.businessName}` : null;
      const body = input.channel === "EMAIL"
        ? `Hi ${input.recipientName},\n\nThank you for your time. We prepared a private interactive concept for ${presentation.businessName}: ${presentationUrl}\n\nIt is a preview, not your live website. You can review the concept and ask the AI presenter questions directly on the page.\n\nPlease reply if you would like to discuss any changes or optional upgrades.`
        : `Hi ${input.recipientName} — here is the private interactive concept prepared for ${presentation.businessName}: ${presentationUrl}. This is a preview, not a live site. Reply if you would like to discuss it.`;
      const consentSnapshot = JSON.stringify({ channel: input.channel, contactPermissionConfirmed: true, prospectConsentStatus: presentation.consentStatus, checkedAt: new Date().toISOString() });
      const result = await db.execute(sql`
        INSERT INTO prospect_followup_preparations (userId, prospectId, presentationId, channel, recipientName, recipientAddress, subject, body, status, consentSnapshot)
        VALUES (${ctx.user.id}, ${presentation.prospectId}, ${input.presentationId}, ${input.channel}, ${input.recipientName}, ${input.recipientAddress}, ${subject}, ${body}, 'PENDING_REVIEW', ${consentSnapshot})
      `);
      await db.execute(sql`INSERT INTO prospect_presentation_events (userId, presentationId, eventType, metadata) VALUES (${ctx.user.id}, ${input.presentationId}, 'FOLLOW_UP_PREPARED', ${JSON.stringify({ channel: input.channel, at: new Date().toISOString() })})`);
      return { followUpId: (result as any).insertId ?? (result as any)?.[0]?.insertId, status: "PENDING_REVIEW", body, subject, presentationUrl };
    }),

  listPreparedFollowUps: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.execute(sql`
      SELECT f.*, p.businessName, pr.presentationSlug FROM prospect_followup_preparations f
      JOIN business_prospects p ON p.id=f.prospectId
      JOIN prospect_presentations pr ON pr.id=f.presentationId
      WHERE f.userId=${ctx.user.id} ORDER BY f.createdAt DESC LIMIT 100
    `);
    return rowsOf(rows);
  }),

  getPublicDemo: publicProcedure
    .input(z.object({ demoSlug: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = rowsOf(await db.execute(sql`SELECT demoSlug, generatedHtml, title, expiresAt FROM prospect_demos WHERE demoSlug=${input.demoSlug} AND status='APPROVED_FOR_SHARE' LIMIT 1`));
      const demo = rows[0];
      if (!demo || (demo.expiresAt && new Date(demo.expiresAt).getTime() < Date.now())) return null;
      return demo;
    }),

  getPublicPresentation: publicProcedure
    .input(z.object({ presentationSlug: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = rowsOf(await db.execute(sql`
        SELECT pr.presentationSlug, pr.script, pr.expiresAt, d.demoSlug, d.title
        FROM prospect_presentations pr JOIN prospect_demos d ON d.id=pr.demoId
        WHERE pr.presentationSlug=${input.presentationSlug} AND pr.status IN ('APPROVED','SHARED') LIMIT 1
      `));
      const presentation = rows[0];
      if (!presentation || (presentation.expiresAt && new Date(presentation.expiresAt).getTime() < Date.now())) return null;
      await db.execute(sql`
        INSERT INTO prospect_presentation_events (userId, presentationId, eventType, metadata)
        SELECT userId, id, 'OPENED', ${JSON.stringify({ at: new Date().toISOString() })}
        FROM prospect_presentations WHERE presentationSlug=${input.presentationSlug} LIMIT 1
      `);
      return presentation;
    }),

  askPresentation: publicProcedure
    .input(z.object({ presentationSlug: z.string().min(1), message: z.string().min(1).max(1200) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = rowsOf(await db.execute(sql`
        SELECT pr.script, pr.expiresAt, d.title
        FROM prospect_presentations pr JOIN prospect_demos d ON d.id=pr.demoId
        WHERE pr.presentationSlug=${input.presentationSlug} AND pr.status IN ('APPROVED','SHARED') LIMIT 1
      `));
      const presentation = rows[0];
      if (!presentation || (presentation.expiresAt && new Date(presentation.expiresAt).getTime() < Date.now())) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This private presentation is unavailable." });
      }
      const response = await openRouterChat({
        model: "openai/gpt-4o-mini",
        temperature: 0.25,
        maxTokens: 500,
        messages: [{ role: "system", content: `You are the VonWork AI presenter for a private concept website presentation. Follow this approved presentation context: ${presentation.script}\n\nRules: Be transparent that this is a private concept preview, not a live website. Do not claim the business requested the work. Do not promise rankings, revenue, compliance, or results. Offer optional website, booking, AI chat, SEO, GEO/AEO, video, and custom-AI features only when relevant. If asked about pricing, state that final pricing and activation are confirmed with the owner.` }, { role: "user", content: input.message }],
      });
      await db.execute(sql`
        INSERT INTO prospect_presentation_events (userId, presentationId, eventType, metadata)
        SELECT userId, id, 'QUESTION_ASKED', ${JSON.stringify({ at: new Date().toISOString(), length: input.message.length })}
        FROM prospect_presentations WHERE presentationSlug=${input.presentationSlug} LIMIT 1
      `);
      return { message: response.choices[0]?.message?.content ?? "I can help explain this private website concept and its optional upgrades." };
    }),
});
