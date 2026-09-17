/**
 * VonWork Stripe Products & Pricing Configuration
 * Centralized product definitions for all subscription packages
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  interval: "month" | "year";
  features: string[];
  category?: "platform" | "website" | "seo" | "aicfo" | "joinforce" | "hfn";
  isJoinForce?: boolean; // hidden from public — only shown to JoinForce members
  isHfnOwnUse?: boolean; // hidden from public — only shown after HFN verification
  ownUseOnly?: boolean;
}

export interface WebsitePlan {
  id: "website_only" | "ai_messaging";
  name: string;
  priceInCents: number;
  description: string;
  features: string[];
  addonType?: "ai_messaging";
}

/** Public Website Builder subscriptions. A free rebuilt-site preview remains a demo, not a subscription tier. */
export const WEBSITE_PLANS: Record<WebsitePlan["id"], WebsitePlan> = {
  website_only: {
    id: "website_only",
    name: "Website Only",
    priceInCents: 2900,
    description: "A live VonWork website with SSL and a secure business back-office.",
    features: ["Live website hosting", "Custom domain and SSL", "Secure business back-office", "Demo-to-live activation"],
  },
  ai_messaging: {
    id: "ai_messaging",
    name: "AI Messaging",
    priceInCents: 19900,
    description: "Website chatbot plus limited AI phone answering for a live VonWork website.",
    addonType: "ai_messaging",
    features: ["Everything in Website Only", "Website chatbot", "Lead capture and routing", "Limited AI phone answering", "100 AI phone-answering minutes per month"],
  },
};

export const PRODUCTS: Record<string, Product> = {
  // ── Website Builder Packages (Public) ───────────────────────────────────────
  website_only: {
    id: "website_only",
    name: "Website Only",
    description: WEBSITE_PLANS.website_only.description,
    priceInCents: WEBSITE_PLANS.website_only.priceInCents,
    interval: "month",
    category: "website",
    features: WEBSITE_PLANS.website_only.features,
  },
  ai_messaging: {
    id: "ai_messaging",
    name: "AI Messaging",
    description: WEBSITE_PLANS.ai_messaging.description,
    priceInCents: WEBSITE_PLANS.ai_messaging.priceInCents,
    interval: "month",
    category: "website",
    features: WEBSITE_PLANS.ai_messaging.features,
  },

  // ── Platform Tiers (Public) ───────────────────────────────────────────────
  starter: {
    id: "starter",
    name: "VonWork Starter",
    description: "Core AI Business OS for small businesses and solo operators",
    priceInCents: 49900, // $499/month
    interval: "month",
    category: "platform",
    features: [
      "AI Receptionist (1,000 min/mo)",
      "CRM — contacts, deals, pipeline",
      "Omnichannel inbox (SMS, email, web chat)",
      "AI Scheduler + public booking page",
      "Payroll & legal document AI",
      "Basic accounting back-office",
      "1 AI Chat Agent (usage billed separately)",
      "AI-rebuilt website demo + Website Only activation option",
      "Email & chat support",
    ],
  },
  pro: {
    id: "pro",
    name: "VonWork AI Video Pro",
    description: "AI Video Agent + full AI Business OS — replaces $4,000+/mo in SaaS tools",
    priceInCents: 99900, // $999/month
    interval: "month",
    category: "platform",
    features: [
      "Everything in Starter",
      "AI Call Center (10,000 min/mo)",
      "Broadcast — bulk SMS & voice drop",
      "Full accounting + AI CFO chat",
      "AI Sales + AI Marketing modules",
      "5 AI Chat Agents (usage billed separately)",
      "Custom AI video agent and live presentation room",
      "Custom voice / avatar workflow (consent required)",
      "AI SEO Quick Audit + website rebuild demo",
      "Field Service (FSM) module",
      "Priority support",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "VonWork Enterprise",
    description: "White-label platform for enterprises with dedicated implementation",
    priceInCents: 149700, // $1,497/month
    interval: "month",
    category: "platform",
    features: [
      "Everything in Pro",
      "Unlimited AI Agents",
      "White-label branding (your logo)",
      "Client sub-account management",
      "All 5 GEO/AEO tools",
      "AI CFO — Controller tier",
      "Affiliate program access",
      "Dedicated account manager",
      "Custom onboarding",
    ],
  },

  // ── SEO Flat-Rate Add-ons (not tiers — pick what you need) ───────────────
  seo_execution: {
    id: "seo_execution",
    name: "AI SEO Execution",
    description: "Full SEO toolkit — keyword research, content writer, meta, schema, on-page optimizer",
    priceInCents: 14900, // $149/month flat
    interval: "month",
    category: "seo",
    features: [
      "Unlimited keyword research",
      "AI Article Writer (GPT-4o mini)",
      "Meta tag writer",
      "Schema markup generator",
      "On-Page Optimizer",
      "Internal Linking Planner",
      "Competitor Analysis",
      "Monthly site audit",
    ],
  },
  seo_geo_aeo: {
    id: "seo_geo_aeo",
    name: "AI GEO/AEO — Get Found by AI",
    description: "All 5 tools to get cited by ChatGPT, Perplexity, Claude & Gemini",
    priceInCents: 14900, // $149/month flat
    interval: "month",
    category: "seo",
    features: [
      "AI Citation Optimizer",
      "FAQ Schema Builder",
      "Entity & Brand Strategy",
      "AI Answer Simulator",
      "AI Content Rewriter",
    ],
  },
  seo_bundle: {
    id: "seo_bundle",
    name: "AI SEO + GEO/AEO Bundle",
    description: "Both SEO Execution and GEO/AEO tools at one flat price",
    priceInCents: 24900, // $249/month (save $49 vs buying separately)
    interval: "month",
    category: "seo",
    features: [
      "Everything in AI SEO Execution",
      "Everything in AI GEO/AEO",
      "Save $49/mo vs buying separately",
    ],
  },

  // ── AI CFO Subscription Tiers ─────────────────────────────────────────────
  aicfo_bookkeeper: {
    id: "aicfo_bookkeeper",
    name: "AI Bookkeeper",
    description: "Automated bookkeeping for small businesses and freelancers",
    priceInCents: 29700, // $297/month
    interval: "month",
    category: "aicfo",
    features: [
      "AI transaction categorization",
      "Receipt OCR upload",
      "Monthly P&L report",
      "1 accounting client",
      "AI Tax Advisor Q&A",
    ],
  },
  aicfo_controller: {
    id: "aicfo_controller",
    name: "AI Controller",
    description: "Full bookkeeping + bank reconciliation for growing businesses",
    priceInCents: 69700, // $697/month
    interval: "month",
    category: "aicfo",
    features: [
      "Everything in AI Bookkeeper",
      "Bank reconciliation",
      "Cash flow forecasting",
      "3 accounting clients",
      "AI CFO chat (50 messages/mo)",
      "1 tax filing included/year",
    ],
  },
  aicfo_cfo: {
    id: "aicfo_cfo",
    name: "AI CFO",
    description: "Strategic financial intelligence + full tax services",
    priceInCents: 149700, // $1,497/month
    interval: "month",
    category: "aicfo",
    features: [
      "Everything in AI Controller",
      "Unlimited AI CFO chat",
      "10 accounting clients",
      "Full tax filing suite",
      "Indian CPA team access",
      "3 tax filings included/year",
    ],
  },
  aicfo_enterprise: {
    id: "aicfo_enterprise",
    name: "AI CFO Enterprise",
    description: "Full-service accounting firm in a box — for agencies and enterprises",
    priceInCents: 299700, // $2,997/month
    interval: "month",
    category: "aicfo",
    features: [
      "Unlimited accounting clients",
      "Unlimited tax filings",
      "Dedicated Indian CPA team",
      "White-label reseller rights",
      "API access",
      "Weekly CFO strategy calls",
    ],
  },

  // ── JoinForce Member Pricing (hidden — only shown to JoinForce members) ───
  jf_starter: {
    id: "jf_starter",
    name: "VonWork Starter — JoinForce Member Rate",
    description: "Exclusive 40% discount for verified JoinForce members",
    priceInCents: 29900, // $299/month (40% off $499)
    interval: "month",
    category: "joinforce",
    isJoinForce: true,
    features: [
      "Everything in VonWork Starter",
      "JoinForce member badge",
      "40% discount vs public price",
      "Access to JoinForce community tools",
    ],
  },
  jf_pro: {
    id: "jf_pro",
    name: "VonWork Pro — JoinForce Member Rate",
    description: "Exclusive 30% discount for JoinForce members",
    priceInCents: 69900, // $699/month (30% off $999)
    interval: "month",
    category: "joinforce",
    isJoinForce: true,
    features: [
      "Everything in VonWork AI Video Pro",
      "JoinForce member badge",
      "30% discount vs public price",
      "Access to JoinForce community tools",
      "JoinForce referral commission tracking",
    ],
  },
  jf_seo_bundle: {
    id: "jf_seo_bundle",
    name: "AI SEO + GEO Bundle — JoinForce Member Rate",
    description: "Exclusive 40% discount on the SEO + GEO/AEO bundle for JoinForce members",
    priceInCents: 14900, // $149/month (40% off $249)
    interval: "month",
    category: "joinforce",
    isJoinForce: true,
    features: [
      "Everything in AI SEO + GEO/AEO Bundle",
      "40% discount vs public price",
      "JoinForce member badge",
    ],
  },
  jf_seo_execution: {
    id: "jf_seo_execution",
    name: "AI SEO Execution — JoinForce Member Rate",
    description: "Verified JoinForce rate for AI SEO Execution",
    priceInCents: 9900,
    interval: "month",
    category: "joinforce",
    isJoinForce: true,
    features: ["Everything in AI SEO Execution", "Verified JoinForce member rate"],
  },
  jf_geo_aeo: {
    id: "jf_geo_aeo",
    name: "AI GEO/AEO — JoinForce Member Rate",
    description: "Verified JoinForce rate for AI GEO/AEO tools",
    priceInCents: 9900,
    interval: "month",
    category: "joinforce",
    isJoinForce: true,
    features: ["Everything in AI GEO/AEO", "Verified JoinForce member rate"],
  },

  // ── Humans First Member Own-Use Pricing (hidden + server-gated) ────────────
  // The benefit is non-transferable and attached to one verified member and
  // their own VonWork business account. Usage charges remain separate.
  hfn_starter: {
    id: "hfn_starter",
    name: "VonWork Starter — HFN Own-Use Rate",
    description: "Verified Humans First member own-use rate: 50% off VonWork Starter",
    priceInCents: 24950, // exactly 50% off $499/month
    interval: "month",
    category: "hfn",
    isHfnOwnUse: true,
    ownUseOnly: true,
    features: [
      "Everything in VonWork Starter",
      "50% verified HFN own-use discount",
      "Non-transferable: one verified member and their own business account",
      "AI usage, call minutes, and messages billed separately",
    ],
  },
  hfn_pro: {
    id: "hfn_pro",
    name: "VonWork AI Video Pro — HFN Own-Use Rate",
    description: "Verified Humans First member own-use rate: 50% off VonWork AI Video Pro",
    priceInCents: 49950, // exactly 50% off $999/month
    interval: "month",
    category: "hfn",
    isHfnOwnUse: true,
    ownUseOnly: true,
    features: [
      "Everything in VonWork AI Video Pro",
      "50% verified HFN own-use discount",
      "Non-transferable: one verified member and their own business account",
      "AI usage, call minutes, and messages billed separately",
    ],
  },
};
