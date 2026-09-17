import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { legalContracts } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

const CONTRACT_TEMPLATES: Record<string, string> = {
  nda: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of [DATE] between [PARTY_A] ("Disclosing Party") and [PARTY_B] ("Receiving Party").

1. CONFIDENTIAL INFORMATION. "Confidential Information" means any non-public information disclosed by Disclosing Party to Receiving Party, either directly or indirectly, in writing, orally or by inspection of tangible objects.

2. OBLIGATIONS. Receiving Party agrees to: (a) hold Confidential Information in strict confidence; (b) not disclose Confidential Information to any third party; (c) use Confidential Information solely for the purpose of evaluating a potential business relationship.

3. TERM. This Agreement shall remain in effect for [TERM] years from the date of execution.

4. GOVERNING LAW. This Agreement shall be governed by the laws of [STATE/JURISDICTION].

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

_________________________          _________________________
[PARTY_A]                          [PARTY_B]
Date: ___________________          Date: ___________________`,

  msa: `MASTER SERVICES AGREEMENT

This Master Services Agreement ("Agreement") is entered into as of [DATE] between [COMPANY] ("Service Provider") and [CLIENT] ("Client").

1. SERVICES. Service Provider shall provide the services described in one or more Statements of Work ("SOW") executed by the parties.

2. PAYMENT. Client shall pay Service Provider the fees set forth in each SOW within [PAYMENT_TERMS] days of invoice.

3. INTELLECTUAL PROPERTY. All work product created by Service Provider under this Agreement shall be owned by [IP_OWNER].

4. LIMITATION OF LIABILITY. In no event shall either party be liable for indirect, incidental, or consequential damages.

5. TERM AND TERMINATION. This Agreement shall commence on the Effective Date and continue until terminated by either party with [NOTICE_PERIOD] days written notice.

6. GOVERNING LAW. This Agreement shall be governed by the laws of [STATE/JURISDICTION].`,

  sow: `STATEMENT OF WORK

This Statement of Work ("SOW") is entered into pursuant to the Master Services Agreement between [COMPANY] and [CLIENT] dated [MSA_DATE].

PROJECT: [PROJECT_NAME]

SCOPE OF WORK:
[DESCRIBE_SCOPE]

DELIVERABLES:
[LIST_DELIVERABLES]

TIMELINE:
Start Date: [START_DATE]
End Date: [END_DATE]

FEES:
[FEE_STRUCTURE]

ACCEPTANCE CRITERIA:
[ACCEPTANCE_CRITERIA]`,
};

export const legalRouter = router({
  listContracts: protectedProcedure
    .input(z.object({ status: z.enum(["draft", "review", "signed", "expired", "all"]).default("all") }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(legalContracts)
        .where(eq(legalContracts.userId, ctx.user.id))
        .orderBy(desc(legalContracts.createdAt));
      return rows.filter(r => input.status === "all" || r.status === input.status);
    }),

  getContract: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [contract] = await db.select().from(legalContracts)
        .where(and(eq(legalContracts.id, input.id), eq(legalContracts.userId, ctx.user.id))).limit(1);
      if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
      return contract;
    }),

  createContract: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      type: z.enum(["nda", "msa", "sow", "employment", "contractor", "service", "custom"]).default("custom"),
      content: z.string().optional(),
      contactId: z.number().optional(),
      companyId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const templateContent = CONTRACT_TEMPLATES[input.type] ?? "";
      await db.insert(legalContracts).values({
        ...input,
        content: input.content ?? templateContent,
        userId: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }),

  updateContract: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      status: z.enum(["draft", "review", "signed", "expired"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(legalContracts).set({ ...data, updatedAt: Date.now() })
        .where(and(eq(legalContracts.id, id), eq(legalContracts.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteContract: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(legalContracts).where(and(eq(legalContracts.id, input.id), eq(legalContracts.userId, ctx.user.id)));
      return { success: true };
    }),

  // AI clause analysis
  analyzeClause: protectedProcedure
    .input(z.object({ clause: z.string().min(10) }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a legal AI assistant. Analyze the provided contract clause and identify: (1) potential risks, (2) missing protections, (3) suggested improvements. Be concise and practical."
          },
          { role: "user", content: `Analyze this contract clause:\n\n${input.clause}` }
        ],
      });
      return { analysis: (response.choices[0].message.content as string) ?? "" };
    }),

  // AI contract generation
  generateContract: protectedProcedure
    .input(z.object({
      type: z.string(),
      context: z.string().min(10),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a legal AI assistant. Generate a professional contract based on the type and context provided. Include all standard clauses for this type of agreement."
          },
          { role: "user", content: `Generate a ${input.type} contract for the following context:\n\n${input.context}` }
        ],
      });
      return { content: (response.choices[0].message.content as string) ?? "" };
    }),
});
