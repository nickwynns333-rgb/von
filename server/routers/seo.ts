import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { seoProjects, seoAuditReports, seoSubscriptions } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { openRouterChat } from "../openrouter";
import { TRPCError } from "@trpc/server";

// ─── Model Selection ──────────────────────────────────────────────────────────
// GPT-4o mini: best cost/quality for structured analysis ($0.15/$0.60 per 1M tokens)
// GPT-4o: best for long-form content generation ($2.50/$10 per 1M tokens)
const ANALYSIS_MODEL = "openai/gpt-4o-mini";
const CONTENT_MODEL = "openai/gpt-4o";

// ─── SEO Package Tiers ────────────────────────────────────────────────────────
export const SEO_TIERS = {
  starter: {
    name: "Starter",
    price: 100,
    projectsLimit: 1,
    auditsPerMonth: 4,
    features: [
      "1 website project",
      "4 AI audits/month",
      "Technical SEO analysis",
      "Keyword research (50 keywords)",
      "Content brief generator",
      "Meta tag writer",
      "Schema.org markup generator",
      "Monthly SEO report",
    ],
  },
  growth: {
    name: "Growth",
    price: 250,
    projectsLimit: 3,
    auditsPerMonth: 15,
    features: [
      "3 website projects",
      "15 AI audits/month",
      "Everything in Starter",
      "Competitor gap analysis",
      "Full article writer (5 articles/mo)",
      "On-page optimizer",
      "Internal linking planner",
      "Local SEO optimization",
      "GEO/AEO optimization (AI search)",
      "Backlink opportunity finder",
      "Weekly SEO report",
    ],
  },
  agency: {
    name: "Agency",
    price: 500,
    projectsLimit: 10,
    auditsPerMonth: 60,
    features: [
      "10 website projects",
      "60 AI audits/month",
      "Everything in Growth",
      "E-commerce SEO",
      "Full article writer (20 articles/mo)",
      "White-label SEO reports",
      "Priority support",
      "API access",
      "Daily rank tracking",
    ],
  },
};

// ─── Claude SEO Team System Prompt ───────────────────────────────────────────
const SEO_SYSTEM_PROMPT = `You are an expert SEO team with 25 specialized skills covering:
Technical SEO, E-E-A-T optimization, Schema.org markup, GEO/AEO (AI search optimization),
Local SEO, keyword strategy, content briefs, competitor analysis, backlink strategy, and e-commerce SEO.
Always provide actionable, specific recommendations with priority levels (Critical/High/Medium/Low).
Format findings as structured JSON when asked. Be concise but thorough.`;

// ─── Router ───────────────────────────────────────────────────────────────────
export const seoRouter = router({
  // ── Projects ──────────────────────────────────────────────────────────────
  listProjects: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db
      .select()
      .from(seoProjects)
      .where(eq(seoProjects.userId, ctx.user.id))
      .orderBy(desc(seoProjects.createdAt));
  }),

  createProject: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(128), url: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const now = Date.now();
      const [project] = await db.insert(seoProjects).values({
        userId: ctx.user.id,
        name: input.name,
        url: input.url,
        createdAt: now,
        updatedAt: now,
      }).$returningId();
      return project;
    }),

  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(seoProjects).where(
        and(eq(seoProjects.id, input.projectId), eq(seoProjects.userId, ctx.user.id))
      );
      return { success: true };
    }),

  listAudits: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db
        .select()
        .from(seoAuditReports)
        .where(and(eq(seoAuditReports.projectId, input.projectId), eq(seoAuditReports.userId, ctx.user.id)))
        .orderBy(desc(seoAuditReports.createdAt))
        .limit(20);
    }),

  // ── AUDIT: Analyze a URL ───────────────────────────────────────────────────
  runAudit: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      url: z.string().url(),
      auditType: z.enum(["full", "technical", "content", "schema", "geo", "local", "backlinks", "keywords"]).default("full"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const auditPrompts: Record<string, string> = {
        full: `Perform a comprehensive SEO audit for: ${input.url}
Analyze: technical SEO, content quality, E-E-A-T signals, schema markup, page speed indicators, mobile optimization, keyword opportunities, and GEO/AEO readiness.
Return a JSON object with: { score: number (0-100), findings: [{category, severity: "critical"|"high"|"medium"|"low", title, description, recommendation, estimatedImpact}], summary: string, topPriorities: string[] }`,
        technical: `Perform a technical SEO audit for: ${input.url}
Focus on: crawlability, indexability, site structure, URL structure, canonical tags, Core Web Vitals, HTTPS, structured data.
Return JSON: { score: number, findings: [{category, severity, title, description, recommendation}], summary: string }`,
        content: `Perform a content SEO audit for: ${input.url}
Analyze: content quality, E-E-A-T signals, keyword usage, heading structure, internal linking, readability, featured snippet opportunities.
Return JSON: { score: number, findings: [{category, severity, title, description, recommendation}], summary: string }`,
        schema: `Audit Schema.org markup opportunities for: ${input.url}
Identify: missing schema types, incorrect implementations, rich snippet opportunities (FAQ, HowTo, Product, Review, LocalBusiness, Article).
Return JSON: { score: number, findings: [{schemaType, severity, title, description, jsonLdExample}], summary: string }`,
        geo: `Analyze GEO/AEO (Generative Engine Optimization) for: ${input.url}
Focus on: AI search readiness, featured snippet optimization, People Also Ask opportunities, entity optimization.
Return JSON: { score: number, findings: [{category, severity, title, description, recommendation}], summary: string }`,
        local: `Perform a local SEO audit for: ${input.url}
Analyze: NAP consistency, Google Business Profile signals, local keyword opportunities, local schema markup, citation opportunities.
Return JSON: { score: number, findings: [{category, severity, title, description, recommendation}], summary: string }`,
        keywords: `Perform keyword research for: ${input.url}
Identify: primary keywords, long-tail opportunities, search intent mapping, keyword clusters, low-competition high-value terms.
Return JSON: { score: number, keywords: [{keyword, intent, difficulty: "low"|"medium"|"high", opportunity}], clusters: [{topic, keywords: string[]}], summary: string }`,
        backlinks: `Analyze backlink strategy for: ${input.url}
Identify: link building opportunities, anchor text strategy, competitor backlink gaps, high-authority sites to target.
Return JSON: { score: number, findings: [{category, severity, title, description, recommendation}], opportunities: [{type, target, approach}], summary: string }`,
      };

      const response = await openRouterChat({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: SEO_SYSTEM_PROMPT },
          { role: "user", content: auditPrompts[input.auditType] || auditPrompts.full },
        ],
        temperature: 0.3,
      });

      const rawResponse = response.choices[0]?.message?.content ?? "";
      let findings: string | null = null;
      let score = 0;
      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          findings = JSON.stringify(parsed.findings || parsed.keywords || parsed.opportunities || []);
          score = parsed.score ?? 0;
        }
      } catch {
        findings = JSON.stringify([{ category: "Analysis", severity: "medium", title: "SEO Analysis Complete", description: rawResponse.slice(0, 500), recommendation: "Review full report" }]);
        score = 50;
      }

      const now = Date.now();
      const [report] = await db.insert(seoAuditReports).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        auditType: input.auditType,
        score,
        findings,
        rawResponse,
        creditsUsed: 1,
        createdAt: now,
      }).$returningId();

      await db.update(seoProjects)
        .set({ lastAuditAt: now, auditScore: score, updatedAt: now })
        .where(eq(seoProjects.id, input.projectId));

      return { reportId: report.id, score, findings, rawResponse };
    }),

  // ── EXECUTE: Write Meta Tags ───────────────────────────────────────────────
  writeMetaTags: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      pageTitle: z.string().optional(),
      targetKeyword: z.string().optional(),
      pageType: z.enum(["homepage", "product", "blog", "service", "about", "contact"]).default("homepage"),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: SEO_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Write optimized meta tags for this page:
URL: ${input.url}
Page type: ${input.pageType}
${input.pageTitle ? `Current title: ${input.pageTitle}` : ""}
${input.targetKeyword ? `Target keyword: ${input.targetKeyword}` : ""}

Return JSON: {
  title: string (50-60 chars, keyword near start),
  description: string (150-160 chars, includes keyword, compelling CTA),
  ogTitle: string,
  ogDescription: string,
  h1: string,
  canonicalNote: string,
  robotsRecommendation: string
}`,
          },
        ],
        temperature: 0.3,
      });

      const raw = response.choices[0]?.message?.content ?? "";
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        return { metaTags: jsonMatch ? JSON.parse(jsonMatch[0]) : null, raw };
      } catch {
        return { metaTags: null, raw };
      }
    }),

  // ── EXECUTE: Generate Schema Markup ───────────────────────────────────────
  generateSchema: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      schemaType: z.enum(["LocalBusiness", "Product", "Article", "FAQ", "HowTo", "Organization", "Person", "BreadcrumbList", "WebSite"]),
      businessName: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: SEO_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Generate complete, valid Schema.org JSON-LD markup for:
URL: ${input.url}
Schema type: ${input.schemaType}
${input.businessName ? `Business name: ${input.businessName}` : ""}
${input.description ? `Description: ${input.description}` : ""}

Return the complete JSON-LD script tag ready to paste into the <head> of the page.
Also return a brief explanation of what each field does.
Format: { jsonLd: string (the complete <script type="application/ld+json">...</script>), explanation: string, fieldsToCustomize: string[] }`,
          },
        ],
        temperature: 0.2,
      });

      const raw = response.choices[0]?.message?.content ?? "";
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        return { result: jsonMatch ? JSON.parse(jsonMatch[0]) : null, raw };
      } catch {
        return { result: null, raw };
      }
    }),

  // ── EXECUTE: Write Full SEO Article ───────────────────────────────────────
  writeArticle: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      title: z.string().optional(),
      wordCount: z.number().min(300).max(3000).default(1200),
      tone: z.enum(["professional", "conversational", "authoritative", "friendly"]).default("professional"),
      industry: z.string().optional(),
      includeSchema: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: CONTENT_MODEL,
        messages: [
          { role: "system", content: `${SEO_SYSTEM_PROMPT} You are also an expert content writer who creates fully SEO-optimized articles that rank on Google.` },
          {
            role: "user",
            content: `Write a fully SEO-optimized article for the keyword: "${input.keyword}"
${input.title ? `Title: ${input.title}` : ""}
${input.industry ? `Industry: ${input.industry}` : ""}
Target word count: ~${input.wordCount} words
Tone: ${input.tone}

Requirements:
- Keyword in H1, first paragraph, and naturally throughout
- Use H2 and H3 subheadings with semantic keywords
- Include E-E-A-T signals (expertise, experience, authority, trust)
- Add a FAQ section at the end (5 questions)
- Optimize for featured snippets
- Include internal linking placeholders [LINK: topic]
- ${input.includeSchema ? "Include Article schema markup at the end" : ""}

Return the complete article in Markdown format, ready to publish.`,
          },
        ],
        temperature: 0.6,
      });

      return { article: response.choices[0]?.message?.content ?? "" };
    }),

  // ── EXECUTE: On-Page Optimizer ─────────────────────────────────────────────
  optimizePage: protectedProcedure
    .input(z.object({
      content: z.string().min(100),
      targetKeyword: z.string().min(1),
      url: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: SEO_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze and optimize this page content for the keyword: "${input.targetKeyword}"
${input.url ? `URL: ${input.url}` : ""}

Content to optimize:
---
${input.content.slice(0, 3000)}
---

Return JSON: {
  keywordDensity: string,
  score: number (0-100),
  issues: [{type, severity, description, fix}],
  optimizedTitle: string,
  optimizedH1: string,
  suggestedLSIKeywords: string[],
  readabilityScore: string,
  recommendations: string[]
}`,
          },
        ],
        temperature: 0.3,
      });

      const raw = response.choices[0]?.message?.content ?? "";
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        return { result: jsonMatch ? JSON.parse(jsonMatch[0]) : null, raw };
      } catch {
        return { result: null, raw };
      }
    }),

  // ── EXECUTE: Internal Linking Planner ─────────────────────────────────────
  planInternalLinks: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      pages: z.array(z.string()).min(2).max(20),
      targetPage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: SEO_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Create an internal linking strategy for this website: ${input.url}

Pages to link between:
${input.pages.map((p, i) => `${i + 1}. ${p}`).join("\n")}
${input.targetPage ? `\nPriority page to boost: ${input.targetPage}` : ""}

Return JSON: {
  linkingPlan: [{fromPage: string, toPage: string, anchorText: string, reason: string, priority: "high"|"medium"|"low"}],
  pillarPages: string[],
  clusterTopics: [{pillar: string, supportingPages: string[]}],
  summary: string
}`,
          },
        ],
        temperature: 0.4,
      });

      const raw = response.choices[0]?.message?.content ?? "";
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        return { result: jsonMatch ? JSON.parse(jsonMatch[0]) : null, raw };
      } catch {
        return { result: null, raw };
      }
    }),

  // ── ANALYZE: Content Brief ─────────────────────────────────────────────────
  generateContentBrief: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      url: z.string().url().optional(),
      industry: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: SEO_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Create a comprehensive SEO content brief for: "${input.keyword}"
${input.url ? `Website: ${input.url}` : ""}
${input.industry ? `Industry: ${input.industry}` : ""}

Include:
1. Target keyword + 5 LSI/semantic keywords
2. Search intent analysis
3. Recommended title (H1) with keyword
4. Meta description (155 chars)
5. Content outline (H2s and H3s)
6. Key entities to mention
7. Word count recommendation
8. E-E-A-T signals to include
9. Schema markup recommendation
10. Featured snippet opportunity`,
          },
        ],
        temperature: 0.4,
      });

      return { brief: response.choices[0]?.message?.content ?? "" };
    }),

  // ── ANALYZE: Keyword Research ──────────────────────────────────────────────
  keywordResearch: protectedProcedure
    .input(z.object({
      seed: z.string().min(1),
      industry: z.string().optional(),
      count: z.number().default(20),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: SEO_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Generate ${input.count} keyword ideas for: "${input.seed}"
${input.industry ? `Industry: ${input.industry}` : ""}

For each keyword: keyword, intent ("informational"|"commercial"|"transactional"|"navigational"), difficulty ("low"|"medium"|"high"), type ("head"|"body"|"long-tail"), contentIdea (1 sentence).
Return as JSON array: [{keyword, intent, difficulty, type, contentIdea}]`,
          },
        ],
        temperature: 0.5,
      });

      const raw = response.choices[0]?.message?.content ?? "[]";
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        return { keywords: jsonMatch ? JSON.parse(jsonMatch[0]) : [], raw };
      } catch {
        return { keywords: [], raw };
      }
    }),

  // ── ANALYZE: Competitor Gap ────────────────────────────────────────────────
  analyzeCompetitor: protectedProcedure
    .input(z.object({
      yourUrl: z.string().url(),
      competitorUrl: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: SEO_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Competitor SEO gap analysis:
Your site: ${input.yourUrl}
Competitor: ${input.competitorUrl}

Analyze:
1. Content gaps (topics they cover that you don't)
2. Keyword opportunities they're ranking for
3. Backlink strategy differences
4. Technical SEO advantages they have
5. Quick wins to outrank them

Return JSON: { gaps: [{category, opportunity, priority, action}], quickWins: string[], summary: string }`,
          },
        ],
        temperature: 0.4,
      });

      return { analysis: response.choices[0]?.message?.content ?? "" };
    }),

  // ── Subscription ──────────────────────────────────────────────────────────
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const [sub] = await db
      .select()
      .from(seoSubscriptions)
      .where(eq(seoSubscriptions.userId, ctx.user.id))
      .limit(1);
    return sub ?? null;
  }),

  getTiers: protectedProcedure.query(() => SEO_TIERS),

  // ── GEO/AEO: AI Citation Optimizer ───────────────────────────────────────────
  // Rewrites content into the direct-answer format AI engines quote
  optimizeForAICitation: protectedProcedure
    .input(z.object({
      content: z.string().min(50).max(8000),
      targetQuery: z.string().min(3).max(200), // The question users ask AI engines
      brand: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: CONTENT_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert in GEO (Generative Engine Optimization) — optimizing content to be cited by AI engines like ChatGPT, Perplexity, Claude, Gemini, and Bing Copilot.

AI engines prefer content that:
1. Opens with a direct, authoritative answer (1-2 sentences)
2. Uses named entities, statistics, and specific facts
3. Has clear structure: definition → explanation → examples → FAQ
4. Includes quotable "soundbite" paragraphs (2-3 sentences, standalone)
5. Uses natural language matching how people ask AI questions
6. Cites sources and data points
7. Avoids fluff, filler, and marketing language

Return a JSON object with:
- optimizedContent: the rewritten content (markdown)
- citationSnippets: array of 3-5 standalone paragraphs AI engines are most likely to quote
- entityList: array of key entities/facts added to strengthen AI recognition
- improvements: array of specific changes made and why
- aiReadinessScore: 0-100 score for AI citation likelihood`,
          },
          {
            role: "user",
            content: `Target query (what users ask AI engines): "${input.targetQuery}"
${input.brand ? `Brand: ${input.brand}` : ""}

Original content to optimize:
${input.content}`,
          },
        ],
        responseFormat: { type: "json_object" },
        temperature: 0.3,
      });
      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        return { result: parsed, raw };
      } catch {
        return { result: null, raw };
      }
    }),

  // ── GEO/AEO: FAQ Schema Builder ──────────────────────────────────────────────
  // Generates FAQ blocks that match how people ask AI engines questions
  buildFAQSchema: protectedProcedure
    .input(z.object({
      topic: z.string().min(3).max(200),
      url: z.string().url(),
      industry: z.string().optional(),
      count: z.number().min(5).max(20).default(10),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: ANALYSIS_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert in AEO (Answer Engine Optimization) and FAQ schema markup.

Generate FAQ questions that:
1. Match exactly how people phrase questions to ChatGPT, Perplexity, and Google
2. Cover the full topic cluster (definition, how-to, comparison, cost, alternatives, problems)
3. Have direct, authoritative answers (2-4 sentences each)
4. Include the primary keyword naturally in both Q and A
5. Are formatted for JSON-LD FAQ schema

Return a JSON object with:
- faqs: array of {question, answer} objects
- jsonLd: complete JSON-LD script tag ready to paste into HTML
- topQueries: array of the top 5 queries people ask AI engines about this topic
- coverageScore: 0-100 score for how well the FAQs cover the topic`,
          },
          {
            role: "user",
            content: `Topic: ${input.topic}
URL: ${input.url}
${input.industry ? `Industry: ${input.industry}` : ""}
Generate ${input.count} FAQ pairs.`,
          },
        ],
        responseFormat: { type: "json_object" },
        temperature: 0.3,
      });
      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        return { result: parsed, raw };
      } catch {
        return { result: null, raw };
      }
    }),

  // ── GEO/AEO: Entity & Brand Mention Tracker ──────────────────────────────────
  // Identifies entities to mention to be associated with a topic in AI training data
  analyzeEntityStrategy: protectedProcedure
    .input(z.object({
      topic: z.string().min(3).max(200),
      brand: z.string().min(1).max(100),
      url: z.string().url(),
      industry: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: ANALYSIS_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert in entity-based SEO and AI search visibility.

AI engines like ChatGPT and Perplexity build knowledge graphs from entities (people, companies, products, concepts, places). To appear in AI answers, a brand must be associated with the right entities.

Analyze the topic and brand, then return a JSON object with:
- coreEntities: array of {entity, type, relevance, howToMention} — entities the brand MUST be associated with
- authorityFigures: array of {name, role, whyMention} — people/experts to cite or quote
- competitorEntities: array of entities competitors are associated with that this brand is missing
- contentGaps: array of subtopics the brand needs content about to build entity associations
- mentionStrategy: step-by-step plan to build entity associations over 90 days
- currentVisibilityScore: estimated 0-100 score for AI search visibility based on the topic/brand`,
          },
          {
            role: "user",
            content: `Brand: ${input.brand}
Website: ${input.url}
Topic to rank for: ${input.topic}
${input.industry ? `Industry: ${input.industry}` : ""}`,
          },
        ],
        responseFormat: { type: "json_object" },
        temperature: 0.3,
      });
      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        return { result: parsed, raw };
      } catch {
        return { result: null, raw };
      }
    }),

  // ── GEO/AEO: AI Answer Simulator ─────────────────────────────────────────────
  // Simulates what ChatGPT/Perplexity would say and shows where to insert your brand
  simulateAIAnswer: protectedProcedure
    .input(z.object({
      query: z.string().min(5).max(300),
      brand: z.string().min(1).max(100),
      url: z.string().url(),
      engine: z.enum(["chatgpt", "perplexity", "gemini", "claude", "bing"]).default("perplexity"),
    }))
    .mutation(async ({ input }) => {
      const engineStyles: Record<string, string> = {
        chatgpt: "conversational, comprehensive, uses bullet points, cites sources inline",
        perplexity: "research-style, numbered citations, factual, concise paragraphs",
        gemini: "structured, uses headers, Google-product-aware, balanced",
        claude: "nuanced, thoughtful, acknowledges uncertainty, well-organized",
        bing: "Microsoft-integrated, uses web sources, structured with links",
      };
      const response = await openRouterChat({
        model: CONTENT_MODEL,
        messages: [
          {
            role: "system",
            content: `You are simulating how ${input.engine.charAt(0).toUpperCase() + input.engine.slice(1)} AI would answer a user query. Style: ${engineStyles[input.engine]}.

First, generate what the AI would currently say WITHOUT knowing about the brand.
Then, analyze where and how the brand could be inserted to get cited.

Return a JSON object with:
- currentAIAnswer: what the AI would say today (realistic simulation, 200-400 words)
- brandInsertionPoints: array of {location, suggestedText, reason} — exactly where/how to insert the brand
- optimizedAIAnswer: the same answer but with the brand naturally cited
- citationRequirements: what content/pages the brand needs to create to earn this citation
- competitorsMentioned: array of brands/sources the AI would currently cite instead
- difficultyScore: 1-10 (10 = very hard to displace current sources)`,
          },
          {
            role: "user",
            content: `Query: "${input.query}"
Brand to insert: ${input.brand}
Website: ${input.url}`,
          },
        ],
        responseFormat: { type: "json_object" },
        temperature: 0.4,
      });
      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        return { result: parsed, raw };
      } catch {
        return { result: null, raw };
      }
    }),

  // ── GEO/AEO: AI-Optimized Content Rewriter ───────────────────────────────────
  // Rewrites existing content to be citation-friendly for AI engines
  rewriteForAISearch: protectedProcedure
    .input(z.object({
      content: z.string().min(50).max(10000),
      targetKeyword: z.string().min(2).max(200),
      brand: z.string().optional(),
      addStatistics: z.boolean().default(true),
      addFAQ: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const response = await openRouterChat({
        model: CONTENT_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert content strategist specializing in GEO (Generative Engine Optimization) — making content get cited by AI engines.

Rewrite the provided content following these AI-search optimization principles:

1. **Direct Answer First**: Open with a 1-2 sentence direct answer to the implied question
2. **Inverted Pyramid**: Most important info first, supporting details after
3. **Quotable Snippets**: Create 3-5 standalone paragraphs (2-3 sentences) that AI can quote verbatim
4. **Named Entities**: Add specific company names, people, statistics, dates, and places
5. **Statistics & Data**: Add relevant statistics with sources (even estimated/industry-standard ones)
6. **FAQ Section**: Add 5-7 Q&A pairs matching how people ask AI engines
7. **Semantic Richness**: Use LSI keywords, synonyms, and related concepts
8. **Authority Signals**: Add expert quotes, methodology mentions, and credibility markers

Return a JSON object with:
- rewrittenContent: the full rewritten content in markdown
- citationSnippets: array of 3-5 paragraphs most likely to be quoted by AI
- addedElements: list of what was added (statistics, entities, FAQ, etc.)
- beforeAfterScore: {before: 0-100, after: 0-100} AI citation readiness scores
- keyImprovements: array of the most impactful changes made`,
          },
          {
            role: "user",
            content: `Target keyword: ${input.targetKeyword}
${input.brand ? `Brand: ${input.brand}` : ""}
Add statistics: ${input.addStatistics}
Add FAQ section: ${input.addFAQ}

Content to rewrite:
${input.content}`,
          },
        ],
        responseFormat: { type: "json_object" },
        temperature: 0.35,
      });
      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        return { result: parsed, raw };
      } catch {
        return { result: null, raw };
      }
    }),
});
