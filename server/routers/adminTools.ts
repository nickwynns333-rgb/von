/**
 * Admin Tools Router
 * - Feature Flags management (list, toggle, per-user/role overrides)
 * - AI Interaction Logs viewer (search, filter, export)
 */
import { z } from "zod";
import { eq, desc, and, gte, lte, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { featureFlags, featureFlagOverrides, aiInteractionLogs } from "../../drizzle/schema";
import { DEFAULT_FLAGS } from "../featureFlags";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const adminToolsRouter = router({
  // ─── Feature Flags ────────────────────────────────────────────────────────
  listFlags: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const dbFlags = await db.select().from(featureFlags).orderBy(featureFlags.name);
    // Merge with defaults so all flags appear even if not yet in DB
    const merged = Object.entries(DEFAULT_FLAGS).map(([name, def]) => {
      const dbFlag = dbFlags.find((f) => f.name === name);
      return {
        name,
        description: def.description,
        enabled: dbFlag ? dbFlag.enabled : def.enabled,
        allowedRoles: dbFlag ? dbFlag.allowedRoles : def.allowedRoles ?? null,
        inDb: !!dbFlag,
        id: dbFlag?.id ?? null,
      };
    });
    return merged;
  }),

  toggleFlag: adminProcedure
    .input(z.object({ name: z.string(), enabled: z.boolean(), allowedRoles: z.array(z.string()).optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(featureFlags).where(eq(featureFlags.name, input.name)).limit(1);
      if (existing.length === 0) {
        await db.insert(featureFlags).values({
          name: input.name,
          enabled: input.enabled,
          allowedRoles: input.allowedRoles ?? null,
          description: DEFAULT_FLAGS[input.name]?.description ?? "",
        });
      } else {
        await db
          .update(featureFlags)
          .set({ enabled: input.enabled, allowedRoles: input.allowedRoles ?? existing[0].allowedRoles })
          .where(eq(featureFlags.name, input.name));
      }
      return { success: true };
    }),

  listFlagOverrides: adminProcedure
    .input(z.object({ flagName: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select()
        .from(featureFlagOverrides)
        .where(input.flagName ? eq(featureFlagOverrides.flagName, input.flagName) : undefined)
        .orderBy(desc(featureFlagOverrides.createdAt));
      return rows;
    }),

  setFlagOverride: adminProcedure
    .input(z.object({
      flagName: z.string(),
      userId: z.number().optional(),
      role: z.string().optional(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!input.userId && !input.role) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Must specify userId or role" });
      }
      // Upsert: delete existing then insert
      if (input.userId) {
        await db
          .delete(featureFlagOverrides)
          .where(and(eq(featureFlagOverrides.flagName, input.flagName), eq(featureFlagOverrides.userId, input.userId)));
      }
      await db.insert(featureFlagOverrides).values({
        flagName: input.flagName,
        userId: input.userId ?? null,
        role: input.role ?? null,
        enabled: input.enabled ? 1 : 0,
        createdAt: Date.now(),
      });
      return { success: true };
    }),

  deleteFlagOverride: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(featureFlagOverrides).where(eq(featureFlagOverrides.id, input.id));
      return { success: true };
    }),

  // ─── AI Interaction Logs ──────────────────────────────────────────────────
  listAiLogs: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().default(0),
      userId: z.number().optional(),
      feature: z.string().optional(),
      model: z.string().optional(),
      fromTs: z.number().optional(),
      toTs: z.number().optional(),
      successOnly: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [];
      if (input.userId) conditions.push(eq(aiInteractionLogs.userId, input.userId));
      if (input.feature) conditions.push(eq(aiInteractionLogs.feature, input.feature));
      if (input.model) conditions.push(eq(aiInteractionLogs.model, input.model));
      if (input.fromTs) conditions.push(gte(aiInteractionLogs.createdAt, input.fromTs));
      if (input.toTs) conditions.push(lte(aiInteractionLogs.createdAt, input.toTs));
      if (input.successOnly) conditions.push(eq(aiInteractionLogs.success, 1));

      const rows = await db
        .select()
        .from(aiInteractionLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(aiInteractionLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return rows;
    }),

  aiLogStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db
      .select()
      .from(aiInteractionLogs)
      .orderBy(desc(aiInteractionLogs.createdAt))
      .limit(1000);

    const totalCalls = rows.length;
    const totalTokens = rows.reduce((s, r) => s + (r.totalTokens ?? 0), 0);
    const totalCost = rows.reduce((s, r) => s + parseFloat(String(r.costUsd ?? 0)), 0);
    const totalCredits = rows.reduce((s, r) => s + (r.creditsDeducted ?? 0), 0);
    const successRate = totalCalls > 0 ? rows.filter((r) => r.success === 1).length / totalCalls : 1;
    const avgLatency = totalCalls > 0 ? rows.reduce((s, r) => s + (r.latencyMs ?? 0), 0) / totalCalls : 0;

    // Per-model breakdown
    const byModel: Record<string, { calls: number; tokens: number; cost: number }> = {};
    for (const r of rows) {
      if (!byModel[r.model]) byModel[r.model] = { calls: 0, tokens: 0, cost: 0 };
      byModel[r.model].calls++;
      byModel[r.model].tokens += r.totalTokens ?? 0;
      byModel[r.model].cost += parseFloat(String(r.costUsd ?? 0));
    }

    // Per-feature breakdown
    const byFeature: Record<string, number> = {};
    for (const r of rows) {
      const f = r.feature ?? "unknown";
      byFeature[f] = (byFeature[f] ?? 0) + 1;
    }

    return { totalCalls, totalTokens, totalCost, totalCredits, successRate, avgLatency, byModel, byFeature };
  }),
});
