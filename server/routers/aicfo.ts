import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  accountingClients,
  financialTransactions,
  taxOrders,
  exceptionQueue,
  cfoConversations,
} from "../../drizzle/schema";
import { eq, desc, and, sum, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { openRouterChat } from "../openrouter";
import { storagePut } from "../storage";

// ─── Tax form pricing (Annex A) ───────────────────────────────────────────────
const TAX_PRICING: Record<string, number> = {
  "1040_single": 110,
  "1040_mfj": 110,
  "1040_mfs": 110,
  "1120": 220,
  "1120s": 220,
  "1065": 220,
  "1041": 220,
  "quarterly_corp": 40,
  "quarterly_llc": 40,
};
const EXTRA_SCHEDULE_PRICE = 20;
const EXTRA_STATE_PRICE = 20;

// ─── Router ───────────────────────────────────────────────────────────────────
export const aicfoRouter = router({

  // ── Accounting Clients ──────────────────────────────────────────────────────

  getMyClients: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(accountingClients)
      .where(eq(accountingClients.userId, ctx.user.id))
      .orderBy(desc(accountingClients.createdAt));
  }),

  createClient: protectedProcedure
    .input(z.object({
      businessName: z.string().min(1),
      businessType: z.enum(["sole_trader", "llc", "s_corp", "c_corp", "partnership", "trust", "individual"]).default("llc"),
      industry: z.string().optional(),
      fiscalYearEnd: z.string().default("12-31"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(accountingClients).values({
        userId: ctx.user.id,
        businessName: input.businessName,
        businessType: input.businessType,
        industry: input.industry,
        fiscalYearEnd: input.fiscalYearEnd,
        subscriptionTier: "ai_bookkeeper",
        status: "active",
        onboardedAt: Date.now(),
      });
      return { id: (result as any).insertId };
    }),

  // ── Transactions / Bookkeeper ───────────────────────────────────────────────

  getTransactions: protectedProcedure
    .input(z.object({ clientId: z.number(), limit: z.number().default(100) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verify ownership
      const [client] = await db.select().from(accountingClients)
        .where(and(eq(accountingClients.id, input.clientId), eq(accountingClients.userId, ctx.user.id))).limit(1);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });
      return db.select().from(financialTransactions)
        .where(eq(financialTransactions.clientId, input.clientId))
        .orderBy(desc(financialTransactions.date))
        .limit(input.limit);
    }),

  addTransaction: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      date: z.number(),
      description: z.string().min(1),
      amount: z.number(),
      type: z.enum(["income", "expense", "transfer", "adjustment"]),
      category: z.string().optional(),
      vendor: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [client] = await db.select().from(accountingClients)
        .where(and(eq(accountingClients.id, input.clientId), eq(accountingClients.userId, ctx.user.id))).limit(1);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(financialTransactions).values({
        clientId: input.clientId,
        userId: ctx.user.id,
        date: input.date,
        description: input.description,
        amount: input.amount.toString(),
        type: input.type,
        category: input.category,
        vendor: input.vendor,
        notes: input.notes,
        humanReviewed: true,
      });
      return { success: true };
    }),

  // AI categorize a transaction description
  categorizeTransaction: protectedProcedure
    .input(z.object({ description: z.string(), amount: z.number(), vendor: z.string().optional() }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a bookkeeping AI. Categorize the transaction into one of these categories:
Income: Sales Revenue, Service Revenue, Interest Income, Other Income
Expenses: Advertising, Bank Fees, Computer & Software, Contractor, Dues & Subscriptions, Equipment, Insurance, Legal & Professional, Meals & Entertainment, Office Supplies, Payroll, Rent, Taxes, Travel, Utilities, Vehicle, Other Expense
Return JSON: {"category": "...", "subcategory": "...", "type": "income|expense", "confidence": 0.0-1.0}`
          },
          { role: "user", content: `Description: ${input.description}\nAmount: $${input.amount}\nVendor: ${input.vendor ?? "unknown"}` }
        ],
        responseFormat: { type: "json_object" }
      });
      try {
        return JSON.parse(response.choices[0]?.message?.content ?? "{}");
      } catch {
        return { category: "Other Expense", subcategory: "", type: "expense", confidence: 0.5 };
      }
    }),

  // Generate P&L summary
  getProfitLoss: protectedProcedure
    .input(z.object({ clientId: z.number(), year: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [client] = await db.select().from(accountingClients)
        .where(and(eq(accountingClients.id, input.clientId), eq(accountingClients.userId, ctx.user.id))).limit(1);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const year = input.year ?? new Date().getFullYear();
      const startTs = new Date(`${year}-01-01`).getTime();
      const endTs = new Date(`${year}-12-31T23:59:59`).getTime();

      const transactions = await db.select().from(financialTransactions)
        .where(and(
          eq(financialTransactions.clientId, input.clientId),
          sql`${financialTransactions.date} >= ${startTs}`,
          sql`${financialTransactions.date} <= ${endTs}`
        ));

      const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + parseFloat(t.amount as string), 0);
      const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount as string), 0);
      const netProfit = income - expenses;

      // Group by category
      const byCategory: Record<string, number> = {};
      for (const t of transactions) {
        const cat = t.category ?? "Uncategorized";
        byCategory[cat] = (byCategory[cat] ?? 0) + parseFloat(t.amount as string);
      }

      return { year, income, expenses, netProfit, byCategory, transactionCount: transactions.length };
    }),

  // Upload receipt and OCR it
  uploadReceipt: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      fileName: z.string(),
      fileBase64: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [client] = await db.select().from(accountingClients)
        .where(and(eq(accountingClients.id, input.clientId), eq(accountingClients.userId, ctx.user.id))).limit(1);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const buffer = Buffer.from(input.fileBase64, "base64");
      const key = `receipts/${ctx.user.id}/${input.clientId}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      // AI OCR: extract transaction details from the receipt image
      const ocrResponse = await openRouterChat({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a receipt OCR AI. Extract transaction details from the receipt image. Return JSON: {\"date\": \"YYYY-MM-DD\", \"vendor\": \"...\", \"amount\": 0.00, \"description\": \"...\", \"category\": \"...\"}"
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the transaction details from this receipt:" },
              { type: "image_url", image_url: { url, detail: "auto" } }
            ] as any
          }
        ],
        responseFormat: { type: "json_object" }
      });

      let extracted: any = {};
      try {
        extracted = JSON.parse(ocrResponse.choices[0]?.message?.content ?? "{}");
      } catch {}

      return { receiptUrl: url, receiptKey: key, extracted };
    }),

  // ── AI CFO Chat ─────────────────────────────────────────────────────────────

  cfoChat: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      message: z.string().min(1).max(2000),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [client] = await db.select().from(accountingClients)
        .where(and(eq(accountingClients.id, input.clientId), eq(accountingClients.userId, ctx.user.id))).limit(1);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      // Get recent financial context
      const recentTxns = await db.select().from(financialTransactions)
        .where(eq(financialTransactions.clientId, input.clientId))
        .orderBy(desc(financialTransactions.date)).limit(50);

      const income = recentTxns.filter(t => t.type === "income").reduce((s, t) => s + parseFloat(t.amount as string), 0);
      const expenses = recentTxns.filter(t => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount as string), 0);

      const systemPrompt = `You are an AI CFO for ${client.businessName}, a ${client.businessType} in the ${client.industry ?? "general"} industry.

Current financial snapshot (last 50 transactions):
- Total Income: $${income.toFixed(2)}
- Total Expenses: $${expenses.toFixed(2)}
- Net Profit: $${(income - expenses).toFixed(2)}

You provide strategic financial advice, cash flow analysis, tax planning, cost reduction strategies, and growth forecasting. Be specific, data-driven, and actionable. Always reference the actual numbers when relevant.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.history ?? []).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user" as const, content: input.message },
      ];

      const response = await openRouterChat({ model: "openai/gpt-4o", messages });
      const reply = response.choices[0]?.message?.content ?? "";

      // Save conversation
      const [existing] = await db.select().from(cfoConversations)
        .where(and(eq(cfoConversations.clientId, input.clientId), eq(cfoConversations.userId, ctx.user.id))).limit(1);

      const updatedMessages = [
        ...(input.history ?? []),
        { role: "user", content: input.message },
        { role: "assistant", content: reply },
      ];

      if (existing) {
        await db.update(cfoConversations)
          .set({ messages: updatedMessages, updatedAt: Date.now() })
          .where(eq(cfoConversations.id, existing.id));
      } else {
        await db.insert(cfoConversations).values({
          clientId: input.clientId,
          userId: ctx.user.id,
          messages: updatedMessages,
        });
      }

      return { reply };
    }),

  getCfoHistory: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [conv] = await db.select().from(cfoConversations)
        .where(and(eq(cfoConversations.clientId, input.clientId), eq(cfoConversations.userId, ctx.user.id))).limit(1);
      return conv?.messages ?? [];
    }),

  // ── Tax Services ────────────────────────────────────────────────────────────

  getTaxPricing: protectedProcedure.query(async () => {
    return {
      forms: [
        { id: "1040_single", label: "Form 1040 – Individual (Single)", price: 110, description: "Federal individual income tax return" },
        { id: "1040_mfj", label: "Form 1040 – Married Filing Jointly", price: 110, description: "Joint federal income tax return" },
        { id: "1040_mfs", label: "Form 1040 – Married Filing Separately", price: 110, description: "Separate federal income tax return" },
        { id: "1120", label: "Form 1120 – C Corporation", price: 220, description: "Corporate income tax return" },
        { id: "1120s", label: "Form 1120-S – S Corporation", price: 220, description: "S corporation income tax return" },
        { id: "1065", label: "Form 1065 – Partnership / LLC", price: 220, description: "Partnership income tax return" },
        { id: "1041", label: "Form 1041 – Estate or Trust", price: 220, description: "Estate and trust income tax return" },
        { id: "quarterly_corp", label: "Quarterly Estimates – Corporation", price: 40, description: "Per quarter estimated tax filing" },
        { id: "quarterly_llc", label: "Quarterly Estimates – LLC/Individual", price: 40, description: "Per quarter estimated tax filing" },
      ],
      addOns: [
        { id: "extra_schedule", label: "Additional Schedule", price: EXTRA_SCHEDULE_PRICE, description: "Per extra schedule (C, D, E, F, etc.)" },
        { id: "extra_state", label: "Additional State Return", price: EXTRA_STATE_PRICE, description: "Per additional state filing" },
      ],
    };
  }),

  createTaxOrder: protectedProcedure
    .input(z.object({
      formType: z.enum(["1040_single", "1040_mfj", "1040_mfs", "1120", "1120s", "1065", "1041", "quarterly_corp", "quarterly_llc"]),
      taxYear: z.number().min(2020).max(2030),
      state: z.string().optional(),
      extraSchedules: z.number().min(0).default(0),
      extraStates: z.number().min(0).default(0),
      clientId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const basePrice = TAX_PRICING[input.formType] ?? 110;
      const totalPrice = basePrice + (input.extraSchedules * EXTRA_SCHEDULE_PRICE) + (input.extraStates * EXTRA_STATE_PRICE);

      const [result] = await db.insert(taxOrders).values({
        userId: ctx.user.id,
        clientId: input.clientId,
        formType: input.formType as any,
        taxYear: input.taxYear,
        state: input.state,
        extraSchedules: input.extraSchedules,
        extraStates: input.extraStates,
        basePrice: basePrice.toString(),
        totalPrice: totalPrice.toString(),
        status: "pending",
        notes: input.notes,
      });

      // Create exception queue item for Indian team to pick up
      await db.insert(exceptionQueue).values({
        clientId: input.clientId ?? ctx.user.id,
        userId: ctx.user.id,
        type: "tax_question",
        priority: "medium",
        title: `New Tax Order: ${input.formType.toUpperCase()} for ${input.taxYear}`,
        description: `Tax order placed. Form: ${input.formType}, Year: ${input.taxYear}, Total: $${totalPrice}. Notes: ${input.notes ?? "None"}`,
        contextData: { taxOrderId: (result as any).insertId, formType: input.formType, taxYear: input.taxYear, totalPrice },
        status: "open",
      });

      return { id: (result as any).insertId, totalPrice };
    }),

  getMyTaxOrders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(taxOrders)
      .where(eq(taxOrders.userId, ctx.user.id))
      .orderBy(desc(taxOrders.createdAt));
  }),

  // AI tax question answering
  askTaxQuestion: protectedProcedure
    .input(z.object({
      question: z.string().min(1).max(2000),
      businessType: z.string().optional(),
      taxYear: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert US tax advisor AI. You help businesses and individuals understand their tax obligations, deductions, deadlines, and filing requirements. 
Business type: ${input.businessType ?? "general"}
Tax year: ${input.taxYear ?? new Date().getFullYear()}
Provide accurate, actionable tax guidance. Always recommend consulting a licensed CPA for final decisions. Reference specific IRS forms, publications, and deadlines when relevant.`
          },
          { role: "user", content: input.question }
        ]
      });
      return { answer: response.choices[0]?.message?.content ?? "" };
    }),
});
