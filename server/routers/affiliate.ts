import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  partners, referrals, commissions, payoutRequests,
  partnerLevels, commissionPlans, marketingAssets,
  fraudFlags, users,
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  calculateCommission,
  checkFraud,
  getPartnerLevel,
  getNextLevel,
  getEligibleAt,
  PARTNER_LEVELS,
} from "../commissionEngine";
import { nanoid } from "nanoid";

// ─── Helper: generate unique referral code ────────────────────────────────────
function generateReferralCode(name: string): string {
  const base = name.replace(/\s+/g, "").toUpperCase().slice(0, 6);
  const suffix = nanoid(4).toUpperCase();
  return `${base}${suffix}`;
}

export const affiliateRouter = router({
  // ─── Registration ───────────────────────────────────────────────────────────
  register: protectedProcedure
    .input(z.object({
      type: z.enum(["affiliate", "reseller", "agency"]).default("affiliate"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Check if already a partner
      const existing = await db.select().from(partners).where(eq(partners.userId, ctx.user.id)).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Already registered as a partner" });

      const referralCode = generateReferralCode(ctx.user.name ?? "VW");

      await db.insert(partners).values({
        userId: ctx.user.id,
        type: input.type,
        referralCode,
        status: "pending",
      });

      return { referralCode, message: "Partner application submitted for review" };
    }),

  // ─── Get my partner profile ─────────────────────────────────────────────────
  me: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(partners).where(eq(partners.userId, ctx.user.id)).limit(1);
    if (!result.length) return null;

    const partner = result[0];
    const level = PARTNER_LEVELS.find((l) => l.name === "bronze"); // default
    const nextLevel = getNextLevel("bronze");

    return { ...partner, levelInfo: level, nextLevel };
  }),

  // ─── Get referral stats ─────────────────────────────────────────────────────
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const partnerResult = await db.select().from(partners).where(eq(partners.userId, ctx.user.id)).limit(1);
    if (!partnerResult.length) return null;

    const partner = partnerResult[0];

    // Get commission totals
    const commissionTotals = await db
      .select({
        status: commissions.status,
        total: sql<string>`SUM(${commissions.amount})`,
        credits: sql<number>`SUM(${commissions.creditAmount})`,
      })
      .from(commissions)
      .where(eq(commissions.partnerId, partner.id))
      .groupBy(commissions.status);

    const pending = commissionTotals.find((c) => c.status === "pending");
    const approved = commissionTotals.find((c) => c.status === "approved");
    const paid = commissionTotals.find((c) => c.status === "paid");

    return {
      totalClicks: partner.totalClicks,
      totalSignups: partner.totalSignups,
      totalActiveCustomers: partner.totalActiveCustomers,
      totalMrrGenerated: partner.totalMrrGenerated,
      pendingCommissions: parseFloat(pending?.total ?? "0"),
      approvedCommissions: parseFloat(approved?.total ?? "0"),
      paidCommissions: parseFloat(paid?.total ?? "0"),
      creditEarnings: (pending?.credits ?? 0) + (approved?.credits ?? 0),
      referralCode: partner.referralCode,
    };
  }),

  // ─── Get commission history ─────────────────────────────────────────────────
  commissions: protectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const partnerResult = await db.select().from(partners).where(eq(partners.userId, ctx.user.id)).limit(1);
      if (!partnerResult.length) return [];

      return db
        .select()
        .from(commissions)
        .where(eq(commissions.partnerId, partnerResult[0].id))
        .orderBy(desc(commissions.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // ─── Request payout ─────────────────────────────────────────────────────────
  requestPayout: protectedProcedure
    .input(z.object({
      amount: z.number().min(10),
      method: z.enum(["stripe_connect", "paypal", "wise", "ach", "bitcoin", "usdt", "manual"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const partnerResult = await db.select().from(partners).where(eq(partners.userId, ctx.user.id)).limit(1);
      if (!partnerResult.length) throw new TRPCError({ code: "NOT_FOUND", message: "Not a partner" });

      const partner = partnerResult[0];
      if (partner.status !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Partner account not active" });

      await db.insert(payoutRequests).values({
        partnerId: partner.id,
        amount: String(input.amount),
        method: input.method,
        status: "pending",
      });

      return { success: true, message: "Payout request submitted" };
    }),

  // ─── Get payout history ─────────────────────────────────────────────────────
  payouts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const partnerResult = await db.select().from(partners).where(eq(partners.userId, ctx.user.id)).limit(1);
    if (!partnerResult.length) return [];

    return db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.partnerId, partnerResult[0].id))
      .orderBy(desc(payoutRequests.requestedAt));
  }),

  // ─── Get marketing assets ───────────────────────────────────────────────────
  marketingAssets: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(marketingAssets).where(eq(marketingAssets.isActive, true)).orderBy(marketingAssets.type);
  }),

  // ─── Track referral click (public) ─────────────────────────────────────────
  trackClick: publicProcedure
    .input(z.object({
      referralCode: z.string(),
      landingPage: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { tracked: false };

      const partnerResult = await db.select().from(partners).where(eq(partners.referralCode, input.referralCode)).limit(1);
      if (!partnerResult.length) return { tracked: false };

      const partner = partnerResult[0];

      // Insert referral click
      await db.insert(referrals).values({
        partnerId: partner.id,
        referralCode: input.referralCode,
        attribution: "last_click",
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        landingPage: input.landingPage,
        status: "clicked",
      });

      // Increment click counter
      await db
        .update(partners)
        .set({ totalClicks: sql`${partners.totalClicks} + 1` })
        .where(eq(partners.id, partner.id));

      return { tracked: true };
    }),

  // ─── Leaderboard (top affiliates by MRR) ───────────────────────────────────
  leaderboard: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const results = await db
      .select({
        id: partners.id,
        totalMrrGenerated: partners.totalMrrGenerated,
        totalActiveCustomers: partners.totalActiveCustomers,
        totalCommissionsEarned: partners.totalCommissionsEarned,
        userName: users.name,
      })
      .from(partners)
      .leftJoin(users, eq(partners.userId, users.id))
      .where(eq(partners.status, "active"))
      .orderBy(desc(partners.totalMrrGenerated))
      .limit(10);

    return results.map((r, i) => ({
      rank: i + 1,
      name: r.userName ?? "Anonymous",
      mrr: parseFloat(String(r.totalMrrGenerated ?? 0)),
      customers: r.totalActiveCustomers,
      earned: parseFloat(String(r.totalCommissionsEarned ?? 0)),
    }));
  }),

  // ─── Admin: list all partners ───────────────────────────────────────────────
  adminListPartners: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return [];

    return db
      .select({
        id: partners.id,
        type: partners.type,
        status: partners.status,
        referralCode: partners.referralCode,
        totalMrrGenerated: partners.totalMrrGenerated,
        totalActiveCustomers: partners.totalActiveCustomers,
        totalCommissionsEarned: partners.totalCommissionsEarned,
        totalCommissionsPaid: partners.totalCommissionsPaid,
        isFraudFlagged: partners.isFraudFlagged,
        createdAt: partners.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(partners)
      .leftJoin(users, eq(partners.userId, users.id))
      .orderBy(desc(partners.createdAt));
  }),

  // ─── Admin: approve/suspend partner ────────────────────────────────────────
  adminUpdatePartnerStatus: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      status: z.enum(["pending", "active", "suspended", "banned"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(partners)
        .set({
          status: input.status,
          approvedAt: input.status === "active" ? new Date() : undefined,
        })
        .where(eq(partners.id, input.partnerId));

      return { success: true };
    }),

  // ─── Admin: list pending payouts ────────────────────────────────────────────
  adminListPayouts: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return [];

    return db
      .select({
        id: payoutRequests.id,
        amount: payoutRequests.amount,
        method: payoutRequests.method,
        status: payoutRequests.status,
        requestedAt: payoutRequests.requestedAt,
        partnerId: payoutRequests.partnerId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(payoutRequests)
      .leftJoin(partners, eq(payoutRequests.partnerId, partners.id))
      .leftJoin(users, eq(partners.userId, users.id))
      .orderBy(desc(payoutRequests.requestedAt));
  }),

  // ─── Admin: approve/reject payout (with optional Stripe Connect auto-disburse) ─
  adminProcessPayout: protectedProcedure
    .input(z.object({
      payoutId: z.number(),
      status: z.enum(["paid", "rejected"]),
      adminNotes: z.string().optional(),
      transactionRef: z.string().optional(),
      stripeConnectAccountId: z.string().optional(), // e.g. acct_xxxx for auto-transfer
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Fetch the payout request
      const [payout] = await db.select().from(payoutRequests).where(eq(payoutRequests.id, input.payoutId)).limit(1);
      if (!payout) throw new TRPCError({ code: "NOT_FOUND", message: "Payout request not found" });

      let stripeTransferId: string | undefined;

      // Auto-disburse via Stripe Connect transfer if account ID provided
      if (input.status === "paid" && input.stripeConnectAccountId) {
        try {
          const StripeLib = (await import("stripe")).default;
          const stripe = new StripeLib(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" });
          const amountCents = Math.round(parseFloat(payout.amount) * 100);
          const transfer = await stripe.transfers.create({
            amount: amountCents,
            currency: "usd",
            destination: input.stripeConnectAccountId,
            description: `VonWork affiliate payout #${payout.id}`,
            metadata: {
              payout_id: String(payout.id),
              partner_id: String(payout.partnerId),
            },
          });
          stripeTransferId = transfer.id;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Stripe transfer failed";
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Stripe payout failed: ${msg}` });
        }
      }

      await db
        .update(payoutRequests)
        .set({
          status: input.status,
          adminNotes: input.adminNotes,
          transactionRef: stripeTransferId ?? input.transactionRef,
          stripeTransferId: stripeTransferId ?? payout.stripeTransferId ?? undefined,
          processedAt: new Date(),
        })
        .where(eq(payoutRequests.id, input.payoutId));

      return { success: true, stripeTransferId };
    }),

  // ─── Admin: list fraud flags ────────────────────────────────────────────────
  adminFraudFlags: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(fraudFlags)
      .where(eq(fraudFlags.isResolved, false))
      .orderBy(desc(fraudFlags.flaggedAt));
  }),

  // ─── Admin: resolve fraud flag ──────────────────────────────────────────────
  adminResolveFraudFlag: protectedProcedure
    .input(z.object({ flagId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(fraudFlags)
        .set({ isResolved: true, resolvedBy: ctx.user.id, resolvedAt: new Date() })
        .where(eq(fraudFlags.id, input.flagId));

      return { success: true };
    }),

  // ─── Admin: list commission plans ──────────────────────────────────────────
  adminListCommissionPlans: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return [];
    return db.select().from(commissionPlans).orderBy(commissionPlans.isDefault);
  }),

  // ─── Admin: create commission plan ─────────────────────────────────────────
  adminCreateCommissionPlan: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(["percentage", "fixed", "percentage_bonus", "tiered", "recurring", "one_time", "credit_reward", "hybrid"]),
      rate: z.number().optional(),
      fixedAmount: z.number().optional(),
      creditReward: z.number().optional(),
      isRecurring: z.boolean().optional(),
      recurringMonths: z.number().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(commissionPlans).values({
        name: input.name,
        type: input.type,
        rate: input.rate ? String(input.rate) : "0",
        fixedAmount: input.fixedAmount ? String(input.fixedAmount) : "0",
        creditReward: input.creditReward ?? 0,
        isRecurring: input.isRecurring ?? false,
        recurringMonths: input.recurringMonths ?? 0,
        isDefault: input.isDefault ?? false,
      });

      return { success: true };
    }),

  // ─── Admin: upload marketing asset ─────────────────────────────────────────
  adminCreateMarketingAsset: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(["banner", "logo", "email_template", "social_graphic", "presentation", "video", "case_study", "sales_script", "other"]),
      url: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(marketingAssets).values(input);
      return { success: true };
    }),
});
