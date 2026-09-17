import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  whiteLabelConfigs,
  customDomains,
  agencyClients,
  users,
  creditTransactions,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAgencyRole(userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || (user.role !== "agency" && user.role !== "admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Agency account required" });
  }
  return user;
}

// ─── White-Label Config Router ────────────────────────────────────────────────

export const whiteLabelRouter = router({
  // Get current agency's white-label config
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [config] = await db
      .select()
      .from(whiteLabelConfigs)
      .where(eq(whiteLabelConfigs.agencyUserId, ctx.user.id))
      .limit(1);
    return config ?? null;
  }),

  // Get white-label config by domain (used by middleware for dynamic theming)
  getConfigByDomain: protectedProcedure
    .input(z.object({ domain: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [domain] = await db
        .select()
        .from(customDomains)
        .where(and(eq(customDomains.domain, input.domain), eq(customDomains.status, "active")))
        .limit(1);
      if (!domain) return null;
      const [config] = await db
        .select()
        .from(whiteLabelConfigs)
        .where(eq(whiteLabelConfigs.agencyUserId, domain.agencyUserId))
        .limit(1);
      return config ?? null;
    }),

  // Upsert brand config
  saveConfig: protectedProcedure
    .input(
      z.object({
        brandName: z.string().min(1).max(128),
        logoUrl: z.string().url().optional().or(z.literal("")),
        faviconUrl: z.string().url().optional().or(z.literal("")),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#7c3aed"),
        secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#06b6d4"),
        accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#10b981"),
        backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#030712"),
        textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f9fafb"),
        fontFamily: z.string().max(128).default("Inter"),
        customCss: z.string().max(10000).optional(),
        supportEmail: z.string().email().optional().or(z.literal("")),
        supportPhone: z.string().max(32).optional(),
        footerText: z.string().max(512).optional(),
        hideVonworkBranding: z.boolean().default(false),
        customLoginMessage: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db
        .select({ id: whiteLabelConfigs.id })
        .from(whiteLabelConfigs)
        .where(eq(whiteLabelConfigs.agencyUserId, ctx.user.id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(whiteLabelConfigs)
          .set({ ...input, logoUrl: input.logoUrl || null, faviconUrl: input.faviconUrl || null })
          .where(eq(whiteLabelConfigs.agencyUserId, ctx.user.id));
      } else {
        await db.insert(whiteLabelConfigs).values({
          agencyUserId: ctx.user.id,
          ...input,
          logoUrl: input.logoUrl || null,
          faviconUrl: input.faviconUrl || null,
        });
      }
      return { success: true };
    }),

  // ─── Domain Management ───────────────────────────────────────────────────────

  listDomains: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(customDomains)
      .where(eq(customDomains.agencyUserId, ctx.user.id))
      .orderBy(desc(customDomains.createdAt));
  }),

  addDomain: protectedProcedure
    .input(z.object({ domain: z.string().min(3).max(253) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Normalize domain
      const domain = input.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

      // Check if already exists
      const [existing] = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.domain, domain))
        .limit(1);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Domain already registered" });
      }

      const verificationToken = nanoid(32);
      await db.insert(customDomains).values({
        agencyUserId: ctx.user.id,
        domain,
        status: "pending",
        verificationToken,
      });

      return {
        domain,
        verificationToken,
        dnsInstructions: {
          type: "TXT",
          name: `_vonwork-verify.${domain}`,
          value: `vonwork-verify=${verificationToken}`,
          ttl: 300,
        },
        cnameInstructions: {
          type: "CNAME",
          name: domain,
          value: "vonwork-ai-tpdwgxnc.manus.space",
          ttl: 300,
        },
      };
    }),

  verifyDomain: protectedProcedure
    .input(z.object({ domainId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [domain] = await db
        .select()
        .from(customDomains)
        .where(
          and(
            eq(customDomains.id, input.domainId),
            eq(customDomains.agencyUserId, ctx.user.id)
          )
        )
        .limit(1);

      if (!domain) throw new TRPCError({ code: "NOT_FOUND" });

      // In production, this would do a real DNS TXT lookup.
      // For now, we simulate verification and mark as active.
      await db
        .update(customDomains)
        .set({ status: "active", verifiedAt: new Date(), sslStatus: "active" })
        .where(eq(customDomains.id, input.domainId));

      return { verified: true, domain: domain.domain };
    }),

  removeDomain: protectedProcedure
    .input(z.object({ domainId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .delete(customDomains)
        .where(
          and(
            eq(customDomains.id, input.domainId),
            eq(customDomains.agencyUserId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  setPrimaryDomain: protectedProcedure
    .input(z.object({ domainId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Clear all primary flags for this agency
      await db
        .update(customDomains)
        .set({ isPrimary: false })
        .where(eq(customDomains.agencyUserId, ctx.user.id));
      // Set new primary
      await db
        .update(customDomains)
        .set({ isPrimary: true })
        .where(
          and(
            eq(customDomains.id, input.domainId),
            eq(customDomains.agencyUserId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // ─── Client Sub-Accounts ─────────────────────────────────────────────────────

  listClients: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        client: agencyClients,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        },
      })
      .from(agencyClients)
      .leftJoin(users, eq(agencyClients.clientUserId, users.id))
      .where(eq(agencyClients.agencyUserId, ctx.user.id))
      .orderBy(desc(agencyClients.createdAt));
    return rows;
  }),

  inviteClient: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        creditLimit: z.number().min(0).max(100000).default(1000),
        agentLimit: z.number().min(1).max(100).default(5),
        customLabel: z.string().max(128).optional(),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if already invited
      const [existing] = await db
        .select()
        .from(agencyClients)
        .where(
          and(
            eq(agencyClients.agencyUserId, ctx.user.id),
            eq(agencyClients.inviteEmail, input.email)
          )
        )
        .limit(1);

      if (existing && existing.status !== "removed") {
        throw new TRPCError({ code: "CONFLICT", message: "Client already invited" });
      }

      const inviteToken = nanoid(32);
      await db.insert(agencyClients).values({
        agencyUserId: ctx.user.id,
        inviteEmail: input.email,
        inviteToken,
        creditLimit: input.creditLimit,
        agentLimit: input.agentLimit,
        customLabel: input.customLabel,
        notes: input.notes,
        status: "invited",
      });

      return {
        success: true,
        inviteToken,
        inviteUrl: `/join?token=${inviteToken}`,
      };
    }),

  updateClient: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        creditLimit: z.number().min(0).max(100000).optional(),
        agentLimit: z.number().min(1).max(100).optional(),
        customLabel: z.string().max(128).optional(),
        notes: z.string().max(1000).optional(),
        status: z.enum(["invited", "active", "suspended", "removed"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clientId, ...updates } = input;
      await db
        .update(agencyClients)
        .set(updates)
        .where(
          and(
            eq(agencyClients.id, clientId),
            eq(agencyClients.agencyUserId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  allocateCredits: protectedProcedure
    .input(z.object({ clientId: z.number(), credits: z.number().min(1).max(100000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [clientRecord] = await db
        .select()
        .from(agencyClients)
        .where(
          and(
            eq(agencyClients.id, input.clientId),
            eq(agencyClients.agencyUserId, ctx.user.id)
          )
        )
        .limit(1);

      if (!clientRecord) throw new TRPCError({ code: "NOT_FOUND" });
      if (!clientRecord.clientUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Client has not accepted invite yet" });
      }

      // Add credits to client's balance
      await db.insert(creditTransactions).values({
        userId: clientRecord.clientUserId,
        type: "agency_grant",
        amount: input.credits,
        balanceAfter: input.credits,
        description: `Credits allocated by agency (from agency user ${ctx.user.id})`,
        featureType: "agency_allocation",
      });

      // Update allocated counter
      await db
        .update(agencyClients)
        .set({ creditsAllocated: clientRecord.creditsAllocated + input.credits })
        .where(eq(agencyClients.id, input.clientId));

      return { success: true, creditsAllocated: input.credits };
    }),

  getClientUsage: protectedProcedure
    .input(z.object({ clientUserId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Verify this client belongs to this agency
      const [clientRecord] = await db
        .select()
        .from(agencyClients)
        .where(
          and(
            eq(agencyClients.clientUserId, input.clientUserId),
            eq(agencyClients.agencyUserId, ctx.user.id)
          )
        )
        .limit(1);

      if (!clientRecord) throw new TRPCError({ code: "FORBIDDEN" });

      return db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, input.clientUserId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(50);
    }),

  // ─── Admin Domain Controls ────────────────────────────────────────────────────

  adminListDomains: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        domain: customDomains,
        agency: { id: users.id, name: users.name, email: users.email },
      })
      .from(customDomains)
      .leftJoin(users, eq(customDomains.agencyUserId, users.id))
      .orderBy(desc(customDomains.createdAt));
  }),

  adminUpdateDomainStatus: protectedProcedure
    .input(
      z.object({
        domainId: z.number(),
        status: z.enum(["pending", "verifying", "active", "failed", "suspended"]),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(customDomains)
        .set({
          status: input.status,
          adminNotes: input.adminNotes,
          ...(input.status === "active" ? { verifiedAt: new Date(), sslStatus: "active" } : {}),
        })
        .where(eq(customDomains.id, input.domainId));
      return { success: true };
    }),
});
