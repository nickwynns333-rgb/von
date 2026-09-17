import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { crmContacts, crmCompanies, crmPipelines, crmDeals, crmTasks } from "../../drizzle/schema";
import { eq, and, desc, like, or } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

const DEFAULT_STAGES = [
  { id: "lead", name: "Lead", order: 0, color: "#6366f1" },
  { id: "qualified", name: "Qualified", order: 1, color: "#f59e0b" },
  { id: "proposal", name: "Proposal", order: 2, color: "#3b82f6" },
  { id: "negotiation", name: "Negotiation", order: 3, color: "#8b5cf6" },
  { id: "closed_won", name: "Closed Won", order: 4, color: "#10b981" },
  { id: "closed_lost", name: "Closed Lost", order: 5, color: "#ef4444" },
];

export const crmRouter = router({
  // ── Contacts ──────────────────────────────────────────────────────────────
  listContacts: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(crmContacts)
        .where(eq(crmContacts.userId, ctx.user.id))
        .orderBy(desc(crmContacts.createdAt));
      if (input.search) {
        const s = input.search.toLowerCase();
        return rows.filter(r =>
          (r.firstName ?? "").toLowerCase().includes(s) ||
          (r.lastName ?? "").toLowerCase().includes(s) ||
          (r.email ?? "").toLowerCase().includes(s) ||
          (r.phone ?? "").includes(s)
        );
      }
      return rows;
    }),

  createContact: protectedProcedure
    .input(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      companyId: z.number().optional(),
      title: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.insert(crmContacts).values({ ...input, userId: ctx.user.id, createdAt: now, updatedAt: now });
      return { success: true };
    }),

  updateContact: protectedProcedure
    .input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      title: z.string().optional(),
      notes: z.string().optional(),
      leadScore: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(crmContacts).set({ ...data, updatedAt: Date.now() })
        .where(and(eq(crmContacts.id, id), eq(crmContacts.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteContact: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(crmContacts).where(and(eq(crmContacts.id, input.id), eq(crmContacts.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Companies ─────────────────────────────────────────────────────────────
  listCompanies: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(crmCompanies).where(eq(crmCompanies.userId, ctx.user.id)).orderBy(desc(crmCompanies.createdAt));
  }),

  createCompany: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      industry: z.string().optional(),
      website: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.insert(crmCompanies).values({ ...input, userId: ctx.user.id, createdAt: now, updatedAt: now });
      return { success: true };
    }),

  // ── Pipelines ─────────────────────────────────────────────────────────────
  listPipelines: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    let pipelines = await db.select().from(crmPipelines).where(eq(crmPipelines.userId, ctx.user.id));
    if (pipelines.length === 0) {
      // Seed a default pipeline
      await db.insert(crmPipelines).values({
        userId: ctx.user.id,
        name: "Sales Pipeline",
        stages: DEFAULT_STAGES,
        createdAt: Date.now(),
      });
      pipelines = await db.select().from(crmPipelines).where(eq(crmPipelines.userId, ctx.user.id));
    }
    return pipelines;
  }),

  // ── Deals ─────────────────────────────────────────────────────────────────
  listDeals: protectedProcedure
    .input(z.object({ pipelineId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(crmDeals)
        .leftJoin(crmContacts, eq(crmDeals.contactId, crmContacts.id))
        .leftJoin(crmCompanies, eq(crmDeals.companyId, crmCompanies.id))
        .where(eq(crmDeals.userId, ctx.user.id))
        .orderBy(desc(crmDeals.createdAt));
      return rows
        .filter(r => !input.pipelineId || r.crm_deals.pipelineId === input.pipelineId)
        .map(r => ({ ...r.crm_deals, contact: r.crm_contacts, company: r.crm_companies }));
    }),

  createDeal: protectedProcedure
    .input(z.object({
      pipelineId: z.number(),
      stageId: z.string(),
      title: z.string().min(1),
      value: z.number().optional(),
      contactId: z.number().optional(),
      companyId: z.number().optional(),
      probability: z.number().min(0).max(100).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.insert(crmDeals).values({ ...input, value: input.value?.toFixed(2) as any, userId: ctx.user.id, createdAt: now, updatedAt: now });
      return { success: true };
    }),

  updateDeal: protectedProcedure
    .input(z.object({
      id: z.number(),
      stageId: z.string().optional(),
      title: z.string().optional(),
      value: z.number().optional(),
      probability: z.number().optional(),
      status: z.enum(["open", "won", "lost"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(crmDeals).set({ ...data, value: (data as any).value?.toFixed(2), updatedAt: Date.now() } as any)
        .where(and(eq(crmDeals.id, id), eq(crmDeals.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteDeal: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(crmDeals).where(and(eq(crmDeals.id, input.id), eq(crmDeals.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Tasks ─────────────────────────────────────────────────────────────────
  listTasks: protectedProcedure
    .input(z.object({ status: z.enum(["todo", "in_progress", "done", "all"]).default("all") }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(crmTasks).where(eq(crmTasks.userId, ctx.user.id)).orderBy(crmTasks.dueAt);
      return rows.filter(r => input.status === "all" || r.status === input.status);
    }),

  createTask: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      dueAt: z.number().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      contactId: z.number().optional(),
      dealId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.insert(crmTasks).values({ ...input, userId: ctx.user.id, createdAt: now, updatedAt: now });
      return { success: true };
    }),

  updateTask: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["todo", "in_progress", "done"]).optional(),
      title: z.string().optional(),
      dueAt: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(crmTasks).set({ ...data, updatedAt: Date.now() })
        .where(and(eq(crmTasks.id, id), eq(crmTasks.userId, ctx.user.id)));
      return { success: true };
    }),

  scoreContact: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const contacts = await db.select().from(crmContacts)
        .where(and(eq(crmContacts.id, input.contactId), eq(crmContacts.userId, ctx.user.id)));
      const contact = contacts[0];
      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });
      const prompt = `You are a sales AI. Score this lead from 0-100 and explain why.\nContact: ${[contact.firstName, contact.lastName].filter(Boolean).join(" ")}\nEmail: ${contact.email ?? "N/A"}\nPhone: ${contact.phone ?? "N/A"}\nSource: ${contact.source ?? "unknown"}\nNotes: ${contact.notes ?? "none"}\n\nRespond with: SCORE: [number]\nREASON: [2-3 sentences]`;
      const res = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const text = res.choices[0].message.content as string;
      const scoreMatch = text.match(/SCORE:\s*(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
      await db.update(crmContacts).set({ leadScore: score, updatedAt: Date.now() })
        .where(eq(crmContacts.id, input.contactId));
      return { score, analysis: text };
    }),
});
