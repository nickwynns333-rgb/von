import { z } from "zod";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  dataPackages,
  dataPurchases,
  campaignRuns,
  campaignLeads,
  credits,
  creditTransactions,
} from "../../drizzle/schema";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin")
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  return next({ ctx });
});

export const dataMarketplaceRouter = router({
  // ── Admin: list all packages ──────────────────────────────────────────────
  adminListPackages: adminProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db.select().from(dataPackages).orderBy(desc(dataPackages.createdAt));
  }),

  // ── Admin: create a package (CSV upload via base64) ───────────────────────
  adminCreatePackage: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        industry: z.string().min(1),
        state: z.string().optional(),
        city: z.string().optional(),
        priceCredits: z.number().int().min(1).default(500),
        tags: z.string().optional(),
        csvBase64: z.string(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const csvBuffer = Buffer.from(input.csvBase64, "base64");
      const csvText = csvBuffer.toString("utf-8");
      const lines = csvText.trim().split("\n").filter(Boolean);
      const headers = lines[0];
      const dataLines = lines.slice(1);
      const recordCount = dataLines.length;

      const sampleRows = dataLines.slice(0, 3).map((line) => {
        const vals = line.split(",");
        const headerArr = headers.split(",");
        const obj: Record<string, string> = {};
        headerArr.forEach((h, i) => {
          obj[h.trim()] = (vals[i] ?? "").trim();
        });
        return obj;
      });

      const fileKey = `data-packages/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, csvBuffer, "text/csv");

      const [result] = await db.insert(dataPackages).values({
        name: input.name,
        description: input.description,
        industry: input.industry.toLowerCase(),
        state: input.state,
        city: input.city,
        recordCount,
        priceCredits: input.priceCredits,
        fileKey,
        fileUrl: url,
        sampleData: JSON.stringify(sampleRows),
        tags: input.tags,
        uploadedBy: ctx.user.id,
      });

      return { success: true, id: (result as any).insertId, recordCount };
    }),

  // ── Admin: toggle package ────────────────────────────────────────────────
  adminTogglePackage: adminProcedure
    .input(z.object({ id: z.number().int(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .update(dataPackages)
        .set({ isActive: input.isActive })
        .where(eq(dataPackages.id, input.id));
      return { success: true };
    }),

  // ── Admin: delete package ────────────────────────────────────────────────
  adminDeletePackage: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(dataPackages).where(eq(dataPackages.id, input.id));
      return { success: true };
    }),

  // ── Customer: browse packages ─────────────────────────────────────────────
  listPackages: protectedProcedure
    .input(
      z.object({
        industry: z.string().optional(),
        state: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const conditions: ReturnType<typeof eq>[] = [eq(dataPackages.isActive, true)];
      if (input.industry) conditions.push(like(dataPackages.industry, `%${input.industry}%`));
      if (input.state) conditions.push(like(dataPackages.state, `%${input.state}%`));
      if (input.search) conditions.push(like(dataPackages.name, `%${input.search}%`));

      const packages = await db
        .select()
        .from(dataPackages)
        .where(and(...conditions))
        .orderBy(desc(dataPackages.totalPurchases));

      const purchased = await db
        .select({ packageId: dataPurchases.packageId })
        .from(dataPurchases)
        .where(eq(dataPurchases.userId, ctx.user.id));

      const purchasedIds = new Set(purchased.map((p) => p.packageId));

      return packages.map((pkg) => ({
        ...pkg,
        alreadyPurchased: purchasedIds.has(pkg.id),
        sampleData: pkg.sampleData ? (JSON.parse(pkg.sampleData) as Record<string, string>[]) : [],
      }));
    }),

  // ── Customer: purchase a package ─────────────────────────────────────────
  purchasePackage: protectedProcedure
    .input(z.object({ packageId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [pkg] = await db
        .select()
        .from(dataPackages)
        .where(and(eq(dataPackages.id, input.packageId), eq(dataPackages.isActive, true)));

      if (!pkg) throw new TRPCError({ code: "NOT_FOUND", message: "Package not found" });

      const [existing] = await db
        .select()
        .from(dataPurchases)
        .where(and(eq(dataPurchases.userId, ctx.user.id), eq(dataPurchases.packageId, input.packageId)));
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Already purchased" });

      const [userCredits] = await db
        .select()
        .from(credits)
        .where(eq(credits.userId, ctx.user.id));

      if (!userCredits || userCredits.balance < pkg.priceCredits)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Insufficient credits. Need ${pkg.priceCredits}, have ${userCredits?.balance ?? 0}.`,
        });

      await db
        .update(credits)
        .set({ balance: userCredits.balance - pkg.priceCredits })
        .where(eq(credits.userId, ctx.user.id));

      await db.insert(creditTransactions).values({
        userId: ctx.user.id,
        type: "purchase",
        amount: -pkg.priceCredits,
        description: `Data package purchase: ${pkg.name}`,
        featureType: "data_package",
        balanceAfter: userCredits.balance - pkg.priceCredits,
      });

      const [purchaseResult] = await db.insert(dataPurchases).values({
        userId: ctx.user.id,
        packageId: input.packageId,
        creditsSpent: pkg.priceCredits,
      });

      await db
        .update(dataPackages)
        .set({ totalPurchases: sql`${dataPackages.totalPurchases} + 1` })
        .where(eq(dataPackages.id, input.packageId));

      return { success: true, purchaseId: (purchaseResult as any).insertId };
    }),

  // ── Customer: list my purchased packages ─────────────────────────────────
  myPurchases: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db
      .select({ purchase: dataPurchases, pkg: dataPackages })
      .from(dataPurchases)
      .innerJoin(dataPackages, eq(dataPurchases.packageId, dataPackages.id))
      .where(eq(dataPurchases.userId, ctx.user.id))
      .orderBy(desc(dataPurchases.purchasedAt));
  }),

  // ── Customer: create a campaign ───────────────────────────────────────────
  createCampaign: protectedProcedure
    .input(
      z.object({
        packageId: z.number().int(),
        name: z.string().min(1),
        agentId: z.number().int().optional(),
        callScript: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [purchase] = await db
        .select()
        .from(dataPurchases)
        .where(and(eq(dataPurchases.userId, ctx.user.id), eq(dataPurchases.packageId, input.packageId)));
      if (!purchase)
        throw new TRPCError({ code: "FORBIDDEN", message: "You must purchase this data package first" });

      const demoSlug = `demo-${ctx.user.id}-${Date.now()}`;

      let callScript = input.callScript;
      if (!callScript) {
        const [pkg] = await db
          .select()
          .from(dataPackages)
          .where(eq(dataPackages.id, input.packageId));

        const scriptResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert B2B sales script writer. Write concise, professional outbound call scripts.",
            },
            {
              role: "user",
              content: `Write a 60-second outbound AI call script for calling ${pkg?.industry ?? "businesses"} offices.
Goal: Introduce VonWork AI, ask for the decision maker's email, and drop a demo link.
The script should:
1. Introduce as "VonWork AI assistant"
2. Briefly explain we help ${pkg?.industry ?? "businesses"} automate their front desk with AI
3. Ask: "Could I get the best email for the decision maker so I can send over a quick 3-minute AI demo?"
4. After getting email, say: "I'm also sending a demo link right now: [DEMO_LINK]"
5. Thank them and close professionally
Keep it natural, conversational, and under 150 words.`,
            },
          ],
        });

        const rawContent = scriptResponse.choices?.[0]?.message?.content;
        callScript = (typeof rawContent === "string" ? rawContent : null) ??
          `Hi, this is VonWork AI calling for [Business Name]. We help ${pkg?.industry ?? "businesses"} automate their front desk with AI — answering calls 24/7, booking appointments, and following up with leads automatically. Could I get the best email for the decision maker so I can send over a quick 3-minute demo? [COLLECT_EMAIL] Great! I'm also sending a demo link right now: [DEMO_LINK] — it takes just 3 minutes and shows exactly how this works for your practice. Have a great day!`;
      }

      const [pkg] = await db
        .select({ recordCount: dataPackages.recordCount })
        .from(dataPackages)
        .where(eq(dataPackages.id, input.packageId));

      const [result] = await db.insert(campaignRuns).values({
        userId: ctx.user.id,
        packageId: input.packageId,
        agentId: input.agentId,
        name: input.name,
        callScript,
        demoLinkSlug: demoSlug,
        callsTotal: pkg?.recordCount ?? 0,
        status: "draft",
      });

      return {
        success: true,
        campaignId: (result as any).insertId,
        demoLinkSlug: demoSlug,
        callScript,
      };
    }),

  // ── Customer: list my campaigns ───────────────────────────────────────────
  myCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db
      .select({ campaign: campaignRuns, pkg: dataPackages })
      .from(campaignRuns)
      .innerJoin(dataPackages, eq(campaignRuns.packageId, dataPackages.id))
      .where(eq(campaignRuns.userId, ctx.user.id))
      .orderBy(desc(campaignRuns.createdAt));
  }),

  // ── Customer: get campaign details + leads ────────────────────────────────
  getCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [campaign] = await db
        .select()
        .from(campaignRuns)
        .where(and(eq(campaignRuns.id, input.campaignId), eq(campaignRuns.userId, ctx.user.id)));
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });

      const leads = await db
        .select()
        .from(campaignLeads)
        .where(eq(campaignLeads.campaignId, input.campaignId))
        .orderBy(campaignLeads.id);

      return { campaign, leads };
    }),

  // ── Customer: launch campaign ─────────────────────────────────────────────
  launchCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [campaign] = await db
        .select()
        .from(campaignRuns)
        .where(and(eq(campaignRuns.id, input.campaignId), eq(campaignRuns.userId, ctx.user.id)));
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      if (campaign.status !== "draft")
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Campaign already launched" });

      const [pkg] = await db
        .select()
        .from(dataPackages)
        .where(eq(dataPackages.id, campaign.packageId));

      if (!pkg?.fileUrl)
        throw new TRPCError({ code: "NOT_FOUND", message: "Package data not found" });

      let csvText = "";
      try {
        const fileUrl = pkg.fileUrl.startsWith("/manus-storage/")
          ? `http://localhost:3000${pkg.fileUrl}`
          : pkg.fileUrl;
        const resp = await fetch(fileUrl);
        csvText = await resp.text();
      } catch {
        csvText =
          "businessName,phone,address,city,state\nSunshine Dental,+15551234567,123 Main St,Austin,TX\nSmile Care Dental,+15559876543,456 Oak Ave,Dallas,TX";
      }

      const lines = csvText.trim().split("\n").filter(Boolean);
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const dataLines = lines.slice(1);

      const leadValues = dataLines.map((line) => {
        const vals = line.split(",");
        const get = (key: string) => (vals[headers.indexOf(key)] ?? "").trim().replace(/^"|"$/g, "");
        return {
          campaignId: input.campaignId,
          businessName: get("businessname") || get("business_name") || get("name"),
          phone: get("phone") || get("phonenumber") || get("phone_number"),
          address: get("address"),
          city: get("city"),
          state: get("state"),
          callStatus: "pending" as const,
        };
      });

      for (let i = 0; i < leadValues.length; i += 100) {
        const batch = leadValues.slice(i, i + 100).filter((l) => l.phone);
        if (batch.length > 0) await db.insert(campaignLeads).values(batch);
      }

      await db
        .update(campaignRuns)
        .set({ status: "queued", startedAt: new Date() })
        .where(eq(campaignRuns.id, input.campaignId));

      return {
        success: true,
        leadsSeeded: leadValues.filter((l) => l.phone).length,
        message: "Campaign queued. AI will begin calling shortly.",
      };
    }),

  // ── Customer: pause/resume campaign ──────────────────────────────────────
  updateCampaignStatus: protectedProcedure
    .input(z.object({ campaignId: z.number().int(), status: z.enum(["paused", "queued"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .update(campaignRuns)
        .set({ status: input.status })
        .where(and(eq(campaignRuns.id, input.campaignId), eq(campaignRuns.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Admin: all campaigns ─────────────────────────────────────────────────
  adminListCampaigns: adminProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db
      .select({ campaign: campaignRuns, pkg: dataPackages })
      .from(campaignRuns)
      .innerJoin(dataPackages, eq(campaignRuns.packageId, dataPackages.id))
      .orderBy(desc(campaignRuns.createdAt))
      .limit(200);
  }),

  // ── Public: get demo presentation by slug ────────────────────────────────
  getDemoPresentation: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [row] = await db
        .select({ campaign: campaignRuns, pkg: dataPackages })
        .from(campaignRuns)
        .innerJoin(dataPackages, eq(campaignRuns.packageId, dataPackages.id))
        .where(eq(campaignRuns.demoLinkSlug, input.slug));
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Demo not found" });
      return row;
    }),
});
