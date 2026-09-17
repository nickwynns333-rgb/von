import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { phoneNumbers, callLogs, ivrMenus, creditTransactions, subscriptions, aiAgents } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import {
  searchAvailableNumber,
  purchasePhoneNumber,
  initiateOutboundCall as telnyxInitiateCall,
  type OutboundCallParams,
} from "../telnyx";

// Credit costs per minute (configurable)
const CREDITS_PER_MINUTE_INBOUND = 2;
const CREDITS_PER_MINUTE_OUTBOUND = 3;

export const telephonyRouter = router({
  // ── Phone Number Management ────────────────────────────────────────────────

  listNumbers: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.userId, ctx.user.id))
      .orderBy(desc(phoneNumbers.createdAt));
  }),

  searchAvailableNumbers: protectedProcedure
    .input(z.object({
      countryCode: z.string().default("US"),
      areaCode: z.string().optional(),
      contains: z.string().optional(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      try {
        // Call real Telnyx API
        const results = await searchAvailableNumber(input.areaCode);
        const list = Array.isArray(results) ? results : [results];
        return list.slice(0, input.limit).map((n: any) => ({
          phone_number: n.phone_number,
          region: n.region_information?.[0]?.region_name ?? "US",
          monthly_cost: "$1.00",
        }));
      } catch (err) {
        console.error("[Telephony] searchAvailableNumbers error:", err);
        // Fallback mock so UI still works if Telnyx key not set
        return [
          { phone_number: "+12125551234", region: "New York, NY", monthly_cost: "$1.00" },
          { phone_number: "+13105557890", region: "Los Angeles, CA", monthly_cost: "$1.00" },
          { phone_number: "+17025554567", region: "Las Vegas, NV", monthly_cost: "$1.00" },
          { phone_number: "+14155559012", region: "San Francisco, CA", monthly_cost: "$1.00" },
          { phone_number: "+13055553456", region: "Miami, FL", monthly_cost: "$1.00" },
        ].filter(n => !input.areaCode || n.phone_number.includes(input.areaCode)).slice(0, input.limit);
      }
    }),

  provisionNumber: protectedProcedure
    .input(z.object({
      phoneNumber: z.string(),
      friendlyName: z.string().optional(),
      agentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Admins can provision without subscription; regular users need one
      if (ctx.user.role !== "admin") {
        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(and(eq(subscriptions.userId, ctx.user.id), eq(subscriptions.status, "active")))
          .limit(1);
        if (!sub) throw new Error("Active subscription required to provision phone numbers");
      }

      // Purchase the real number from Telnyx
      let telnyxNumberId: string;
      try {
        const purchased = await purchasePhoneNumber(input.phoneNumber);
        telnyxNumberId = purchased.id;
      } catch (err: any) {
        throw new Error(`Failed to purchase number from Telnyx: ${err?.message ?? String(err)}`);
      }

      const [result] = await db.insert(phoneNumbers).values({
        userId: ctx.user.id,
        agentId: input.agentId ?? null,
        telnyxNumberId,
        phoneNumber: input.phoneNumber,
        friendlyName: input.friendlyName ?? input.phoneNumber,
        status: "active",
      });

      return { success: true, id: (result as any).insertId, telnyxNumberId };
    }),

  updateNumber: protectedProcedure
    .input(z.object({
      id: z.number(),
      friendlyName: z.string().optional(),
      forwardTo: z.string().optional().nullable(),
      ivrEnabled: z.boolean().optional(),
      ivrScript: z.string().optional().nullable(),
      agentId: z.number().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { id, ...updates } = input;
      await db
        .update(phoneNumbers)
        .set(updates)
        .where(and(eq(phoneNumbers.id, id), eq(phoneNumbers.userId, ctx.user.id)));
      return { success: true };
    }),

  releaseNumber: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .update(phoneNumbers)
        .set({ status: "released" })
        .where(and(eq(phoneNumbers.id, input.id), eq(phoneNumbers.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Call Logs ──────────────────────────────────────────────────────────────

  listCallLogs: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      direction: z.enum(["inbound", "outbound", "all"]).default("all"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(callLogs.userId, ctx.user.id)];
      if (input.direction !== "all") {
        conditions.push(eq(callLogs.direction, input.direction));
      }
      return db
        .select()
        .from(callLogs)
        .where(and(...conditions))
        .orderBy(desc(callLogs.startedAt))
        .limit(input.limit);
    }),

  // ── Outbound Calls ─────────────────────────────────────────────────────────

  initiateOutboundCall: protectedProcedure
    .input(z.object({
      fromNumberId: z.number(),
      toNumber: z.string(),
      agentId: z.number().optional(),
      script: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Get the from number
      const [fromNum] = await db
        .select()
        .from(phoneNumbers)
        .where(and(eq(phoneNumbers.id, input.fromNumberId), eq(phoneNumbers.userId, ctx.user.id)))
        .limit(1);
      if (!fromNum) throw new Error("Phone number not found");

      // Get agent details if provided
      let agentName = "Alex";
      let agentScript = input.script ?? "";
      if (input.agentId) {
        const [agent] = await db
          .select()
          .from(aiAgents)
          .where(eq(aiAgents.id, input.agentId))
          .limit(1);
        if (agent) {
          agentName = agent.name;
          agentScript = agent.systemPrompt ?? agentScript;
        }
      }

      // Initiate real Telnyx outbound call
      let callControlId: string;
      const connectionId = process.env.TELNYX_CONNECTION_ID ?? "";
      try {
        const params: OutboundCallParams = {
          to: input.toNumber,
          from: fromNum.phoneNumber,
          connectionId,
          agentName,
          script: agentScript || `Hi, this is ${agentName}. How can I help you today?`,
          campaignLeadId: ctx.user.id.toString(),
        };
        const result = await telnyxInitiateCall(params);
        callControlId = result.callControlId;
      } catch (err: any) {
        throw new Error(`Failed to initiate call: ${err?.message ?? String(err)}`);
      }

      // Log the call
      await db.insert(callLogs).values({
        userId: ctx.user.id,
        agentId: input.agentId ?? null,
        phoneNumberId: input.fromNumberId,
        telnyxCallControlId: callControlId,
        direction: "outbound",
        fromNumber: fromNum.phoneNumber,
        toNumber: input.toNumber,
        status: "initiated",
      });

      return { success: true, callControlId };
    }),

  // ── IVR Menus ──────────────────────────────────────────────────────────────

  listIvrMenus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(ivrMenus)
      .where(eq(ivrMenus.userId, ctx.user.id))
      .orderBy(desc(ivrMenus.createdAt));
  }),

  createIvrMenu: protectedProcedure
    .input(z.object({
      phoneNumberId: z.number(),
      name: z.string(),
      greeting: z.string(),
      options: z.array(z.object({
        key: z.string(),
        label: z.string(),
        action: z.enum(["forward", "agent", "voicemail", "repeat"]),
        value: z.string().optional(),
      })),
      fallbackAction: z.string().default("agent"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [result] = await db.insert(ivrMenus).values({
        userId: ctx.user.id,
        phoneNumberId: input.phoneNumberId,
        name: input.name,
        greeting: input.greeting,
        options: JSON.stringify(input.options),
        fallbackAction: input.fallbackAction,
      });
      return { success: true, id: (result as any).insertId };
    }),

  updateIvrMenu: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      greeting: z.string().optional(),
      options: z.array(z.object({
        key: z.string(),
        label: z.string(),
        action: z.enum(["forward", "agent", "voicemail", "repeat"]),
        value: z.string().optional(),
      })).optional(),
      fallbackAction: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { id, options, ...rest } = input;
      await db
        .update(ivrMenus)
        .set({ ...rest, ...(options ? { options: JSON.stringify(options) } : {}) })
        .where(and(eq(ivrMenus.id, id), eq(ivrMenus.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteIvrMenu: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .delete(ivrMenus)
        .where(and(eq(ivrMenus.id, input.id), eq(ivrMenus.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── AI Call Summary ────────────────────────────────────────────────────────

  generateCallSummary: protectedProcedure
    .input(z.object({
      callId: z.number(),
      transcription: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a call summarizer. Provide a concise 2-3 sentence summary of the call, key topics discussed, and any action items.",
          },
          { role: "user", content: `Transcription:\n${input.transcription}` },
        ],
      });

      const summary = (response as any)?.choices?.[0]?.message?.content ?? "Summary unavailable";

      await db
        .update(callLogs)
        .set({ aiSummary: summary })
        .where(and(eq(callLogs.id, input.callId), eq(callLogs.userId, ctx.user.id)));

      return { summary };
    }),

  // ── Call Stats ─────────────────────────────────────────────────────────────

  getCallStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, inbound: 0, outbound: 0, totalMinutes: 0, creditsUsed: 0 };

    const [stats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        inbound: sql<number>`SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END)`,
        outbound: sql<number>`SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END)`,
        totalMinutes: sql<number>`ROUND(SUM(durationSeconds) / 60, 1)`,
        creditsUsed: sql<number>`SUM(creditsCharged)`,
      })
      .from(callLogs)
      .where(eq(callLogs.userId, ctx.user.id));

    return stats ?? { total: 0, inbound: 0, outbound: 0, totalMinutes: 0, creditsUsed: 0 };
  }),
});
