import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { payrollWorkers, payrollRuns, payrollEntries } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const payrollRouter = router({
  // Workers
  listWorkers: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(payrollWorkers)
      .where(and(eq(payrollWorkers.userId, ctx.user.id), eq(payrollWorkers.isActive, 1)))
      .orderBy(payrollWorkers.name);
  }),

  addWorker: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(["employee", "contractor"]).default("contractor"),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      payRate: z.number().positive().optional(),
      payType: z.enum(["hourly", "salary", "per_task"]).default("hourly"),
      taxId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(payrollWorkers).values({ ...input, payRate: input.payRate?.toFixed(2) as any, userId: ctx.user.id, createdAt: Date.now() });
      return { success: true };
    }),

  updateWorker: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      payRate: z.number().optional(),
      payType: z.enum(["hourly", "salary", "per_task"]).optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(payrollWorkers).set(data as any)
        .where(and(eq(payrollWorkers.id, id), eq(payrollWorkers.userId, ctx.user.id)));
      return { success: true };
    }),

  // Pay Runs
  listRuns: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(payrollRuns)
      .where(eq(payrollRuns.userId, ctx.user.id))
      .orderBy(desc(payrollRuns.createdAt));
  }),

  createRun: protectedProcedure
    .input(z.object({
      periodStart: z.number(),
      periodEnd: z.number(),
      notes: z.string().optional(),
      entries: z.array(z.object({
        workerId: z.number(),
        hoursWorked: z.number().optional(),
        grossPay: z.number(),
        deductions: z.number().default(0),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const totalGross = input.entries.reduce((s, e) => s + e.grossPay, 0);
      const totalDeductions = input.entries.reduce((s, e) => s + (e.deductions ?? 0), 0);
      const totalNet = totalGross - totalDeductions;
      const now = Date.now();
      const [result] = await db.insert(payrollRuns).values({
        userId: ctx.user.id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        totalGross: totalGross.toFixed(2) as any,
        totalNet: totalNet.toFixed(2) as any,
        status: "draft",
        notes: input.notes,
        createdAt: now,
      });
      const runId = (result as any).insertId;
      for (const entry of input.entries) {
        await db.insert(payrollEntries).values({
          runId,
          workerId: entry.workerId,
          hoursWorked: entry.hoursWorked?.toFixed(2) as any,
          grossPay: entry.grossPay.toFixed(2) as any,
          deductions: (entry.deductions ?? 0).toFixed(2) as any,
          netPay: (entry.grossPay - (entry.deductions ?? 0)).toFixed(2) as any,
          createdAt: now,
        });
      }
      return { runId };
    }),

  approveRun: protectedProcedure
    .input(z.object({ runId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(payrollRuns).set({ status: "approved" })
        .where(and(eq(payrollRuns.id, input.runId), eq(payrollRuns.userId, ctx.user.id)));
      return { success: true };
    }),

  getRunEntries: protectedProcedure
    .input(z.object({ runId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [run] = await db.select().from(payrollRuns)
        .where(and(eq(payrollRuns.id, input.runId), eq(payrollRuns.userId, ctx.user.id))).limit(1);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      const entries = await db.select().from(payrollEntries)
        .leftJoin(payrollWorkers, eq(payrollEntries.workerId, payrollWorkers.id))
        .where(eq(payrollEntries.runId, input.runId));
      return { run, entries: entries.map(e => ({ ...e.payroll_entries, worker: e.payroll_workers })) };
    }),
});
