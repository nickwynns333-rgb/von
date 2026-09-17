import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { teamMembers, teamTasks, exceptionQueue, taxOrders, accountingClients } from "../../drizzle/schema";
import { eq, desc, and, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "../_core/env";

// ─── Team Auth Helpers ────────────────────────────────────────────────────────

function signTeamToken(memberId: number, role: string) {
  return jwt.sign({ teamMemberId: memberId, role }, ENV.cookieSecret, { expiresIn: "12h" });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const indianTeamRouter = router({
  // Login for team members (separate from Manus OAuth)
  login: protectedProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [member] = await db.select().from(teamMembers).where(eq(teamMembers.email, input.email)).limit(1);
      if (!member || !member.isActive) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      const valid = await bcrypt.compare(input.password, member.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      const token = signTeamToken(member.id, member.role ?? "bookkeeper");
      return { token, member: { id: member.id, name: member.name, email: member.email, role: member.role } };
    }),

  // Admin: create a team member
  createMember: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(["bookkeeper", "accountant", "tax_specialist", "senior_accountant", "manager"]).default("bookkeeper"),
      specialization: z.string().optional(),
      hourlyRate: z.number().default(10),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const passwordHash = await bcrypt.hash(input.password, 12);
      const [result] = await db.insert(teamMembers).values({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        specialization: input.specialization,
        hourlyRate: input.hourlyRate.toString(),
        isActive: true,
      });
      return { id: (result as any).insertId };
    }),

  // List all team members (admin)
  listMembers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({
      id: teamMembers.id,
      name: teamMembers.name,
      email: teamMembers.email,
      role: teamMembers.role,
      specialization: teamMembers.specialization,
      hourlyRate: teamMembers.hourlyRate,
      isActive: teamMembers.isActive,
    }).from(teamMembers).orderBy(desc(teamMembers.createdAt));
  }),

  // Get exception queue (open items needing human review)
  getExceptionQueue: protectedProcedure
    .input(z.object({ status: z.enum(["open", "assigned", "in_progress", "resolved", "escalated", "all"]).default("open") }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const query = db.select().from(exceptionQueue).orderBy(desc(exceptionQueue.createdAt));
      if (input.status !== "all") {
        return db.select().from(exceptionQueue)
          .where(eq(exceptionQueue.status, input.status as any))
          .orderBy(desc(exceptionQueue.createdAt))
          .limit(100);
      }
      return query.limit(100);
    }),

  // Assign exception to team member
  assignException: protectedProcedure
    .input(z.object({ exceptionId: z.number(), teamMemberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(exceptionQueue)
        .set({ assignedTo: input.teamMemberId, status: "assigned", updatedAt: Date.now() })
        .where(eq(exceptionQueue.id, input.exceptionId));
      return { success: true };
    }),

  // Resolve exception
  resolveException: protectedProcedure
    .input(z.object({ exceptionId: z.number(), resolution: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(exceptionQueue)
        .set({ status: "resolved", resolution: input.resolution, resolvedAt: Date.now(), updatedAt: Date.now() })
        .where(eq(exceptionQueue.id, input.exceptionId));
      return { success: true };
    }),

  // Get all tax orders (admin view)
  getTaxOrders: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.status) {
        return db.select().from(taxOrders)
          .where(eq(taxOrders.status, input.status as any))
          .orderBy(desc(taxOrders.createdAt)).limit(100);
      }
      return db.select().from(taxOrders).orderBy(desc(taxOrders.createdAt)).limit(100);
    }),

  // Assign tax order to team member
  assignTaxOrder: protectedProcedure
    .input(z.object({ taxOrderId: z.number(), teamMemberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(taxOrders)
        .set({ assignedTeamMemberId: input.teamMemberId, status: "in_progress", updatedAt: Date.now() })
        .where(eq(taxOrders.id, input.taxOrderId));
      return { success: true };
    }),

  // Update tax order status
  updateTaxOrderStatus: protectedProcedure
    .input(z.object({
      taxOrderId: z.number(),
      status: z.enum(["pending", "documents_requested", "in_progress", "review", "completed", "filed"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(taxOrders)
        .set({ status: input.status, notes: input.notes, updatedAt: Date.now() })
        .where(eq(taxOrders.id, input.taxOrderId));
      return { success: true };
    }),

  // Log team task / hours
  logTask: protectedProcedure
    .input(z.object({
      teamMemberId: z.number(),
      clientId: z.number().optional(),
      taxOrderId: z.number().optional(),
      exceptionId: z.number().optional(),
      taskType: z.enum(["bookkeeping", "tax_prep", "payroll", "reconciliation", "review", "cleanup", "other"]),
      description: z.string().min(1),
      hoursWorked: z.number().min(0),
      rateType: z.enum(["standard", "cleanup"]).default("standard"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rate = input.rateType === "cleanup" ? 20 : 10;
      const amountBilled = input.hoursWorked * rate;
      await db.insert(teamTasks).values({
        teamMemberId: input.teamMemberId,
        clientId: input.clientId,
        taxOrderId: input.taxOrderId,
        exceptionId: input.exceptionId,
        taskType: input.taskType,
        description: input.description,
        hoursWorked: input.hoursWorked.toString(),
        rateType: input.rateType,
        hourlyRate: rate.toString(),
        amountBilled: amountBilled.toString(),
        status: "completed",
        completedAt: Date.now(),
      });
      return { success: true, amountBilled };
    }),

  // Get team task log / billing summary
  getTaskLog: protectedProcedure
    .input(z.object({ teamMemberId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.teamMemberId) {
        return db.select().from(teamTasks)
          .where(eq(teamTasks.teamMemberId, input.teamMemberId))
          .orderBy(desc(teamTasks.createdAt)).limit(200);
      }
      return db.select().from(teamTasks).orderBy(desc(teamTasks.createdAt)).limit(200);
    }),

  // Get all accounting clients (admin)
  getClients: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(accountingClients).orderBy(desc(accountingClients.createdAt)).limit(200);
  }),
});
