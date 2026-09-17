import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import {
  serviceBusinesses,
  serviceCustomers,
  appointments,
  followUpSequences,
  followUpLogs,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export const appointmentsRouter = router({
  // ─── Service Business CRUD ─────────────────────────────────────────────────
  listBusinesses: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select()
      .from(serviceBusinesses)
      .where(eq(serviceBusinesses.userId, ctx.user.id))
      .orderBy(desc(serviceBusinesses.createdAt));
  }),

  getBusiness: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [biz] = await db
        .select()
        .from(serviceBusinesses)
        .where(and(eq(serviceBusinesses.id, input.id), eq(serviceBusinesses.userId, ctx.user.id)));
      if (!biz) throw new TRPCError({ code: "NOT_FOUND" });
      return biz;
    }),

  createBusiness: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        industry: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        timezone: z.string().default("America/Chicago"),
        bookingUrl: z.string().url().optional(),
        aiGreeting: z.string().optional(),
        confirmationMsg: z.string().optional(),
        reminderMsg: z.string().optional(),
        followUpMsg: z.string().optional(),
        upsellMsg: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(serviceBusinesses).values({
        userId: ctx.user.id,
        ...input,
      });
      return { id: (result as any).insertId };
    }),

  updateBusiness: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        industry: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        timezone: z.string().optional(),
        bookingUrl: z.string().optional(),
        aiGreeting: z.string().optional(),
        confirmationMsg: z.string().optional(),
        reminderMsg: z.string().optional(),
        followUpMsg: z.string().optional(),
        upsellMsg: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...updates } = input;
      await db
        .update(serviceBusinesses)
        .set(updates)
        .where(and(eq(serviceBusinesses.id, id), eq(serviceBusinesses.userId, ctx.user.id)));
      return { success: true };
    }),

  // ─── Service Customers ─────────────────────────────────────────────────────
  listCustomers: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // verify ownership
      const [biz] = await db
        .select({ id: serviceBusinesses.id })
        .from(serviceBusinesses)
        .where(and(eq(serviceBusinesses.id, input.businessId), eq(serviceBusinesses.userId, ctx.user.id)));
      if (!biz) throw new TRPCError({ code: "FORBIDDEN" });
      return db
        .select()
        .from(serviceCustomers)
        .where(eq(serviceCustomers.businessId, input.businessId))
        .orderBy(desc(serviceCustomers.createdAt));
    }),

  upsertCustomer: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        id: z.number().optional(),
        name: z.string().optional(),
        phone: z.string().min(7),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        notes: z.string().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [biz] = await db
        .select({ id: serviceBusinesses.id })
        .from(serviceBusinesses)
        .where(and(eq(serviceBusinesses.id, input.businessId), eq(serviceBusinesses.userId, ctx.user.id)));
      if (!biz) throw new TRPCError({ code: "FORBIDDEN" });

      const { id, ...data } = input;
      if (id) {
        await db.update(serviceCustomers).set(data).where(eq(serviceCustomers.id, id));
        return { id };
      } else {
        const [result] = await db.insert(serviceCustomers).values(data);
        return { id: (result as any).insertId };
      }
    }),

  importCustomers: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        rows: z.array(
          z.object({
            name: z.string().optional(),
            phone: z.string(),
            email: z.string().optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            notes: z.string().optional(),
            tags: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [biz] = await db
        .select({ id: serviceBusinesses.id })
        .from(serviceBusinesses)
        .where(and(eq(serviceBusinesses.id, input.businessId), eq(serviceBusinesses.userId, ctx.user.id)));
      if (!biz) throw new TRPCError({ code: "FORBIDDEN" });

      const rows = input.rows.map((r) => ({ ...r, businessId: input.businessId }));
      if (rows.length > 0) {
        await db.insert(serviceCustomers).values(rows);
      }
      return { imported: rows.length };
    }),

  // ─── Appointments ──────────────────────────────────────────────────────────
  listAppointments: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        from: z.date().optional(),
        to: z.date().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [biz] = await db
        .select({ id: serviceBusinesses.id })
        .from(serviceBusinesses)
        .where(and(eq(serviceBusinesses.id, input.businessId), eq(serviceBusinesses.userId, ctx.user.id)));
      if (!biz) throw new TRPCError({ code: "FORBIDDEN" });

      const conditions = [eq(appointments.businessId, input.businessId)];
      if (input.from) conditions.push(gte(appointments.scheduledAt, input.from));
      if (input.to) conditions.push(lte(appointments.scheduledAt, input.to));

      return db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(appointments.scheduledAt);
    }),

  createAppointment: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        customerId: z.number().optional(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        customerEmail: z.string().email().optional(),
        serviceType: z.string().optional(),
        scheduledAt: z.date(),
        durationMinutes: z.number().default(60),
        notes: z.string().optional(),
        bookedVia: z.enum(["ai_call", "ai_chat", "manual", "online", "referral"]).default("manual"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [biz] = await db
        .select({ id: serviceBusinesses.id })
        .from(serviceBusinesses)
        .where(and(eq(serviceBusinesses.id, input.businessId), eq(serviceBusinesses.userId, ctx.user.id)));
      if (!biz) throw new TRPCError({ code: "FORBIDDEN" });

      const [result] = await db.insert(appointments).values({
        ...input,
        status: "pending",
      });
      return { id: (result as any).insertId };
    }),

  updateAppointmentStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "reminded", "completed", "cancelled", "no_show"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(appointments)
        .set({ status: input.status, notes: input.notes })
        .where(eq(appointments.id, input.id));
      return { success: true };
    }),

  // ─── Follow-Up Sequences ───────────────────────────────────────────────────
  listSequences: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [biz] = await db
        .select({ id: serviceBusinesses.id })
        .from(serviceBusinesses)
        .where(and(eq(serviceBusinesses.id, input.businessId), eq(serviceBusinesses.userId, ctx.user.id)));
      if (!biz) throw new TRPCError({ code: "FORBIDDEN" });
      return db
        .select()
        .from(followUpSequences)
        .where(eq(followUpSequences.businessId, input.businessId))
        .orderBy(desc(followUpSequences.createdAt));
    }),

  createSequence: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        name: z.string().min(1),
        type: z.enum([
          "appointment_reminder",
          "post_service_followup",
          "upsell_inspection",
          "re_engagement",
          "review_request",
          "referral_ask",
          "custom",
        ]),
        triggerType: z.enum([
          "hours_before_appointment",
          "hours_after_appointment",
          "days_after_last_service",
          "days_since_last_contact",
          "manual",
        ]),
        triggerValue: z.number().default(24),
        channel: z.enum(["ai_call", "sms", "email", "all"]),
        messageTemplate: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [biz] = await db
        .select({ id: serviceBusinesses.id })
        .from(serviceBusinesses)
        .where(and(eq(serviceBusinesses.id, input.businessId), eq(serviceBusinesses.userId, ctx.user.id)));
      if (!biz) throw new TRPCError({ code: "FORBIDDEN" });
      const [result] = await db.insert(followUpSequences).values(input);
      return { id: (result as any).insertId };
    }),

  updateSequence: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        messageTemplate: z.string().optional(),
        triggerValue: z.number().optional(),
        channel: z.enum(["ai_call", "sms", "email", "all"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...updates } = input;
      await db.update(followUpSequences).set(updates).where(eq(followUpSequences.id, id));
      return { success: true };
    }),

  // ─── Follow-Up Logs ────────────────────────────────────────────────────────
  listLogs: protectedProcedure
    .input(z.object({ businessId: z.number(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [biz] = await db
        .select({ id: serviceBusinesses.id })
        .from(serviceBusinesses)
        .where(and(eq(serviceBusinesses.id, input.businessId), eq(serviceBusinesses.userId, ctx.user.id)));
      if (!biz) throw new TRPCError({ code: "FORBIDDEN" });
      return db
        .select()
        .from(followUpLogs)
        .where(eq(followUpLogs.businessId, input.businessId))
        .orderBy(desc(followUpLogs.createdAt))
        .limit(input.limit);
    }),

  // ─── AI Message Generation ─────────────────────────────────────────────────
  generateMessage: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "appointment_reminder",
          "post_service_followup",
          "upsell_inspection",
          "re_engagement",
          "review_request",
          "referral_ask",
          "custom",
        ]),
        businessName: z.string(),
        industry: z.string(),
        customerName: z.string().optional(),
        serviceType: z.string().optional(),
        channel: z.enum(["ai_call", "sms", "email"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const typeDescriptions: Record<string, string> = {
        appointment_reminder: "remind the customer of their upcoming appointment",
        post_service_followup: "follow up after service to check satisfaction",
        upsell_inspection: "offer an inspection or new service",
        re_engagement: "re-engage a customer who hasn't visited in a while",
        review_request: "ask the customer to leave a review",
        referral_ask: "ask the customer to refer friends or family",
        custom: "send a custom message",
      };
      const channelInstructions: Record<string, string> = {
        ai_call: "Write a natural spoken script for an AI phone call (conversational, 60-90 seconds). Include a greeting, the main message, and a clear call-to-action.",
        sms: "Write a concise SMS message (under 160 characters). Be friendly and direct.",
        email: "Write a short, friendly email with subject line and body (3-4 sentences max).",
      };

      const response = await invokeLLM({
        messages: [
          {
            role: "system" as const,
            content: `You are a professional AI communications specialist for ${input.businessName}, a ${input.industry} business. Write messages that are warm, professional, and effective.`,
          },
          {
            role: "user" as const,
            content: `Generate a ${input.channel} message to ${typeDescriptions[input.type]}.
${input.customerName ? `Customer name: ${input.customerName}` : ""}
${input.serviceType ? `Service type: ${input.serviceType}` : ""}

${channelInstructions[input.channel]}

Return ONLY the message text, no explanation.`,
          },
        ],
      });
      const content = response.choices?.[0]?.message?.content ?? "";
      return { message: content };
    }),

  // ─── Stats ─────────────────────────────────────────────────────────────────
  getStats: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [biz] = await db
        .select({ id: serviceBusinesses.id })
        .from(serviceBusinesses)
        .where(and(eq(serviceBusinesses.id, input.businessId), eq(serviceBusinesses.userId, ctx.user.id)));
      if (!biz) throw new TRPCError({ code: "FORBIDDEN" });

      const [totalCustomers] = await db
        .select({ count: sql<number>`count(*)` })
        .from(serviceCustomers)
        .where(eq(serviceCustomers.businessId, input.businessId));

      const [totalAppointments] = await db
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(eq(appointments.businessId, input.businessId));

      const [upcomingAppts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(
          and(
            eq(appointments.businessId, input.businessId),
            gte(appointments.scheduledAt, new Date()),
            eq(appointments.status, "confirmed")
          )
        );

      const [completedAppts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(
          and(
            eq(appointments.businessId, input.businessId),
            eq(appointments.status, "completed")
          )
        );

      const [activeSequences] = await db
        .select({ count: sql<number>`count(*)` })
        .from(followUpSequences)
        .where(
          and(
            eq(followUpSequences.businessId, input.businessId),
            eq(followUpSequences.isActive, true)
          )
        );

      return {
        totalCustomers: Number(totalCustomers?.count ?? 0),
        totalAppointments: Number(totalAppointments?.count ?? 0),
        upcomingAppointments: Number(upcomingAppts?.count ?? 0),
        completedAppointments: Number(completedAppts?.count ?? 0),
        activeSequences: Number(activeSequences?.count ?? 0),
      };
    }),
});
