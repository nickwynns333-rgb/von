import Stripe from "stripe";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { PRODUCTS } from "../products";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-06-24.dahlia" as any,
});

const HFN_PLAN_IDS = ["hfn_starter", "hfn_pro"] as const;
const JF_PLAN_IDS = ["jf_starter", "jf_pro", "jf_seo_execution", "jf_geo_aeo", "jf_seo_bundle"] as const;

type HfnEligibility = {
  eligible: boolean;
  reason?: string;
  hfnMemberId?: string;
  vwAccountId?: number | null;
};

function rowsOf(result: unknown): any[] {
  return (Array.isArray((result as any)?.[0]) ? (result as any)[0] : result) as any[];
}

async function checkHfnOwnUseEligibility(userId: number): Promise<HfnEligibility> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const accountRows = rowsOf(await db.execute(sql`SELECT id, hfnMemberId FROM vw_accounts WHERE userId = ${userId} LIMIT 1`));
  const account = accountRows[0];
  if (!account?.hfnMemberId) {
    return { eligible: false, reason: "Add and verify your Humans First Member ID in the VON WORK qualification flow first." };
  }

  const cachedRows = rowsOf(await db.execute(sql`
    SELECT hfnStatus, expiresAt FROM upstream_status
    WHERE vwAccountId = ${account.id} AND hfnMemberId = ${account.hfnMemberId}
    ORDER BY checkedAt DESC LIMIT 1
  `));
  const cached = cachedRows[0];
  const cacheCurrent = cached?.expiresAt && new Date(cached.expiresAt).getTime() > Date.now();
  let isActive = cacheCurrent && cached.hfnStatus === "ACTIVE";

  if (!isActive && !cacheCurrent) {
    const configRows = rowsOf(await db.execute(sql`SELECT value FROM vw_config WHERE \`key\` = 'hfn_api_url' LIMIT 1`));
    const hfnApiUrl = configRows[0]?.value ?? "https://humansfirstnetwork.com/api/v1/membership/status";
    try {
      const response = await fetch(hfnApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HFN_API_KEY ?? ""}`,
        },
        body: JSON.stringify({ member_id: account.hfnMemberId }),
        signal: AbortSignal.timeout(8000),
      });
      const payload = response.ok ? await response.json() as { status?: string } : null;
      isActive = payload?.status === "ACTIVE";
      const hfnStatus = isActive ? "ACTIVE" : response.status === 404 ? "NOT_FOUND" : "INACTIVE";
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await db.execute(sql`
        INSERT INTO upstream_status (vwAccountId, hfnMemberId, hfnStatus, jfProofOfLoyalty, expiresAt, source)
        VALUES (${account.id}, ${account.hfnMemberId}, ${hfnStatus}, 'UNKNOWN', ${expiresAt}, 'ACTIVATION')
      `);
    } catch {
      return { eligible: false, reason: "Humans First status could not be verified safely. Please try again once the membership service is available." };
    }
  }

  if (!isActive) {
    return { eligible: false, reason: "An active Humans First membership is required for the protected own-use rate." };
  }

  return { eligible: true, hfnMemberId: account.hfnMemberId, vwAccountId: account.id };
}

async function recordHfnEntitlement(userId: number, eligibility: HfnEligibility, plan: string) {
  const db = await getDb();
  if (!db || !eligibility.hfnMemberId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const existing = rowsOf(await db.execute(sql`
    SELECT id FROM member_pricing_entitlements
    WHERE userId = ${userId} AND program = 'HFN' AND purpose = 'OWN_USE' AND sourceMemberId = ${eligibility.hfnMemberId}
    ORDER BY updatedAt DESC LIMIT 1
  `));
  const metadata = JSON.stringify({ plan, nonTransferable: true, ownUseOnly: true });
  if (existing[0]) {
    await db.execute(sql`
      UPDATE member_pricing_entitlements
      SET status = 'ACTIVE', discountPercent = 50, vwAccountId = ${eligibility.vwAccountId ?? null}, lastVerifiedAt = NOW(), metadata = ${metadata}
      WHERE id = ${existing[0].id}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO member_pricing_entitlements (userId, vwAccountId, program, sourceMemberId, purpose, discountPercent, status, lastVerifiedAt, metadata)
      VALUES (${userId}, ${eligibility.vwAccountId ?? null}, 'HFN', ${eligibility.hfnMemberId}, 'OWN_USE', 50, 'ACTIVE', NOW(), ${metadata})
    `);
  }
}

async function checkJoinForceEligibility(userId: number): Promise<HfnEligibility> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const accountRows = rowsOf(await db.execute(sql`SELECT id, hfnMemberId FROM vw_accounts WHERE userId = ${userId} LIMIT 1`));
  const account = accountRows[0];
  if (!account?.hfnMemberId) {
    return { eligible: false, reason: "Add your HFN Member ID and complete a VON WORK gate check first." };
  }
  const credentialRows = rowsOf(await db.execute(sql`
    SELECT hfnStatus, jfProofOfLoyalty, jfLevel, expiresAt FROM upstream_status
    WHERE vwAccountId = ${account.id} AND hfnMemberId = ${account.hfnMemberId}
    ORDER BY checkedAt DESC LIMIT 1
  `));
  const credential = credentialRows[0];
  if (!credential?.expiresAt || new Date(credential.expiresAt).getTime() <= Date.now()) {
    return { eligible: false, reason: "Your JoinForce credential check is stale. Refresh it from the VON WORK Qualification page before using the member rate." };
  }
  if (credential.hfnStatus !== "ACTIVE" || credential.jfProofOfLoyalty !== "VERIFIED" || !credential.jfLevel) {
    return { eligible: false, reason: "An active HFN membership and a verified JoinForce Proof of Loyalty credential are required for this rate." };
  }
  return { eligible: true, hfnMemberId: account.hfnMemberId, vwAccountId: account.id };
}

async function recordJoinForceEntitlement(userId: number, eligibility: HfnEligibility, plan: string) {
  const db = await getDb();
  if (!db || !eligibility.hfnMemberId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const product = PRODUCTS[plan];
  const publicEquivalent = plan === "jf_starter" ? 49900 : plan === "jf_pro" ? 99900 : plan === "jf_seo_bundle" ? 24900 : 14900;
  const discountPercent = Math.round((1 - product.priceInCents / publicEquivalent) * 100);
  const existing = rowsOf(await db.execute(sql`
    SELECT id FROM member_pricing_entitlements
    WHERE userId = ${userId} AND program = 'JOINFORCE' AND sourceMemberId = ${eligibility.hfnMemberId}
    ORDER BY updatedAt DESC LIMIT 1
  `));
  const metadata = JSON.stringify({ plan, joinForceVerified: true });
  if (existing[0]) {
    await db.execute(sql`
      UPDATE member_pricing_entitlements
      SET status = 'ACTIVE', discountPercent = ${discountPercent}, vwAccountId = ${eligibility.vwAccountId ?? null}, lastVerifiedAt = NOW(), metadata = ${metadata}
      WHERE id = ${existing[0].id}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO member_pricing_entitlements (userId, vwAccountId, program, sourceMemberId, purpose, discountPercent, status, lastVerifiedAt, metadata)
      VALUES (${userId}, ${eligibility.vwAccountId ?? null}, 'JOINFORCE', ${eligibility.hfnMemberId}, 'OWN_USE', ${discountPercent}, 'ACTIVE', NOW(), ${metadata})
    `);
  }
}

export const memberPricingRouter = router({
  getHfnOwnUseOffers: protectedProcedure.query(async ({ ctx }) => {
    const eligibility = await checkHfnOwnUseEligibility(ctx.user.id);
    const offers = HFN_PLAN_IDS.map((id) => PRODUCTS[id]);
    return { eligibility, offers: eligibility.eligible ? offers : [] };
  }),

  createHfnOwnUseCheckout: protectedProcedure
    .input(z.object({ plan: z.enum(HFN_PLAN_IDS), origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const eligibility = await checkHfnOwnUseEligibility(ctx.user.id);
      if (!eligibility.eligible || !eligibility.hfnMemberId) {
        throw new TRPCError({ code: "FORBIDDEN", message: eligibility.reason ?? "HFN eligibility is required." });
      }
      const product = PRODUCTS[input.plan];
      if (!product?.isHfnOwnUse || !product.ownUseOnly) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid HFN own-use plan." });
      }
      await recordHfnEntitlement(ctx.user.id, eligibility, input.plan);
      const origin = new URL(input.origin).origin;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: ctx.user.email ?? undefined,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: product.name, description: product.description },
            unit_amount: product.priceInCents,
            recurring: { interval: product.interval },
          },
          quantity: 1,
        }],
        metadata: {
          plan: input.plan,
          user_id: String(ctx.user.id),
          hfn_member_id: eligibility.hfnMemberId,
          entitlement_program: "HFN",
          entitlement_purpose: "OWN_USE",
          non_transferable: "true",
        },
        success_url: `${origin}/hfn-pricing?checkout=success`,
        cancel_url: `${origin}/hfn-pricing?checkout=cancelled`,
      });
      if (!session.url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Checkout session could not be created." });
      return { url: session.url };
    }),

  getJoinForceOffers: protectedProcedure.query(async ({ ctx }) => {
    const eligibility = await checkJoinForceEligibility(ctx.user.id);
    const offers = JF_PLAN_IDS.map((id) => PRODUCTS[id]);
    return { eligibility, offers: eligibility.eligible ? offers : [] };
  }),

  createJoinForceCheckout: protectedProcedure
    .input(z.object({ plan: z.enum(JF_PLAN_IDS), origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const eligibility = await checkJoinForceEligibility(ctx.user.id);
      if (!eligibility.eligible || !eligibility.hfnMemberId) {
        throw new TRPCError({ code: "FORBIDDEN", message: eligibility.reason ?? "JoinForce eligibility is required." });
      }
      const product = PRODUCTS[input.plan];
      if (!product?.isJoinForce) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid JoinForce member plan." });
      await recordJoinForceEntitlement(ctx.user.id, eligibility, input.plan);
      const origin = new URL(input.origin).origin;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: ctx.user.email ?? undefined,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: product.name, description: product.description },
            unit_amount: product.priceInCents,
            recurring: { interval: product.interval },
          },
          quantity: 1,
        }],
        metadata: {
          plan: input.plan,
          user_id: String(ctx.user.id),
          hfn_member_id: eligibility.hfnMemberId,
          entitlement_program: "JOINFORCE",
          joinforce_verified: "true",
        },
        success_url: `${origin}/joinforce-pricing?checkout=success`,
        cancel_url: `${origin}/joinforce-pricing?checkout=cancelled`,
      });
      if (!session.url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Checkout session could not be created." });
      return { url: session.url };
    }),
});
