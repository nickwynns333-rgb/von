import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addCredits,
  createAgent,
  createKnowledgeEntry,
  deductCredits,
  deleteAgent,
  getAgencyClients,
  getAgentById,
  getAllUsers,
  getCreditPacks,
  getCreditPricing,
  getCreditTransactions,
  getPlans,
  getUserAgents,
  getUserCredits,
  getUserKnowledge,
  getUserSubscription,
  getWhiteLabelSettings,
  seedCreditPacks,
  seedDefaultPlans,
  updateAgent,
  updateUserRole,
  upsertCreditPricing,
  upsertWhiteLabelSettings,
} from "./db";
import { FEATURE_MODELS, listOpenRouterModels, openRouterChat } from "./openrouter";
import { buildRagContext } from "./knowledgeBase";
import { getDb } from "./db";
import { knowledgeBases, userMemory } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { affiliateRouter } from "./routers/affiliate";
import { meetingsRouter } from "./routers/meetings";
import { knowledgeBaseRouter } from "./routers/knowledgeBase";
import { whiteLabelRouter } from "./routers/whiteLabel";
import { telephonyRouter } from "./routers/telephony";
import { chatWidgetRouter } from "./routers/chatWidget";
import { dataMarketplaceRouter } from "./routers/dataMarketplace";
import { appointmentsRouter } from "./routers/appointments";
import { adminToolsRouter } from "./routers/adminTools";
import { meetingSummaryRouter } from "./routers/meetingSummary";
import { telnyxRouter } from "./routers/telnyxRouter";
import { promptTemplatesRouter } from "./routers/promptTemplates";
import { avatarStudioRouter } from "./routers/avatarStudio";
import { seoRouter } from "./routers/seo";
import { schedulerRouter } from "./routers/scheduler";
import { websiteBuilderRouter } from "./routers/websiteBuilder";
import { memoryRouter } from "./routers/memory";
import { indianTeamRouter } from "./routers/indianTeam";
import { aicfoRouter } from "./routers/aicfo";
import { communicationsRouter } from "./routers/communications";
import { crmRouter } from "./routers/crm";
import { payrollRouter } from "./routers/payroll";
import { legalRouter } from "./routers/legal";
import { collectionsRouter } from "./routers/collections";
import { accountingRouter } from "./routers/accounting";
import { broadcastRouter } from "./routers/broadcast";
import { callCenterRouter } from "./routers/callCenter";
import { vonworkGatesRouter } from "./routers/vonwork-gates";
import { siteAdminRouter } from "./routers/siteAdmin";
import { memberPricingRouter } from "./routers/memberPricing";
import { prospectingRouter } from "./routers/prospecting";
import { nanoid } from "nanoid";

// ─── Role guards ──────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

const agencyOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "agency")
    throw new TRPCError({ code: "FORBIDDEN", message: "Agency or admin access required" });
  return next({ ctx });
});

// ─── Plans Router ─────────────────────────────────────────────────────────────

const plansRouter = router({
  list: publicProcedure.query(async () => {
    await seedDefaultPlans();
    return getPlans();
  }),
});

// ─── Credits Router ───────────────────────────────────────────────────────────

const creditsRouter = router({
  balance: protectedProcedure.query(async ({ ctx }) => {
    return getUserCredits(ctx.user.id);
  }),

  transactions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      return getCreditTransactions(ctx.user.id, input.limit);
    }),

  packs: publicProcedure.query(async () => {
    await seedCreditPacks();
    return getCreditPacks();
  }),

  pricing: publicProcedure.query(async () => {
    return getCreditPricing();
  }),

  adminGrant: adminProcedure
    .input(z.object({ userId: z.number(), amount: z.number().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      await addCredits(input.userId, input.amount, "admin_grant", input.description ?? "Admin credit grant");
      return { success: true };
    }),

  agencyAllocate: agencyOrAdminProcedure
    .input(z.object({ clientUserId: z.number(), amount: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await deductCredits(ctx.user.id, input.amount, "agency_grant", `Allocated to client ${input.clientUserId}`);
      if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient credits" });
      await addCredits(input.clientUserId, input.amount, "agency_grant", `Credits from agency ${ctx.user.id}`);
      return { success: true };
    }),
});

// ─── Subscription Router ──────────────────────────────────────────────────────

const subscriptionRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getUserSubscription(ctx.user.id);
    return sub ?? null;
  }),
});

// ─── AI Agents Router ─────────────────────────────────────────────────────────

const agentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserAgents(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const agent = await getAgentById(input.id);
      if (!agent || agent.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return agent;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        type: z.enum(["receptionist", "outbound_caller", "video_sales", "chat", "appointment_setter", "customer_service", "sales_closer"]),
        model: z.string().optional(),
        systemPrompt: z.string().optional(),
        personality: z.string().optional(),
        tone: z.string().optional(),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const featureModels = FEATURE_MODELS[input.type] ?? FEATURE_MODELS.default;
      const slug = nanoid(10);
      await createAgent({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        model: input.model ?? featureModels.primary,
        systemPrompt: input.systemPrompt ?? null,
        personality: input.personality ?? "professional",
        tone: input.tone ?? "friendly",
        language: input.language ?? "en",
        shareableSlug: slug,
        isActive: true,
      });
      return { success: true, slug };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        systemPrompt: z.string().optional(),
        model: z.string().optional(),
        personality: z.string().optional(),
        tone: z.string().optional(),
        language: z.string().optional(),
        isActive: z.boolean().optional(),
        config: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await getAgentById(input.id);
      if (!agent || agent.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, ...data } = input;
      await updateAgent(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await getAgentById(input.id);
      if (!agent || agent.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteAgent(input.id);
      return { success: true };
    }),

  chat: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        message: z.string().min(1).max(2000),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await getAgentById(input.agentId);
      if (!agent || agent.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      const creditResult = await deductCredits(
        ctx.user.id, 1, "usage_chat",
        `Chat with agent: ${agent.name}`,
        { featureType: "chat", modelUsed: agent.model }
      );
      if (!creditResult.success) throw new TRPCError({ code: "PAYMENT_REQUIRED", message: "Insufficient credits" });

      // RAG: find a knowledge base linked to this agent and inject relevant context
      let ragContext = "";
      try {
        const db = await getDb();
        if (db && agent.id) {
          const [linkedKB] = await db
            .select()
            .from(knowledgeBases)
            .where(eq(knowledgeBases.agentId, agent.id))
            .limit(1);
          if (linkedKB && linkedKB.chunkCount > 0) {
            ragContext = await buildRagContext(linkedKB.id, input.message, 3);
          }
        }
      } catch (e) {
        console.warn("[RAG] Context retrieval failed:", e);
      }

      // Memory: inject user context digest into system prompt
      let memoryContext = "";
      try {
        const db = await getDb();
        if (db) {
          const [mem] = await db
            .select({ contextDigest: userMemory.contextDigest })
            .from(userMemory)
            .where(eq(userMemory.userId, ctx.user.id))
            .limit(1);
          if (mem?.contextDigest) {
            memoryContext = `\n\n[User Context]: ${mem.contextDigest}`;
          }
        }
      } catch (e) {
        console.warn("[Memory] Context retrieval failed:", e);
      }

      const baseSystemPrompt = (agent.systemPrompt ?? `You are ${agent.name}, a ${agent.type} AI assistant. Be ${agent.personality} and ${agent.tone}.`) + memoryContext;
      const systemPromptWithRag = ragContext
        ? `${baseSystemPrompt}\n\nWhen answering, use the following knowledge base context if relevant:${ragContext}Answer based on the context when available, otherwise use your general knowledge.`
        : baseSystemPrompt;

      const messages = [
        { role: "system" as const, content: systemPromptWithRag },
        ...(input.history ?? []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user" as const, content: input.message },
      ];

      const response = await openRouterChat({ model: agent.model, messages });
      return {
        reply: response.choices[0]?.message?.content ?? "",
        creditsRemaining: creditResult.balance,
        model: response.model,
      };
    }),
});

// ─── Knowledge Base Router ────────────────────────────────────────────────────

const knowledgeRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserKnowledge(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        type: z.enum(["pdf", "url", "text", "csv", "docx"]),
        sourceUrl: z.string().url().optional(),
        agentId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createKnowledgeEntry({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        sourceUrl: input.sourceUrl ?? null,
        agentId: input.agentId ?? null,
        status: "pending",
      });
      return { success: true };
    }),
});

// ─── Admin Router ─────────────────────────────────────────────────────────────

const adminRouter = router({
  users: adminProcedure
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      return getAllUsers(input.limit, input.offset);
    }),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "agency"]) }))
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  plans: adminProcedure.query(async () => {
    return getPlans();
  }),

  creditPricing: adminProcedure.query(async () => {
    return getCreditPricing();
  }),

  updateCreditPricing: adminProcedure
    .input(
      z.object({
        featureType: z.string(),
        creditsPerUnit: z.number().min(0),
        unitLabel: z.string(),
        defaultModel: z.string().optional(),
        fallbackModel: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertCreditPricing({
        featureType: input.featureType,
        creditsPerUnit: input.creditsPerUnit,
        unitLabel: input.unitLabel,
        defaultModel: input.defaultModel ?? null,
        fallbackModel: input.fallbackModel ?? null,
        isActive: input.isActive ?? true,
      });
      return { success: true };
    }),

  openRouterModels: adminProcedure.query(async () => {
    try {
      return await listOpenRouterModels();
    } catch {
      return [];
    }
  }),
});

// ─── Agency Router ────────────────────────────────────────────────────────────

const agencyRouter = router({
  clients: agencyOrAdminProcedure.query(async ({ ctx }) => {
    return getAgencyClients(ctx.user.id);
  }),

  whiteLabelSettings: agencyOrAdminProcedure.query(async ({ ctx }) => {
    return getWhiteLabelSettings(ctx.user.id);
  }),

  updateWhiteLabel: agencyOrAdminProcedure
    .input(
      z.object({
        brandName: z.string().max(128).optional(),
        primaryColor: z.string().max(16).optional(),
        accentColor: z.string().max(16).optional(),
        customDomain: z.string().max(256).optional(),
        hideVonworkBranding: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertWhiteLabelSettings({ userId: ctx.user.id, ...input });
      return { success: true };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  plans: plansRouter,
  credits: creditsRouter,
  subscription: subscriptionRouter,
  agents: agentsRouter,
  knowledge: knowledgeRouter,
  admin: adminRouter,
  agency: agencyRouter,
  affiliate: affiliateRouter,
  meetings: meetingsRouter,
  kb: knowledgeBaseRouter,
  whiteLabel: whiteLabelRouter,
  telephony: telephonyRouter,
  chatWidget: chatWidgetRouter,
  dataMarketplace: dataMarketplaceRouter,
  appointments: appointmentsRouter,
  adminTools: adminToolsRouter,
  meetingSummary: meetingSummaryRouter,
  telnyx: telnyxRouter,
  promptTemplates: promptTemplatesRouter,
  avatarStudio: avatarStudioRouter,
  seo: seoRouter,
  memory: memoryRouter,
  indianTeam: indianTeamRouter,
  aicfo: aicfoRouter,
  communications: communicationsRouter,
  crm: crmRouter,
  payroll: payrollRouter,
  legal: legalRouter,
  collections: collectionsRouter,
  accounting: accountingRouter,
  broadcast: broadcastRouter,
  callCenter: callCenterRouter,
  scheduler: schedulerRouter,
  websiteBuilder: websiteBuilderRouter,
  vonwork: vonworkGatesRouter,
  siteAdmin: siteAdminRouter,
  memberPricing: memberPricingRouter,
  prospecting: prospectingRouter,
});

export type AppRouter = typeof appRouter;
