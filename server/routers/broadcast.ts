import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { broadcastCampaigns, broadcastRecipients } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { sendSms, sendWhatsApp, initiateOutboundCall } from "../telnyx";
import { phoneNumbers } from "../../drizzle/schema";

export const broadcastRouter = router({
  // ─── Campaigns ───────────────────────────────────────────────────────────────
  listCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(broadcastCampaigns)
      .where(eq(broadcastCampaigns.userId, ctx.user.id))
      .orderBy(desc(broadcastCampaigns.createdAt));
  }),

  createCampaign: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(["sms", "whatsapp", "voice"]),
      message: z.string().optional(),
      voiceScript: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const [result] = await db.insert(broadcastCampaigns).values({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        message: input.message,
        voiceScript: input.voiceScript,
        createdAt: now,
        updatedAt: now,
      });
      return { id: (result as any).insertId };
    }),

  // ─── Recipients (CSV import) ─────────────────────────────────────────────────
  importRecipients: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      recipients: z.array(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
      })).min(1).max(10000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verify campaign ownership
      const [campaign] = await db.select().from(broadcastCampaigns)
        .where(and(eq(broadcastCampaigns.id, input.campaignId), eq(broadcastCampaigns.userId, ctx.user.id))).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      const now = Date.now();
      // Insert in batches of 500
      const batchSize = 500;
      let inserted = 0;
      for (let i = 0; i < input.recipients.length; i += batchSize) {
        const batch = input.recipients.slice(i, i + batchSize);
        await db.insert(broadcastRecipients).values(
          batch.map(r => ({
            campaignId: input.campaignId,
            userId: ctx.user.id,
            name: r.name,
            phone: r.phone,
            email: r.email,
            createdAt: now,
          }))
        );
        inserted += batch.length;
      }
      // Update campaign total
      await db.update(broadcastCampaigns).set({
        totalContacts: inserted,
        updatedAt: now,
      }).where(eq(broadcastCampaigns.id, input.campaignId));
      return { imported: inserted };
    }),

  listRecipients: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(broadcastRecipients)
        .where(and(
          eq(broadcastRecipients.campaignId, input.campaignId),
          eq(broadcastRecipients.userId, ctx.user.id)
        ));
    }),

  // ─── Launch Campaign ─────────────────────────────────────────────────────────
  launchCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [campaign] = await db.select().from(broadcastCampaigns)
        .where(and(eq(broadcastCampaigns.id, input.campaignId), eq(broadcastCampaigns.userId, ctx.user.id))).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.status === "running") throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign already running" });

      // Get from number
      const [phone] = await db.select().from(phoneNumbers)
        .where(eq(phoneNumbers.userId, ctx.user.id)).limit(1);
      const fromNumber = phone?.phoneNumber;
      if (!fromNumber && (campaign.type === "sms" || campaign.type === "whatsapp" || campaign.type === "voice")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No phone number provisioned. Go to Telephony to provision a number first." });
      }

      // Mark as running
      const now = Date.now();
      await db.update(broadcastCampaigns).set({ status: "running", startedAt: now, updatedAt: now })
        .where(eq(broadcastCampaigns.id, input.campaignId));

      // Get pending recipients
      const recipients = await db.select().from(broadcastRecipients)
        .where(and(
          eq(broadcastRecipients.campaignId, input.campaignId),
          eq(broadcastRecipients.status, "pending")
        ));

      let sent = 0;
      let failed = 0;

      // Fire messages asynchronously (non-blocking — return immediately, process in background)
      (async () => {
        for (const recipient of recipients) {
          try {
            if (!recipient.phone) {
              await db!.update(broadcastRecipients).set({ status: "failed", errorMessage: "No phone number", sentAt: Date.now() })
                .where(eq(broadcastRecipients.id, recipient.id));
              failed++;
              continue;
            }
            if (campaign.type === "sms") {
              await sendSms({ to: recipient.phone, from: fromNumber!, messagingProfileId: campaign.messagingProfileId ?? "", text: campaign.message ?? "" });
            } else if (campaign.type === "whatsapp") {
              await sendWhatsApp({ to: recipient.phone, from: fromNumber!, text: campaign.message ?? "" });
            } else if (campaign.type === "voice") {
              const [phoneMeta] = await db!.select().from(phoneNumbers)
                .where(eq(phoneNumbers.userId, ctx.user.id)).limit(1);
              await initiateOutboundCall({
                to: recipient.phone,
                from: fromNumber!,
                connectionId: (phoneMeta as any)?.connectionId ?? "",
                agentName: "VonWork Broadcast",
                script: campaign.voiceScript ?? campaign.message ?? "Hello, this is an automated message.",
              });
            }
            await db!.update(broadcastRecipients).set({ status: "sent", sentAt: Date.now() })
              .where(eq(broadcastRecipients.id, recipient.id));
            sent++;
            // Throttle: 3 messages/second to avoid rate limits
            await new Promise(r => setTimeout(r, 333));
          } catch (err: any) {
            await db!.update(broadcastRecipients).set({ status: "failed", errorMessage: err?.message?.slice(0, 500) ?? "Unknown error", sentAt: Date.now() })
              .where(eq(broadcastRecipients.id, recipient.id));
            failed++;
          }
        }
        // Mark completed
        await db!.update(broadcastCampaigns).set({
          status: "completed",
          sent,
          failed,
          completedAt: Date.now(),
          updatedAt: Date.now(),
        }).where(eq(broadcastCampaigns.id, input.campaignId));
      })().catch(console.error);

      return { launched: true, totalRecipients: recipients.length };
    }),

  getCampaignStats: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [campaign] = await db.select().from(broadcastCampaigns)
        .where(and(eq(broadcastCampaigns.id, input.campaignId), eq(broadcastCampaigns.userId, ctx.user.id))).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      const recipients = await db.select().from(broadcastRecipients)
        .where(eq(broadcastRecipients.campaignId, input.campaignId));
      const stats = {
        total: recipients.length,
        pending: recipients.filter(r => r.status === "pending").length,
        sent: recipients.filter(r => r.status === "sent").length,
        delivered: recipients.filter(r => r.status === "delivered").length,
        failed: recipients.filter(r => r.status === "failed").length,
        optedOut: recipients.filter(r => r.status === "opted_out").length,
      };
      return { campaign, stats };
    }),
});
