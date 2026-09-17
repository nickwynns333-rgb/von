/**
 * Telnyx Auto-Provisioning & Call Engine
 *
 * This service handles:
 * 1. Auto-provisioning: buy number, create voice app, messaging profile per business
 * 2. Outbound AI calls: initiate call, inject TTS script, capture STT, drop demo link
 * 3. SMS / WhatsApp messaging
 * 4. Webhook event processing
 */

import axios from "axios";

const TELNYX_API = "https://api.telnyx.com/v2";
const TELNYX_API_KEY = process.env.TELNYX_API_KEY!;

// Webhook base URL — the public URL of this deployment
function getWebhookBase(): string {
  return process.env.VITE_APP_URL || "https://vonwork-ai-tpdwgxnc.manus.space";
}

const telnyxClient = axios.create({
  baseURL: TELNYX_API,
  headers: {
    Authorization: `Bearer ${TELNYX_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ProvisionedAccount {
  phoneNumber: string;
  phoneNumberId: string;
  connectionId: string;   // Voice App ID
  messagingProfileId: string;
}

export interface OutboundCallParams {
  to: string;             // destination phone number E.164
  from: string;           // Telnyx number E.164
  connectionId: string;   // Voice App connection ID
  agentName: string;      // AI agent name for TTS greeting
  script: string;         // Opening TTS script
  campaignLeadId?: string;
  demoLink?: string;
  clientState?: Record<string, unknown>;
}

export interface SendSmsParams {
  to: string;
  from: string;
  messagingProfileId: string;
  text: string;
}

export interface SendWhatsAppParams {
  to: string;
  from: string;           // WhatsApp-enabled number
  text: string;
}

// ─────────────────────────────────────────────
// PROVISIONING
// ─────────────────────────────────────────────

/**
 * Search for an available US phone number in a given area code.
 * Falls back to any available US number if the area code has none.
 */
export async function searchAvailableNumber(areaCode?: string): Promise<{ phoneNumber: string; reservationId?: string }> {
  const params: Record<string, string> = {
    "filter[country_code]": "US",
    "filter[features][]": "voice",
    "filter[number_type]": "local",
    "page[size]": "5",
  };
  if (areaCode) {
    params["filter[national_destination_code]"] = areaCode;
  }

  const qs = new URLSearchParams(params).toString();
  const res = await telnyxClient.get(`/available_phone_numbers?${qs}`);
  const numbers = res.data?.data ?? [];

  if (numbers.length === 0) {
    // Fallback: any US number
    const fallbackQs = new URLSearchParams({
      "filter[country_code]": "US",
      "filter[features][]": "voice",
      "filter[number_type]": "local",
      "page[size]": "1",
    }).toString();
    const fallback = await telnyxClient.get(`/available_phone_numbers?${fallbackQs}`);
    const fallbackNumbers = fallback.data?.data ?? [];
    if (fallbackNumbers.length === 0) throw new Error("No available US phone numbers found");
    return { phoneNumber: fallbackNumbers[0].phone_number };
  }

  return { phoneNumber: numbers[0].phone_number };
}

/**
 * Purchase a phone number.
 */
export async function purchasePhoneNumber(phoneNumber: string, connectionId?: string): Promise<{ id: string; phoneNumber: string }> {
  const body: Record<string, unknown> = {
    phone_number: phoneNumber,
    messaging_enabled: true,
    voice_enabled: true,
  };
  if (connectionId) {
    body.connection_id = connectionId;
  }

  const res = await telnyxClient.post("/phone_number_orders", {
    phone_numbers: [body],
  });

  const order = res.data?.data;
  // Orders are async — poll for completion
  const orderId = order?.id;
  if (orderId) {
    await pollOrderCompletion(orderId);
  }

  // Get the purchased number details
  const numbersRes = await telnyxClient.get(
    `/phone_numbers?filter[phone_number]=${encodeURIComponent(phoneNumber)}`
  );
  const num = numbersRes.data?.data?.[0];
  return { id: num?.id ?? "", phoneNumber: num?.phone_number ?? phoneNumber };
}

async function pollOrderCompletion(orderId: string, maxAttempts = 10): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await telnyxClient.get(`/phone_number_orders/${orderId}`);
    const status = res.data?.data?.status;
    if (status === "success") return;
    if (status === "failure") throw new Error(`Phone number order ${orderId} failed`);
  }
}

/**
 * Create a Telnyx Voice API Application (connection) for a business.
 */
export async function createVoiceApp(businessName: string): Promise<{ connectionId: string }> {
  const webhookUrl = `${getWebhookBase()}/api/telnyx/webhook`;

  const res = await telnyxClient.post("/connections", {
    connection_name: `VonWork - ${businessName}`,
    webhook_event_url: webhookUrl,
    webhook_event_failover_url: webhookUrl,
    webhook_api_version: "2",
    active: true,
    anchorSite: "Ashburn, VA",
    dtmf_type: "RFC 2833",
    encode_contact_header_enabled: false,
    encrypted_media: false,
    onnet_t38_passthrough_enabled: false,
    timeout_1xx_secs: 3,
    timeout_2xx_secs: 90,
  });

  return { connectionId: res.data?.data?.id ?? "" };
}

/**
 * Create a Messaging Profile for SMS/WhatsApp.
 */
export async function createMessagingProfile(businessName: string): Promise<{ messagingProfileId: string }> {
  const res = await telnyxClient.post("/messaging_profiles", {
    name: `VonWork - ${businessName}`,
    enabled: true,
    webhook_url: `${getWebhookBase()}/api/telnyx/webhook`,
    webhook_failover_url: `${getWebhookBase()}/api/telnyx/webhook`,
    webhook_api_version: "2",
    whitelisted_destinations: ["US", "CA"],
  });

  return { messagingProfileId: res.data?.data?.id ?? "" };
}

/**
 * Assign a phone number to a messaging profile.
 */
export async function assignNumberToMessagingProfile(
  phoneNumberId: string,
  messagingProfileId: string
): Promise<void> {
  await telnyxClient.patch(`/phone_numbers/${phoneNumberId}`, {
    messaging_profile_id: messagingProfileId,
  });
}

/**
 * Full auto-provisioning for a new business.
 * Buys a number, creates voice app + messaging profile, assigns everything.
 */
export async function provisionBusinessAccount(
  businessName: string,
  areaCode?: string
): Promise<ProvisionedAccount> {
  // 1. Create voice app
  const { connectionId } = await createVoiceApp(businessName);

  // 2. Create messaging profile
  const { messagingProfileId } = await createMessagingProfile(businessName);

  // 3. Search for available number
  const { phoneNumber } = await searchAvailableNumber(areaCode);

  // 4. Purchase the number with voice app assigned
  const { id: phoneNumberId } = await purchasePhoneNumber(phoneNumber, connectionId);

  // 5. Assign to messaging profile
  if (phoneNumberId) {
    await assignNumberToMessagingProfile(phoneNumberId, messagingProfileId);
  }

  return { phoneNumber, phoneNumberId, connectionId, messagingProfileId };
}

// ─────────────────────────────────────────────
// OUTBOUND CALLS
// ─────────────────────────────────────────────

/**
 * Initiate an outbound AI call.
 * The call.answered webhook will trigger TTS script injection.
 */
export async function initiateOutboundCall(params: OutboundCallParams): Promise<{ callControlId: string }> {
  const clientState = Buffer.from(
    JSON.stringify({
      agentName: params.agentName,
      script: params.script,
      campaignLeadId: params.campaignLeadId,
      demoLink: params.demoLink,
      ...params.clientState,
    })
  ).toString("base64");

  const res = await telnyxClient.post("/calls", {
    to: params.to,
    from: params.from,
    connection_id: params.connectionId,
    client_state: clientState,
    timeout_secs: 30,
    record_audio: true,
    record_format: "mp3",
    record_channels: "dual",
  });

  return { callControlId: res.data?.data?.call_control_id ?? "" };
}

/**
 * Speak text on an active call (TTS).
 */
export async function speakOnCall(
  callControlId: string,
  text: string,
  voice: string = "female",
  language: string = "en-US"
): Promise<void> {
  const voiceMap: Record<string, string> = {
    female: "Polly.Joanna",
    male: "Polly.Matthew",
    professional_female: "Polly.Joanna-Neural",
    professional_male: "Polly.Matthew-Neural",
  };

  await telnyxClient.post(`/calls/${callControlId}/actions/speak`, {
    payload: text,
    voice: voiceMap[voice] ?? voiceMap.female,
    language,
    payload_type: "text",
    service_level: "premium",
    stop: "never",
  });
}

/**
 * Start real-time transcription on a call.
 */
export async function startTranscription(callControlId: string): Promise<void> {
  await telnyxClient.post(`/calls/${callControlId}/actions/transcription_start`, {
    language: "en",
    transcription_engine: "A",
    interim_results: true,
  });
}

/**
 * Hang up a call.
 */
export async function hangupCall(callControlId: string): Promise<void> {
  await telnyxClient.post(`/calls/${callControlId}/actions/hangup`, {});
}

/**
 * Transfer a call to a human agent.
 */
export async function transferCall(callControlId: string, to: string): Promise<void> {
  await telnyxClient.post(`/calls/${callControlId}/actions/transfer`, { to });
}

// ─────────────────────────────────────────────
// MESSAGING
// ─────────────────────────────────────────────

/**
 * Send an SMS message.
 */
export async function sendSms(params: SendSmsParams): Promise<{ messageId: string }> {
  const res = await telnyxClient.post("/messages", {
    from: params.from,
    to: params.to,
    text: params.text,
    messaging_profile_id: params.messagingProfileId,
    type: "SMS",
  });
  return { messageId: res.data?.data?.id ?? "" };
}

/**
 * Send a WhatsApp message (requires WhatsApp-enabled number).
 */
export async function sendWhatsApp(params: SendWhatsAppParams): Promise<{ messageId: string }> {
  const res = await telnyxClient.post("/messages", {
    from: params.from,
    to: params.to,
    text: params.text,
    type: "WhatsApp",
  });
  return { messageId: res.data?.data?.id ?? "" };
}

/**
 * Send a demo link via SMS after a call.
 */
export async function sendDemoLinkSms(
  to: string,
  from: string,
  messagingProfileId: string,
  demoLink: string,
  businessName: string
): Promise<{ messageId: string }> {
  const text = `Hi! ${businessName} sent you a personalized AI demo. Watch it here: ${demoLink}\n\nReply STOP to opt out.`;
  return sendSms({ to, from, messagingProfileId, text });
}

// ─────────────────────────────────────────────
// WEBHOOK PARSING
// ─────────────────────────────────────────────

export interface TelnyxWebhookEvent {
  event_type: string;
  payload: {
    call_control_id?: string;
    call_leg_id?: string;
    call_session_id?: string;
    client_state?: string;
    from?: string;
    to?: string;
    state?: string;
    transcription_data?: {
      transcript?: string;
      is_final?: boolean;
    };
    recording_url?: string;
    duration_secs?: number;
    hangup_cause?: string;
    // Messaging
    id?: string;
    text?: string;
    direction?: string;
  };
}

/**
 * Parse the base64 client_state back into the original object.
 */
export function parseClientState(clientState?: string): Record<string, unknown> {
  if (!clientState) return {};
  try {
    return JSON.parse(Buffer.from(clientState, "base64").toString("utf-8"));
  } catch {
    return {};
  }
}

/**
 * Verify Telnyx webhook signature (Ed25519).
 * Returns true if valid or if no secret is configured (dev mode).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  // In production, verify Ed25519 signature
  // For now, accept all (add TELNYX_WEBHOOK_SECRET env var to enable verification)
  const secret = process.env.TELNYX_WEBHOOK_SECRET;
  if (!secret) return true; // Dev mode — accept all

  try {
    const crypto = require("crypto");
    const message = `${timestamp}|${rawBody}`;
    const keyBuffer = Buffer.from(secret, "base64");
    const verified = crypto.verify(
      null,
      Buffer.from(message),
      { key: keyBuffer, format: "der", type: "spki" },
      Buffer.from(signature, "base64")
    );
    return verified;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// ACCOUNT INFO
// ─────────────────────────────────────────────

/**
 * List all phone numbers on the account.
 */
export async function listPhoneNumbers(): Promise<Array<{ id: string; phoneNumber: string; status: string; connectionId?: string }>> {
  const res = await telnyxClient.get("/phone_numbers?page[size]=50");
  return (res.data?.data ?? []).map((n: Record<string, unknown>) => ({
    id: n.id as string,
    phoneNumber: n.phone_number as string,
    status: n.status as string,
    connectionId: n.connection_id as string | undefined,
  }));
}

/**
 * List all voice apps (connections) on the account.
 */
export async function listVoiceApps(): Promise<Array<{ id: string; name: string; webhookUrl?: string }>> {
  const res = await telnyxClient.get("/connections?page[size]=50");
  return (res.data?.data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: c.connection_name as string,
    webhookUrl: c.webhook_event_url as string | undefined,
  }));
}

/**
 * Get account balance.
 */
export async function getAccountBalance(): Promise<{ balance: string; currency: string }> {
  const res = await telnyxClient.get("/balance");
  return {
    balance: res.data?.data?.balance ?? "0",
    currency: res.data?.data?.currency ?? "USD",
  };
}
