/**
 * Telnyx Webhook Handler + AI Conversation Engine
 *
 * Handles all Telnyx events:
 * - call.initiated, call.answered, call.hangup
 * - call.transcription, call.gather.ended
 * - message.received
 *
 * Inbound call routing (gap fixes):
 * 1. If number has forwardTo → transfer immediately
 * 2. If number has IVR enabled → play IVR menu, gather key press
 * 3. If number has AI agent assigned → load agent's system prompt
 * 4. Otherwise → use default "Alex" script
 */

import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import { phoneNumbers, ivrMenus, aiAgents, callLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  speakOnCall,
  startTranscription,
  hangupCall,
  sendDemoLinkSms,
  parseClientState,
  verifyWebhookSignature,
  type TelnyxWebhookEvent,
} from "./telnyx";

export const telnyxWebhookRouter = Router();

// In-memory conversation state (keyed by call_control_id)
const callState = new Map<
  string,
  {
    clientState: Record<string, unknown>;
    transcript: string[];
    emailCaptured?: string;
    stage: "greeting" | "ivr" | "asking_email" | "confirming" | "closing" | "done";
    turnCount: number;
    ivrOptions?: Array<{ key: string; label: string; action: string; value?: string }>;
  }
>();

// ─────────────────────────────────────────────
// WEBHOOK ENDPOINT
// ─────────────────────────────────────────────

telnyxWebhookRouter.post("/webhook", async (req: Request, res: Response) => {
  // Verify signature
  const signature = req.headers["telnyx-signature-ed25519"] as string ?? "";
  const timestamp = req.headers["telnyx-timestamp"] as string ?? "";
  const rawBody = JSON.stringify(req.body);

  if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
    console.error("[Telnyx Webhook] Invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event: TelnyxWebhookEvent = req.body?.data ?? req.body;
  const eventType = event.event_type;

  console.log(`[Telnyx Webhook] ${eventType}`, event.payload?.call_control_id ?? event.payload?.id ?? "");

  try {
    switch (eventType) {
      case "call.initiated":
        await handleCallInitiated(event);
        break;
      case "call.answered":
        await handleCallAnswered(event);
        break;
      case "call.transcription":
        await handleTranscription(event);
        break;
      case "call.gather.ended":
        await handleGatherEnded(event);
        break;
      case "call.hangup":
        await handleCallHangup(event);
        break;
      case "call.recording.saved":
        await handleRecordingSaved(event);
        break;
      case "message.received":
        await handleMessageReceived(event);
        break;
      case "message.sent":
      case "message.finalized":
        break;
      default:
        console.log(`[Telnyx Webhook] Unhandled event: ${eventType}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`[Telnyx Webhook] Error handling ${eventType}:`, err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ─────────────────────────────────────────────
// EVENT HANDLERS
// ─────────────────────────────────────────────

async function handleCallInitiated(event: TelnyxWebhookEvent) {
  const payload = event.payload as any;
  const { call_control_id, client_state } = payload;
  if (!call_control_id) return;

  const state = parseClientState(client_state);
  const direction = payload.direction ?? "outgoing";

  // ── INBOUND CALL ROUTING ──────────────────────────────────────────────────
  if (direction === "incoming") {
    const db = await getDb();
    if (db) {
      // Normalize destination number
      const toNumber: string =
        typeof payload.to === "string" ? payload.to :
        payload.to?.phone_number ?? "";

      const fromNumber: string =
        typeof payload.from === "string" ? payload.from :
        payload.from?.phone_number ?? "";

      // Look up the destination number in our DB
      const [numConfig] = await db
        .select()
        .from(phoneNumbers)
        .where(eq(phoneNumbers.phoneNumber, toNumber))
        .limit(1);

      if (numConfig) {
        // 1. CALL FORWARDING — transfer immediately before answering
        if (numConfig.forwardTo) {
          console.log(`[Telnyx] Forwarding inbound call to ${numConfig.forwardTo}`);
          callState.set(call_control_id, {
            clientState: { ...state, forwarded: true },
            transcript: [],
            stage: "done",
            turnCount: 0,
          });
          // Transfer happens on call.answered since we need it answered first
          state.forwardTo = numConfig.forwardTo;
        }

        // 2. IVR MENU — load options for use in call.answered
        if (numConfig.ivrEnabled && !numConfig.forwardTo) {
          const [ivr] = await db
            .select()
            .from(ivrMenus)
            .where(eq(ivrMenus.phoneNumberId, numConfig.id))
            .limit(1);
          if (ivr) {
            state.ivrMode = true;
            state.ivrGreeting = ivr.greeting;
            state.ivrOptions = ivr.options; // JSON string
            state.ivrFallback = ivr.fallbackAction;
          }
        }

        // 3. AI AGENT ROUTING — load assigned agent's system prompt
        if (numConfig.agentId && !numConfig.forwardTo) {
          const [agent] = await db
            .select()
            .from(aiAgents)
            .where(eq(aiAgents.id, numConfig.agentId))
            .limit(1);
          if (agent) {
            state.agentName = agent.name;
            state.script = agent.systemPrompt ?? state.script;
            state.agentId = agent.id;
          }
        }

        // Log inbound call
        await db.insert(callLogs).values({
          userId: numConfig.userId,
          agentId: numConfig.agentId ?? null,
          phoneNumberId: numConfig.id,
          telnyxCallControlId: call_control_id,
          direction: "inbound",
          fromNumber,
          toNumber,
          status: "initiated",
        }).catch(() => {});
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  callState.set(call_control_id, {
    clientState: state,
    transcript: [],
    stage: state.ivrMode ? "ivr" : "greeting",
    turnCount: 0,
    ivrOptions: state.ivrOptions
      ? (() => { try { return JSON.parse(state.ivrOptions as string); } catch { return undefined; } })()
      : undefined,
  });

  if (state.campaignLeadId) {
    await updateLeadStatus(String(state.campaignLeadId), "calling");
  }
}

async function handleCallAnswered(event: TelnyxWebhookEvent) {
  const { call_control_id, client_state } = event.payload;
  if (!call_control_id) return;

  const state = parseClientState(client_state);
  const cs = callState.get(call_control_id);
  const mergedState = cs?.clientState ?? state;

  // 1. CALL FORWARDING — transfer now that call is answered
  if (mergedState.forwardTo) {
    console.log(`[Telnyx] Executing call transfer to ${mergedState.forwardTo}`);
    try {
      const apiKey = process.env.TELNYX_API_KEY;
      if (apiKey) {
        await fetch(`https://api.telnyx.com/v2/calls/${call_control_id}/actions/transfer`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ to: mergedState.forwardTo }),
        });
      }
    } catch (err) {
      console.error("[Telnyx] Transfer failed:", err);
    }
    return;
  }

  // 2. IVR MENU — play greeting and gather key press
  if (mergedState.ivrMode && mergedState.ivrGreeting) {
    const options = cs?.ivrOptions ?? [];
    const optionsList = options
      .map((o: any) => `Press ${o.key} for ${o.label}`)
      .join(". ");
    const ivrScript = `${mergedState.ivrGreeting}. ${optionsList}.`;

    if (!callState.has(call_control_id)) {
      callState.set(call_control_id, {
        clientState: mergedState,
        transcript: [],
        stage: "ivr",
        turnCount: 0,
        ivrOptions: options,
      });
    }

    await speakOnCall(call_control_id, ivrScript, "professional_female");

    // Gather a single digit key press
    try {
      const apiKey = process.env.TELNYX_API_KEY;
      if (apiKey) {
        await fetch(`https://api.telnyx.com/v2/calls/${call_control_id}/actions/gather`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            minimum_digits: 1,
            maximum_digits: 1,
            timeout_millis: 10000,
            inter_digit_timeout_millis: 5000,
          }),
        });
      }
    } catch (err) {
      console.error("[Telnyx] Gather failed:", err);
    }
    return;
  }

  // 3. AI AGENT / DEFAULT SCRIPT
  const agentName = String(mergedState.agentName ?? "Alex");
  const script = String(
    mergedState.script ??
      `Hi, this is ${agentName} calling on behalf of VonWork. I'm reaching out to connect with the decision maker about a quick AI demo. Do you have a moment?`
  );

  if (!callState.has(call_control_id)) {
    callState.set(call_control_id, {
      clientState: mergedState,
      transcript: [],
      stage: "greeting",
      turnCount: 0,
    });
  }

  await speakOnCall(call_control_id, script, String(mergedState.voice ?? "professional_female"));
  await startTranscription(call_control_id);

  if (mergedState.campaignLeadId) {
    await updateLeadStatus(String(mergedState.campaignLeadId), "answered");
  }
}

async function handleGatherEnded(event: TelnyxWebhookEvent) {
  const payload = event.payload as any;
  const { call_control_id } = payload;
  if (!call_control_id) return;

  const cs = callState.get(call_control_id);
  if (!cs || cs.stage !== "ivr") return;

  const digit = payload.digits ?? "";
  const options = cs.ivrOptions ?? [];
  const matched = options.find((o: any) => o.key === digit);

  if (!matched) {
    // No match — repeat IVR or fall through to agent
    const fallback = cs.clientState.ivrFallback ?? "agent";
    if (fallback === "repeat") {
      const ivrScript = String(cs.clientState.ivrGreeting ?? "Please press a key to continue.");
      await speakOnCall(call_control_id, ivrScript, "professional_female");
    } else {
      // Fall through to AI agent
      cs.stage = "greeting";
      await startTranscription(call_control_id);
      await speakOnCall(call_control_id, "Let me connect you with our AI assistant.", "professional_female");
    }
    return;
  }

  // Execute the matched IVR option
  if (matched.action === "forward" && matched.value) {
    const apiKey = process.env.TELNYX_API_KEY;
    if (apiKey) {
      await fetch(`https://api.telnyx.com/v2/calls/${call_control_id}/actions/transfer`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: matched.value }),
      });
    }
  } else if (matched.action === "agent") {
    cs.stage = "greeting";
    await speakOnCall(call_control_id, `Connecting you to ${matched.label}.`, "professional_female");
    await startTranscription(call_control_id);
  } else if (matched.action === "voicemail") {
    await speakOnCall(call_control_id, "Please leave your message after the tone.", "professional_female");
    cs.stage = "done";
    setTimeout(() => hangupCall(call_control_id), 30000);
  } else if (matched.action === "repeat") {
    const ivrScript = String(cs.clientState.ivrGreeting ?? "");
    await speakOnCall(call_control_id, ivrScript, "professional_female");
  }
}

async function handleTranscription(event: TelnyxWebhookEvent) {
  const { call_control_id, client_state, transcription_data } = event.payload;
  if (!call_control_id || !transcription_data?.is_final) return;

  const transcript = transcription_data.transcript?.trim();
  if (!transcript) return;

  const cs = callState.get(call_control_id);
  if (!cs || cs.stage === "done" || cs.stage === "ivr") return;

  cs.transcript.push(`Prospect: ${transcript}`);
  cs.turnCount++;

  // Run AI to decide next action
  const response = await runConversationAI(call_control_id, transcript, cs);
  if (response) {
    cs.transcript.push(`Agent: ${response.speech}`);

    if (response.speech) {
      await speakOnCall(call_control_id, response.speech);
    }

    if (response.emailCaptured) {
      cs.emailCaptured = response.emailCaptured;
      cs.stage = "confirming";
      if (cs.clientState.campaignLeadId) {
        await updateLeadEmail(String(cs.clientState.campaignLeadId), response.emailCaptured);
      }
    }

    if (response.action === "hangup") {
      cs.stage = "done";
      setTimeout(() => hangupCall(call_control_id), 3000);
    }

    if (response.action === "send_demo_link") {
      cs.stage = "closing";
    }
  }
}

async function handleCallHangup(event: TelnyxWebhookEvent) {
  const { call_control_id, client_state, duration_secs, hangup_cause } = event.payload;
  if (!call_control_id) return;

  const state = parseClientState(client_state);
  const cs = callState.get(call_control_id);

  const leadId = String(state.campaignLeadId ?? cs?.clientState?.campaignLeadId ?? "");
  if (leadId) {
    const finalStatus: "answered" | "no_answer" = cs?.emailCaptured ? "answered" : "no_answer";
    await updateLeadStatus(leadId, finalStatus, {
      duration: duration_secs,
      hangupCause: hangup_cause,
      transcript: cs?.transcript?.join("\n"),
    });

    if (cs?.emailCaptured && state.demoLink) {
      try {
        await sendDemoLinkSms(
          String(state.toNumber ?? event.payload.to),
          String(state.fromNumber ?? event.payload.from),
          String(state.messagingProfileId ?? ""),
          String(state.demoLink),
          String(state.businessName ?? "VonWork")
        );
      } catch (err) {
        console.error("[Telnyx] Failed to send demo link SMS:", err);
      }
    }
  }

  callState.delete(call_control_id);
}

async function handleRecordingSaved(event: TelnyxWebhookEvent) {
  const { call_control_id, client_state } = event.payload;
  const state = parseClientState(client_state);
  const recordingUrl = (event.payload as Record<string, unknown>).recording_url as string | undefined;

  if (state.campaignLeadId && recordingUrl) {
    const db = await getDb();
    if (!db) return;
    const { campaignLeads } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    await db
      .update(campaignLeads)
      .set({ notes: `Recording: ${recordingUrl}` })
      .where(eq(campaignLeads.id, Number(state.campaignLeadId)));
  }
}

async function handleMessageReceived(event: TelnyxWebhookEvent) {
  const payload = event.payload as any;

  // Telnyx message.received payload shape varies — normalise defensively
  const fromRaw = payload.from;
  const toRaw = Array.isArray(payload.to) ? payload.to[0] : payload.to;
  const fromPhone: string =
    typeof fromRaw === "string" ? fromRaw : (fromRaw?.phone_number ?? "");
  const toPhone: string =
    typeof toRaw === "string" ? toRaw : (toRaw?.phone_number ?? "");
  const text: string = payload.text ?? payload.body ?? "";
  const channelType: "sms" | "whatsapp" = "sms";

  console.log(`[Telnyx] Inbound SMS from ${fromPhone} to ${toPhone}: ${text}`);

  if (!fromPhone || !text) return;

  try {
    const db = await getDb();
    if (!db) return;

    const {
      phoneNumbers: phoneNumbersTable,
      commContacts,
      conversations,
      commMessages,
    } = await import("../drizzle/schema");
    const { eq, and, or } = await import("drizzle-orm");

    // 1. Find which user owns the destination number
    const [numRow] = await db
      .select()
      .from(phoneNumbersTable)
      .where(eq(phoneNumbersTable.phoneNumber, toPhone))
      .limit(1);

    if (!numRow) {
      console.warn(`[Telnyx] No phone number record found for ${toPhone} — skipping inbox creation`);
      return;
    }
    const ownerId = numRow.userId;

    // 2. Find or create a contact for the sender
    let [contact] = await db
      .select()
      .from(commContacts)
      .where(and(eq(commContacts.userId, ownerId), eq(commContacts.phone, fromPhone)))
      .limit(1);

    if (!contact) {
      const inserted = await db.insert(commContacts).values({
        userId: ownerId,
        name: fromPhone,
        phone: fromPhone,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const insertId = (inserted as any).insertId ?? (inserted as any)[0]?.insertId;
      const [newContact] = await db
        .select()
        .from(commContacts)
        .where(eq(commContacts.id, Number(insertId)))
        .limit(1);
      contact = newContact;
    }

    // 3. Find an open conversation for this contact+channel, or create one
    let [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, ownerId),
          eq(conversations.contactId, contact.id),
          eq(conversations.channelType, channelType),
          or(eq(conversations.status, "open"), eq(conversations.status, "snoozed"))
        )
      )
      .limit(1);

    const now = Date.now();
    if (!conversation) {
      const inserted = await db.insert(conversations).values({
        userId: ownerId,
        contactId: contact.id,
        channelType,
        status: "open",
        lastMessageAt: now,
        unreadCount: 1,
        createdAt: now,
        updatedAt: now,
      });
      const insertId = (inserted as any).insertId ?? (inserted as any)[0]?.insertId;
      const [newConv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, Number(insertId)))
        .limit(1);
      conversation = newConv;
    } else {
      // Bump unread count and last message timestamp
      await db
        .update(conversations)
        .set({
          lastMessageAt: now,
          unreadCount: (conversation.unreadCount ?? 0) + 1,
          updatedAt: now,
        })
        .where(eq(conversations.id, conversation.id));
    }

    // 4. Insert the inbound message
    await db.insert(commMessages).values({
      conversationId: conversation.id,
      userId: ownerId,
      direction: "inbound",
      sender: "contact",
      content: text,
      contentType: "text",
      status: "delivered",
      createdAt: now,
    });

    console.log(`[Telnyx] Inbound SMS saved → conversation #${conversation.id} for user ${ownerId}`);

    // 5. Auto-AI reply if conversation is unassigned (no human/AI agent yet)
    const isNewConversation = !conversation.assignedTo;
    if (isNewConversation) {
      try {
        const aiResult = await invokeLLM({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system" as const,
              content: `You are a friendly AI receptionist for a business using VonWork. A customer just sent an inbound SMS. Send a brief, warm acknowledgment (1-2 sentences) letting them know you received their message and that someone will be with them shortly. Be professional and helpful. Do not ask for information yet.`,
            },
            {
              role: "user" as const,
              content: `Customer message: "${text}"`,
            },
          ],
        });

        const aiReply = aiResult?.choices?.[0]?.message?.content;
        if (aiReply && typeof aiReply === "string" && aiReply.trim()) {
          // Save AI reply to DB
          await db.insert(commMessages).values({
            conversationId: conversation.id,
            userId: ownerId,
            direction: "outbound",
            sender: "ai",
            content: aiReply.trim(),
            contentType: "text",
            status: "sent",
            aiModel: "gpt-4o-mini",
            createdAt: Date.now() + 1, // ensure ordering after inbound
          });

          // Send via Telnyx SMS
          const { sendSms } = await import("./telnyx");
          const [fromNum] = await db
            .select()
            .from(phoneNumbersTable)
            .where(eq(phoneNumbersTable.userId, ownerId))
            .limit(1);

          if (fromNum?.phoneNumber) {
            await sendSms({
              to: fromPhone,
              from: fromNum.phoneNumber,
              messagingProfileId: (fromNum as any).messagingProfileId ?? "",
              text: aiReply.trim(),
            }).catch(err => console.error("[Telnyx] Auto-reply send failed:", err));
          }

          console.log(`[Telnyx] Auto-AI reply sent to ${fromPhone}`);
        }
      } catch (aiErr) {
        console.error("[Telnyx] Auto-AI reply error:", aiErr);
      }
    }
  } catch (err) {
    console.error("[Telnyx] handleMessageReceived DB error:", err);
  }
}

// ─────────────────────────────────────────────
// AI CONVERSATION ENGINE
// ─────────────────────────────────────────────

interface AIResponse {
  speech: string;
  action?: "continue" | "hangup" | "send_demo_link" | "transfer";
  emailCaptured?: string;
}

async function runConversationAI(
  callControlId: string,
  latestTranscript: string,
  cs: NonNullable<ReturnType<typeof callState.get>>
): Promise<AIResponse | null> {
  const { clientState, transcript, stage, turnCount } = cs;

  if (turnCount > 10) {
    return { speech: "Thank you for your time. Have a great day!", action: "hangup" };
  }

  // Use the agent's custom system prompt if available, otherwise use default
  const agentPrompt = clientState.script
    ? String(clientState.script)
    : null;

  const systemPrompt = agentPrompt ?? `You are ${clientState.agentName ?? "Alex"}, a professional AI assistant making a brief outbound call on behalf of ${clientState.businessName ?? "VonWork"}.

Your goal is to:
1. Politely ask for the email address of the decision maker
2. Once you have the email, confirm it and let them know you're sending a personalized AI demo link
3. Thank them and end the call professionally

Current stage: ${stage}
Turn count: ${turnCount}

Rules:
- Keep responses SHORT (1-2 sentences max)
- Be friendly, professional, and respectful
- If they say they're not interested, thank them and hang up
- If they give an email, extract it exactly and confirm it
- Never be pushy or aggressive

Conversation so far:
${transcript.slice(-6).join("\n")}

Latest prospect response: "${latestTranscript}"

Respond with JSON: { "speech": "what to say", "action": "continue|hangup|send_demo_link", "emailCaptured": "email@example.com or null" }`;

  try {
    const result = await invokeLLM({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: `Latest: "${latestTranscript}". What should I say next?` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ai_call_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              speech: { type: "string" },
              action: { type: "string", enum: ["continue", "hangup", "send_demo_link"] },
              emailCaptured: { type: ["string", "null"] },
            },
            required: ["speech", "action", "emailCaptured"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = result?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return {
      speech: parsed.speech ?? "",
      action: parsed.action ?? "continue",
      emailCaptured: parsed.emailCaptured ?? undefined,
    };
  } catch (err) {
    console.error("[Telnyx AI] Conversation AI error:", err);
    return {
      speech: "I apologize, let me try that again. Could you please share your email address?",
      action: "continue",
    };
  }
}

// ─────────────────────────────────────────────
// DB HELPERS
// ─────────────────────────────────────────────

type LeadCallStatus = "pending" | "calling" | "answered" | "voicemail" | "no_answer" | "busy" | "failed" | "do_not_call";

async function updateLeadStatus(
  leadId: string,
  status: LeadCallStatus | string,
  extra?: { duration?: number; hangupCause?: string; transcript?: string }
) {
  if (!leadId || leadId === "undefined") return;
  try {
    const db = await getDb();
    if (!db) return;
    const { campaignLeads } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    await db
      .update(campaignLeads)
      .set({
        callStatus: status as LeadCallStatus,
        ...(extra?.transcript ? { notes: extra.transcript.slice(0, 2000) } : {}),
      })
      .where(eq(campaignLeads.id, Number(leadId)));
  } catch (err) {
    console.error("[Telnyx DB] updateLeadStatus error:", err);
  }
}

async function updateLeadEmail(leadId: string, email: string) {
  if (!leadId || leadId === "undefined") return;
  try {
    const db = await getDb();
    if (!db) return;
    const { campaignLeads } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    await db
      .update(campaignLeads)
      .set({ email: email, callStatus: "answered" as LeadCallStatus })
      .where(eq(campaignLeads.id, Number(leadId)));
  } catch (err) {
    console.error("[Telnyx DB] updateLeadEmail error:", err);
  }
}
