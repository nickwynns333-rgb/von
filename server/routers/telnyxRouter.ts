/**
 * Telnyx tRPC Router
 *
 * Exposes procedures for:
 * - Provisioning: auto-buy number, create voice app, messaging profile
 * - Telephony dashboard: list numbers, voice apps, account balance
 * - Campaign calling: initiate outbound calls, check call status
 * - SMS/WhatsApp: send messages
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  provisionBusinessAccount,
  searchAvailableNumber,
  listPhoneNumbers,
  listVoiceApps,
  getAccountBalance,
  initiateOutboundCall,
  sendSms,
  sendWhatsApp,
} from "../telnyx";
import { getDb } from "../db";

export const telnyxRouter = router({
  // ─── Account Info ───────────────────────────────────────────────────────────

  /**
   * Get Telnyx account balance
   */
  getBalance: adminProcedure.query(async () => {
    try {
      return await getAccountBalance();
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch Telnyx balance" });
    }
  }),

  /**
   * List all phone numbers on the Telnyx account
   */
  listNumbers: protectedProcedure.query(async () => {
    try {
      return await listPhoneNumbers();
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch phone numbers" });
    }
  }),

  /**
   * List all voice apps (connections) on the Telnyx account
   */
  listVoiceApps: adminProcedure.query(async () => {
    try {
      return await listVoiceApps();
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch voice apps" });
    }
  }),

  /**
   * Search for available phone numbers in a given area code
   */
  searchNumbers: protectedProcedure
    .input(z.object({ areaCode: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        const result = await searchAvailableNumber(input.areaCode);
        return result;
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to search phone numbers" });
      }
    }),

  // ─── Provisioning ───────────────────────────────────────────────────────────

  /**
   * Auto-provision a complete Telnyx account for a business:
   * - Buy a phone number
   * - Create a Voice App
   * - Create a Messaging Profile
   * - Assign the number to both
   */
  provisionBusiness: protectedProcedure
    .input(
      z.object({
        businessName: z.string().min(1),
        areaCode: z.string().optional(),
        serviceBusinessId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const provisioned = await provisionBusinessAccount(input.businessName, input.areaCode);

        // Save provisioning data to the service business record if provided
        if (input.serviceBusinessId) {
          const db = await getDb();
          if (db) {
            const { serviceBusinesses } = await import("../../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await db
              .update(serviceBusinesses)
              .set({
                // Store Telnyx IDs in the aiGreeting field as JSON until schema is extended
                aiGreeting: JSON.stringify({
                  telnyxPhoneNumber: provisioned.phoneNumber,
                  telnyxConnectionId: provisioned.connectionId,
                  telnyxMessagingProfileId: provisioned.messagingProfileId,
                }),
              })
              .where(eq(serviceBusinesses.id, input.serviceBusinessId));
          }
        }

        return provisioned;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Provisioning failed";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  // ─── Outbound Calls ─────────────────────────────────────────────────────────

  /**
   * Initiate a single outbound AI call
   */
  initiateCall: protectedProcedure
    .input(
      z.object({
        to: z.string().min(10),
        from: z.string().min(10),
        connectionId: z.string().min(1),
        agentName: z.string().default("Alex"),
        script: z.string().min(1),
        campaignLeadId: z.number().optional(),
        demoLink: z.string().optional(),
        voice: z.enum(["female", "male", "professional_female", "professional_male"]).default("professional_female"),
        businessName: z.string().optional(),
        messagingProfileId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await initiateOutboundCall({
          to: input.to,
          from: input.from,
          connectionId: input.connectionId,
          agentName: input.agentName,
          script: input.script,
          campaignLeadId: input.campaignLeadId?.toString(),
          demoLink: input.demoLink,
          clientState: {
            voice: input.voice,
            businessName: input.businessName,
            messagingProfileId: input.messagingProfileId,
            fromNumber: input.from,
            toNumber: input.to,
          },
        });
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to initiate call";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  // ─── Messaging ──────────────────────────────────────────────────────────────

  /**
   * Send an SMS message
   */
  sendSms: protectedProcedure
    .input(
      z.object({
        to: z.string().min(10),
        from: z.string().min(10),
        messagingProfileId: z.string().min(1),
        text: z.string().min(1).max(1600),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await sendSms(input);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to send SMS";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  /**
   * Send a WhatsApp message
   */
  sendWhatsApp: protectedProcedure
    .input(
      z.object({
        to: z.string().min(10),
        from: z.string().min(10),
        text: z.string().min(1).max(4096),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await sendWhatsApp(input);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to send WhatsApp message";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  // ─── Campaign Batch Calling ─────────────────────────────────────────────────

  /**
   * Launch a batch campaign — initiates AI calls for all pending leads
   */
  launchCampaignCalls: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        fromNumber: z.string().min(10),
        connectionId: z.string().min(1),
        agentName: z.string().default("Alex"),
        script: z.string().min(1),
        demoLink: z.string().optional(),
        voice: z.enum(["female", "male", "professional_female", "professional_male"]).default("professional_female"),
        messagingProfileId: z.string().optional(),
        maxConcurrent: z.number().min(1).max(10).default(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { campaignRuns, campaignLeads } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      // Verify campaign belongs to user
      const [campaign] = await db
        .select()
        .from(campaignRuns)
        .where(and(eq(campaignRuns.id, input.campaignId), eq(campaignRuns.userId, ctx.user.id)));

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      // Get pending leads
      const leads = await db
        .select()
        .from(campaignLeads)
        .where(and(eq(campaignLeads.campaignId, input.campaignId), eq(campaignLeads.callStatus, "pending")));

      if (leads.length === 0) {
        return { launched: 0, message: "No pending leads to call" };
      }

      // Update campaign status to active
      await db.update(campaignRuns).set({ status: "running" }).where(eq(campaignRuns.id, input.campaignId));

      // Launch calls in batches (respecting maxConcurrent)
      let launched = 0;
      const batch = leads.slice(0, input.maxConcurrent);

      for (const lead of batch) {
        try {
          await initiateOutboundCall({
            to: lead.phone,
            from: input.fromNumber,
            connectionId: input.connectionId,
            agentName: input.agentName,
            script: input.script,
            campaignLeadId: lead.id.toString(),
            demoLink: input.demoLink,
            clientState: {
              voice: input.voice,
              businessName: lead.businessName,
              messagingProfileId: input.messagingProfileId,
              fromNumber: input.fromNumber,
              toNumber: lead.phone,
            },
          });

          await db
            .update(campaignLeads)
            .set({ callStatus: "calling" })
            .where(eq(campaignLeads.id, lead.id));

          launched++;
        } catch (err) {
          console.error(`[Campaign] Failed to call lead ${lead.id}:`, err);
          await db
            .update(campaignLeads)
            .set({ callStatus: "failed" })
            .where(eq(campaignLeads.id, lead.id));
        }
      }

      return { launched, total: leads.length, message: `Launched ${launched} calls` };
    }),
});
