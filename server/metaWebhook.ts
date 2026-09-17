import crypto from "crypto";
import express, { type Request, type Response, Router } from "express";
import { and, eq } from "drizzle-orm";
import { commChannels, commContacts, commMessages, conversations } from "../drizzle/schema";
import { getDb } from "./db";

type RawRequest = Request & { rawBody?: string };

export const metaWebhookRouter = Router();

export function verifyMetaSignature(rawBody: string, signature: string | undefined, appSecret: string): boolean {
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

metaWebhookRouter.use(express.json({
  verify: (req, _res, buffer) => { (req as RawRequest).rawBody = buffer.toString("utf8"); },
}));

metaWebhookRouter.get("/webhook", (req: Request, res: Response) => {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "";
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === verifyToken && verifyToken) {
    return res.status(200).send(String(req.query["hub.challenge"] ?? ""));
  }
  return res.sendStatus(403);
});

metaWebhookRouter.post("/webhook", async (req: RawRequest, res: Response) => {
  const appSecret = process.env.META_APP_SECRET ?? "";
  if (!verifyMetaSignature(req.rawBody ?? JSON.stringify(req.body), req.header("x-hub-signature-256"), appSecret)) {
    return res.status(401).json({ error: "Invalid Meta webhook signature" });
  }

  try {
    const objectType = String(req.body?.object ?? "");
    const channelType = objectType === "instagram" ? "instagram" : "facebook";
    for (const entry of Array.isArray(req.body?.entry) ? req.body.entry : []) {
      const accountId = String(entry.id ?? "");
      for (const event of Array.isArray(entry.messaging) ? entry.messaging : []) {
        const senderId = String(event.sender?.id ?? "");
        const text = String(event.message?.text ?? "").trim();
        if (!senderId || !text || event.message?.is_echo) continue;
        await persistMetaInbound({ channelType, accountId, senderId, text });
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Meta Webhook] Inbound processing failed", error);
    return res.status(500).json({ error: "Inbound processing failed" });
  }
});

async function persistMetaInbound({ channelType, accountId, senderId, text }: { channelType: "facebook" | "instagram"; accountId: string; senderId: string; text: string }) {
  const db = await getDb();
  if (!db) return;
  const candidates = await db.select().from(commChannels).where(and(eq(commChannels.type, channelType), eq(commChannels.isActive, 1)));
  const channel = candidates.find((candidate) => String((candidate.config as Record<string, unknown> | null)?.externalAccountId ?? "") === accountId);
  if (!channel) return;

  const contactKey = `meta:${channelType}:${senderId}`;
  let [contact] = await db.select().from(commContacts).where(and(eq(commContacts.userId, channel.userId), eq(commContacts.phone, contactKey))).limit(1);
  const now = Date.now();
  if (!contact) {
    const inserted = await db.insert(commContacts).values({
      userId: channel.userId,
      name: `${channelType === "instagram" ? "Instagram" : "Messenger"} contact`,
      phone: contactKey,
      tags: ["meta", channelType, senderId],
      createdAt: now,
      updatedAt: now,
    });
    const contactId = Number((inserted as any).insertId ?? (inserted as any)?.[0]?.insertId);
    [contact] = await db.select().from(commContacts).where(eq(commContacts.id, contactId)).limit(1);
  }
  if (!contact) return;

  let [conversation] = await db.select().from(conversations)
    .where(and(eq(conversations.userId, channel.userId), eq(conversations.contactId, contact.id), eq(conversations.channelType, channelType), eq(conversations.status, "open")))
    .limit(1);
  if (!conversation) {
    const inserted = await db.insert(conversations).values({
      userId: channel.userId,
      contactId: contact.id,
      channelType,
      status: "open",
      unreadCount: 1,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = Number((inserted as any).insertId ?? (inserted as any)?.[0]?.insertId);
    [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  } else {
    await db.update(conversations).set({ unreadCount: (conversation.unreadCount ?? 0) + 1, lastMessageAt: now, updatedAt: now }).where(eq(conversations.id, conversation.id));
  }
  if (!conversation) return;
  await db.insert(commMessages).values({
    conversationId: conversation.id,
    userId: channel.userId,
    direction: "inbound",
    sender: "contact",
    content: text,
    contentType: "text",
    status: "delivered",
    createdAt: now,
  });
}
