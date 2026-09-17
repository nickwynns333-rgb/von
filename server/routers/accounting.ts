import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  invoices,
  invoiceLineItems,
  bills,
  vendors,
  bankAccounts,
  bankTransactions,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql, or } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ─── Chart of Accounts ────────────────────────────────────────────────────────

const DEFAULT_COA = [
  // Assets
  { accountNumber: "1000", name: "Cash and Cash Equivalents", type: "asset" as const, subtype: "current_asset" },
  { accountNumber: "1100", name: "Accounts Receivable", type: "asset" as const, subtype: "current_asset" },
  { accountNumber: "1200", name: "Inventory", type: "asset" as const, subtype: "current_asset" },
  { accountNumber: "1500", name: "Property & Equipment", type: "asset" as const, subtype: "fixed_asset" },
  // Liabilities
  { accountNumber: "2000", name: "Accounts Payable", type: "liability" as const, subtype: "current_liability" },
  { accountNumber: "2100", name: "Credit Cards Payable", type: "liability" as const, subtype: "current_liability" },
  { accountNumber: "2200", name: "Payroll Liabilities", type: "liability" as const, subtype: "current_liability" },
  { accountNumber: "2500", name: "Long-Term Debt", type: "liability" as const, subtype: "long_term_liability" },
  // Equity
  { accountNumber: "3000", name: "Owner's Equity", type: "equity" as const, subtype: "equity" },
  { accountNumber: "3100", name: "Retained Earnings", type: "equity" as const, subtype: "equity" },
  // Revenue
  { accountNumber: "4000", name: "Sales Revenue", type: "revenue" as const, subtype: "operating_revenue" },
  { accountNumber: "4100", name: "Service Revenue", type: "revenue" as const, subtype: "operating_revenue" },
  { accountNumber: "4200", name: "Other Income", type: "revenue" as const, subtype: "other_income" },
  // Expenses
  { accountNumber: "5000", name: "Cost of Goods Sold", type: "expense" as const, subtype: "cogs" },
  { accountNumber: "6000", name: "Salaries & Wages", type: "expense" as const, subtype: "operating_expense" },
  { accountNumber: "6100", name: "Rent & Utilities", type: "expense" as const, subtype: "operating_expense" },
  { accountNumber: "6200", name: "Marketing & Advertising", type: "expense" as const, subtype: "operating_expense" },
  { accountNumber: "6300", name: "Software & Subscriptions", type: "expense" as const, subtype: "operating_expense" },
  { accountNumber: "6400", name: "Professional Services", type: "expense" as const, subtype: "operating_expense" },
  { accountNumber: "6500", name: "Travel & Entertainment", type: "expense" as const, subtype: "operating_expense" },
  { accountNumber: "6600", name: "Office Supplies", type: "expense" as const, subtype: "operating_expense" },
  { accountNumber: "6700", name: "Depreciation", type: "expense" as const, subtype: "operating_expense" },
  { accountNumber: "6900", name: "Miscellaneous Expense", type: "expense" as const, subtype: "operating_expense" },
];

export const accountingRouter = router({
  // ─── Chart of Accounts ──────────────────────────────────────────────────────
  getChartOfAccounts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const accounts = await db.select().from(chartOfAccounts)
      .where(eq(chartOfAccounts.userId, ctx.user.id))
      .orderBy(chartOfAccounts.accountNumber);
    return accounts;
  }),

  seedDefaultCOA: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const existing = await db.select({ id: chartOfAccounts.id }).from(chartOfAccounts)
      .where(eq(chartOfAccounts.userId, ctx.user.id)).limit(1);
    if (existing.length > 0) return { seeded: false, message: "Chart of accounts already exists" };
    const now = Date.now();
    await db.insert(chartOfAccounts).values(
      DEFAULT_COA.map(a => ({ ...a, userId: ctx.user.id, createdAt: now, updatedAt: now }))
    );
    return { seeded: true, count: DEFAULT_COA.length };
  }),

  createAccount: protectedProcedure
    .input(z.object({
      accountNumber: z.string().min(1),
      name: z.string().min(1),
      type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
      subtype: z.string().optional(),
      description: z.string().optional(),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const [result] = await db.insert(chartOfAccounts).values({
        ...input, userId: ctx.user.id, createdAt: now, updatedAt: now,
      });
      return { id: (result as any).insertId };
    }),

  updateAccount: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...fields } = input;
      await db.update(chartOfAccounts).set({ ...fields, updatedAt: Date.now() })
        .where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.userId, ctx.user.id)));
      return { success: true };
    }),

  // ─── Invoices (Accounts Receivable) ─────────────────────────────────────────
  listInvoices: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      from: z.number().optional(),
      to: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(invoices)
        .where(eq(invoices.userId, ctx.user.id))
        .orderBy(desc(invoices.issueDate));
      return rows.filter(r => {
        if (input.status && r.status !== input.status) return false;
        if (input.from && r.issueDate < input.from) return false;
        if (input.to && r.issueDate > input.to) return false;
        return true;
      });
    }),

  getInvoice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [inv] = await db.select().from(invoices)
        .where(and(eq(invoices.id, input.id), eq(invoices.userId, ctx.user.id))).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
      const lines = await db.select().from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, input.id));
      return { ...inv, lineItems: lines };
    }),

  createInvoice: protectedProcedure
    .input(z.object({
      clientName: z.string().min(1),
      clientEmail: z.string().email().optional(),
      clientAddress: z.string().optional(),
      issueDate: z.number(),
      dueDate: z.number(),
      taxRate: z.number().min(0).max(100).default(0),
      discountAmount: z.number().min(0).default(0),
      currency: z.string().default("USD"),
      notes: z.string().optional(),
      terms: z.string().optional(),
      lineItems: z.array(z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
        taxable: z.boolean().default(true),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      // Generate invoice number
      const count = await db.select({ c: sql<number>`COUNT(*)` }).from(invoices)
        .where(eq(invoices.userId, ctx.user.id));
      const invoiceNumber = `INV-${String((count[0]?.c ?? 0) + 1).padStart(4, "0")}`;
      // Calculate totals
      const subtotal = input.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
      const taxAmount = (subtotal * input.taxRate) / 100;
      const total = subtotal + taxAmount - input.discountAmount;
      const [result] = await db.insert(invoices).values({
        userId: ctx.user.id,
        invoiceNumber,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientAddress: input.clientAddress,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        taxRate: String(input.taxRate),
        taxAmount: String(taxAmount),
        discountAmount: String(input.discountAmount),
        subtotal: String(subtotal),
        total: String(total),
        currency: input.currency,
        notes: input.notes,
        terms: input.terms,
        createdAt: now,
        updatedAt: now,
      });
      const invoiceId = (result as any).insertId;
      // Insert line items
      await db.insert(invoiceLineItems).values(
        input.lineItems.map(l => ({
          invoiceId,
          description: l.description,
          quantity: String(l.quantity),
          unitPrice: String(l.unitPrice),
          amount: String(l.quantity * l.unitPrice),
          taxable: l.taxable,
          createdAt: now,
        }))
      );
      return { id: invoiceId, invoiceNumber, total };
    }),

  updateInvoiceStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "sent", "viewed", "partial", "paid", "overdue", "voided"]),
      amountPaid: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.update(invoices).set({
        status: input.status,
        ...(input.amountPaid !== undefined ? { amountPaid: String(input.amountPaid) } : {}),
        ...(input.status === "paid" ? { paidAt: now } : {}),
        ...(input.status === "sent" ? { sentAt: now } : {}),
        updatedAt: now,
      }).where(and(eq(invoices.id, input.id), eq(invoices.userId, ctx.user.id)));
      return { success: true };
    }),

  // ─── Bills (Accounts Payable) ────────────────────────────────────────────────
  listBills: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(bills)
        .where(eq(bills.userId, ctx.user.id))
        .orderBy(desc(bills.dueDate));
      return rows.filter(r => !input.status || r.status === input.status);
    }),

  createBill: protectedProcedure
    .input(z.object({
      vendorName: z.string().min(1),
      vendorEmail: z.string().email().optional(),
      issueDate: z.number(),
      dueDate: z.number(),
      subtotal: z.number().positive(),
      taxAmount: z.number().min(0).default(0),
      currency: z.string().default("USD"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const count = await db.select({ c: sql<number>`COUNT(*)` }).from(bills)
        .where(eq(bills.userId, ctx.user.id));
      const billNumber = `BILL-${String((count[0]?.c ?? 0) + 1).padStart(4, "0")}`;
      const total = input.subtotal + input.taxAmount;
      const [result] = await db.insert(bills).values({
        userId: ctx.user.id,
        billNumber,
        vendorName: input.vendorName,
        vendorEmail: input.vendorEmail,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        subtotal: String(input.subtotal),
        taxAmount: String(input.taxAmount),
        total: String(total),
        currency: input.currency,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      });
      return { id: (result as any).insertId, billNumber, total };
    }),

  updateBillStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "received", "approved", "partial", "paid", "overdue", "voided"]),
      amountPaid: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.update(bills).set({
        status: input.status,
        ...(input.amountPaid !== undefined ? { amountPaid: String(input.amountPaid) } : {}),
        ...(input.status === "paid" ? { paidAt: now } : {}),
        updatedAt: now,
      }).where(and(eq(bills.id, input.id), eq(bills.userId, ctx.user.id)));
      return { success: true };
    }),

  // ─── Vendors ─────────────────────────────────────────────────────────────────
  listVendors: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(vendors).where(eq(vendors.userId, ctx.user.id)).orderBy(vendors.name);
  }),

  createVendor: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      taxId: z.string().optional(),
      paymentTerms: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const [result] = await db.insert(vendors).values({ ...input, userId: ctx.user.id, createdAt: now, updatedAt: now });
      return { id: (result as any).insertId };
    }),

  // ─── Bank Accounts ───────────────────────────────────────────────────────────
  listBankAccounts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(bankAccounts)
      .where(and(eq(bankAccounts.userId, ctx.user.id), eq(bankAccounts.isActive, true)));
  }),

  createBankAccount: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      type: z.enum(["checking", "savings", "credit_card", "loan", "investment"]).default("checking"),
      currency: z.string().default("USD"),
      currentBalance: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const [result] = await db.insert(bankAccounts).values({
        ...input,
        currentBalance: String(input.currentBalance),
        userId: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      return { id: (result as any).insertId };
    }),

  // ─── Bank Transactions (Reconciliation) ─────────────────────────────────────
  listBankTransactions: protectedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(bankTransactions)
        .where(and(
          eq(bankTransactions.userId, ctx.user.id),
          eq(bankTransactions.bankAccountId, input.bankAccountId)
        ))
        .orderBy(desc(bankTransactions.date));
      return rows.filter(r => !input.status || r.status === input.status);
    }),

  importBankTransactions: protectedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      transactions: z.array(z.object({
        date: z.number(),
        description: z.string(),
        amount: z.number(),
        type: z.enum(["debit", "credit"]),
        reference: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.insert(bankTransactions).values(
        input.transactions.map(t => ({
          userId: ctx.user.id,
          bankAccountId: input.bankAccountId,
          date: t.date,
          description: t.description,
          amount: String(t.amount),
          type: t.type,
          reference: t.reference,
          createdAt: now,
        }))
      );
      return { imported: input.transactions.length };
    }),

  reconcileTransaction: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["matched", "reconciled", "excluded"]),
      matchedInvoiceId: z.number().optional(),
      matchedBillId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...fields } = input;
      await db.update(bankTransactions).set(fields)
        .where(and(eq(bankTransactions.id, id), eq(bankTransactions.userId, ctx.user.id)));
      return { success: true };
    }),

  // ─── Financial Reports ───────────────────────────────────────────────────────
  getBalanceSheet: protectedProcedure
    .input(z.object({ asOf: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const accounts = await db.select().from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.userId, ctx.user.id), eq(chartOfAccounts.isActive, true)))
        .orderBy(chartOfAccounts.accountNumber);
      // AR total from invoices
      const arRows = await db.select({ total: sql<string>`SUM(total - amount_paid)` }).from(invoices)
        .where(and(eq(invoices.userId, ctx.user.id), sql`status NOT IN ('voided','paid')`));
      const arTotal = parseFloat(arRows[0]?.total ?? "0");
      // AP total from bills
      const apRows = await db.select({ total: sql<string>`SUM(total - amount_paid)` }).from(bills)
        .where(and(eq(bills.userId, ctx.user.id), sql`status NOT IN ('voided','paid')`));
      const apTotal = parseFloat(apRows[0]?.total ?? "0");
      const assets = accounts.filter(a => a.type === "asset");
      const liabilities = accounts.filter(a => a.type === "liability");
      const equity = accounts.filter(a => a.type === "equity");
      return { assets, liabilities, equity, arTotal, apTotal };
    }),

  getIncomeStatement: protectedProcedure
    .input(z.object({ from: z.number(), to: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Revenue from paid invoices in period
      const revenueRows = await db.select({ total: sql<string>`SUM(total)` }).from(invoices)
        .where(and(
          eq(invoices.userId, ctx.user.id),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, input.from),
          lte(invoices.paidAt, input.to)
        ));
      const revenue = parseFloat(revenueRows[0]?.total ?? "0");
      // Expenses from paid bills in period
      const expenseRows = await db.select({ total: sql<string>`SUM(total)` }).from(bills)
        .where(and(
          eq(bills.userId, ctx.user.id),
          eq(bills.status, "paid"),
          gte(bills.paidAt, input.from),
          lte(bills.paidAt, input.to)
        ));
      const expenses = parseFloat(expenseRows[0]?.total ?? "0");
      const netIncome = revenue - expenses;
      const accounts = await db.select().from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.userId, ctx.user.id), eq(chartOfAccounts.isActive, true)));
      const revenueAccounts = accounts.filter(a => a.type === "revenue");
      const expenseAccounts = accounts.filter(a => a.type === "expense");
      return { revenue, expenses, netIncome, revenueAccounts, expenseAccounts };
    }),

  getARAgingSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const now = Date.now();
    const rows = await db.select().from(invoices)
      .where(and(eq(invoices.userId, ctx.user.id), sql`status NOT IN ('paid','voided','draft')`));
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    for (const inv of rows) {
      const daysOverdue = Math.max(0, Math.floor((now - inv.dueDate) / 86400000));
      const outstanding = parseFloat(inv.total ?? "0") - parseFloat(inv.amountPaid ?? "0");
      if (daysOverdue <= 0) buckets.current += outstanding;
      else if (daysOverdue <= 30) buckets.days30 += outstanding;
      else if (daysOverdue <= 60) buckets.days60 += outstanding;
      else if (daysOverdue <= 90) buckets.days90 += outstanding;
      else buckets.over90 += outstanding;
    }
    return { buckets, invoices: rows };
  }),

  getAPAgingSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const now = Date.now();
    const rows = await db.select().from(bills)
      .where(and(eq(bills.userId, ctx.user.id), sql`status NOT IN ('paid','voided','draft')`));
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    for (const bill of rows) {
      const daysOverdue = Math.max(0, Math.floor((now - bill.dueDate) / 86400000));
      const outstanding = parseFloat(bill.total ?? "0") - parseFloat(bill.amountPaid ?? "0");
      if (daysOverdue <= 0) buckets.current += outstanding;
      else if (daysOverdue <= 30) buckets.days30 += outstanding;
      else if (daysOverdue <= 60) buckets.days60 += outstanding;
      else if (daysOverdue <= 90) buckets.days90 += outstanding;
      else buckets.over90 += outstanding;
    }
    return { buckets, bills: rows };
  }),

  // ─── AI Accounting Assistant ─────────────────────────────────────────────────
  askAccountingAI: protectedProcedure
    .input(z.object({ question: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Gather context
      const invCount = await db.select({ c: sql<number>`COUNT(*)`, total: sql<string>`SUM(total)` })
        .from(invoices).where(eq(invoices.userId, ctx.user.id));
      const billCount = await db.select({ c: sql<number>`COUNT(*)`, total: sql<string>`SUM(total)` })
        .from(bills).where(eq(bills.userId, ctx.user.id));
      const context = `User has ${invCount[0]?.c ?? 0} invoices totaling $${invCount[0]?.total ?? 0} and ${billCount[0]?.c ?? 0} bills totaling $${billCount[0]?.total ?? 0}.`;
      const res = await invokeLLM({
        messages: [
          { role: "system", content: `You are an expert accountant and CFO assistant. ${context} Answer accounting questions clearly and professionally. Provide actionable advice.` },
          { role: "user", content: input.question },
        ],
      });
      return { answer: res.choices[0].message.content as string };
    }),
});
