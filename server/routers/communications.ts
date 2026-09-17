import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { conversations, commMessages, commContacts, commChannels, phoneNumbers } from "../../drizzle/schema";
import { eq, and, desc, or, like, sql } from "drizzle-orm";
import { openRouterChat } from "../openrouter";
import { sendSms, sendWhatsApp } from "../telnyx";

export const SOCIAL_CONTROL_CHANNELS = [
  { type: "webchat", label: "Website Chat", provider: "VonWork" },
  { type: "sms", label: "SMS", provider: "Telnyx" },
  { type: "whatsapp", label: "WhatsApp", provider: "Meta / Telnyx" },
  { type: "instagram", label: "Instagram DMs", provider: "Meta" },
  { type: "facebook", label: "Messenger", provider: "Meta" },
  { type: "telegram", label: "Telegram", provider: "Telegram Bot API" },
  { type: "email", label: "Email", provider: "Configured mailbox" },
  { type: "voice", label: "Voice", provider: "Telnyx / LiveKit" },
] as const;

export const SAFE_INBOUND_TEST_DISPATCHES_EXTERNALLY = false;

export const communicationsRouter = router({
  // List conversations
  listConversations: protectedProcedure
    .input(z.object({
      status: z.enum(["open", "snoozed", "resolved", "spam", "all"]).default("open"),
      channelType: z.string().optional(),
      search: z.string().optional(),
    }).optional().default({ status: "open" }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let q = db.select().from(conversations)
        .leftJoin(commContacts, eq(conversations.contactId, commContacts.id))
        .where(eq(conversations.userId, ctx.user.id))
        .orderBy(desc(conversations.lastMessageAt));
      const rows = await q;
      return rows.filter(r => {
        if (input.status !== "all" && r.conversations.status !== input.status) return false;
        if (input.channelType && input.channelType !== "all" && r.conversations.channelType !== input.channelType) return false;
        if (input.search) {
          const s = input.search.toLowerCase();
          const name = (r.comm_contacts?.name ?? "").toLowerCase();
          const subject = (r.conversations.subject ?? "").toLowerCase();
          if (!name.includes(s) && !subject.includes(s)) return false;
        }
        return true;
      }).map(r => ({
        ...r.conversations,
        contact: r.comm_contacts,
      }));
    }),

  // Get conversation messages
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [conv] = await db.select().from(conversations)
        .where(and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id))).limit(1);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });
      const msgs = await db.select().from(commMessages)
        .where(eq(commMessages.conversationId, input.conversationId))
        .orderBy(commMessages.createdAt);
      return msgs;
    }),

  // Send a message (outbound) — channel-aware dispatch
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string().min(1),
      contentType: z.enum(["text", "image", "audio", "video", "file", "template"]).default("text"),
      // Optional override: caller can specify from/messagingProfileId if known
      fromNumber: z.string().optional(),
      messagingProfileId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Load conversation + contact
      const [conv] = await db.select().from(conversations)
        .leftJoin(commContacts, eq(conversations.contactId, commContacts.id))
        .where(and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id)))
        .limit(1);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

      const channel = conv.conversations.channelType;
      const contactPhone = conv.comm_contacts?.phone;
      const now = Date.now();
      let dispatchStatus: "sent" | "failed" = "sent";
      let dispatchError: string | undefined;

      // ── Channel-aware dispatch ────────────────────────────────────────────
      if ((channel === "sms" || channel === "whatsapp") && input.contentType === "text") {
        // Resolve the from-number: use override, or look up the user's first active SMS-capable number
        let fromNum = input.fromNumber;
        let msgProfileId = input.messagingProfileId;

        if (!fromNum) {
          const [numRow] = await db.select().from(phoneNumbers)
            .where(and(eq(phoneNumbers.userId, ctx.user.id), eq(phoneNumbers.status, "active")))
            .limit(1);
          if (numRow) {
            fromNum = numRow.phoneNumber;
            // messagingProfileId may be stored in capabilities JSON or aiGreeting — try to parse it
            // For now we use the number itself; Telnyx will route via the default messaging profile
          }
        }

        if (!fromNum || !contactPhone) {
          // No provisioned number or no contact phone — save as pending, don't throw
          dispatchStatus = "failed";
          dispatchError = !fromNum
            ? "No provisioned Telnyx number found. Go to Telephony → provision a number first."
            : "Contact has no phone number on file.";
        } else {
          try {
            if (channel === "whatsapp") {
              await sendWhatsApp({ to: contactPhone, from: fromNum, text: input.content });
            } else {
              // SMS — messagingProfileId is required by Telnyx; fall back to empty string
              // (Telnyx will use the number's default profile if omitted)
              await sendSms({
                to: contactPhone,
                from: fromNum,
                messagingProfileId: msgProfileId ?? "",
                text: input.content,
              });
            }
          } catch (err) {
            dispatchStatus = "failed";
            dispatchError = err instanceof Error ? err.message : "Telnyx send failed";
          }
        }
      }
      // email, webchat, instagram, telegram, facebook, voice — stored only (no direct dispatch yet)

      // ── Persist message ───────────────────────────────────────────────────
      await db.insert(commMessages).values({
        conversationId: input.conversationId,
        userId: ctx.user.id,
        direction: "outbound",
        sender: "agent",
        content: input.content,
        contentType: input.contentType,
        status: dispatchStatus,
        createdAt: now,
      });
      await db.update(conversations).set({ lastMessageAt: now, updatedAt: now })
        .where(eq(conversations.id, input.conversationId));

      return {
        success: dispatchStatus === "sent",
        channel,
        dispatched: (channel === "sms" || channel === "whatsapp") && dispatchStatus === "sent",
        error: dispatchError,
      };
    }),

  // Create a new conversation
  createConversation: protectedProcedure
    .input(z.object({
      contactName: z.string().optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
      channelType: z.enum(["whatsapp", "sms", "email", "webchat", "instagram", "telegram", "facebook", "voice"]).default("webchat"),
      subject: z.string().optional(),
      initialMessage: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      // Create or find contact
      let contactId: number | undefined;
      if (input.contactName || input.contactPhone || input.contactEmail) {
        const [contact] = await db.insert(commContacts).values({
          userId: ctx.user.id,
          name: input.contactName,
          phone: input.contactPhone,
          email: input.contactEmail,
          createdAt: now,
          updatedAt: now,
        });
        contactId = (contact as any).insertId;
      }
      const [result] = await db.insert(conversations).values({
        userId: ctx.user.id,
        contactId,
        channelType: input.channelType,
        subject: input.subject,
        status: "open",
        lastMessageAt: now,
        unreadCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      const convId = (result as any).insertId;
      if (input.initialMessage) {
        await db.insert(commMessages).values({
          conversationId: convId,
          userId: ctx.user.id,
          direction: "inbound",
          sender: "contact",
          content: input.initialMessage,
          status: "read",
          createdAt: now,
        });
      }
      return { conversationId: convId };
    }),

  // Update conversation status
  updateStatus: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      status: z.enum(["open", "snoozed", "resolved", "spam"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(conversations).set({ status: input.status, updatedAt: Date.now() })
        .where(and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id)));
      return { success: true };
    }),

  // AI Router — auto-assign conversation to the right AI agent
  aiRoute: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [conv] = await db.select().from(conversations)
        .where(and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id))).limit(1);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });
      const msgs = await db.select().from(commMessages)
        .where(eq(commMessages.conversationId, input.conversationId))
        .orderBy(desc(commMessages.createdAt)).limit(5);
      const lastMessages = msgs.reverse().map(m => `${m.sender}: ${m.content}`).join("\n");
      const response = await openRouterChat({
        model: "openai/gpt-4o-mini",
        maxTokens: 300,
        temperature: 0.15,
        messages: [
          {
            role: "system",
            content: `You are an AI router for a business communications platform. Based on the conversation, determine which AI agent should handle it.
Options:
- ai_receptionist: General inquiries, greetings, directions
- ai_sales: Interested in buying, pricing questions, demos
- ai_support: Technical issues, complaints, help requests
- ai_collections: Payment overdue, invoice questions
- human: Complex issues, escalations, VIP clients

Return JSON: {"assignedTo": "ai_sales|ai_support|ai_receptionist|ai_collections|human", "reason": "brief reason"}`
          },
          { role: "user", content: `Conversation:\n${lastMessages}\n\nChannel: ${conv.channelType}\nSubject: ${conv.subject ?? "none"}` }
        ],

      });
      let assignment: { assignedTo: string; reason: string } = { assignedTo: "ai_receptionist", reason: "default" };
      try {
        assignment = JSON.parse((response.choices[0].message.content as string) ?? "{}");
      } catch {}
      await db.update(conversations).set({
        assignedTo: assignment.assignedTo as any,
        updatedAt: Date.now(),
      }).where(eq(conversations.id, input.conversationId));
      return assignment;
    }),

  // AI Reply — generate a response in the conversation
  aiReply: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [conv] = await db.select().from(conversations)
        .where(and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id))).limit(1);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });
      const msgs = await db.select().from(commMessages)
        .where(eq(commMessages.conversationId, input.conversationId))
        .orderBy(commMessages.createdAt).limit(20);
      const agentRole = conv.assignedTo ?? "ai_receptionist";
      const systemPrompts: Record<string, string> = {
        ai_receptionist: "You are a friendly AI receptionist. Greet customers warmly, answer general questions, and direct them to the right department.",
        ai_sales: "You are an expert AI sales agent. Understand customer needs, highlight value, handle objections, and guide toward a purchase decision.",
        ai_support: "You are a helpful AI support agent. Diagnose issues, provide clear solutions, and escalate complex problems to human agents.",
        ai_collections: "You are a professional AI collections agent. Politely remind about overdue payments, offer payment plans, and resolve billing disputes.",
        human: "You are a helpful assistant. Provide a suggested response for the human agent to review and send.",
      };
      const response = await openRouterChat({
        model: "openai/gpt-4o-mini",
        maxTokens: 700,
        temperature: 0.35,
        messages: [
          { role: "system", content: systemPrompts[agentRole] ?? systemPrompts.ai_receptionist },
          ...msgs.map(m => ({
            role: (m.sender === "contact" ? "user" : "assistant") as "user" | "assistant",
            content: m.content as string,
          })),
        ],
      });
      const replyContent = (response.choices[0].message.content as string) ?? "";
      const now = Date.now();
      await db.insert(commMessages).values({
        conversationId: input.conversationId,
        userId: ctx.user.id,
        direction: "outbound",
        sender: "ai",
        content: replyContent,
        status: "sent",
        aiModel: "gpt-4o-mini",
        createdAt: now,
      });
      await db.update(conversations).set({ lastMessageAt: now, updatedAt: now })
        .where(eq(conversations.id, input.conversationId));
      return { reply: replyContent };
    }),

  // List contacts
  listContacts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(commContacts).where(eq(commContacts.userId, ctx.user.id)).orderBy(desc(commContacts.createdAt));
  }),

  // Unified omnichannel control center. Credentials are never accepted here; provider OAuth/API setup stays server-side.
  getChannelControlCenter: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const definitions = SOCIAL_CONTROL_CHANNELS;
    const configured = await db.select().from(commChannels).where(eq(commChannels.userId, ctx.user.id));
    const counts = (await db.execute(sql`
      SELECT channel_type AS channelType, COUNT(*) AS conversations,
        SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) AS openConversations,
        SUM(CASE WHEN assigned_to='human' THEN 1 ELSE 0 END) AS humanHandoffs
      FROM conversations WHERE user_id=${ctx.user.id} GROUP BY channel_type
    `) as any).rows ?? [];
    return definitions.map((definition) => {
      const channel = configured.find((item) => item.type === definition.type);
      const stats = counts.find((item: any) => item.channelType === definition.type) ?? {};
      const config = (channel?.config ?? {}) as Record<string, unknown>;
      return {
        ...definition,
        name: channel?.name ?? definition.label,
        isActive: Boolean(channel?.isActive),
        connectionStatus: config.connectionStatus ?? (channel ? "CONFIGURED" : "NOT_CONNECTED"),
        setupNote: config.setupNote ?? "Connection has not been configured.",
        conversations: Number(stats.conversations ?? 0),
        openConversations: Number(stats.openConversations ?? 0),
        humanHandoffs: Number(stats.humanHandoffs ?? 0),
      };
    });
  }),

  configureChannelConnection: protectedProcedure
    .input(z.object({
      type: z.enum(["whatsapp", "sms", "email", "webchat", "instagram", "telegram", "facebook", "voice"]),
      name: z.string().min(2).max(100),
      setupNote: z.string().min(5).max(500),
      externalAccountId: z.string().min(2).max(255).optional(),
      isActive: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(commChannels).where(and(eq(commChannels.userId, ctx.user.id), eq(commChannels.type, input.type))).limit(1);
      const existingConfig = (existing[0]?.config ?? {}) as Record<string, unknown>;
      const config = {
        ...existingConfig,
        connectionStatus: input.isActive ? "PENDING_PROVIDER_VERIFICATION" : "PENDING_CONFIGURATION",
        setupNote: input.setupNote,
        ...(input.externalAccountId ? { externalAccountId: input.externalAccountId } : {}),
        updatedAt: new Date().toISOString(),
      };
      if (existing[0]) {
        await db.update(commChannels).set({ name: input.name, config, isActive: input.isActive ? 1 : 0 }).where(eq(commChannels.id, existing[0].id));
      } else {
        await db.insert(commChannels).values({ userId: ctx.user.id, type: input.type, name: input.name, config, isActive: input.isActive ? 1 : 0 } as any);
      }
      return { success: true, connectionStatus: config.connectionStatus };
    }),

  setHumanHandoff: protectedProcedure
    .input(z.object({ conversationId: z.number(), mode: z.enum(["human", "ai_receptionist", "ai_sales", "ai_support", "ai_collections"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(conversations).set({ assignedTo: input.mode, updatedAt: Date.now() }).where(and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id)));
      return { success: true };
    }),

  createSafeInboundChannelTest: protectedProcedure
    .input(z.object({
      type: z.enum(["whatsapp", "sms", "email", "webchat", "instagram", "telegram", "facebook", "voice"]),
      content: z.string().min(5).max(1200).default("Test inbound message — no external provider delivery occurred."),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const contact = await db.insert(commContacts).values({ userId: ctx.user.id, name: `${input.type} safe test`, tags: ["safe-test", "no-external-delivery"], createdAt: now, updatedAt: now } as any);
      const contactId = (contact as any)[0]?.insertId ?? (contact as any).insertId;
      const conversation = await db.insert(conversations).values({ userId: ctx.user.id, contactId, channelType: input.type, subject: "Safe inbound channel test — no external delivery", status: "open", unreadCount: 1, lastMessageAt: now, createdAt: now, updatedAt: now } as any);
      const conversationId = (conversation as any)[0]?.insertId ?? (conversation as any).insertId;
      await db.insert(commMessages).values({ conversationId, userId: ctx.user.id, direction: "inbound", sender: "contact", content: input.content, status: "read", createdAt: now } as any);
      return { conversationId, dispatchedExternally: SAFE_INBOUND_TEST_DISPATCHES_EXTERNALLY };
    }),
});
