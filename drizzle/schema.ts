import {
  bigint,
  boolean,
  decimal,
  int,
  json,
  longtext,
  mysqlEnum,
  mysqlTable,
  text,
  tinyint,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "agency"]).default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  agencyOwnerId: int("agencyOwnerId"), // null = direct customer, set = managed by agency
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Plans ────────────────────────────────────────────────────────────────────

export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(), // Basic, Pro, Business, Enterprise, Agency
  slug: varchar("slug", { length: 32 }).notNull().unique(), // basic, pro, business, enterprise, agency
  priceMonthly: decimal("priceMonthly", { precision: 10, scale: 2 }).notNull(),
  priceAnnual: decimal("priceAnnual", { precision: 10, scale: 2 }),
  creditsPerMonth: int("creditsPerMonth").notNull().default(0),
  maxAgents: int("maxAgents").notNull().default(1),
  maxClients: int("maxClients").notNull().default(0), // agency only
  features: json("features").$type<string[]>().notNull(),
  stripePriceIdMonthly: varchar("stripePriceIdMonthly", { length: 64 }),
  stripePriceIdAnnual: varchar("stripePriceIdAnnual", { length: 64 }),
  isActive: boolean("isActive").notNull().default(true),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planId: int("planId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 64 }),
  status: mysqlEnum("status", [
    "active",
    "trialing",
    "past_due",
    "canceled",
    "incomplete",
    "paused",
  ])
    .notNull()
    .default("active"),
  billingInterval: mysqlEnum("billingInterval", ["monthly", "annual"]).default("monthly"),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
  trialEnd: timestamp("trialEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;

// ─── Credits ──────────────────────────────────────────────────────────────────

export const credits = mysqlTable("credits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  balance: int("balance").notNull().default(0),
  lifetimePurchased: int("lifetimePurchased").notNull().default(0),
  lifetimeUsed: int("lifetimeUsed").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Credits = typeof credits.$inferSelect;

// ─── Credit Transactions ──────────────────────────────────────────────────────

export const creditTransactions = mysqlTable("credit_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(), // positive = added, negative = deducted
  type: mysqlEnum("type", [
    "subscription_grant",  // monthly credits from plan
    "purchase",            // one-time credit pack buy
    "admin_grant",         // admin manually added
    "agency_grant",        // agency allocated to client
    "usage_chat",          // AI chat message
    "usage_call",          // AI phone call minute
    "usage_meeting",       // AI video meeting minute
    "usage_voice",         // voice cloning / TTS
    "usage_presentation",  // presentation generation
    "usage_knowledge",     // knowledge base indexing
    "usage_image",         // image generation
    "usage_document",      // document analysis
    "refund",
  ]).notNull(),
  description: text("description"),
  featureType: varchar("featureType", { length: 64 }), // which VonWork feature was used
  modelUsed: varchar("modelUsed", { length: 128 }),    // e.g. "meta-llama/llama-3.1-8b-instruct"
  costUsd: decimal("costUsd", { precision: 10, scale: 6 }), // actual API cost in USD
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 64 }),
  balanceAfter: int("balanceAfter").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;

// ─── Credit Pricing Config ────────────────────────────────────────────────────

export const creditPricing = mysqlTable("credit_pricing", {
  id: int("id").autoincrement().primaryKey(),
  featureType: varchar("featureType", { length: 64 }).notNull().unique(),
  creditsPerUnit: int("creditsPerUnit").notNull(), // credits charged per unit of usage
  unitLabel: varchar("unitLabel", { length: 32 }).notNull(), // "message", "minute", "generation"
  defaultModel: varchar("defaultModel", { length: 128 }), // default OpenRouter model
  fallbackModel: varchar("fallbackModel", { length: 128 }), // fallback if primary fails
  isActive: boolean("isActive").notNull().default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditPricing = typeof creditPricing.$inferSelect;

// ─── AI Agents ────────────────────────────────────────────────────────────────

export const aiAgents = mysqlTable("ai_agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  type: mysqlEnum("type", [
    "receptionist",
    "outbound_caller",
    "video_sales",
    "chat",
    "appointment_setter",
    "customer_service",
    "sales_closer",
  ]).notNull(),
  model: varchar("model", { length: 128 }).notNull().default("meta-llama/llama-3.1-8b-instruct"),
  systemPrompt: text("systemPrompt"),
  personality: varchar("personality", { length: 64 }).default("professional"),
  tone: varchar("tone", { length: 64 }).default("friendly"),
  language: varchar("language", { length: 16 }).default("en"),
  avatarUrl: varchar("avatarUrl", { length: 512 }),
  avatarVideoKey: varchar("avatarVideoKey", { length: 512 }), // S3 key for uploaded avatar video/photo
  simliAvatarId: varchar("simliAvatarId", { length: 128 }), // Simli avatar ID for live video
  voiceId: varchar("voiceId", { length: 128 }),
  fishVoiceId: varchar("fishVoiceId", { length: 128 }), // Fish Audio cloned voice ID
  voiceReferenceKey: varchar("voiceReferenceKey", { length: 512 }), // S3 key for uploaded voice sample
  config: json("config").$type<Record<string, unknown>>(),
  shareableSlug: varchar("shareableSlug", { length: 64 }).unique(),
  isActive: boolean("isActive").notNull().default(true),
  totalConversations: int("totalConversations").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertAiAgent = typeof aiAgents.$inferInsert;

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export const knowledgeBase = mysqlTable("knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"), // null = global for this user
  name: varchar("name", { length: 256 }).notNull(),
  type: mysqlEnum("type", ["pdf", "url", "text", "csv", "docx"]).notNull(),
  storageKey: varchar("storageKey", { length: 512 }), // S3 key
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  status: mysqlEnum("status", ["pending", "processing", "ready", "failed"]).default("pending"),
  chunkCount: int("chunkCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KnowledgeBaseEntry = typeof knowledgeBase.$inferSelect;

// ─── Agency Clients ─── (defined below in Phase 5 white-label section) ─────────

// ─── White Label Settings ─────────────────────────────────────────────────────

export const whiteLabelSettings = mysqlTable("white_label_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  brandName: varchar("brandName", { length: 128 }),
  logoUrl: varchar("logoUrl", { length: 512 }),
  faviconUrl: varchar("faviconUrl", { length: 512 }),
  primaryColor: varchar("primaryColor", { length: 16 }).default("#6366f1"),
  accentColor: varchar("accentColor", { length: 16 }).default("#22d3ee"),
  customDomain: varchar("customDomain", { length: 256 }),
  customEmail: varchar("customEmail", { length: 320 }),
  hideVonworkBranding: boolean("hideVonworkBranding").notNull().default(false),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhiteLabelSettings = typeof whiteLabelSettings.$inferSelect;

// ─── Credit Packs (one-time purchase options) ─────────────────────────────────

export const creditPacks = mysqlTable("credit_packs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(), // e.g. "Starter Pack", "Power Pack"
  credits: int("credits").notNull(),
  priceUsd: decimal("priceUsd", { precision: 10, scale: 2 }).notNull(),
  stripePriceId: varchar("stripePriceId", { length: 64 }),
  isActive: boolean("isActive").notNull().default(true),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type CreditPack = typeof creditPacks.$inferSelect;

// ─── Feature Flags ────────────────────────────────────────────────────────────

export const featureFlags = mysqlTable("feature_flags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  allowedRoles: json("allowedRoles").$type<string[]>(),
  allowedUserIds: json("allowedUserIds").$type<number[]>(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeatureFlag = typeof featureFlags.$inferSelect;

// ─── Partner Levels ───────────────────────────────────────────────────────────

export const partnerLevels = mysqlTable("partner_levels", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 32 }).notNull().unique(), // bronze, silver, gold, platinum, diamond
  minMrr: decimal("minMrr", { precision: 10, scale: 2 }).notNull().default("0"),
  minSubscribers: int("minSubscribers").notNull().default(0),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull(), // e.g. 20.00 = 20%
  bonusRate: decimal("bonusRate", { precision: 5, scale: 2 }).default("0"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PartnerLevel = typeof partnerLevels.$inferSelect;

// ─── Partners ─────────────────────────────────────────────────────────────────

export const partners = mysqlTable("partners", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  type: mysqlEnum("type", ["affiliate", "reseller", "agency"]).notNull().default("affiliate"),
  levelId: int("levelId"), // FK to partner_levels
  referralCode: varchar("referralCode", { length: 32 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "active", "suspended", "banned"]).notNull().default("pending"),
  payoutMethod: mysqlEnum("payoutMethod", [
    "stripe_connect", "paypal", "wise", "ach", "bitcoin", "usdt", "manual"
  ]).default("manual"),
  payoutDetails: json("payoutDetails").$type<Record<string, string>>(), // payout account info
  stripeConnectId: varchar("stripeConnectId", { length: 64 }),
  totalClicks: int("totalClicks").notNull().default(0),
  totalSignups: int("totalSignups").notNull().default(0),
  totalActiveCustomers: int("totalActiveCustomers").notNull().default(0),
  totalMrrGenerated: decimal("totalMrrGenerated", { precision: 10, scale: 2 }).notNull().default("0"),
  totalCommissionsEarned: decimal("totalCommissionsEarned", { precision: 10, scale: 2 }).notNull().default("0"),
  totalCommissionsPaid: decimal("totalCommissionsPaid", { precision: 10, scale: 2 }).notNull().default("0"),
  isFraudFlagged: boolean("isFraudFlagged").notNull().default(false),
  notes: text("notes"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;

// ─── Commission Plans ─────────────────────────────────────────────────────────

export const commissionPlans = mysqlTable("commission_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  type: mysqlEnum("type", [
    "percentage",       // % of sale
    "fixed",            // fixed $ amount
    "percentage_bonus", // % + fixed bonus
    "tiered",           // tiered by volume
    "recurring",        // % every month
    "one_time",         // one-time on first payment
    "credit_reward",    // AI credits per sale
    "hybrid",           // cash + credits
  ]).notNull().default("percentage"),
  rate: decimal("rate", { precision: 5, scale: 2 }).default("0"),       // percentage rate
  fixedAmount: decimal("fixedAmount", { precision: 10, scale: 2 }).default("0"), // fixed $
  creditReward: int("creditReward").default(0),                          // credits per sale
  tierConfig: json("tierConfig").$type<{ minSales: number; rate: number }[]>(), // tiered config
  isRecurring: boolean("isRecurring").notNull().default(false),
  recurringMonths: int("recurringMonths").default(0), // 0 = lifetime
  isDefault: boolean("isDefault").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommissionPlan = typeof commissionPlans.$inferSelect;

// ─── Partner Commission Plan Overrides ───────────────────────────────────────

export const partnerCommissionOverrides = mysqlTable("partner_commission_overrides", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  commissionPlanId: int("commissionPlanId").notNull(),
  overrideType: mysqlEnum("overrideType", [
    "partner",      // specific partner
    "plan",         // by subscription plan
    "product",      // by product
    "campaign",     // by campaign
    "coupon",       // by coupon code
    "level",        // by partner level
  ]).notNull(),
  overrideKey: varchar("overrideKey", { length: 128 }), // e.g. plan slug, coupon code
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Referrals ────────────────────────────────────────────────────────────────

export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  referredUserId: int("referredUserId"),       // set when user signs up
  referralCode: varchar("referralCode", { length: 32 }).notNull(),
  promoCode: varchar("promoCode", { length: 32 }),
  attribution: mysqlEnum("attribution", ["first_click", "last_click", "direct"]).default("last_click"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  landingPage: varchar("landingPage", { length: 512 }),
  clickedAt: timestamp("clickedAt").defaultNow().notNull(),
  signedUpAt: timestamp("signedUpAt"),
  convertedAt: timestamp("convertedAt"),       // first payment
  status: mysqlEnum("status", ["clicked", "signed_up", "converted", "refunded", "fraud"]).default("clicked"),
});

export type Referral = typeof referrals.$inferSelect;

// ─── Commissions ─────────────────────────────────────────────────────────────

export const commissions = mysqlTable("commissions", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  referralId: int("referralId"),
  referredUserId: int("referredUserId"),
  commissionPlanId: int("commissionPlanId"),
  type: mysqlEnum("type", [
    "percentage", "fixed", "percentage_bonus", "tiered",
    "recurring", "one_time", "credit_reward", "hybrid",
    "level1", "level2", "level3",   // multi-level
  ]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0"), // $ amount
  creditAmount: int("creditAmount").notNull().default(0),                         // credit amount
  saleAmount: decimal("saleAmount", { precision: 10, scale: 2 }),                // original sale $
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 64 }),
  status: mysqlEnum("status", [
    "pending",    // awaiting eligibility check
    "eligible",   // passed membership check
    "approved",   // admin approved
    "paid",       // payout sent
    "paused",     // membership lapsed
    "rejected",   // admin rejected
    "fraud",      // flagged as fraud
  ]).notNull().default("pending"),
  eligibleAt: timestamp("eligibleAt"),  // when it becomes payable
  approvedAt: timestamp("approvedAt"),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Commission = typeof commissions.$inferSelect;

// ─── Payout Requests ─────────────────────────────────────────────────────────

export const payoutRequests = mysqlTable("payout_requests", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: mysqlEnum("method", [
    "stripe_connect", "paypal", "wise", "ach", "bitcoin", "usdt", "manual"
  ]).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "paid", "rejected"]).notNull().default("pending"),
  stripeTransferId: varchar("stripeTransferId", { length: 64 }),
  transactionRef: varchar("transactionRef", { length: 256 }), // external tx ID
  notes: text("notes"),
  adminNotes: text("adminNotes"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});

export type PayoutRequest = typeof payoutRequests.$inferSelect;

// ─── Fraud Flags ──────────────────────────────────────────────────────────────

export const fraudFlags = mysqlTable("fraud_flags", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  referralId: int("referralId"),
  reason: mysqlEnum("reason", [
    "self_referral", "duplicate_account", "vpn_abuse",
    "cookie_manipulation", "fake_purchase", "refund_abuse", "suspicious_pattern"
  ]).notNull(),
  details: text("details"),
  severity: mysqlEnum("severity", ["low", "medium", "high"]).notNull().default("medium"),
  isResolved: boolean("isResolved").notNull().default(false),
  resolvedBy: int("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  flaggedAt: timestamp("flaggedAt").defaultNow().notNull(),
});

export type FraudFlag = typeof fraudFlags.$inferSelect;

// ─── Marketing Assets ─────────────────────────────────────────────────────────

export const marketingAssets = mysqlTable("marketing_assets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  type: mysqlEnum("type", [
    "banner", "logo", "email_template", "social_graphic",
    "presentation", "video", "case_study", "sales_script", "other"
  ]).notNull(),
  storageKey: varchar("storageKey", { length: 512 }),
  url: varchar("url", { length: 1024 }),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  downloadCount: int("downloadCount").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MarketingAsset = typeof marketingAssets.$inferSelect;

// ─── AI Meetings (Video Sales Agent) ─────────────────────────────────────────

export const aiMeetings = mysqlTable("ai_meetings", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 256 }),
  prospectEmail: varchar("prospectEmail", { length: 320 }),
  prospectName: varchar("prospectName", { length: 128 }),
  status: mysqlEnum("status", ["scheduled", "waiting", "live", "ended", "cancelled"]).notNull().default("scheduled"),
  livekitRoomName: varchar("livekitRoomName", { length: 128 }),
  presentationId: int("presentationId"),
  recordingUrl: varchar("recordingUrl", { length: 1024 }),
  transcriptStorageKey: varchar("transcriptStorageKey", { length: 512 }),
  summary: text("summary"),
  durationSeconds: int("durationSeconds").default(0),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiMeeting = typeof aiMeetings.$inferSelect;

// ─── AI Presentations ─────────────────────────────────────────────────────────

export const aiPresentations = mysqlTable("ai_presentations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  title: varchar("title", { length: 256 }).notNull(),
  prompt: text("prompt"),
  slides: json("slides").$type<{ title: string; content: string; notes: string; imageUrl?: string }[]>().notNull(),
  theme: varchar("theme", { length: 32 }).default("dark"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiPresentation = typeof aiPresentations.$inferSelect;

// ─── Knowledge Bases ──────────────────────────────────────────────────────────
export const knowledgeBases = mysqlTable("knowledge_bases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"), // optional: link to a specific AI agent
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  isDefault: boolean("isDefault").notNull().default(false),
  docCount: int("docCount").notNull().default(0),
  chunkCount: int("chunkCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBases.$inferInsert;

// ─── KB Documents ─────────────────────────────────────────────────────────────
export const kbDocuments = mysqlTable("kb_documents", {
  id: int("id").autoincrement().primaryKey(),
  kbId: int("kbId").notNull(),
  userId: int("userId").notNull(),
  filename: varchar("filename", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1024 }),
  fileKey: varchar("fileKey", { length: 512 }),
  mimeType: varchar("mimeType", { length: 128 }).notNull().default("text/plain"),
  status: mysqlEnum("status", ["pending", "processing", "ready", "error"]).notNull().default("pending"),
  charCount: int("charCount").notNull().default(0),
  chunkCount: int("chunkCount").notNull().default(0),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type KbDocument = typeof kbDocuments.$inferSelect;
export type InsertKbDocument = typeof kbDocuments.$inferInsert;

// ─── KB Chunks (with embedding stored as JSON array) ─────────────────────────
export const kbChunks = mysqlTable("kb_chunks", {
  id: int("id").autoincrement().primaryKey(),
  docId: int("docId").notNull(),
  kbId: int("kbId").notNull(),
  userId: int("userId").notNull(),
  chunkIndex: int("chunkIndex").notNull(),
  content: text("content").notNull(),
  // Embedding stored as JSON array of floats (1536 dims for text-embedding-3-small)
  embedding: json("embedding").$type<number[]>(),
  tokenCount: int("tokenCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type KbChunk = typeof kbChunks.$inferSelect;
export type InsertKbChunk = typeof kbChunks.$inferInsert;

// ─── White-Label Configs ──────────────────────────────────────────────────────
export const whiteLabelConfigs = mysqlTable("white_label_configs", {
  id: int("id").autoincrement().primaryKey(),
  agencyUserId: int("agencyUserId").notNull().unique(),
  brandName: varchar("brandName", { length: 128 }).notNull().default("VonWork"),
  logoUrl: varchar("logoUrl", { length: 1024 }),
  faviconUrl: varchar("faviconUrl", { length: 1024 }),
  primaryColor: varchar("primaryColor", { length: 16 }).notNull().default("#7c3aed"),
  secondaryColor: varchar("secondaryColor", { length: 16 }).notNull().default("#06b6d4"),
  accentColor: varchar("accentColor", { length: 16 }).notNull().default("#10b981"),
  backgroundColor: varchar("backgroundColor", { length: 16 }).notNull().default("#030712"),
  textColor: varchar("textColor", { length: 16 }).notNull().default("#f9fafb"),
  fontFamily: varchar("fontFamily", { length: 128 }).notNull().default("Inter"),
  customCss: text("customCss"),
  supportEmail: varchar("supportEmail", { length: 320 }),
  supportPhone: varchar("supportPhone", { length: 32 }),
  footerText: varchar("footerText", { length: 512 }),
  hideVonworkBranding: boolean("hideVonworkBranding").notNull().default(false),
  customLoginMessage: varchar("customLoginMessage", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WhiteLabelConfig = typeof whiteLabelConfigs.$inferSelect;
export type InsertWhiteLabelConfig = typeof whiteLabelConfigs.$inferInsert;

// ─── Custom Domains ───────────────────────────────────────────────────────────
export const customDomains = mysqlTable("custom_domains", {
  id: int("id").autoincrement().primaryKey(),
  agencyUserId: int("agencyUserId").notNull(),
  domain: varchar("domain", { length: 253 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "verifying", "active", "failed", "suspended"]).notNull().default("pending"),
  verificationToken: varchar("verificationToken", { length: 64 }),
  verifiedAt: timestamp("verifiedAt"),
  sslStatus: mysqlEnum("sslStatus", ["none", "pending", "active", "expired"]).notNull().default("none"),
  sslExpiresAt: timestamp("sslExpiresAt"),
  isPrimary: boolean("isPrimary").notNull().default(false),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomDomain = typeof customDomains.$inferSelect;
export type InsertCustomDomain = typeof customDomains.$inferInsert;

// ─── Agency Clients (sub-accounts) ───────────────────────────────────────────
export const agencyClients = mysqlTable("agency_clients", {
  id: int("id").autoincrement().primaryKey(),
  agencyUserId: int("agencyUserId").notNull(),
  clientUserId: int("clientUserId"),
  inviteEmail: varchar("inviteEmail", { length: 320 }).notNull(),
  inviteToken: varchar("inviteToken", { length: 64 }),
  status: mysqlEnum("status", ["invited", "active", "suspended", "removed"]).notNull().default("invited"),
  creditLimit: int("creditLimit").notNull().default(1000),
  creditsAllocated: int("creditsAllocated").notNull().default(0),
  agentLimit: int("agentLimit").notNull().default(5),
  customLabel: varchar("customLabel", { length: 128 }),
  notes: text("notes"),
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgencyClient = typeof agencyClients.$inferSelect;
export type InsertAgencyClient = typeof agencyClients.$inferInsert;

// ─── Phase 3: Telephony ──────────────────────────────────────────────────────

export const phoneNumbers = mysqlTable("phone_numbers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  telnyxNumberId: varchar("telnyxNumberId", { length: 128 }),
  phoneNumber: varchar("phoneNumber", { length: 32 }).notNull(),
  friendlyName: varchar("friendlyName", { length: 128 }),
  countryCode: varchar("countryCode", { length: 4 }).notNull().default("US"),
  capabilities: varchar("capabilities", { length: 64 }).notNull().default("voice,sms"),
  status: mysqlEnum("status", ["active", "pending", "released", "failed"]).notNull().default("pending"),
  forwardTo: varchar("forwardTo", { length: 32 }),
  ivrEnabled: boolean("ivrEnabled").notNull().default(false),
  ivrScript: text("ivrScript"),
  monthlyRateCents: int("monthlyRateCents").notNull().default(100),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const callLogs = mysqlTable("call_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  phoneNumberId: int("phoneNumberId"),
  telnyxCallControlId: varchar("telnyxCallControlId", { length: 256 }),
  telnyxCallLegId: varchar("telnyxCallLegId", { length: 256 }),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  fromNumber: varchar("fromNumber", { length: 32 }).notNull(),
  toNumber: varchar("toNumber", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["initiated", "ringing", "answered", "completed", "failed", "busy", "no_answer"]).notNull().default("initiated"),
  durationSeconds: int("durationSeconds").notNull().default(0),
  costCents: int("costCents").notNull().default(0),
  creditsCharged: int("creditsCharged").notNull().default(0),
  recordingUrl: text("recordingUrl"),
  transcription: text("transcription"),
  aiSummary: text("aiSummary"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  answeredAt: timestamp("answeredAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ivrMenus = mysqlTable("ivr_menus", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  phoneNumberId: int("phoneNumberId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  greeting: text("greeting").notNull(),
  options: text("options").notNull(), // JSON: [{key: "1", action: "forward", value: "+1..."}, ...]
  fallbackAction: varchar("fallbackAction", { length: 32 }).notNull().default("agent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = typeof phoneNumbers.$inferInsert;
export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;
export type IvrMenu = typeof ivrMenus.$inferSelect;

// ─── Phase 3: Chat Widgets ───────────────────────────────────────────────────

export const chatWidgets = mysqlTable("chat_widgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  widgetKey: varchar("widgetKey", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  greeting: text("greeting").notNull().default("Hi! How can I help you today?"),
  primaryColor: varchar("primaryColor", { length: 16 }).notNull().default("#6366f1"),
  accentColor: varchar("accentColor", { length: 16 }).notNull().default("#22d3ee"),
  position: mysqlEnum("position", ["bottom-right", "bottom-left", "top-right", "top-left"]).notNull().default("bottom-right"),
  avatarUrl: text("avatarUrl"),
  botName: varchar("botName", { length: 64 }).notNull().default("AI Assistant"),
  placeholder: varchar("placeholder", { length: 128 }).notNull().default("Type a message..."),
  allowedDomains: text("allowedDomains"), // comma-separated list, null = all
  collectEmail: boolean("collectEmail").notNull().default(false),
  collectName: boolean("collectName").notNull().default(false),
  showBranding: boolean("showBranding").notNull().default(true),
  isActive: boolean("isActive").notNull().default(true),
  totalConversations: int("totalConversations").notNull().default(0),
  totalMessages: int("totalMessages").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const widgetConversations = mysqlTable("widget_conversations", {
  id: int("id").autoincrement().primaryKey(),
  widgetId: int("widgetId").notNull(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  visitorName: varchar("visitorName", { length: 128 }),
  visitorEmail: varchar("visitorEmail", { length: 320 }),
  visitorIp: varchar("visitorIp", { length: 64 }),
  pageUrl: text("pageUrl"),
  messages: text("messages").notNull().default("[]"), // JSON array
  status: mysqlEnum("status", ["active", "resolved", "abandoned"]).notNull().default("active"),
  creditsUsed: int("creditsUsed").notNull().default(0),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type ChatWidget = typeof chatWidgets.$inferSelect;
export type InsertChatWidget = typeof chatWidgets.$inferInsert;
export type WidgetConversation = typeof widgetConversations.$inferSelect;

// ─── Data Marketplace ────────────────────────────────────────────────────────

export const dataPackages = mysqlTable("data_packages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  industry: varchar("industry", { length: 128 }).notNull(), // "dentists", "doctors", "lawyers", etc.
  state: varchar("state", { length: 64 }), // null = nationwide
  city: varchar("city", { length: 128 }),
  recordCount: int("recordCount").notNull().default(0),
  priceCredits: int("priceCredits").notNull().default(500), // credits to purchase
  fileKey: varchar("fileKey", { length: 512 }), // S3 key for the CSV
  fileUrl: varchar("fileUrl", { length: 1024 }),
  sampleData: text("sampleData"), // JSON: first 3 rows preview
  tags: varchar("tags", { length: 512 }), // comma-separated
  isActive: boolean("isActive").notNull().default(true),
  totalPurchases: int("totalPurchases").notNull().default(0),
  uploadedBy: int("uploadedBy").notNull(), // admin userId
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DataPackage = typeof dataPackages.$inferSelect;
export type InsertDataPackage = typeof dataPackages.$inferInsert;

export const dataPurchases = mysqlTable("data_purchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  packageId: int("packageId").notNull(),
  creditsSpent: int("creditsSpent").notNull(),
  affiliateId: int("affiliateId"), // affiliate who referred this user
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
});

export type DataPurchase = typeof dataPurchases.$inferSelect;

export const campaignRuns = mysqlTable("campaign_runs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  packageId: int("packageId").notNull(),
  agentId: int("agentId"), // AI agent to use for calls
  name: varchar("name", { length: 256 }).notNull(),
  status: mysqlEnum("status", ["draft", "queued", "running", "paused", "completed", "failed"]).notNull().default("draft"),
  callScript: text("callScript"), // AI call script
  demoLinkSlug: varchar("demoLinkSlug", { length: 128 }), // /demo/:slug → AI video sales agent
  callsTotal: int("callsTotal").notNull().default(0),
  callsCompleted: int("callsCompleted").notNull().default(0),
  callsAnswered: int("callsAnswered").notNull().default(0),
  callsFailed: int("callsFailed").notNull().default(0),
  emailsCollected: int("emailsCollected").notNull().default(0),
  linksDropped: int("linksDropped").notNull().default(0),
  meetingsBooked: int("meetingsBooked").notNull().default(0),
  creditsUsed: int("creditsUsed").notNull().default(0),
  affiliateId: int("affiliateId"), // affiliate who drove this campaign
  testMode: boolean("testMode").notNull().default(true),
  outreachApprovalStatus: mysqlEnum("outreachApprovalStatus", ["DRAFT", "APPROVED", "REJECTED"]).notNull().default("DRAFT"),
  outreachApprovedAt: timestamp("outreachApprovedAt"),
  outreachApprovedBy: int("outreachApprovedBy"),
  scheduledAt: timestamp("scheduledAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignRun = typeof campaignRuns.$inferSelect;
export type InsertCampaignRun = typeof campaignRuns.$inferInsert;

export const campaignLeads = mysqlTable("campaign_leads", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  businessName: varchar("businessName", { length: 256 }),
  phone: varchar("phone", { length: 32 }).notNull(),
  address: varchar("address", { length: 512 }),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  email: varchar("email", { length: 320 }), // collected during call
  decisionMakerName: varchar("decisionMakerName", { length: 256 }),
  callStatus: mysqlEnum("callStatus", ["pending", "calling", "answered", "voicemail", "no_answer", "busy", "failed", "do_not_call"]).notNull().default("pending"),
  callLogId: int("callLogId"),
  demoLinkSent: boolean("demoLinkSent").notNull().default(false),
  demoLinkClickedAt: timestamp("demoLinkClickedAt"),
  meetingBookedAt: timestamp("meetingBookedAt"),
  presentationCompletedAt: timestamp("presentationCompletedAt"),
  convertedAt: timestamp("convertedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignLead = typeof campaignLeads.$inferSelect;
export type InsertCampaignLead = typeof campaignLeads.$inferInsert;

// ─── Appointment Engine ───────────────────────────────────────────────────────
// Business profile for service businesses using the appointment engine
export const serviceBusinesses = mysqlTable("service_businesses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  industry: varchar("industry", { length: 64 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 8 }),
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/Chicago"),
  bookingUrl: varchar("bookingUrl", { length: 512 }),
  aiGreeting: text("aiGreeting"),
  confirmationMsg: text("confirmationMsg"),
  reminderMsg: text("reminderMsg"),
  followUpMsg: text("followUpMsg"),
  upsellMsg: text("upsellMsg"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ServiceBusiness = typeof serviceBusinesses.$inferSelect;
export type InsertServiceBusiness = typeof serviceBusinesses.$inferInsert;

// Customer/patient records for a service business
export const serviceCustomers = mysqlTable("service_customers", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  name: varchar("name", { length: 256 }),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 8 }),
  notes: text("notes"),
  tags: varchar("tags", { length: 512 }),
  lastServiceDate: timestamp("lastServiceDate"),
  nextFollowUpDate: timestamp("nextFollowUpDate"),
  totalAppointments: int("totalAppointments").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ServiceCustomer = typeof serviceCustomers.$inferSelect;
export type InsertServiceCustomer = typeof serviceCustomers.$inferInsert;

// Appointments booked by AI or manually
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  customerId: int("customerId"),
  customerName: varchar("customerName", { length: 256 }),
  customerPhone: varchar("customerPhone", { length: 32 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  serviceType: varchar("serviceType", { length: 256 }),
  scheduledAt: timestamp("scheduledAt").notNull(),
  durationMinutes: int("durationMinutes").notNull().default(60),
  status: mysqlEnum("status", ["pending", "confirmed", "reminded", "completed", "cancelled", "no_show"]).notNull().default("pending"),
  notes: text("notes"),
  bookedVia: mysqlEnum("bookedVia", ["ai_call", "ai_chat", "manual", "online", "referral"]).notNull().default("manual"),
  reminderSentAt: timestamp("reminderSentAt"),
  confirmationSentAt: timestamp("confirmationSentAt"),
  followUpSentAt: timestamp("followUpSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// AI follow-up / upsell / reminder sequences
export const followUpSequences = mysqlTable("follow_up_sequences", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  type: mysqlEnum("type", [
    "appointment_reminder",
    "post_service_followup",
    "upsell_inspection",
    "re_engagement",
    "review_request",
    "referral_ask",
    "custom",
  ]).notNull().default("custom"),
  triggerType: mysqlEnum("triggerType", [
    "hours_before_appointment",
    "hours_after_appointment",
    "days_after_last_service",
    "days_since_last_contact",
    "manual",
  ]).notNull().default("manual"),
  triggerValue: int("triggerValue").notNull().default(24),
  channel: mysqlEnum("channel", ["ai_call", "sms", "email", "all"]).notNull().default("ai_call"),
  messageTemplate: text("messageTemplate").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  totalSent: int("totalSent").notNull().default(0),
  totalResponded: int("totalResponded").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FollowUpSequence = typeof followUpSequences.$inferSelect;
export type InsertFollowUpSequence = typeof followUpSequences.$inferInsert;

// Log of each follow-up/reminder execution
export const followUpLogs = mysqlTable("follow_up_logs", {
  id: int("id").autoincrement().primaryKey(),
  sequenceId: int("sequenceId").notNull(),
  businessId: int("businessId").notNull(),
  customerId: int("customerId"),
  appointmentId: int("appointmentId"),
  customerPhone: varchar("customerPhone", { length: 32 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  channel: varchar("channel", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "delivered", "responded", "failed", "opted_out"]).notNull().default("pending"),
  messageContent: text("messageContent"),
  responseContent: text("responseContent"),
  sentAt: timestamp("sentAt"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FollowUpLog = typeof followUpLogs.$inferSelect;
export type InsertFollowUpLog = typeof followUpLogs.$inferInsert;

// ─── AI Interaction Logs ──────────────────────────────────────────────────────
export const aiInteractionLogs = mysqlTable("ai_interaction_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  agentId: int("agent_id"),
  sessionId: varchar("session_id", { length: 128 }),
  model: varchar("model", { length: 128 }).notNull(),
  promptTokens: int("prompt_tokens").default(0),
  completionTokens: int("completion_tokens").default(0),
  totalTokens: int("total_tokens").default(0),
  costUsd: decimal("cost_usd", { precision: 10, scale: 6 }).default("0"),
  creditsDeducted: int("credits_deducted").default(0),
  feature: varchar("feature", { length: 64 }),
  latencyMs: int("latency_ms"),
  success: tinyint("success").default(1),
  errorMessage: text("error_message"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AiInteractionLog = typeof aiInteractionLogs.$inferSelect;
export type InsertAiInteractionLog = typeof aiInteractionLogs.$inferInsert;

// ─── Feature Flag Overrides ───────────────────────────────────────────────────
export const featureFlagOverrides = mysqlTable("feature_flag_overrides", {
  id: int("id").autoincrement().primaryKey(),
  flagName: varchar("flag_name", { length: 128 }).notNull(),
  userId: int("user_id"),
  role: varchar("role", { length: 32 }),
  enabled: tinyint("enabled").default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FeatureFlagOverride = typeof featureFlagOverrides.$inferSelect;
export type InsertFeatureFlagOverride = typeof featureFlagOverrides.$inferInsert;

// ─── Prompt Templates ─────────────────────────────────────────────────────────
export const promptTemplates = mysqlTable("prompt_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  industry: varchar("industry", { length: 80 }).notNull().default("general"),
  agentType: varchar("agent_type", { length: 60 }).notNull().default("chat"),
  content: text("content").notNull(),
  isSystem: tinyint("is_system").notNull().default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplates.$inferInsert;

// ─── AI SEO Projects ──────────────────────────────────────────────────────────
export const seoProjects = mysqlTable("seo_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  tier: mysqlEnum("tier", ["starter", "growth", "agency"]).notNull().default("starter"),
  lastAuditAt: bigint("last_audit_at", { mode: "number" }),
  auditScore: int("audit_score"),
  keywords: text("keywords"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type SeoProject = typeof seoProjects.$inferSelect;
export type InsertSeoProject = typeof seoProjects.$inferInsert;

// ─── SEO Audit Reports ────────────────────────────────────────────────────────
export const seoAuditReports = mysqlTable("seo_audit_reports", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  userId: int("user_id").notNull(),
  auditType: mysqlEnum("audit_type", ["full", "technical", "content", "schema", "geo", "local", "backlinks", "keywords"]).notNull().default("full"),
  score: int("score"),
  findings: text("findings"),
  rawResponse: text("raw_response"),
  creditsUsed: int("credits_used").default(5),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type SeoAuditReport = typeof seoAuditReports.$inferSelect;
export type InsertSeoAuditReport = typeof seoAuditReports.$inferInsert;

// ─── SEO Subscriptions ────────────────────────────────────────────────────────
export const seoSubscriptions = mysqlTable("seo_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  tier: mysqlEnum("tier", ["starter", "growth", "agency"]).notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "past_due", "trialing"]).notNull().default("trialing"),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 256 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 256 }),
  currentPeriodEnd: bigint("current_period_end", { mode: "number" }),
  projectsLimit: int("projects_limit").notNull().default(1),
  auditsPerMonth: int("audits_per_month").notNull().default(4),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type SeoSubscription = typeof seoSubscriptions.$inferSelect;
export type InsertSeoSubscription = typeof seoSubscriptions.$inferInsert;

// ─── User Memory Brain (OpenWolf-style) ───────────────────────────────────────
export const userMemory = mysqlTable("user_memory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  preferences: text("preferences"),
  corrections: text("corrections"),
  doNotRepeat: text("do_not_repeat"),
  contextDigest: text("context_digest"),
  interactionCount: int("interaction_count").default(0),
  agentsUsed: text("agents_used"),
  topicsDiscussed: text("topics_discussed"),
  businessName: varchar("business_name", { length: 128 }),
  industry: varchar("industry", { length: 64 }),
  goals: text("goals"),
  lastActiveAt: bigint("last_active_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type UserMemory = typeof userMemory.$inferSelect;
export type InsertUserMemory = typeof userMemory.$inferInsert;

// ─── Memory Interactions Log ──────────────────────────────────────────────────
export const memoryInteractions = mysqlTable("memory_interactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  agentId: int("agent_id"),
  agentName: varchar("agent_name", { length: 128 }),
  userMessage: text("user_message").notNull(),
  agentResponse: text("agent_response").notNull(),
  topicTags: text("topic_tags"),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]).default("neutral"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type MemoryInteraction = typeof memoryInteractions.$inferSelect;
export type InsertMemoryInteraction = typeof memoryInteractions.$inferInsert;

// ─── Accounting Clients ───────────────────────────────────────────────────────
export const accountingClients = mysqlTable("accounting_clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  businessType: mysqlEnum("business_type", ["sole_trader", "llc", "s_corp", "c_corp", "partnership", "trust", "individual"]).default("llc"),
  industry: varchar("industry", { length: 100 }),
  fiscalYearEnd: varchar("fiscal_year_end", { length: 10 }).default("12-31"),
  subscriptionTier: mysqlEnum("subscription_tier", ["ai_bookkeeper", "ai_accounting", "ai_cfo", "enterprise"]).default("ai_bookkeeper"),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  status: mysqlEnum("status", ["active", "paused", "cancelled"]).default("active"),
  assignedTeamMemberId: int("assigned_team_member_id"),
  onboardedAt: bigint("onboarded_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AccountingClient = typeof accountingClients.$inferSelect;
export type InsertAccountingClient = typeof accountingClients.$inferInsert;

// ─── Financial Transactions ───────────────────────────────────────────────────
export const financialTransactions = mysqlTable("financial_transactions", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id").notNull(),
  userId: int("user_id").notNull(),
  date: bigint("date", { mode: "number" }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["income", "expense", "transfer", "adjustment"]).notNull(),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  account: varchar("account", { length: 100 }),
  vendor: varchar("vendor", { length: 255 }),
  receiptUrl: text("receipt_url"),
  receiptKey: varchar("receipt_key", { length: 500 }),
  aiCategorized: boolean("ai_categorized").default(false),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }),
  humanReviewed: boolean("human_reviewed").default(false),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = typeof financialTransactions.$inferInsert;

// ─── Tax Orders ───────────────────────────────────────────────────────────────
export const taxOrders = mysqlTable("tax_orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  clientId: int("client_id"),
  formType: mysqlEnum("form_type", ["1040_single", "1040_mfj", "1040_mfs", "1120", "1120s", "1065", "1041", "quarterly_corp", "quarterly_llc"]).notNull(),
  taxYear: int("tax_year").notNull(),
  state: varchar("state", { length: 50 }),
  extraSchedules: int("extra_schedules").default(0),
  extraStates: int("extra_states").default(0),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "documents_requested", "in_progress", "review", "completed", "filed"]).default("pending"),
  assignedTeamMemberId: int("assigned_team_member_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  documentsUrl: text("documents_url"),
  completedDocumentsUrl: text("completed_documents_url"),
  notes: text("notes"),
  dueDate: bigint("due_date", { mode: "number" }),
  filedDate: bigint("filed_date", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type TaxOrder = typeof taxOrders.$inferSelect;
export type InsertTaxOrder = typeof taxOrders.$inferInsert;

// ─── Exception Queue ──────────────────────────────────────────────────────────
export const exceptionQueue = mysqlTable("exception_queue", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id").notNull(),
  userId: int("user_id").notNull(),
  type: mysqlEnum("type", ["categorization", "reconciliation", "tax_question", "document_review", "payroll", "other"]).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  contextData: json("context_data"),
  status: mysqlEnum("status", ["open", "assigned", "in_progress", "resolved", "escalated"]).default("open"),
  assignedTo: int("assigned_to"),
  resolution: text("resolution"),
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type ExceptionQueueItem = typeof exceptionQueue.$inferSelect;
export type InsertExceptionQueueItem = typeof exceptionQueue.$inferInsert;

// ─── Indian Team Members ──────────────────────────────────────────────────────
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["bookkeeper", "accountant", "tax_specialist", "senior_accountant", "manager"]).default("bookkeeper"),
  specialization: varchar("specialization", { length: 255 }),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).default("10.00"),
  isActive: boolean("is_active").default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// ─── Team Tasks ───────────────────────────────────────────────────────────────
export const teamTasks = mysqlTable("team_tasks", {
  id: int("id").autoincrement().primaryKey(),
  teamMemberId: int("team_member_id").notNull(),
  clientId: int("client_id"),
  taxOrderId: int("tax_order_id"),
  exceptionId: int("exception_id"),
  taskType: mysqlEnum("task_type", ["bookkeeping", "tax_prep", "payroll", "reconciliation", "review", "cleanup", "other"]).notNull(),
  description: text("description").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 6, scale: 2 }),
  rateType: mysqlEnum("rate_type", ["standard", "cleanup"]).default("standard"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).default("10.00"),
  amountBilled: decimal("amount_billed", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "billed"]).default("pending"),
  startedAt: bigint("started_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type TeamTask = typeof teamTasks.$inferSelect;
export type InsertTeamTask = typeof teamTasks.$inferInsert;

// ─── AI CFO Conversations ─────────────────────────────────────────────────────
export const cfoConversations = mysqlTable("cfo_conversations", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id").notNull(),
  userId: int("user_id").notNull(),
  messages: json("messages").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CfoConversation = typeof cfoConversations.$inferSelect;
export type InsertCfoConversation = typeof cfoConversations.$inferInsert;

// ─── Communications Hub ───────────────────────────────────────────────────────
export const commChannels = mysqlTable("comm_channels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  type: mysqlEnum("type", ["whatsapp", "sms", "email", "webchat", "instagram", "telegram", "facebook", "voice"]).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  config: json("config"),
  isActive: tinyint("is_active").default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CommChannel = typeof commChannels.$inferSelect;

export const commContacts = mysqlTable("comm_contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 200 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 200 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  tags: json("tags"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CommContact = typeof commContacts.$inferSelect;

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  contactId: int("contact_id"),
  channelType: mysqlEnum("channel_type", ["whatsapp", "sms", "email", "webchat", "instagram", "telegram", "facebook", "voice"]).notNull().default("webchat"),
  subject: varchar("subject", { length: 300 }),
  status: mysqlEnum("status", ["open", "snoozed", "resolved", "spam"]).default("open"),
  assignedTo: mysqlEnum("assigned_to", ["ai_sales", "ai_support", "ai_receptionist", "ai_collections", "human"]),
  assignedAgentId: int("assigned_agent_id"),
  lastMessageAt: bigint("last_message_at", { mode: "number" }),
  unreadCount: int("unread_count").default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type Conversation = typeof conversations.$inferSelect;

export const commMessages = mysqlTable("comm_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id").notNull(),
  userId: int("user_id").notNull(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  sender: mysqlEnum("sender", ["contact", "agent", "ai"]).notNull().default("contact"),
  content: text("content").notNull(),
  contentType: mysqlEnum("content_type", ["text", "image", "audio", "video", "file", "template"]).default("text"),
  mediaUrl: varchar("media_url", { length: 500 }),
  status: mysqlEnum("status", ["sent", "delivered", "read", "failed"]).default("sent"),
  aiModel: varchar("ai_model", { length: 100 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CommMessage = typeof commMessages.$inferSelect;

// ─── CRM ─────────────────────────────────────────────────────────────────────
export const crmContacts = mysqlTable("crm_contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 30 }),
  companyId: int("company_id"),
  title: varchar("title", { length: 100 }),
  tags: json("tags"),
  notes: text("notes"),
  leadScore: int("lead_score").default(0),
  source: varchar("source", { length: 100 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CrmContact = typeof crmContacts.$inferSelect;

export const crmCompanies = mysqlTable("crm_companies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 300 }),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  annualRevenue: decimal("annual_revenue", { precision: 15, scale: 2 }),
  employeeCount: int("employee_count"),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CrmCompany = typeof crmCompanies.$inferSelect;

export const crmPipelines = mysqlTable("crm_pipelines", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  stages: json("stages").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CrmPipeline = typeof crmPipelines.$inferSelect;

export const crmDeals = mysqlTable("crm_deals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  pipelineId: int("pipeline_id").notNull(),
  stageId: varchar("stage_id", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  value: decimal("value", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  contactId: int("contact_id"),
  companyId: int("company_id"),
  probability: int("probability").default(50),
  expectedCloseDate: bigint("expected_close_date", { mode: "number" }),
  status: mysqlEnum("status", ["open", "won", "lost"]).default("open"),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CrmDeal = typeof crmDeals.$inferSelect;

export const crmTasks = mysqlTable("crm_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  dueAt: bigint("due_at", { mode: "number" }),
  status: mysqlEnum("status", ["todo", "in_progress", "done"]).default("todo"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  contactId: int("contact_id"),
  dealId: int("deal_id"),
  companyId: int("company_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CrmTask = typeof crmTasks.$inferSelect;

// ─── AI Payroll ───────────────────────────────────────────────────────────────
export const payrollWorkers = mysqlTable("payroll_workers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["employee", "contractor"]).notNull().default("contractor"),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 30 }),
  payRate: decimal("pay_rate", { precision: 10, scale: 2 }),
  payType: mysqlEnum("pay_type", ["hourly", "salary", "per_task"]).default("hourly"),
  taxId: varchar("tax_id", { length: 50 }),
  bankDetails: json("bank_details"),
  isActive: tinyint("is_active").default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type PayrollWorker = typeof payrollWorkers.$inferSelect;

export const payrollRuns = mysqlTable("payroll_runs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  periodStart: bigint("period_start", { mode: "number" }).notNull(),
  periodEnd: bigint("period_end", { mode: "number" }).notNull(),
  totalGross: decimal("total_gross", { precision: 15, scale: 2 }),
  totalNet: decimal("total_net", { precision: 15, scale: 2 }),
  status: mysqlEnum("status", ["draft", "approved", "paid"]).default("draft"),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type PayrollRun = typeof payrollRuns.$inferSelect;

export const payrollEntries = mysqlTable("payroll_entries", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("run_id").notNull(),
  workerId: int("worker_id").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 8, scale: 2 }),
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0.00"),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type PayrollEntry = typeof payrollEntries.$inferSelect;

// ─── AI Legal ─────────────────────────────────────────────────────────────────
export const legalContracts = mysqlTable("legal_contracts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  type: mysqlEnum("type", ["nda", "msa", "sow", "employment", "contractor", "service", "custom"]).notNull().default("custom"),
  content: text("content"),
  status: mysqlEnum("status", ["draft", "review", "signed", "expired"]).default("draft"),
  contactId: int("contact_id"),
  companyId: int("company_id"),
  expiresAt: bigint("expires_at", { mode: "number" }),
  signedAt: bigint("signed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type LegalContract = typeof legalContracts.$inferSelect;

// ─── AI Collections ───────────────────────────────────────────────────────────
export const collectionsInvoices = mysqlTable("collections_invoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  contactId: int("contact_id"),
  companyId: int("company_id"),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD"),
  dueDate: bigint("due_date", { mode: "number" }),
  status: mysqlEnum("status", ["draft", "sent", "overdue", "paid", "disputed", "written_off"]).default("draft"),
  description: text("description"),
  paymentLink: varchar("payment_link", { length: 500 }),
  chaseCount: int("chase_count").default(0),
  lastChasedAt: bigint("last_chased_at", { mode: "number" }),
  paidAt: bigint("paid_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type CollectionsInvoice = typeof collectionsInvoices.$inferSelect;

// ─── Full Accounting Back Office ──────────────────────────────────────────────

// Chart of Accounts
export const chartOfAccounts = mysqlTable("chart_of_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  accountNumber: varchar("account_number", { length: 20 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["asset", "liability", "equity", "revenue", "expense"]).notNull(),
  subtype: varchar("subtype", { length: 100 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  parentId: int("parent_id"),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;

// Journal Entries (double-entry bookkeeping)
export const journalEntries = mysqlTable("journal_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  entryNumber: varchar("entry_number", { length: 30 }),
  date: bigint("date", { mode: "number" }).notNull(),
  description: text("description"),
  reference: varchar("reference", { length: 100 }),
  status: mysqlEnum("status", ["draft", "posted", "voided"]).default("draft"),
  totalDebit: decimal("total_debit", { precision: 15, scale: 2 }).default("0.00"),
  totalCredit: decimal("total_credit", { precision: 15, scale: 2 }).default("0.00"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type JournalEntry = typeof journalEntries.$inferSelect;

// Journal Entry Lines
export const journalEntryLines = mysqlTable("journal_entry_lines", {
  id: int("id").autoincrement().primaryKey(),
  journalEntryId: int("journal_entry_id").notNull(),
  accountId: int("account_id").notNull(),
  description: text("description"),
  debit: decimal("debit", { precision: 15, scale: 2 }).default("0.00"),
  credit: decimal("credit", { precision: 15, scale: 2 }).default("0.00"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;

// Invoices (Accounts Receivable)
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  clientId: int("client_id"),
  clientName: varchar("client_name", { length: 200 }),
  clientEmail: varchar("client_email", { length: 320 }),
  clientAddress: text("client_address"),
  issueDate: bigint("issue_date", { mode: "number" }).notNull(),
  dueDate: bigint("due_date", { mode: "number" }).notNull(),
  status: mysqlEnum("status", ["draft", "sent", "viewed", "partial", "paid", "overdue", "voided"]).default("draft"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0.00"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 15, scale: 2 }).default("0.00"),
  amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  notes: text("notes"),
  terms: text("terms"),
  stripePaymentLink: varchar("stripe_payment_link", { length: 500 }),
  paidAt: bigint("paid_at", { mode: "number" }),
  sentAt: bigint("sent_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type Invoice = typeof invoices.$inferSelect;

// Invoice Line Items
export const invoiceLineItems = mysqlTable("invoice_line_items", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoice_id").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1.00"),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  accountId: int("account_id"),
  taxable: boolean("taxable").default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;

// Bills (Accounts Payable)
export const bills = mysqlTable("bills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  billNumber: varchar("bill_number", { length: 50 }),
  vendorId: int("vendor_id"),
  vendorName: varchar("vendor_name", { length: 200 }),
  vendorEmail: varchar("vendor_email", { length: 320 }),
  issueDate: bigint("issue_date", { mode: "number" }).notNull(),
  dueDate: bigint("due_date", { mode: "number" }).notNull(),
  status: mysqlEnum("status", ["draft", "received", "approved", "partial", "paid", "overdue", "voided"]).default("draft"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 15, scale: 2 }).default("0.00"),
  amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  notes: text("notes"),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  paidAt: bigint("paid_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type Bill = typeof bills.$inferSelect;

// Vendors
export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  taxId: varchar("tax_id", { length: 50 }),
  paymentTerms: varchar("payment_terms", { length: 100 }),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type Vendor = typeof vendors.$inferSelect;

// Bank Accounts (for reconciliation)
export const bankAccounts = mysqlTable("bank_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  bankName: varchar("bank_name", { length: 200 }),
  accountNumber: varchar("account_number", { length: 50 }),
  routingNumber: varchar("routing_number", { length: 20 }),
  type: mysqlEnum("type", ["checking", "savings", "credit_card", "loan", "investment"]).default("checking"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).default("0.00"),
  lastReconciledAt: bigint("last_reconciled_at", { mode: "number" }),
  accountId: int("account_id"),
  isActive: boolean("is_active").default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type BankAccount = typeof bankAccounts.$inferSelect;

// Bank Transactions (for reconciliation)
export const bankTransactions = mysqlTable("bank_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  bankAccountId: int("bank_account_id").notNull(),
  date: bigint("date", { mode: "number" }).notNull(),
  description: varchar("description", { length: 500 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["debit", "credit"]).notNull(),
  status: mysqlEnum("status", ["unmatched", "matched", "reconciled", "excluded"]).default("unmatched"),
  matchedJournalEntryId: int("matched_journal_entry_id"),
  matchedInvoiceId: int("matched_invoice_id"),
  matchedBillId: int("matched_bill_id"),
  reference: varchar("reference", { length: 100 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type BankTransaction = typeof bankTransactions.$inferSelect;

// Broadcast Campaigns (bulk SMS / voice)
export const broadcastCampaigns = mysqlTable("broadcast_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["sms", "whatsapp", "voice", "email"]).notNull().default("sms"),
  message: text("message"),
  voiceScript: text("voice_script"),
  fromNumber: varchar("from_number", { length: 30 }),
  messagingProfileId: varchar("messaging_profile_id", { length: 100 }),
  status: mysqlEnum("status", ["draft", "scheduled", "running", "completed", "paused", "failed"]).default("draft"),
  totalContacts: int("total_contacts").default(0),
  sent: int("sent").default(0),
  delivered: int("delivered").default(0),
  failed: int("failed").default(0),
  scheduledAt: bigint("scheduled_at", { mode: "number" }),
  startedAt: bigint("started_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type BroadcastCampaign = typeof broadcastCampaigns.$inferSelect;

// Broadcast Recipients
export const broadcastRecipients = mysqlTable("broadcast_recipients", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaign_id").notNull(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 200 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  status: mysqlEnum("status", ["pending", "sent", "delivered", "failed", "opted_out"]).default("pending"),
  errorMessage: varchar("error_message", { length: 500 }),
  sentAt: bigint("sent_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type BroadcastRecipient = typeof broadcastRecipients.$inferSelect;

// ─── Call Center Scheduler Extensions ────────────────────────────────────────
// These are added via direct SQL since drizzle migration is managed manually
// The campaignRuns table gets these columns added via SQL below

// ═══════════════════════════════════════════════════════════════════════════════
// FSM — AI Field Service Management Platform
// ═══════════════════════════════════════════════════════════════════════════════

// ─── FSM Service Businesses ───────────────────────────────────────────────────
// A VonWork user can own one or more service businesses (multi-location support)

export const fsmBusinesses = mysqlTable("fsm_businesses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(), // VonWork account owner
  name: varchar("name", { length: 200 }).notNull(),
  industry: varchar("industry", { length: 100 }).notNull(), // e.g. "hvac", "auto_repair", "dental"
  industryCategory: mysqlEnum("industry_category", [
    "home_services", "automotive", "medical_wellness", "professional_specialty"
  ]).notNull().default("home_services"),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  country: varchar("country", { length: 10 }).default("US"),
  logoUrl: varchar("logo_url", { length: 512 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  insuranceVerified: boolean("insurance_verified").default(false),
  googlePlaceId: varchar("google_place_id", { length: 200 }),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: int("total_reviews").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmBusiness = typeof fsmBusinesses.$inferSelect;
export type InsertFsmBusiness = typeof fsmBusinesses.$inferInsert;

// ─── FSM Technicians ──────────────────────────────────────────────────────────

export const fsmTechnicians = mysqlTable("fsm_technicians", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("business_id").notNull(),
  userId: int("user_id"), // if the technician has a VonWork login
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  specialties: json("specialties").$type<string[]>(), // e.g. ["hvac_repair", "electrical"]
  certifications: json("certifications").$type<string[]>(),
  licenseNumber: varchar("license_number", { length: 100 }),
  yearsExperience: int("years_experience").default(0),
  status: mysqlEnum("status", ["active", "inactive", "on_leave"]).default("active"),
  // Performance metrics (updated after each job)
  totalJobsCompleted: int("total_jobs_completed").default(0),
  averageTicketSize: decimal("average_ticket_size", { precision: 10, scale: 2 }).default("0.00"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0.00"), // % estimates accepted
  callbackRate: decimal("callback_rate", { precision: 5, scale: 2 }).default("0.00"), // % jobs needing return visit
  upsellRate: decimal("upsell_rate", { precision: 5, scale: 2 }).default("0.00"),
  onTimeRate: decimal("on_time_rate", { precision: 5, scale: 2 }).default("100.00"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmTechnician = typeof fsmTechnicians.$inferSelect;
export type InsertFsmTechnician = typeof fsmTechnicians.$inferInsert;

// ─── FSM Service Customers ────────────────────────────────────────────────────

export const fsmCustomers = mysqlTable("fsm_customers", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("business_id").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  notes: text("notes"),
  tags: json("tags").$type<string[]>(),
  // AI-generated scores
  churnRisk: decimal("churn_risk", { precision: 3, scale: 2 }).default("0.00"), // 0-1
  membershipScore: decimal("membership_score", { precision: 3, scale: 2 }).default("0.00"), // likelihood to buy membership
  lifetimeValue: decimal("lifetime_value", { precision: 10, scale: 2 }).default("0.00"),
  totalJobs: int("total_jobs").default(0),
  hasMembership: boolean("has_membership").default(false),
  membershipExpiresAt: bigint("membership_expires_at", { mode: "number" }),
  referredByPartnerId: int("referred_by_partner_id"), // affiliate who referred this customer
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmCustomer = typeof fsmCustomers.$inferSelect;
export type InsertFsmCustomer = typeof fsmCustomers.$inferInsert;

// ─── FSM Equipment / Assets ───────────────────────────────────────────────────

export const fsmEquipment = mysqlTable("fsm_equipment", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id").notNull(),
  businessId: int("business_id").notNull(),
  type: varchar("type", { length: 100 }).notNull(), // e.g. "furnace", "ac_unit", "water_heater"
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 200 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  installDate: bigint("install_date", { mode: "number" }),
  warrantyExpiry: bigint("warranty_expiry", { mode: "number" }),
  lastServiceDate: bigint("last_service_date", { mode: "number" }),
  nextServiceDue: bigint("next_service_due", { mode: "number" }),
  condition: mysqlEnum("condition", ["excellent", "good", "fair", "poor", "critical"]).default("good"),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmEquipment = typeof fsmEquipment.$inferSelect;

// ─── FSM Jobs ─────────────────────────────────────────────────────────────────

export const fsmJobs = mysqlTable("fsm_jobs", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("business_id").notNull(),
  customerId: int("customer_id").notNull(),
  technicianId: int("technician_id"),
  equipmentId: int("equipment_id"),
  jobNumber: varchar("job_number", { length: 50 }).notNull(),
  type: mysqlEnum("type", [
    "service_call", "installation", "maintenance", "inspection",
    "estimate_only", "warranty", "emergency", "follow_up"
  ]).notNull().default("service_call"),
  status: mysqlEnum("status", [
    "new_lead", "booked", "confirmed", "dispatched",
    "in_progress", "completed", "invoiced", "paid", "cancelled", "on_hold"
  ]).notNull().default("new_lead"),
  priority: mysqlEnum("priority", ["low", "normal", "high", "emergency"]).default("normal"),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  customerNotes: text("customer_notes"),
  internalNotes: text("internal_notes"),
  scheduledAt: bigint("scheduled_at", { mode: "number" }),
  scheduledEndAt: bigint("scheduled_end_at", { mode: "number" }),
  arrivedAt: bigint("arrived_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  estimatedDurationMins: int("estimated_duration_mins").default(60),
  // Location
  serviceAddress: text("service_address"),
  serviceCity: varchar("service_city", { length: 100 }),
  serviceState: varchar("service_state", { length: 50 }),
  serviceZip: varchar("service_zip", { length: 20 }),
  // Financial
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 64 }),
  // AI fields
  aiJobBriefGenerated: boolean("ai_job_brief_generated").default(false),
  aiPreCallCompleted: boolean("ai_pre_call_completed").default(false),
  aiPreCallSummary: text("ai_pre_call_summary"),
  aiRiskFlags: json("ai_risk_flags").$type<string[]>(),
  // Source tracking
  source: mysqlEnum("source", [
    "phone", "online_booking", "ai_agent", "walk_in", "referral", "repeat", "campaign"
  ]).default("phone"),
  referralJobId: int("referral_job_id"), // if this job was referred from another tech
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmJob = typeof fsmJobs.$inferSelect;
export type InsertFsmJob = typeof fsmJobs.$inferInsert;

// ─── FSM Estimates ────────────────────────────────────────────────────────────

export const fsmEstimates = mysqlTable("fsm_estimates", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("job_id").notNull(),
  businessId: int("business_id").notNull(),
  customerId: int("customer_id").notNull(),
  technicianId: int("technician_id"),
  estimateNumber: varchar("estimate_number", { length: 50 }).notNull(),
  status: mysqlEnum("status", [
    "draft", "presented", "accepted", "declined", "expired"
  ]).default("draft"),
  tier: mysqlEnum("tier", ["good", "better", "best"]).default("better"),
  // AI-generated pricing intelligence
  aiGeneratedAt: bigint("ai_generated_at", { mode: "number" }),
  aiConfidenceScore: int("ai_confidence_score"), // 0-100
  marketPriceLow: decimal("market_price_low", { precision: 10, scale: 2 }),
  marketPriceHigh: decimal("market_price_high", { precision: 10, scale: 2 }),
  marketPriceAvg: decimal("market_price_avg", { precision: 10, scale: 2 }),
  pricePosition: mysqlEnum("price_position", ["below_market", "at_market", "above_market"]),
  aiPricingNotes: text("ai_pricing_notes"),
  // Totals
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0.00"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0.00"),
  // Financing
  financingOffered: boolean("financing_offered").default(false),
  monthlyPayment: decimal("monthly_payment", { precision: 10, scale: 2 }),
  financingTermMonths: int("financing_term_months"),
  // Validity
  validUntil: bigint("valid_until", { mode: "number" }),
  acceptedAt: bigint("accepted_at", { mode: "number" }),
  declinedAt: bigint("declined_at", { mode: "number" }),
  declineReason: text("decline_reason"),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmEstimate = typeof fsmEstimates.$inferSelect;
export type InsertFsmEstimate = typeof fsmEstimates.$inferInsert;

// ─── FSM Estimate Line Items ──────────────────────────────────────────────────

export const fsmEstimateLineItems = mysqlTable("fsm_estimate_line_items", {
  id: int("id").autoincrement().primaryKey(),
  estimateId: int("estimate_id").notNull(),
  type: mysqlEnum("type", ["labor", "part", "material", "service_fee", "disposal"]).default("labor"),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1.00"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  partNumber: varchar("part_number", { length: 100 }),
  sortOrder: int("sort_order").default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmEstimateLineItem = typeof fsmEstimateLineItems.$inferSelect;

// ─── FSM AI Diagnoses ─────────────────────────────────────────────────────────

export const fsmDiagnoses = mysqlTable("fsm_diagnoses", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("job_id").notNull(),
  technicianId: int("technician_id"),
  // Technician input
  symptomDescription: text("symptom_description").notNull(),
  observationNotes: text("observation_notes"),
  photoUrls: json("photo_urls").$type<string[]>(),
  videoUrls: json("video_urls").$type<string[]>(),
  // AI analysis output
  aiDiagnosis: text("ai_diagnosis"),
  aiConfidenceScore: int("ai_confidence_score"), // 0-100
  repairUrgency: mysqlEnum("repair_urgency", [
    "fix_now", "fix_soon", "monitor", "optional", "second_opinion_advised"
  ]),
  repairNecessityVerdict: text("repair_necessity_verdict"), // plain-English explanation
  alternativeOptions: json("alternative_options").$type<string[]>(),
  estimatedLifespan: varchar("estimated_lifespan", { length: 100 }), // e.g. "2-3 years remaining"
  riskIfUnaddressed: text("risk_if_unaddressed"),
  // Upsell opportunities identified by AI
  upsellOpportunities: json("upsell_opportunities").$type<{
    title: string; description: string; estimatedValue: number
  }[]>(),
  // Cross-referral opportunities
  referralOpportunities: json("referral_opportunities").$type<{
    industry: string; description: string; urgency: string
  }[]>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmDiagnosis = typeof fsmDiagnoses.$inferSelect;
export type InsertFsmDiagnosis = typeof fsmDiagnoses.$inferInsert;

// ─── FSM Customer AI Reports ──────────────────────────────────────────────────

export const fsmCustomerReports = mysqlTable("fsm_customer_reports", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("job_id").notNull(),
  diagnosisId: int("diagnosis_id"),
  estimateId: int("estimate_id"),
  customerId: int("customer_id").notNull(),
  businessId: int("business_id").notNull(),
  // Report content (AI-generated)
  diagnosisSummary: text("diagnosis_summary"),
  priceBenchmarkSummary: text("price_benchmark_summary"),
  urgencyRating: mysqlEnum("urgency_rating", ["fix_now", "fix_soon", "monitor", "optional"]),
  urgencyExplanation: text("urgency_explanation"),
  recommendedNextSteps: json("recommended_next_steps").$type<string[]>(),
  relatedServicesRecommended: json("related_services_recommended").$type<{
    service: string; reason: string; estimatedCost: string
  }[]>(),
  // Technician & business trust signals
  technicianRating: decimal("technician_rating", { precision: 3, scale: 2 }),
  technicianJobsCompleted: int("technician_jobs_completed"),
  businessRating: decimal("business_rating", { precision: 3, scale: 2 }),
  businessLicenseVerified: boolean("business_license_verified").default(false),
  // Report delivery
  reportUrl: varchar("report_url", { length: 512 }), // public shareable link
  reportKey: varchar("report_key", { length: 64 }).unique(), // short token for URL
  sentViaSms: boolean("sent_via_sms").default(false),
  sentViaEmail: boolean("sent_via_email").default(false),
  viewedAt: bigint("viewed_at", { mode: "number" }),
  secondOpinionRequested: boolean("second_opinion_requested").default(false),
  customerRating: int("customer_rating"), // 1-5 stars after viewing report
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmCustomerReport = typeof fsmCustomerReports.$inferSelect;
export type InsertFsmCustomerReport = typeof fsmCustomerReports.$inferInsert;

// ─── FSM Pre-Appointment Calls ────────────────────────────────────────────────

export const fsmPreCalls = mysqlTable("fsm_pre_calls", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("job_id").notNull(),
  customerId: int("customer_id").notNull(),
  status: mysqlEnum("status", [
    "scheduled", "in_progress", "completed", "failed", "no_answer", "skipped"
  ]).default("scheduled"),
  scheduledAt: bigint("scheduled_at", { mode: "number" }),
  startedAt: bigint("started_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  durationSeconds: int("duration_seconds"),
  callSid: varchar("call_sid", { length: 100 }), // Telnyx call ID
  recordingUrl: varchar("recording_url", { length: 512 }),
  transcript: text("transcript"),
  // AI analysis of the pre-call
  aiSummary: text("ai_summary"),
  symptomsCaptured: json("symptoms_captured").$type<string[]>(),
  photosRequestedViaSms: boolean("photos_requested_via_sms").default(false),
  appointmentConfirmed: boolean("appointment_confirmed").default(false),
  customerConcerns: text("customer_concerns"),
  partsToPreStage: json("parts_to_pre_stage").$type<string[]>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmPreCall = typeof fsmPreCalls.$inferSelect;

// ─── FSM Technician Coaching Notes ───────────────────────────────────────────

export const fsmCoachingNotes = mysqlTable("fsm_coaching_notes", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("job_id").notNull(),
  technicianId: int("technician_id").notNull(),
  businessId: int("business_id").notNull(),
  // AI-generated coaching
  coachingType: mysqlEnum("coaching_type", [
    "upsell_missed", "pricing_feedback", "customer_service", "technical_accuracy",
    "on_time_feedback", "estimate_conversion", "referral_missed", "positive_reinforcement"
  ]).notNull(),
  summary: text("summary").notNull(),
  detailedFeedback: text("detailed_feedback"),
  actionItems: json("action_items").$type<string[]>(),
  estimatedRevenueImpact: decimal("estimated_revenue_impact", { precision: 10, scale: 2 }),
  technicianAcknowledged: boolean("technician_acknowledged").default(false),
  acknowledgedAt: bigint("acknowledged_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmCoachingNote = typeof fsmCoachingNotes.$inferSelect;

// ─── FSM Cross-Referrals ──────────────────────────────────────────────────────

export const fsmReferrals = mysqlTable("fsm_referrals", {
  id: int("id").autoincrement().primaryKey(),
  sourceJobId: int("source_job_id").notNull(), // the job where the referral was spotted
  sourceTechnicianId: int("source_technician_id").notNull(),
  sourceBusinessId: int("source_business_id").notNull(),
  customerId: int("customer_id").notNull(),
  // Referral target
  referredIndustry: varchar("referred_industry", { length: 100 }).notNull(),
  referralDescription: text("referral_description").notNull(),
  urgency: mysqlEnum("urgency", ["urgent", "soon", "when_convenient"]).default("when_convenient"),
  // Matched business (if found in VonWork network)
  referredBusinessId: int("referred_business_id"),
  referredJobId: int("referred_job_id"), // created job at the referred business
  // Commission
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  commissionPaid: boolean("commission_paid").default(false),
  commissionPaidAt: bigint("commission_paid_at", { mode: "number" }),
  status: mysqlEnum("status", [
    "identified", "sent_to_customer", "accepted", "job_created", "completed", "declined"
  ]).default("identified"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmReferral = typeof fsmReferrals.$inferSelect;

// ─── FSM Pricebook ────────────────────────────────────────────────────────────

export const fsmPricebook = mysqlTable("fsm_pricebook", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("business_id").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["labor", "part", "material", "service_package"]).default("labor"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  // Dynamic pricing overrides
  memberPrice: decimal("member_price", { precision: 10, scale: 2 }),
  emergencyMultiplier: decimal("emergency_multiplier", { precision: 4, scale: 2 }).default("1.50"),
  // Market benchmarks (populated by AI)
  marketPriceLow: decimal("market_price_low", { precision: 10, scale: 2 }),
  marketPriceHigh: decimal("market_price_high", { precision: 10, scale: 2 }),
  marketPriceAvg: decimal("market_price_avg", { precision: 10, scale: 2 }),
  lastBenchmarkedAt: bigint("last_benchmarked_at", { mode: "number" }),
  partNumber: varchar("part_number", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmPricebookItem = typeof fsmPricebook.$inferSelect;

// ─── FSM Job Reviews ──────────────────────────────────────────────────────────

export const fsmJobReviews = mysqlTable("fsm_job_reviews", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("job_id").notNull().unique(),
  customerId: int("customer_id").notNull(),
  technicianId: int("technician_id"),
  businessId: int("business_id").notNull(),
  overallRating: int("overall_rating").notNull(), // 1-5
  technicianRating: int("technician_rating"), // 1-5
  valueRating: int("value_rating"), // 1-5
  qualityRating: int("quality_rating"), // 1-5
  punctualityRating: int("punctuality_rating"), // 1-5
  reviewText: text("review_text"),
  // Routing
  routedToPublic: boolean("routed_to_public").default(false), // 4-5 stars → Google/Yelp
  routedToInternal: boolean("routed_to_internal").default(false), // 1-3 stars → internal only
  publicPlatform: varchar("public_platform", { length: 50 }), // "google", "yelp", "facebook"
  publicReviewUrl: varchar("public_review_url", { length: 512 }),
  businessResponse: text("business_response"),
  respondedAt: bigint("responded_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type FsmJobReview = typeof fsmJobReviews.$inferSelect;

// ─── Native AI Scheduler ──────────────────────────────────────────────────────

// Event types — bookable service templates (e.g. "30-min Consultation", "HVAC Tune-Up")
export const eventTypes = mysqlTable("event_types", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull(),
  description: text("description"),
  durationMinutes: int("durationMinutes").notNull().default(30),
  bufferBeforeMinutes: int("bufferBeforeMinutes").notNull().default(0),
  bufferAfterMinutes: int("bufferAfterMinutes").notNull().default(0),
  location: varchar("location", { length: 512 }), // address, Zoom link, phone, etc.
  locationType: mysqlEnum("locationType", ["in_person", "phone", "video", "other"]).notNull().default("in_person"),
  color: varchar("color", { length: 16 }).notNull().default("#1A6FFF"),
  maxBookingsPerDay: int("maxBookingsPerDay"),
  requiresConfirmation: boolean("requiresConfirmation").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EventType = typeof eventTypes.$inferSelect;
export type InsertEventType = typeof eventTypes.$inferInsert;

// Availability rules — working hours per day of week per user
export const availabilityRules = mysqlTable("availability_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0=Sun, 1=Mon, ... 6=Sat
  startTime: varchar("startTime", { length: 8 }).notNull().default("09:00"), // HH:MM
  endTime: varchar("endTime", { length: 8 }).notNull().default("17:00"),     // HH:MM
  isEnabled: boolean("isEnabled").notNull().default(true),
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/Chicago"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AvailabilityRule = typeof availabilityRules.$inferSelect;

// Blocked times — manual overrides (vacations, holidays, lunch breaks)
export const blockedTimes = mysqlTable("blocked_times", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull().default("Blocked"),
  startAt: timestamp("startAt").notNull(),
  endAt: timestamp("endAt").notNull(),
  isAllDay: boolean("isAllDay").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BlockedTime = typeof blockedTimes.$inferSelect;

// Bookings — the native scheduler's booking records (separate from FSM appointments)
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),          // who the booking is with (host)
  eventTypeId: int("eventTypeId"),
  guestName: varchar("guestName", { length: 256 }).notNull(),
  guestEmail: varchar("guestEmail", { length: 320 }).notNull(),
  guestPhone: varchar("guestPhone", { length: 32 }),
  guestNotes: text("guestNotes"),
  startAt: timestamp("startAt").notNull(),
  endAt: timestamp("endAt").notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/Chicago"),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed", "no_show"]).notNull().default("pending"),
  location: varchar("location", { length: 512 }),
  locationType: mysqlEnum("locationType", ["in_person", "phone", "video", "other"]).notNull().default("in_person"),
  meetingLink: varchar("meetingLink", { length: 1024 }),
  cancelReason: text("cancelReason"),
  rescheduleCount: int("rescheduleCount").notNull().default(0),
  reminderSentAt: timestamp("reminderSentAt"),
  confirmationSentAt: timestamp("confirmationSentAt"),
  bookedVia: mysqlEnum("bookedVia", ["ai_agent", "manual", "online_form", "phone", "sms"]).notNull().default("manual"),
  aiSummary: text("aiSummary"),             // AI-generated booking summary
  crmContactId: int("crmContactId"),        // link to CRM contact if matched
  icalUid: varchar("icalUid", { length: 256 }), // for iCal export
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// AI Booking Agent conversations — tracks what the AI said/did when booking
export const bookingAgentLogs = mysqlTable("booking_agent_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookingId: int("bookingId"),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  action: varchar("action", { length: 64 }), // "booked", "rescheduled", "cancelled", "checked_availability"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BookingAgentLog = typeof bookingAgentLogs.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// VON WORK BUILD SPEC — Document 3 of 4
// Gate System, Proof of Work, Business Sign-Up, Tier Matrix, Credential API
// ═══════════════════════════════════════════════════════════════════════════════

// ─── VW Accounts ─────────────────────────────────────────────────────────────
// Separate from the platform `users` table. Links a Manus user to their VW account.

export const vwAccounts = mysqlTable("vw_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK → users.id (Manus OAuth user)
  vwAccountId: varchar("vwAccountId", { length: 32 }).notNull().unique(), // VW-BIZ-XXXXXXXX
  hfnMemberId: varchar("hfnMemberId", { length: 32 }), // e.g. HFN-00000184
  email: varchar("email", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["PENDING", "ACTIVE", "SUSPENDED_UPSTREAM", "SUSPENDED", "CLOSED"]).notNull().default("PENDING"),
  tier: mysqlEnum("tier", ["NONE", "PIONEER", "FOUNDER", "VANGUARD", "LEGACY"]).notNull().default("NONE"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastGateCheckAt: timestamp("lastGateCheckAt"),
  suspendedReason: text("suspendedReason"), // which gate failed
});

export type VwAccount = typeof vwAccounts.$inferSelect;

// ─── Upstream Gate Status ─────────────────────────────────────────────────────
// Cached results of HFN and JOINFORCE API checks. Fail-closed if >48h old.

export const upstreamStatus = mysqlTable("upstream_status", {
  id: int("id").autoincrement().primaryKey(),
  vwAccountId: int("vwAccountId").notNull(), // FK → vw_accounts.id
  hfnMemberId: varchar("hfnMemberId", { length: 32 }),
  hfnStatus: mysqlEnum("hfnStatus", ["ACTIVE", "INACTIVE", "NOT_FOUND", "ERROR", "UNKNOWN"]).notNull().default("UNKNOWN"),
  jfProofOfLoyalty: mysqlEnum("jfProofOfLoyalty", ["VERIFIED", "UNVERIFIED", "NOT_FOUND", "ERROR", "UNKNOWN"]).notNull().default("UNKNOWN"),
  jfLevel: varchar("jfLevel", { length: 32 }), // e.g. FOUNDER, PIONEER, VANGUARD
  jfCredentialValidUntil: timestamp("jfCredentialValidUntil"),
  jfRawResponse: json("jfRawResponse"), // full JOINFORCE credential response
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(), // checkedAt + 48h
  source: mysqlEnum("source", ["LOGIN", "POW_SUBMIT", "AGREEMENT_EXEC", "ACTIVATION", "SCHEDULED", "WEBHOOK"]).notNull(),
});

export type UpstreamStatus = typeof upstreamStatus.$inferSelect;

// ─── POW Submissions ──────────────────────────────────────────────────────────

export const powSubmissions = mysqlTable("pow_submissions", {
  id: int("id").autoincrement().primaryKey(),
  powRef: varchar("powRef", { length: 20 }).notNull().unique(), // POW-00048217
  vwAccountId: int("vwAccountId").notNull(),
  category: varchar("category", { length: 64 }).notNull(), // business_operation, development, mining, etc.
  businessName: varchar("businessName", { length: 255 }),
  role: varchar("role", { length: 128 }),
  objectives: longtext("objectives"),
  productsServices: text("productsServices"),
  contributionDescription: longtext("contributionDescription"),
  dateStart: varchar("dateStart", { length: 16 }), // YYYY-MM-DD
  dateEnd: varchar("dateEnd", { length: 16 }), // YYYY-MM-DD or null = ongoing
  isOngoing: boolean("isOngoing").default(false),
  referenceUrls: json("referenceUrls").$type<string[]>(),
  transactionHashes: json("transactionHashes").$type<string[]>(),
  walletAddress: varchar("walletAddress", { length: 128 }), // evidence only — not verified
  witnessContact: varchar("witnessContact", { length: 255 }),
  attestationChecked: boolean("attestationChecked").notNull().default(false),
  status: mysqlEnum("status", ["SUBMITTED", "AUTO_REVIEW", "MANUAL_REVIEW", "VERIFIED", "REJECTED", "MORE_INFO_REQUIRED", "HISTORICAL"]).notNull().default("SUBMITTED"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  validUntil: timestamp("validUntil"),
  reattestationCadenceDays: int("reattestationCadenceDays").default(365),
  autoReviewResult: json("autoReviewResult"), // automated check results
  revisionCount: int("revisionCount").notNull().default(0),
});

export type PowSubmission = typeof powSubmissions.$inferSelect;

// ─── POW Revisions (append-only) ─────────────────────────────────────────────

export const powRevisions = mysqlTable("pow_revisions", {
  id: int("id").autoincrement().primaryKey(),
  powRef: varchar("powRef", { length: 20 }).notNull(),
  revisionNo: int("revisionNo").notNull(),
  payload: json("payload").notNull(), // full snapshot of submission fields at this revision
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  changedBy: mysqlEnum("changedBy", ["MEMBER", "REVIEWER"]).notNull().default("MEMBER"),
  changeReason: text("changeReason"),
});

// ─── POW Evidence Files ───────────────────────────────────────────────────────

export const powEvidence = mysqlTable("pow_evidence", {
  id: int("id").autoincrement().primaryKey(),
  powRef: varchar("powRef", { length: 20 }).notNull(),
  vwAccountId: int("vwAccountId").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(), // S3 key
  storageUrl: varchar("storageUrl", { length: 1024 }),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  sizeBytes: int("sizeBytes"),
  scannedAt: timestamp("scannedAt"),
  scanResult: mysqlEnum("scanResult", ["CLEAN", "FLAGGED", "PENDING", "ERROR"]).default("PENDING"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

// ─── POW Reviews (append-only) ───────────────────────────────────────────────

export const powReviews = mysqlTable("pow_reviews", {
  id: int("id").autoincrement().primaryKey(),
  powRef: varchar("powRef", { length: 20 }).notNull(),
  reviewerId: int("reviewerId").notNull(), // FK → users.id (admin/reviewer)
  decision: mysqlEnum("decision", ["VERIFIED", "REJECTED", "MORE_INFO_REQUIRED", "ESCALATED"]).notNull(),
  rationale: longtext("rationale").notNull(), // mandatory
  memberMessage: text("memberMessage"), // shown to member
  decidedAt: timestamp("decidedAt").defaultNow().notNull(),
});

// ─── VW Businesses ────────────────────────────────────────────────────────────

export const vwBusinesses = mysqlTable("vw_businesses", {
  id: int("id").autoincrement().primaryKey(),
  vwAccountId: int("vwAccountId").notNull().unique(),
  legalName: varchar("legalName", { length: 255 }).notNull(),
  structure: varchar("structure", { length: 64 }), // LLC, Corporation, Sole Proprietor, etc.
  jurisdiction: varchar("jurisdiction", { length: 128 }), // state/country of formation
  regNumber: varchar("regNumber", { length: 128 }),
  principalAddress: text("principalAddress"),
  signatoryName: varchar("signatoryName", { length: 255 }),
  signatoryRole: varchar("signatoryRole", { length: 128 }),
  taxStatus: varchar("taxStatus", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Agreement Versions (append-only) ────────────────────────────────────────

export const agreementVersions = mysqlTable("agreement_versions", {
  id: int("id").autoincrement().primaryKey(),
  versionId: varchar("versionId", { length: 32 }).notNull().unique(), // VW-BA-v1.1
  body: longtext("body").notNull(), // full agreement text
  bodySha256: varchar("bodySha256", { length: 64 }).notNull(),
  effectiveFrom: timestamp("effectiveFrom").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Agreement Acceptances (append-only) ─────────────────────────────────────

export const agreementAcceptances = mysqlTable("agreement_acceptances", {
  id: int("id").autoincrement().primaryKey(),
  vwAccountId: int("vwAccountId").notNull(),
  versionId: varchar("versionId", { length: 32 }).notNull(),
  acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  typedSignature: varchar("typedSignature", { length: 255 }).notNull(),
  scrolledToEnd: boolean("scrolledToEnd").notNull().default(false),
  checkboxChecked: boolean("checkboxChecked").notNull().default(false),
});

// ─── Tier Matrix (admin-editable, no deploy) ──────────────────────────────────

export const tierMatrix = mysqlTable("tier_matrix", {
  id: int("id").autoincrement().primaryKey(),
  tier: mysqlEnum("tier", ["PIONEER", "FOUNDER", "VANGUARD", "LEGACY"]).notNull(),
  feature: varchar("feature", { length: 128 }).notNull(), // e.g. ai_agents, storage_gb, api_rate
  enabled: boolean("enabled").notNull().default(false),
  quota: int("quota"), // null = unlimited
  quotaUnit: varchar("quotaUnit", { length: 32 }), // agents, GB, req/min, etc.
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"), // FK → users.id
});

// ─── Usage Events ─────────────────────────────────────────────────────────────

export const vwUsageEvents = mysqlTable("vw_usage_events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  vwAccountId: int("vwAccountId").notNull(),
  feature: varchar("feature", { length: 128 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  metadata: json("metadata"),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
});

// ─── Credential Grants (for Nexus and other downstream sites) ─────────────────

export const credentialGrants = mysqlTable("credential_grants", {
  id: int("id").autoincrement().primaryKey(),
  vwAccountId: int("vwAccountId").notNull(),
  recipientSite: varchar("recipientSite", { length: 64 }).notNull(), // nexus, internal, etc.
  scope: json("scope").$type<string[]>(), // what fields are shared
  apiKeyHash: varchar("apiKeyHash", { length: 64 }), // hashed API key of recipient
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
  lastUsedAt: timestamp("lastUsedAt"),
});

// ─── Member Pricing Entitlements (non-transferable own-use discounts) ─────────

export const memberPricingEntitlements = mysqlTable("member_pricing_entitlements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  vwAccountId: int("vwAccountId"),
  program: mysqlEnum("program", ["HFN", "JOINFORCE"]).notNull(),
  sourceMemberId: varchar("sourceMemberId", { length: 64 }).notNull(),
  purpose: mysqlEnum("purpose", ["OWN_USE"]).notNull().default("OWN_USE"),
  discountPercent: int("discountPercent").notNull(),
  status: mysqlEnum("status", ["ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"]).notNull().default("ACTIVE"),
  verifiedAt: timestamp("verifiedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Website Prospecting Studio (review-first, source-attributed) ────────────

export const prospectingRuns = mysqlTable("prospecting_runs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  source: mysqlEnum("source", ["GOOGLE_PLACES", "CSV"]).notNull(),
  industry: varchar("industry", { length: 160 }).notNull(),
  locationQuery: varchar("locationQuery", { length: 255 }).notNull(),
  maxResults: int("maxResults").notNull().default(20),
  status: mysqlEnum("status", ["QUEUED", "RUNNING", "COMPLETED", "FAILED"]).notNull().default("QUEUED"),
  discoveredCount: int("discoveredCount").notNull().default(0),
  missingWebsiteCount: int("missingWebsiteCount").notNull().default(0),
  errorMessage: text("errorMessage"),
  metadata: json("metadata"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const prospectImports = mysqlTable("prospect_imports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["CSV", "DATABASE_EXPORT", "MANUAL"]).notNull().default("CSV"),
  sourceAttribution: varchar("sourceAttribution", { length: 255 }).notNull(),
  declaredBusinessPurpose: text("declaredBusinessPurpose").notNull(),
  consentDeclaration: boolean("consentDeclaration").notNull().default(false),
  mapping: json("mapping"),
  status: mysqlEnum("status", ["PROCESSING", "COMPLETED", "FAILED"]).notNull().default("PROCESSING"),
  rowsReceived: int("rowsReceived").notNull().default(0),
  rowsAccepted: int("rowsAccepted").notNull().default(0),
  rowsDuplicates: int("rowsDuplicates").notNull().default(0),
  rowsSuppressed: int("rowsSuppressed").notNull().default(0),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export const businessProspects = mysqlTable("business_prospects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  runId: int("runId"),
  importId: int("importId"),
  source: mysqlEnum("source", ["GOOGLE_PLACES", "CSV", "MANUAL"]).notNull(),
  sourceRecordId: varchar("sourceRecordId", { length: 255 }),
  sourceAttribution: varchar("sourceAttribution", { length: 255 }).notNull(),
  sourceExpiresAt: timestamp("sourceExpiresAt"),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 160 }),
  formattedAddress: text("formattedAddress"),
  phone: varchar("phone", { length: 64 }),
  email: varchar("email", { length: 320 }),
  decisionMakerName: varchar("decisionMakerName", { length: 255 }),
  decisionMakerEmail: varchar("decisionMakerEmail", { length: 320 }),
  officialWebsite: varchar("officialWebsite", { length: 1024 }),
  normalizedPhone: varchar("normalizedPhone", { length: 32 }),
  normalizedDomain: varchar("normalizedDomain", { length: 255 }),
  normalizedNameAddress: varchar("normalizedNameAddress", { length: 512 }),
  websiteStatus: mysqlEnum("websiteStatus", ["MISSING_SIGNAL", "PRESENT", "UNVERIFIED"]).notNull().default("UNVERIFIED"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  ratingCount: int("ratingCount"),
  reviewStatus: mysqlEnum("reviewStatus", ["NEW", "REVIEW_READY", "APPROVED", "REJECTED", "SUPPRESSED", "DEMO_CREATED", "OUTREACH_APPROVED"]).notNull().default("NEW"),
  isDoNotContact: boolean("isDoNotContact").notNull().default(false),
  consentStatus: mysqlEnum("consentStatus", ["NOT_RECORDED", "OPTED_IN", "WITHDRAWN"]).notNull().default("NOT_RECORDED"),
  consentCapturedAt: timestamp("consentCapturedAt"),
  reviewerNotes: text("reviewerNotes"),
  rawSourceData: json("rawSourceData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const prospectDemos = mysqlTable("prospect_demos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  prospectId: int("prospectId").notNull(),
  demoSlug: varchar("demoSlug", { length: 96 }).notNull().unique(),
  generatedHtml: longtext("generatedHtml").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["DRAFT", "READY_FOR_REVIEW", "APPROVED_FOR_SHARE", "EXPIRED", "ARCHIVED"]).notNull().default("DRAFT"),
  expiresAt: timestamp("expiresAt"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
});

export const prospectOutreachReviews = mysqlTable("prospect_outreach_reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  prospectId: int("prospectId").notNull(),
  demoId: int("demoId"),
  channel: mysqlEnum("channel", ["EMAIL", "MANUAL_CALL", "AI_PRESENTATION", "AI_VOICE"]).notNull(),
  proposedSubject: varchar("proposedSubject", { length: 255 }),
  proposedContent: longtext("proposedContent").notNull(),
  status: mysqlEnum("status", ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "SENT", "CANCELLED"]).notNull().default("DRAFT"),
  consentSnapshot: json("consentSnapshot"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const prospectSuppressions = mysqlTable("prospect_suppressions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  normalizedValue: varchar("normalizedValue", { length: 512 }).notNull(),
  type: mysqlEnum("type", ["PHONE", "EMAIL", "DOMAIN", "BUSINESS"]).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  source: varchar("source", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const prospectPresentations = mysqlTable("prospect_presentations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  prospectId: int("prospectId").notNull(),
  demoId: int("demoId").notNull(),
  presentationSlug: varchar("presentationSlug", { length: 96 }).notNull().unique(),
  script: longtext("script").notNull(),
  status: mysqlEnum("status", ["DRAFT", "APPROVED", "SHARED", "COMPLETED", "EXPIRED"]).notNull().default("DRAFT"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sharedAt: timestamp("sharedAt"),
});

export const prospectCampaignLinks = mysqlTable("prospect_campaign_links", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  prospectId: int("prospectId").notNull(),
  campaignId: int("campaignId").notNull(),
  presentationId: int("presentationId"),
  status: mysqlEnum("status", ["STAGED", "PRESENTATION_READY", "CONTACT_PERMISSION_REQUIRED", "FOLLOW_UP_REVIEW", "SENT", "CONVERTED", "SUPPRESSED"]).notNull().default("STAGED"),
  consentSnapshot: json("consentSnapshot"),
  decisionMakerVerifiedAt: timestamp("decisionMakerVerifiedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const prospectPresentationEvents = mysqlTable("prospect_presentation_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  presentationId: int("presentationId").notNull(),
  eventType: mysqlEnum("eventType", ["OPENED", "QUESTION_ASKED", "CONTACT_CAPTURED", "FOLLOW_UP_PREPARED"]).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const prospectFollowUpPreparations = mysqlTable("prospect_followup_preparations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  prospectId: int("prospectId").notNull(),
  presentationId: int("presentationId").notNull(),
  channel: mysqlEnum("channel", ["EMAIL", "SMS"]).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  recipientAddress: varchar("recipientAddress", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: longtext("body").notNull(),
  status: mysqlEnum("status", ["DRAFT", "PENDING_REVIEW", "APPROVED", "SENT", "CANCELLED"]).notNull().default("PENDING_REVIEW"),
  consentSnapshot: json("consentSnapshot"),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── AI Media Consent (voice and likeness rights) ────────────────────────────

export const aiMediaConsents = mysqlTable("ai_media_consents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  mediaType: mysqlEnum("mediaType", ["VOICE", "AVATAR", "BOTH"]).notNull(),
  subjectName: varchar("subjectName", { length: 255 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  purpose: varchar("purpose", { length: 512 }).notNull(),
  rightsConfirmed: boolean("rightsConfirmed").notNull().default(false),
  disclosureConfirmed: boolean("disclosureConfirmed").notNull().default(false),
  typedSignature: varchar("typedSignature", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["ACTIVE", "REVOKED", "EXPIRED"]).notNull().default("ACTIVE"),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
  metadata: json("metadata"),
});

// ─── Business Brain & Vertical AI Engine ──────────────────────────────────────

export const verticalPromptPacks = mysqlTable("vertical_prompt_packs", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  category: varchar("category", { length: 96 }).notNull(),
  description: text("description"),
  basePrompt: longtext("basePrompt").notNull(),
  safetyRules: json("safetyRules").$type<string[]>(),
  qualificationFields: json("qualificationFields").$type<string[]>(),
  suggestedServices: json("suggestedServices").$type<string[]>(),
  suggestedCrmFields: json("suggestedCrmFields").$type<string[]>(),
  recommendedChannels: json("recommendedChannels").$type<string[]>(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const businessBrains = mysqlTable("business_brains", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  verticalPackId: int("verticalPackId"),
  agentId: int("agentId"),
  prospectId: int("prospectId"),
  websiteSiteId: int("websiteSiteId"),
  serviceBusinessId: int("serviceBusinessId"),
  status: mysqlEnum("status", ["DRAFT", "REVIEW_READY", "ACTIVE", "ARCHIVED"]).notNull().default("DRAFT"),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  dbaName: varchar("dbaName", { length: 255 }),
  legalName: varchar("legalName", { length: 255 }),
  websiteUrl: varchar("websiteUrl", { length: 1024 }),
  industry: varchar("industry", { length: 160 }),
  subIndustry: varchar("subIndustry", { length: 160 }),
  yearsInBusiness: int("yearsInBusiness"),
  logoUrl: varchar("logoUrl", { length: 1024 }),
  businessDescription: longtext("businessDescription"),
  tagline: varchar("tagline", { length: 255 }),
  brandPersonality: varchar("brandPersonality", { length: 64 }).notNull().default("professional"),
  primaryPhone: varchar("primaryPhone", { length: 64 }),
  smsPhone: varchar("smsPhone", { length: 64 }),
  primaryEmail: varchar("primaryEmail", { length: 320 }),
  salesEmail: varchar("salesEmail", { length: 320 }),
  supportEmail: varchar("supportEmail", { length: 320 }),
  emergencyPhone: varchar("emergencyPhone", { length: 64 }),
  hours: json("hours"),
  afterHoursRules: longtext("afterHoursRules"),
  policies: json("policies"),
  paymentRules: json("paymentRules"),
  escalationRules: json("escalationRules"),
  socialLinks: json("socialLinks"),
  sourceFacts: json("sourceFacts"),
  confirmedFields: json("confirmedFields").$type<string[]>(),
  generatedPrompt: longtext("generatedPrompt"),
  generatedAt: timestamp("generatedAt"),
  reviewedAt: timestamp("reviewedAt"),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const businessBrainLocations = mysqlTable("business_brain_locations", {
  id: int("id").autoincrement().primaryKey(),
  brainId: int("brainId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  country: varchar("country", { length: 64 }).default("US"),
  postalCode: varchar("postalCode", { length: 32 }),
  serviceAreaMiles: int("serviceAreaMiles"),
  parkingInstructions: text("parkingInstructions"),
  accessInstructions: text("accessInstructions"),
  calendarConfig: json("calendarConfig"),
  hoursOverride: json("hoursOverride"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const businessBrainPeople = mysqlTable("business_brain_people", {
  id: int("id").autoincrement().primaryKey(),
  brainId: int("brainId").notNull(),
  locationId: int("locationId"),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  role: varchar("role", { length: 128 }),
  department: varchar("department", { length: 128 }),
  phone: varchar("phone", { length: 64 }),
  email: varchar("email", { length: 320 }),
  languages: json("languages").$type<string[]>(),
  skills: json("skills").$type<string[]>(),
  certifications: json("certifications").$type<string[]>(),
  serviceArea: varchar("serviceArea", { length: 255 }),
  availability: json("availability"),
  calendarConfig: json("calendarConfig"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const businessBrainServices = mysqlTable("business_brain_services", {
  id: int("id").autoincrement().primaryKey(),
  brainId: int("brainId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }),
  priceRange: varchar("priceRange", { length: 128 }),
  durationMinutes: int("durationMinutes"),
  deposit: decimal("deposit", { precision: 12, scale: 2 }),
  taxRule: varchar("taxRule", { length: 128 }),
  appointmentType: varchar("appointmentType", { length: 160 }),
  preparationRequirements: text("preparationRequirements"),
  cancellationRules: text("cancellationRules"),
  upsells: json("upsells").$type<string[]>(),
  crossSells: json("crossSells").$type<string[]>(),
  locationIds: json("locationIds").$type<number[]>(),
  peopleIds: json("peopleIds").$type<number[]>(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const businessBrainFaqs = mysqlTable("business_brain_faqs", {
  id: int("id").autoincrement().primaryKey(),
  brainId: int("brainId").notNull(),
  userId: int("userId").notNull(),
  question: text("question").notNull(),
  answer: longtext("answer").notNull(),
  source: mysqlEnum("source", ["WEBSITE", "OWNER", "VERTICAL_TEMPLATE"]).notNull().default("WEBSITE"),
  isApproved: boolean("isApproved").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const businessBrainChangeSets = mysqlTable("business_brain_change_sets", {
  id: int("id").autoincrement().primaryKey(),
  brainId: int("brainId").notNull(),
  userId: int("userId").notNull(),
  trigger: varchar("trigger", { length: 128 }).notNull(),
  affectedTargets: json("affectedTargets").$type<string[]>(),
  proposedChanges: json("proposedChanges"),
  status: mysqlEnum("status", ["DRAFT", "APPLIED", "DISCARDED"]).notNull().default("DRAFT"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  appliedAt: timestamp("appliedAt"),
});

export type VerticalPromptPack = typeof verticalPromptPacks.$inferSelect;
export type BusinessBrain = typeof businessBrains.$inferSelect;

// ─── VW Audit Log (append-only) ──────────────────────────────────────────────

export const vwAuditLog = mysqlTable("vw_audit_log", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  vwAccountId: int("vwAccountId"),
  action: varchar("action", { length: 128 }).notNull(), // GATE_CHECK, POW_SUBMIT, AGREEMENT_ACCEPT, TIER_CHANGE, etc.
  actor: varchar("actor", { length: 128 }), // user ID, system, webhook
  detail: json("detail"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
});

// ─── VW Config (admin-configurable settings, no deploy) ──────────────────────

export const vwConfig = mysqlTable("vw_config", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});
// Default config keys:
// qualifying_jf_level = "PIONEER"
// gate_cache_ttl_hours = "48"
// pow_reattestion_days = "365"
// downgrade_policy = "end_of_period"

// ── Website Builder ──────────────────────────────────────────────────────────
export const wbSites = mysqlTable("wb_sites", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 255 }),
  sessionId: varchar("sessionId", { length: 255 }),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  businessType: varchar("businessType", { length: 100 }).notNull(),
  tagline: varchar("tagline", { length: 500 }),
  description: text("description"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  colorScheme: varchar("colorScheme", { length: 50 }).default("blue"),
  style: varchar("style", { length: 50 }).default("modern"),
  generatedHtml: longtext("generatedHtml"),
  activeRevisionId: int("activeRevisionId"),
  status: mysqlEnum("status", ["generating", "preview", "published", "cancelled"]).default("generating"),
  subdomain: varchar("subdomain", { length: 100 }),
  customDomain: varchar("customDomain", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  planStatus: mysqlEnum("planStatus", ["free", "paid"]).default("free"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const wbChatMessages = mysqlTable("wb_chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const wbRevisions = mysqlTable("wb_revisions", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  parentRevisionId: int("parentRevisionId"),
  instruction: text("instruction").notNull(),
  htmlBefore: longtext("htmlBefore"),
  htmlAfter: longtext("htmlAfter"),
  engine: varchar("engine", { length: 80 }).default("MANUS_INTERNAL"),
  model: varchar("model", { length: 255 }),
  qualityStatus: varchar("qualityStatus", { length: 40 }).default("accepted"),
  createdAt: timestamp("createdAt").defaultNow(),
});


export const prospectLists = mysqlTable("prospect_lists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["GOOGLE_PLACES", "CSV", "MANUAL"]).notNull(),
  industry: varchar("industry", { length: 160 }),
  locationQuery: varchar("locationQuery", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const prospectListMembers = mysqlTable("prospect_list_members", {
  id: int("id").autoincrement().primaryKey(),
  listId: int("listId").notNull(),
  userId: int("userId").notNull(),
  prospectId: int("prospectId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
