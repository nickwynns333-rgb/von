import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { campaignRuns, campaignLeads } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { initiateOutboundCall } from "../telnyx";

// ── Voice catalogue ──────────────────────────────────────────────────────────
export const VOICES = [
  { id: "alloy",    name: "Alloy",    gender: "neutral",  description: "Balanced, neutral tone" },
  { id: "echo",     name: "Echo",     gender: "male",     description: "Clear, professional male" },
  { id: "fable",    name: "Fable",    gender: "male",     description: "Warm, storytelling" },
  { id: "onyx",     name: "Onyx",     gender: "male",     description: "Deep, authoritative" },
  { id: "nova",     name: "Nova",     gender: "female",   description: "Energetic, friendly female" },
  { id: "shimmer",  name: "Shimmer",  gender: "female",   description: "Soft, calm female" },
];

export const CALL_CENTER_SAFETY_DEFAULTS = {
  testMode: true,
  outreachApprovalStatus: "DRAFT" as const,
  requiredLiveDispatchConfirmation: "I_REVIEWED_CONSENT_AND_SUPPRESSION" as const,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function isWithinSchedule(startHour: number, endHour: number, timezone: string): boolean {
  try {
    const now = new Date();
    const localHour = parseInt(
      now.toLocaleString("en-US", { timeZone: timezone, hour: "numeric", hour12: false })
    );
    return localHour >= startHour && localHour < endHour;
  } catch {
    return true; // fallback: allow if timezone parse fails
  }
}

function msUntilNextWindow(startHour: number, timezone: string): number {
  try {
    const now = new Date();
    const localHour = parseInt(
      now.toLocaleString("en-US", { timeZone: timezone, hour: "numeric", hour12: false })
    );
    if (localHour < startHour) {
      return (startHour - localHour) * 3600 * 1000;
    }
    // Already past end — next day
    return (24 - localHour + startHour) * 3600 * 1000;
  } catch {
    return 0;
  }
}

export const callCenterRouter = router({
  // ── Voice catalogue ────────────────────────────────────────────────────────
  listVoices: protectedProcedure.query(() => VOICES),

  // ── AI Script Generator ───────────────────────────────────────────────────
  generateScript: protectedProcedure
    .input(z.object({
      industry: z.string(),
      objective: z.enum(["appointment", "demo", "survey", "collections", "sales"]),
      businessName: z.string().optional(),
      productService: z.string().optional(),
      tone: z.enum(["professional", "friendly", "urgent", "casual"]).default("professional"),
      includeObjectionHandling: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const objMap = {
        appointment: "book an appointment or meeting",
        demo: "schedule a product demonstration",
        survey: "complete a brief survey",
        collections: "collect an outstanding payment",
        sales: "make a sale or get a commitment",
      };

      const prompt = `You are an expert outbound call script writer. Write a complete, natural-sounding AI phone call script for the following:

Industry: ${input.industry}
Objective: ${objMap[input.objective]}
Business Name: ${input.businessName || "our company"}
Product/Service: ${input.productService || "our services"}
Tone: ${input.tone}

Requirements:
- Start with a warm, natural greeting that identifies the caller
- State the purpose clearly within the first 30 seconds
- Include 2-3 key value propositions
- Use natural pauses and conversational language (the AI will read this aloud)
- ${input.includeObjectionHandling ? "Include objection handling for: 'not interested', 'too busy', 'already have a provider'" : "Keep it concise without objection handling"}
- End with a clear call-to-action
- Mark pauses with [pause] and emphasis with *word*
- Keep total script under 90 seconds when read aloud (roughly 200-250 words)

Return ONLY the script text, no labels or headers.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert outbound call script writer. Return only the script, no extra commentary." },
          { role: "user", content: prompt },
        ],
      });

      const script = (response.choices[0]?.message?.content as string) || "";
      return { script };
    }),

  // ── Save script template ──────────────────────────────────────────────────
  saveScript: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      industry: z.string().optional(),
      objective: z.enum(["appointment", "demo", "survey", "collections", "sales"]).default("appointment"),
      script: z.string().min(1),
      voiceId: z.string().default("nova"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.execute(
        sql`INSERT INTO call_center_scripts (userId, name, industry, objective, script, voiceId, createdAt, updatedAt)
            VALUES (${ctx.user.id}, ${input.name}, ${input.industry ?? null}, ${input.objective}, ${input.script}, ${input.voiceId}, ${now}, ${now})`
      );
      return { success: true };
    }),

  listScripts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.execute(
      sql`SELECT * FROM call_center_scripts WHERE userId = ${ctx.user.id} ORDER BY createdAt DESC`
    );
    return (rows as any).rows ?? rows;
  }),

  deleteScript: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`DELETE FROM call_center_scripts WHERE id = ${input.id} AND userId = ${ctx.user.id}`);
      return { success: true };
    }),

  // ── Campaign management ───────────────────────────────────────────────────
  listCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(campaignRuns)
      .where(eq(campaignRuns.userId, ctx.user.id))
      .orderBy(desc(campaignRuns.createdAt));
  }),

  createCampaign: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      script: z.string().min(1),
      voiceId: z.string().default("nova"),
      fromNumber: z.string().min(10),
      connectionId: z.string().min(1),
      agentName: z.string().default("Alex"),
      callsPerHour: z.number().min(1).max(300).default(30),
      maxConcurrent: z.number().min(1).max(20).default(3),
      scheduleStartHour: z.number().min(0).max(23).default(9),
      scheduleEndHour: z.number().min(0).max(23).default(17),
      scheduleTimezone: z.string().default("America/New_York"),
      packageId: z.number().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(campaignRuns).values({
        userId: ctx.user.id,
        packageId: input.packageId,
        name: input.name,
        callScript: input.script,
        status: "draft",
        callsTotal: 0,
        callsCompleted: 0,
        callsAnswered: 0,
        callsFailed: 0,
        emailsCollected: 0,
        linksDropped: 0,
        meetingsBooked: 0,
        creditsUsed: 0,
      } as any);

      const campaignId = (result as any).insertId;

      // Store extra scheduler fields via raw SQL since schema doesn't have them yet
      await db.execute(
        sql`UPDATE campaign_runs SET 
          voiceId = ${input.voiceId},
          fromNumber = ${input.fromNumber},
          connectionId = ${input.connectionId},
          callsPerHour = ${input.callsPerHour},
          maxConcurrent = ${input.maxConcurrent},
          scheduleStartHour = ${input.scheduleStartHour},
          scheduleEndHour = ${input.scheduleEndHour},
          scheduleTimezone = ${input.scheduleTimezone},
          aiScript = ${input.script},
          testMode = ${CALL_CENTER_SAFETY_DEFAULTS.testMode},
          outreachApprovalStatus = ${CALL_CENTER_SAFETY_DEFAULTS.outreachApprovalStatus},
          outreachApprovedAt = NULL,
          outreachApprovedBy = NULL
        WHERE id = ${campaignId}`
      );

      return { campaignId };
    }),

  importLeads: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      leads: z.array(z.object({
        phone: z.string().min(7),
        businessName: z.string().optional(),
        decisionMakerName: z.string().optional(),
        email: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [campaign] = await db.select().from(campaignRuns)
        .where(and(eq(campaignRuns.id, input.campaignId), eq(campaignRuns.userId, ctx.user.id))).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });

      let imported = 0;
      for (const lead of input.leads) {
        if (!lead.phone) continue;
        await db.insert(campaignLeads).values({
          campaignId: input.campaignId,
          phone: lead.phone,
          businessName: lead.businessName,
          decisionMakerName: lead.decisionMakerName,
          email: lead.email,
          city: lead.city,
          state: lead.state,
          callStatus: "pending",
        } as any);
        imported++;
      }

      await db.update(campaignRuns)
        .set({ callsTotal: imported } as any)
        .where(eq(campaignRuns.id, input.campaignId));

      return { imported };
    }),

  // ── Launch with rate limiting ─────────────────────────────────────────────
  launchCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [campaign] = await db.select().from(campaignRuns)
        .where(and(eq(campaignRuns.id, input.campaignId), eq(campaignRuns.userId, ctx.user.id))).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });

      // Read scheduler fields
      const [extra] = (await db.execute(
        sql`SELECT callsPerHour, maxConcurrent, scheduleStartHour, scheduleEndHour, scheduleTimezone, voiceId, aiScript, fromNumber, connectionId, testMode, outreachApprovalStatus FROM campaign_runs WHERE id = ${input.campaignId}`
      ) as any).rows ?? [];

      const startHour = extra?.scheduleStartHour ?? 9;
      const endHour = extra?.scheduleEndHour ?? 17;
      const tz = extra?.scheduleTimezone ?? "America/New_York";
      const callsPerHour = extra?.callsPerHour ?? 30;
      const maxConcurrent = extra?.maxConcurrent ?? 3;
      const voiceId = extra?.voiceId ?? "nova";
      const script = extra?.aiScript ?? campaign.callScript ?? "";
      const fromNumber = extra?.fromNumber ?? "";
      const connectionId = extra?.connectionId ?? "";

      if (extra?.testMode || extra?.outreachApprovalStatus !== "APPROVED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Campaign remains in safe test mode. Review consent and suppression status, then explicitly approve live dispatch in Campaign Controls.",
        });
      }

      if (!fromNumber || !connectionId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign missing fromNumber or connectionId. Edit the campaign first." });
      }

      // Check schedule window
      if (!isWithinSchedule(startHour, endHour, tz)) {
        const waitMs = msUntilNextWindow(startHour, tz);
        const waitHours = Math.round(waitMs / 3600000);
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Outside calling hours (${startHour}:00–${endHour}:00 ${tz}). Next window in ~${waitHours}h.`,
        });
      }

      const pendingLeads = await db.select().from(campaignLeads)
        .where(and(eq(campaignLeads.campaignId, input.campaignId), eq(campaignLeads.callStatus, "pending")));

      if (pendingLeads.length === 0) {
        return { launched: 0, message: "No pending leads" };
      }

      await db.update(campaignRuns).set({ status: "running" } as any).where(eq(campaignRuns.id, input.campaignId));

      // Rate limit: calls per hour → interval between calls in ms
      const intervalMs = Math.max(Math.floor(3600000 / callsPerHour), 1000);
      const batch = pendingLeads.slice(0, maxConcurrent);
      let launched = 0;

      for (let i = 0; i < batch.length; i++) {
        const lead = batch[i];
        // Stagger calls to respect rate limit
        const delay = i * intervalMs;
        setTimeout(async () => {
          try {
            await initiateOutboundCall({
              to: lead.phone,
              from: fromNumber,
              connectionId,
              agentName: "Alex",
              script: script.replace(/\{name\}/g, lead.decisionMakerName ?? lead.businessName ?? "there")
                           .replace(/\{business\}/g, lead.businessName ?? "your business"),
              campaignLeadId: lead.id.toString(),
              clientState: {
                voice: voiceId,
                businessName: lead.businessName,
                fromNumber,
                toNumber: lead.phone,
              },
            });
            await db.update(campaignLeads).set({ callStatus: "calling" } as any).where(eq(campaignLeads.id, lead.id));
          } catch (err) {
            console.error(`[CallCenter] Failed lead ${lead.id}:`, err);
            await db.update(campaignLeads).set({ callStatus: "failed" } as any).where(eq(campaignLeads.id, lead.id));
          }
        }, delay);
        launched++;
      }

      return {
        launched,
        total: pendingLeads.length,
        callsPerHour,
        intervalSeconds: Math.round(intervalMs / 1000),
        message: `Launching ${launched} calls, ${callsPerHour}/hr rate, ${Math.round(intervalMs / 1000)}s between calls`,
      };
    }),

  pauseCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(campaignRuns).set({ status: "paused" } as any)
        .where(and(eq(campaignRuns.id, input.campaignId), eq(campaignRuns.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Live dashboard ────────────────────────────────────────────────────────
  getDashboard: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [campaign] = await db.select().from(campaignRuns)
        .where(and(eq(campaignRuns.id, input.campaignId), eq(campaignRuns.userId, ctx.user.id))).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });

      const leads = await db.select().from(campaignLeads)
        .where(eq(campaignLeads.campaignId, input.campaignId));

      const stats = {
        total: leads.length,
        pending: leads.filter(l => l.callStatus === "pending").length,
        calling: leads.filter(l => l.callStatus === "calling").length,
        answered: leads.filter(l => l.callStatus === "answered").length,
        voicemail: leads.filter(l => l.callStatus === "voicemail").length,
        noAnswer: leads.filter(l => l.callStatus === "no_answer").length,
        failed: leads.filter(l => l.callStatus === "failed").length,
        doNotCall: leads.filter(l => l.callStatus === "do_not_call").length,
        meetingsBooked: campaign.meetingsBooked ?? 0,
        connectRate: leads.length > 0
          ? Math.round((leads.filter(l => l.callStatus === "answered").length / leads.length) * 100)
          : 0,
      };

      // Extra scheduler info
      const [extra] = (await db.execute(
        sql`SELECT callsPerHour, maxConcurrent, scheduleStartHour, scheduleEndHour, scheduleTimezone, voiceId FROM campaign_runs WHERE id = ${input.campaignId}`
      ) as any).rows ?? [];

      const inWindow = isWithinSchedule(
        extra?.scheduleStartHour ?? 9,
        extra?.scheduleEndHour ?? 17,
        extra?.scheduleTimezone ?? "America/New_York"
      );

      return { campaign, stats, extra, inWindow, recentLeads: leads.slice(-20).reverse() };
    }),

  updateCampaignSettings: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      callsPerHour: z.number().min(1).max(300).optional(),
      maxConcurrent: z.number().min(1).max(20).optional(),
      scheduleStartHour: z.number().min(0).max(23).optional(),
      scheduleEndHour: z.number().min(0).max(23).optional(),
      scheduleTimezone: z.string().optional(),
      voiceId: z.string().optional(),
      script: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { campaignId, ...fields } = input;
      if (Object.values(fields).every(v => v === undefined)) return { success: true };

      await db.execute(
        sql`UPDATE campaign_runs SET 
          callsPerHour = COALESCE(${input.callsPerHour ?? null}, callsPerHour),
          maxConcurrent = COALESCE(${input.maxConcurrent ?? null}, maxConcurrent),
          scheduleStartHour = COALESCE(${input.scheduleStartHour ?? null}, scheduleStartHour),
          scheduleEndHour = COALESCE(${input.scheduleEndHour ?? null}, scheduleEndHour),
          scheduleTimezone = COALESCE(${input.scheduleTimezone ?? null}, scheduleTimezone),
          voiceId = COALESCE(${input.voiceId ?? null}, voiceId),
          aiScript = COALESCE(${input.script ?? null}, aiScript)
        WHERE id = ${campaignId} AND userId = ${ctx.user.id}`
      );
      return { success: true };
    }),

  getCampaignReadiness: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = (await db.execute(sql`
        SELECT c.id, c.name, c.status, c.testMode, c.outreachApprovalStatus, c.callsTotal,
          SUM(CASE WHEN l.callStatus='pending' THEN 1 ELSE 0 END) AS pendingLeads,
          SUM(CASE WHEN l.callStatus='do_not_call' THEN 1 ELSE 0 END) AS suppressedLeads
        FROM campaign_runs c LEFT JOIN campaign_leads l ON l.campaignId=c.id
        WHERE c.id=${input.campaignId} AND c.userId=${ctx.user.id}
        GROUP BY c.id
      `) as any).rows ?? [];
      const campaign = rows[0];
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        campaign,
        canDispatch: !campaign.testMode && campaign.outreachApprovalStatus === "APPROVED" && Number(campaign.pendingLeads ?? 0) > 0,
        blockers: [
          campaign.testMode ? "Test mode is enabled" : null,
          campaign.outreachApprovalStatus !== "APPROVED" ? "Live dispatch has not been explicitly approved" : null,
          Number(campaign.pendingLeads ?? 0) === 0 ? "No queued leads" : null,
        ].filter(Boolean),
      };
    }),

  approveLiveDispatch: protectedProcedure
    .input(z.object({ campaignId: z.number(), confirmation: z.literal(CALL_CENTER_SAFETY_DEFAULTS.requiredLiveDispatchConfirmation) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const campaigns = (await db.execute(sql`SELECT id FROM campaign_runs WHERE id=${input.campaignId} AND userId=${ctx.user.id} LIMIT 1`) as any).rows ?? [];
      if (!campaigns[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await db.execute(sql`
        UPDATE campaign_runs SET testMode=false, outreachApprovalStatus='APPROVED', outreachApprovedAt=NOW(), outreachApprovedBy=${ctx.user.id}
        WHERE id=${input.campaignId} AND userId=${ctx.user.id}
      `);
      return { success: true, message: "Campaign is eligible for live dispatch subject to the active calling window and telephony configuration." };
    }),
});
