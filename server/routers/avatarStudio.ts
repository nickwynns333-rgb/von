import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { aiAgents, aiMeetings, aiMediaConsents } from "../../drizzle/schema";
import { eq, and, or } from "drizzle-orm";
import { generateLiveKitToken } from "../livekit";
import { listSimliAvatars, createSimliAvatar, startSimliSession } from "../simli";
import { createFishVoice } from "../fishAudio";
import { checkOpenVoiceHealth, deleteOpenVoiceProfile, getOpenVoiceStatus, synthesizeOpenVoice } from "../openvoice";
import { ENV } from "../_core/env";

async function requireMediaConsent(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, agentId: number, consentRecordId: number, mediaType: "VOICE" | "AVATAR") {
  const [consent] = await db
    .select()
    .from(aiMediaConsents)
    .where(and(eq(aiMediaConsents.id, consentRecordId), eq(aiMediaConsents.userId, userId)))
    .limit(1);
  const validType = consent?.mediaType === mediaType || consent?.mediaType === "BOTH";
  if (!consent || consent.status !== "ACTIVE" || !consent.rightsConfirmed || !consent.disclosureConfirmed || !validType || (consent.agentId !== null && consent.agentId !== agentId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "A current, signed consent record for this agent and media type is required." });
  }
}

export const avatarStudioRouter = router({
  createMediaConsent: protectedProcedure
    .input(z.object({
      agentId: z.number().optional(),
      mediaType: z.enum(["VOICE", "AVATAR", "BOTH"]),
      subjectName: z.string().min(2).max(255),
      sourceUrl: z.string().url().optional(),
      purpose: z.string().min(10).max(512),
      rightsConfirmed: z.literal(true),
      disclosureConfirmed: z.literal(true),
      typedSignature: z.string().min(2).max(255),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.agentId) {
        const [agent] = await db.select().from(aiAgents).where(and(eq(aiAgents.id, input.agentId), eq(aiAgents.userId, ctx.user.id))).limit(1);
        if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }
      const result = await db.insert(aiMediaConsents).values({
        userId: ctx.user.id,
        agentId: input.agentId ?? null,
        mediaType: input.mediaType,
        subjectName: input.subjectName,
        sourceUrl: input.sourceUrl ?? null,
        purpose: input.purpose,
        rightsConfirmed: true,
        disclosureConfirmed: true,
        typedSignature: input.typedSignature,
      });
      return { consentRecordId: Number((result as any).insertId) };
    }),

  listMediaConsents: protectedProcedure
    .input(z.object({ agentId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(aiMediaConsents).where(input.agentId ? and(eq(aiMediaConsents.userId, ctx.user.id), eq(aiMediaConsents.agentId, input.agentId)) : eq(aiMediaConsents.userId, ctx.user.id));
    }),

  revokeMediaConsent: protectedProcedure
    .input(z.object({ consentRecordId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [consent] = await db.select().from(aiMediaConsents).where(and(eq(aiMediaConsents.id, input.consentRecordId), eq(aiMediaConsents.userId, ctx.user.id))).limit(1);
      if (!consent) throw new TRPCError({ code: "NOT_FOUND", message: "Consent record not found" });
      await db.update(aiMediaConsents).set({ status: "REVOKED", revokedAt: new Date() }).where(and(eq(aiMediaConsents.id, input.consentRecordId), eq(aiMediaConsents.userId, ctx.user.id)));
      if (consent.agentId && (consent.mediaType === "VOICE" || consent.mediaType === "BOTH")) {
        const [agent] = await db.select().from(aiAgents).where(and(eq(aiAgents.id, consent.agentId), eq(aiAgents.userId, ctx.user.id))).limit(1);
        const config = (agent?.config ?? {}) as Record<string, unknown>;
        const profileId = config.speechProvider === "openvoice" ? String(config.openVoiceProfileId ?? "") : "";
        if (agent) {
          const { openVoiceProfileId: _removedProfile, ...remainingConfig } = config;
          await db.update(aiAgents).set({ config: { ...remainingConfig, speechProvider: "built_in" } }).where(eq(aiAgents.id, agent.id));
        }
        if (profileId) {
          try { await deleteOpenVoiceProfile(profileId); } catch (error) { console.error("[OpenVoice] profile deletion failed after consent revocation", error); }
        }
      }
      return { success: true };
    }),

  getOpenVoiceStatus: protectedProcedure.query(() => getOpenVoiceStatus()),

  checkOpenVoiceHealth: protectedProcedure.mutation(async () => checkOpenVoiceHealth()),

  setSpeechProvider: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      provider: z.enum(["built_in", "managed", "openvoice"]),
      builtInVoice: z.string().max(128).optional(),
      openVoiceProfileId: z.string().max(512).optional(),
      consentRecordId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(aiAgents).where(and(eq(aiAgents.id, input.agentId), eq(aiAgents.userId, ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      if (input.provider === "openvoice") {
        if (!input.consentRecordId) throw new TRPCError({ code: "FORBIDDEN", message: "Signed voice consent is required for OpenVoice." });
        await requireMediaConsent(db, ctx.user.id, input.agentId, input.consentRecordId, "VOICE");
        if (!input.openVoiceProfileId && !agent.voiceReferenceKey) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a consented voice sample or provide an approved OpenVoice profile ID first." });
        }
      }
      const previousConfig = (agent.config ?? {}) as Record<string, unknown>;
      const config = {
        ...previousConfig,
        speechProvider: input.provider,
        ...(input.builtInVoice ? { builtInVoice: input.builtInVoice } : {}),
        ...(input.provider === "openvoice" ? { openVoiceProfileId: input.openVoiceProfileId ?? `reference:${agent.voiceReferenceKey}` } : {}),
      };
      await db.update(aiAgents).set({ config }).where(eq(aiAgents.id, input.agentId));
      return { success: true, config, openVoice: getOpenVoiceStatus() };
    }),

  synthesizeAgentSpeech: protectedProcedure
    .input(z.object({ agentId: z.number(), text: z.string().min(1).max(2400), format: z.literal("wav").default("wav") }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(aiAgents).where(and(eq(aiAgents.id, input.agentId), eq(aiAgents.userId, ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      const config = (agent.config ?? {}) as Record<string, unknown>;
      const profileId = config.speechProvider === "openvoice" ? String(config.openVoiceProfileId ?? "") : "";
      if (!profileId) throw new TRPCError({ code: "BAD_REQUEST", message: "This agent is not configured for OpenVoice." });
      const [consent] = await db.select().from(aiMediaConsents).where(and(eq(aiMediaConsents.userId, ctx.user.id), eq(aiMediaConsents.agentId, input.agentId), eq(aiMediaConsents.status, "ACTIVE"), or(eq(aiMediaConsents.mediaType, "VOICE"), eq(aiMediaConsents.mediaType, "BOTH")))).limit(1);
      if (!consent) throw new TRPCError({ code: "FORBIDDEN", message: "A current signed voice consent record is required." });
      const audio = await synthesizeOpenVoice({ text: input.text, profileId, language: agent.language ?? "en" });
      return { audioBase64: audio.audio.toString("base64"), contentType: audio.contentType, provider: "openvoice" };
    }),

  // ─── List Simli stock avatars ─────────────────────────────────────────────
  listAvatars: protectedProcedure.query(async () => {
    try {
      const avatars = await listSimliAvatars();
      return avatars;
    } catch (err) {
      console.error("[avatarStudio] listAvatars error:", err);
      return [];
    }
  }),

  // ─── Create custom Simli avatar from uploaded image URL ───────────────────
  createAvatar: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        name: z.string(),
        imageUrl: z.string().url(),
        avatarVideoKey: z.string().optional(),
        consentRecordId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify agent belongs to user
      const [agent] = await db
        .select()
        .from(aiAgents)
        .where(and(eq(aiAgents.id, input.agentId), eq(aiAgents.userId, ctx.user.id)))
        .limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      await requireMediaConsent(db, ctx.user.id, input.agentId, input.consentRecordId, "AVATAR");

      const simliAvatarId = await createSimliAvatar({
        name: input.name,
        imageUrl: input.imageUrl,
      });

      await db
        .update(aiAgents)
        .set({
          simliAvatarId,
          avatarUrl: input.imageUrl,
          avatarVideoKey: input.avatarVideoKey,
        })
        .where(eq(aiAgents.id, input.agentId));

      return { simliAvatarId };
    }),

  // ─── Assign a stock Simli avatar to an agent ─────────────────────────────
  assignStockAvatar: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        simliAvatarId: z.string(),
        avatarUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [agent] = await db
        .select()
        .from(aiAgents)
        .where(and(eq(aiAgents.id, input.agentId), eq(aiAgents.userId, ctx.user.id)))
        .limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });

      await db
        .update(aiAgents)
        .set({
          simliAvatarId: input.simliAvatarId,
          avatarUrl: input.avatarUrl ?? agent.avatarUrl,
        })
        .where(eq(aiAgents.id, input.agentId));

      return { success: true };
    }),

  // ─── Connect an existing Simli dashboard face to an agent ─────────────────
  connectSimliFace: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      simliFaceId: z.string().min(3).max(255),
      consentRecordId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(aiAgents).where(and(eq(aiAgents.id, input.agentId), eq(aiAgents.userId, ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      await requireMediaConsent(db, ctx.user.id, input.agentId, input.consentRecordId, "AVATAR");
      await db.update(aiAgents).set({ simliAvatarId: input.simliFaceId }).where(eq(aiAgents.id, input.agentId));
      return { success: true, simliAvatarId: input.simliFaceId };
    }),

  // ─── Clone voice from uploaded audio URL ─────────────────────────────────
  cloneVoice: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        name: z.string(),
        audioUrl: z.string().url(),
        voiceReferenceKey: z.string().optional(),
        consentRecordId: z.number(),
        preferredProvider: z.enum(["openvoice", "managed"]).default("openvoice"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [agent] = await db
        .select()
        .from(aiAgents)
        .where(and(eq(aiAgents.id, input.agentId), eq(aiAgents.userId, ctx.user.id)))
        .limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      await requireMediaConsent(db, ctx.user.id, input.agentId, input.consentRecordId, "VOICE");

      if (input.preferredProvider === "openvoice") {
        const referenceKey = input.voiceReferenceKey ?? input.audioUrl;
        const openVoiceProfileId = `reference:${referenceKey}`;
        await db.update(aiAgents).set({
          voiceReferenceKey: referenceKey,
          config: {
            ...((agent.config ?? {}) as Record<string, unknown>),
            speechProvider: "openvoice",
            openVoiceProfileId,
          },
        }).where(eq(aiAgents.id, input.agentId));
        return { provider: "openvoice", openVoiceProfileId, serviceReady: getOpenVoiceStatus().configured };
      }

      // If no Fish Audio API key, store the reference URL for use in TTS
      if (!ENV.fishAudioApiKey) {
        await db
          .update(aiAgents)
          .set({
            voiceReferenceKey: input.voiceReferenceKey ?? input.audioUrl,
            fishVoiceId: `ref:${input.audioUrl}`, // use reference URL directly
          })
          .where(eq(aiAgents.id, input.agentId));
        return { fishVoiceId: `ref:${input.audioUrl}` };
      }

      const fishVoiceId = await createFishVoice({
        name: input.name,
        audioUrl: input.audioUrl,
      });

      await db
        .update(aiAgents)
        .set({
          fishVoiceId,
          voiceReferenceKey: input.voiceReferenceKey,
        })
        .where(eq(aiAgents.id, input.agentId));

      return { fishVoiceId };
    }),

  // ─── Get LiveKit token for joining a meeting room ─────────────────────────
  getLiveKitToken: publicProcedure
    .input(
      z.object({
        meetingSlug: z.string(),
        participantName: z.string().default("Guest"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [meeting] = await db
        .select()
        .from(aiMeetings)
        .where(eq(aiMeetings.slug, input.meetingSlug))
        .limit(1);
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });

      const roomName = meeting.livekitRoomName ?? `vonwork-${input.meetingSlug}`;
      const identity = `prospect-${Date.now()}`;

      const token = await generateLiveKitToken({
        roomName,
        participantName: input.participantName,
        participantIdentity: identity,
        isAgent: false,
      });

      return {
        token,
        roomName,
        livekitUrl: ENV.livekitUrl,
      };
    }),

  // ─── Start Simli avatar session for a meeting ─────────────────────────────
  startAvatarSession: publicProcedure
    .input(
      z.object({
        meetingSlug: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db
        .select({
          simliAvatarId: aiAgents.simliAvatarId,
          fishVoiceId: aiAgents.fishVoiceId,
          config: aiAgents.config,
          agentName: aiAgents.name,
        })
        .from(aiMeetings)
        .leftJoin(aiAgents, eq(aiMeetings.agentId, aiAgents.id))
        .where(eq(aiMeetings.slug, input.meetingSlug))
        .limit(1);

      if (!result.length) throw new TRPCError({ code: "NOT_FOUND" });

      const { simliAvatarId, fishVoiceId, agentName, config } = result[0];
      const speechConfig = (config ?? {}) as Record<string, unknown>;
      const speechProvider = speechConfig.speechProvider === "openvoice" ? "openvoice" : speechConfig.speechProvider === "managed" ? "managed" : "built_in";

      // Use a default Simli avatar if none is set
      const avatarId = simliAvatarId ?? "tmp9i8bbq7c"; // Simli default avatar

      const session = await startSimliSession({
        avatarId,
        voiceId: speechProvider === "openvoice" ? undefined : fishVoiceId ?? undefined,
      });

      return {
        ...session,
        agentName: agentName ?? "AI Agent",
        avatarId,
        speechProvider,
        openVoiceProfileId: speechProvider === "openvoice" ? String(speechConfig.openVoiceProfileId ?? "") : null,
        openVoice: getOpenVoiceStatus(),
      };
    }),

  synthesizeMeetingSpeech: publicProcedure
    .input(z.object({ meetingSlug: z.string(), text: z.string().min(1).max(2400), format: z.literal("wav").default("wav") }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [meetingAgent] = await db.select({
        agentId: aiAgents.id,
        userId: aiAgents.userId,
        language: aiAgents.language,
        config: aiAgents.config,
      }).from(aiMeetings).leftJoin(aiAgents, eq(aiMeetings.agentId, aiAgents.id)).where(eq(aiMeetings.slug, input.meetingSlug)).limit(1);
      if (!meetingAgent?.agentId || !meetingAgent.userId) throw new TRPCError({ code: "NOT_FOUND", message: "Meeting agent not found" });
      const config = (meetingAgent.config ?? {}) as Record<string, unknown>;
      const profileId = config.speechProvider === "openvoice" ? String(config.openVoiceProfileId ?? "") : "";
      if (!profileId) throw new TRPCError({ code: "BAD_REQUEST", message: "This video agent is not configured for OpenVoice." });
      const [consent] = await db.select().from(aiMediaConsents).where(and(eq(aiMediaConsents.userId, meetingAgent.userId), eq(aiMediaConsents.agentId, meetingAgent.agentId), eq(aiMediaConsents.status, "ACTIVE"), or(eq(aiMediaConsents.mediaType, "VOICE"), eq(aiMediaConsents.mediaType, "BOTH")))).limit(1);
      if (!consent) throw new TRPCError({ code: "FORBIDDEN", message: "The video agent no longer has active voice consent." });
      const audio = await synthesizeOpenVoice({ text: input.text, profileId, language: meetingAgent.language ?? "en" });
      return { audioBase64: audio.audio.toString("base64"), contentType: audio.contentType, provider: "openvoice" };
    }),

  // ─── Get agent avatar/voice config ────────────────────────────────────────
  getAgentAvatarConfig: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const [agent] = await db
        .select({
          id: aiAgents.id,
          name: aiAgents.name,
          avatarUrl: aiAgents.avatarUrl,
          simliAvatarId: aiAgents.simliAvatarId,
          fishVoiceId: aiAgents.fishVoiceId,
          voiceReferenceKey: aiAgents.voiceReferenceKey,
          avatarVideoKey: aiAgents.avatarVideoKey,
          config: aiAgents.config,
        })
        .from(aiAgents)
        .where(and(eq(aiAgents.id, input.agentId), eq(aiAgents.userId, ctx.user.id)))
        .limit(1);

      return agent ?? null;
    }),
});
