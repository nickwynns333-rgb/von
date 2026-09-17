import "dotenv/config";
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertAiAgent,
  agencyClients,
  aiAgents,
  creditPacks,
  creditPricing,
  creditTransactions,
  credits,
  knowledgeBase,
  plans,
  subscriptions,
  users,
  whiteLabelSettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  const dbUrl = process.env.DATABASE_URL || ENV.databaseUrl || "mysql://root@127.0.0.1:3306/vonwork";
  if (!_db && dbUrl) {
    try {
      _db = drizzle(dbUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "agency") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function getPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder);
}

export async function getPlanBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertPlan(plan: typeof plans.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(plans).values(plan).onDuplicateKeyUpdate({ set: { ...plan } });
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertSubscription(sub: typeof subscriptions.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(subscriptions).values(sub).onDuplicateKeyUpdate({ set: { ...sub } });
}

export async function updateSubscriptionByStripeId(
  stripeSubId: string,
  data: Partial<typeof subscriptions.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set(data).where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
}

// ─── Credits ──────────────────────────────────────────────────────────────────

export async function getUserCredits(userId: number) {
  const db = await getDb();
  if (!db) return { balance: 0, lifetimePurchased: 0, lifetimeUsed: 0 };
  const result = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
  if (result.length > 0) return result[0];
  await db.insert(credits).values({ userId, balance: 0, lifetimePurchased: 0, lifetimeUsed: 0 });
  return { balance: 0, lifetimePurchased: 0, lifetimeUsed: 0 };
}

export async function addCredits(
  userId: number,
  amount: number,
  type: typeof creditTransactions.$inferInsert["type"],
  description: string,
  extra?: Partial<typeof creditTransactions.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(credits)
    .values({ userId, balance: amount, lifetimePurchased: amount, lifetimeUsed: 0 })
    .onDuplicateKeyUpdate({
      set: {
        balance: sql`balance + ${amount}`,
        lifetimePurchased: sql`lifetimePurchased + ${amount}`,
      },
    });
  const updated = await getUserCredits(userId);
  await db.insert(creditTransactions).values({
    userId,
    amount,
    type,
    description,
    balanceAfter: updated.balance ?? 0,
    ...extra,
  });
}

export async function deductCredits(
  userId: number,
  amount: number,
  type: typeof creditTransactions.$inferInsert["type"],
  description: string,
  extra?: Partial<typeof creditTransactions.$inferInsert>
): Promise<{ success: boolean; balance: number }> {
  const db = await getDb();
  if (!db) return { success: false, balance: 0 };
  const current = await getUserCredits(userId);
  if ((current.balance ?? 0) < amount) return { success: false, balance: current.balance ?? 0 };
  await db
    .update(credits)
    .set({ balance: sql`balance - ${amount}`, lifetimeUsed: sql`lifetimeUsed + ${amount}` })
    .where(eq(credits.userId, userId));
  const updated = await getUserCredits(userId);
  await db.insert(creditTransactions).values({
    userId,
    amount: -amount,
    type,
    description,
    balanceAfter: updated.balance ?? 0,
    ...extra,
  });
  return { success: true, balance: updated.balance ?? 0 };
}

export async function getCreditTransactions(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

// ─── Credit Pricing ───────────────────────────────────────────────────────────

export async function getCreditPricing() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditPricing).where(eq(creditPricing.isActive, true));
}

export async function upsertCreditPricing(config: typeof creditPricing.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(creditPricing).values(config).onDuplicateKeyUpdate({ set: { ...config } });
}

// ─── Credit Packs ─────────────────────────────────────────────────────────────

export async function getCreditPacks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditPacks).where(eq(creditPacks.isActive, true)).orderBy(creditPacks.sortOrder);
}

// ─── AI Agents ────────────────────────────────────────────────────────────────

export async function getUserAgents(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiAgents).where(eq(aiAgents.userId, userId)).orderBy(desc(aiAgents.createdAt));
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiAgents).where(eq(aiAgents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAgentBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiAgents).where(eq(aiAgents.shareableSlug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAgent(agent: InsertAiAgent) {
  const db = await getDb();
  if (!db) return;
  return db.insert(aiAgents).values(agent);
}

export async function updateAgent(id: number, data: Partial<InsertAiAgent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiAgents).set(data).where(eq(aiAgents.id, id));
}

export async function deleteAgent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiAgents).set({ isActive: false }).where(eq(aiAgents.id, id));
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export async function getUserKnowledge(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knowledgeBase).where(eq(knowledgeBase.userId, userId)).orderBy(desc(knowledgeBase.createdAt));
}

export async function createKnowledgeEntry(entry: typeof knowledgeBase.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(knowledgeBase).values(entry);
}

// ─── Agency ───────────────────────────────────────────────────────────────────

export async function getAgencyClients(agencyUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ client: users, allocation: agencyClients })
    .from(agencyClients)
    .innerJoin(users, eq(agencyClients.clientUserId, users.id))
    .where(eq(agencyClients.agencyUserId, agencyUserId));
}

export async function addAgencyClient(agencyUserId: number, clientUserId: number, creditsAllocated = 0, inviteEmail = "") {
  const db = await getDb();
  if (!db) return;
  await db.insert(agencyClients).values({
    agencyUserId,
    clientUserId,
    creditsAllocated,
    inviteEmail: inviteEmail || "",
    status: "active",
  });
  await db.update(users).set({ agencyOwnerId: agencyUserId }).where(eq(users.id, clientUserId));
}

// ─── White Label ──────────────────────────────────────────────────────────────

export async function getWhiteLabelSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(whiteLabelSettings).where(eq(whiteLabelSettings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertWhiteLabelSettings(settings: typeof whiteLabelSettings.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(whiteLabelSettings).values(settings).onDuplicateKeyUpdate({ set: { ...settings } });
}

// ─── Seed default data ────────────────────────────────────────────────────────

export async function seedDefaultPlans() {
  const db = await getDb();
  if (!db) return;
  const defaultPlans: typeof plans.$inferInsert[] = [
    {
      name: "Starter", slug: "starter", priceMonthly: "499.00", priceAnnual: "4990.00",
      creditsPerMonth: 5000, maxAgents: 3, maxClients: 0,
      features: ["3 AI Agents", "5,000 Credits/mo", "AI Chat", "AI Receptionist", "Knowledge Base", "Email Support"],
      sortOrder: 1,
    },
    {
      name: "Pro", slug: "pro", priceMonthly: "997.00", priceAnnual: "9970.00",
      creditsPerMonth: 15000, maxAgents: 10, maxClients: 0,
      features: ["10 AI Agents", "15,000 Credits/mo", "All AI Features", "AI Video Sales Agent", "AI Outbound Dialer", "Priority Support"],
      sortOrder: 2,
    },
    {
      name: "Business", slug: "business", priceMonthly: "1997.00", priceAnnual: "19970.00",
      creditsPerMonth: 50000, maxAgents: 25, maxClients: 0,
      features: ["25 AI Agents", "50,000 Credits/mo", "All Pro Features", "AI CRM", "Automation Builder", "API Access", "Dedicated Support"],
      sortOrder: 3,
    },
    {
      name: "Enterprise", slug: "enterprise", priceMonthly: "4997.00", priceAnnual: "49970.00",
      creditsPerMonth: 200000, maxAgents: 100, maxClients: 0,
      features: ["Unlimited AI Agents", "200,000 Credits/mo", "All Business Features", "Custom Integrations", "SLA", "Dedicated Account Manager"],
      sortOrder: 4,
    },
    {
      name: "Agency", slug: "agency", priceMonthly: "2997.00", priceAnnual: "29970.00",
      creditsPerMonth: 100000, maxAgents: 50, maxClients: 50,
      features: ["50 Client Accounts", "100,000 Credits/mo", "White Label", "Custom Domain", "Client Management", "Revenue Share", "Agency Dashboard"],
      sortOrder: 5,
    },
  ];
  for (const plan of defaultPlans) {
    const existing = await getPlanBySlug(plan.slug);
    if (!existing) await db.insert(plans).values(plan);
  }
}

export async function seedCreditPacks() {
  const db = await getDb();
  if (!db) return;
  const packs: typeof creditPacks.$inferInsert[] = [
    { name: "Starter Pack", credits: 1000, priceUsd: "9.00", sortOrder: 1 },
    { name: "Growth Pack", credits: 5000, priceUsd: "39.00", sortOrder: 2 },
    { name: "Power Pack", credits: 15000, priceUsd: "99.00", sortOrder: 3 },
    { name: "Enterprise Pack", credits: 50000, priceUsd: "299.00", sortOrder: 4 },
  ];
  for (const pack of packs) {
    const existing = await db.select().from(creditPacks).where(eq(creditPacks.name, pack.name)).limit(1);
    if (existing.length === 0) await db.insert(creditPacks).values(pack);
  }
}
