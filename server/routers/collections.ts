import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { collectionsInvoices } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const collectionsRouter = router({
  listInvoices: protectedProcedure
    .input(z.object({ status: z.enum(["draft", "sent", "overdue", "paid", "disputed", "written_off", "all"]).default("all") }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(collectionsInvoices)
        .where(eq(collectionsInvoices.userId, ctx.user.id))
        .orderBy(desc(collectionsInvoices.createdAt));
      return rows.filter(r => input.status === "all" || r.status === input.status);
    }),

  createInvoice: protectedProcedure
    .input(z.object({
      contactId: z.number().optional(),
      companyId: z.number().optional(),
      invoiceNumber: z.string().optional(),
      amount: z.number().positive(),
      currency: z.string().default("USD"),
      dueDate: z.number().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const invoiceNum = input.invoiceNumber ?? `INV-${Date.now().toString().slice(-6)}`;
      await db.insert(collectionsInvoices).values({
        ...input,
        invoiceNumber: invoiceNum,
        amount: input.amount.toFixed(2) as any,
        userId: ctx.user.id,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "sent", "overdue", "paid", "disputed", "written_off"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updates: Record<string, any> = { status: input.status, updatedAt: Date.now() };
      if (input.status === "paid") updates.paidAt = Date.now();
      await db.update(collectionsInvoices).set(updates)
        .where(and(eq(collectionsInvoices.id, input.id), eq(collectionsInvoices.userId, ctx.user.id)));
      return { success: true };
    }),

  // AI Chase — generate a collection message
  generateChaseMessage: protectedProcedure
    .input(z.object({
      invoiceId: z.number(),
      tone: z.enum(["friendly", "firm", "final_notice"]).default("friendly"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [invoice] = await db.select().from(collectionsInvoices)
        .where(and(eq(collectionsInvoices.id, input.invoiceId), eq(collectionsInvoices.userId, ctx.user.id))).limit(1);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
      const toneInstructions = {
        friendly: "Write a polite, friendly reminder. Assume it may be an oversight.",
        firm: "Write a firm but professional follow-up. Emphasize the overdue status and request immediate payment.",
        final_notice: "Write a final notice. State that further action may be taken if payment is not received within 48 hours.",
      };
      const daysOverdue = invoice.dueDate ? Math.floor((Date.now() - invoice.dueDate) / 86400000) : 0;
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an AI collections agent. ${toneInstructions[input.tone]} Keep the message professional and under 150 words.`
          },
          {
            role: "user",
            content: `Invoice #${invoice.invoiceNumber} for $${invoice.amount} ${invoice.currency} is ${daysOverdue} days overdue. Chase count: ${invoice.chaseCount}. Generate a collection message.`
          }
        ],
      });
      const message = (response.choices[0].message.content as string) ?? "";
      // Increment chase count
      await db.update(collectionsInvoices).set({
        chaseCount: (invoice.chaseCount ?? 0) + 1,
        lastChasedAt: Date.now(),
        updatedAt: Date.now(),
      }).where(eq(collectionsInvoices.id, input.invoiceId));
      return { message };
    }),

  // Mark overdue invoices
  markOverdue: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const now = Date.now();
    const invoices = await db.select().from(collectionsInvoices)
      .where(and(eq(collectionsInvoices.userId, ctx.user.id), eq(collectionsInvoices.status, "sent")));
    let count = 0;
    for (const inv of invoices) {
      if (inv.dueDate && inv.dueDate < now) {
        await db.update(collectionsInvoices).set({ status: "overdue", updatedAt: now })
          .where(eq(collectionsInvoices.id, inv.id));
        count++;
      }
    }
    return { markedOverdue: count };
  }),
});
