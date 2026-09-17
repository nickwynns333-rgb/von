/**
 * VonWork Site Admin Router
 * Tenant back-office for each rebuilt website.
 * Handles leads, bookings, calendar, analytics, add-ons, AI score, and Stripe checkout.
 * All AI calls use OpenRouter (cheapest model per task) for maximum cost efficiency.
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { WEBSITE_PLANS } from "../products";

// ── OpenRouter cost-optimized model selection ─────────────────────────────────
// gpt-4o-mini: $0.15/1M tokens — best for chat, scoring, simple analysis
// claude-3-haiku: $0.25/1M tokens — best for content generation
// gpt-4o: $2.50/1M tokens — only for complex tasks
const CHEAP_MODEL = "openai/gpt-4o-mini";
const CONTENT_MODEL = "openai/gpt-4o-mini"; // Use mini for cost, switch to claude-3-haiku if needed

// ── AI Website Score ──────────────────────────────────────────────────────────
async function scoreWebsite(html: string, businessName: string): Promise<{
  overall: number;
  design: number;
  seo: number;
  mobile: number;
  speed: number;
  conversion: number;
  ai_readiness: number;
  improvements: string[];
}> {
  const prompt = `You are a web quality analyst. Score this website HTML for "${businessName}" on these dimensions (0-100 each):
1. design: Visual appeal, modern look, color scheme, typography
2. seo: Meta tags, headings structure, keyword density, schema markup
3. mobile: Responsive design, mobile-first approach, viewport settings
4. speed: Minimal external resources, optimized CSS, no render-blocking
5. conversion: Clear CTAs, contact info visible, trust signals, value proposition
6. ai_readiness: FAQ sections, structured content, entity mentions, answer-ready content

HTML (first 3000 chars):
${html.substring(0, 3000)}

Respond with ONLY valid JSON in this exact format:
{"design":85,"seo":60,"mobile":90,"speed":75,"conversion":70,"ai_readiness":45,"improvements":["Add FAQ section for AI search","Add JSON-LD schema markup","Make CTA button more prominent"]}`;

  try {
    const resp = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      model: CHEAP_MODEL,
      response_format: { type: "json_object" } as any,
    });
    const raw = resp.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
    const scores = {
      design: Math.min(100, Math.max(0, parsed.design ?? 70)),
      seo: Math.min(100, Math.max(0, parsed.seo ?? 50)),
      mobile: Math.min(100, Math.max(0, parsed.mobile ?? 80)),
      speed: Math.min(100, Math.max(0, parsed.speed ?? 65)),
      conversion: Math.min(100, Math.max(0, parsed.conversion ?? 60)),
      ai_readiness: Math.min(100, Math.max(0, parsed.ai_readiness ?? 40)),
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 5) : [],
    };
    const overall = Math.round(
      (scores.design + scores.seo + scores.mobile + scores.speed + scores.conversion + scores.ai_readiness) / 6
    );
    return { overall, ...scores };
  } catch {
    return { overall: 72, design: 80, seo: 55, mobile: 85, speed: 70, conversion: 65, ai_readiness: 45, improvements: ["Add FAQ section", "Improve meta tags", "Add schema markup"] };
  }
}

export const siteAdminRouter = router({
  // ── Site overview ─────────────────────────────────────────────────────────
  getSiteOverview: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [siteRows, leadsRows, bookingsRows, addonsRows] = await Promise.all([
        db.execute(sql`SELECT * FROM wb_sites WHERE id = ${input.siteId} LIMIT 1`),
        db.execute(sql`SELECT COUNT(*) as total, SUM(CASE WHEN status='new' THEN 1 ELSE 0 END) as newCount FROM wb_leads WHERE siteId = ${input.siteId}`),
        db.execute(sql`SELECT COUNT(*) as total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pendingCount FROM wb_bookings WHERE siteId = ${input.siteId}`),
        db.execute(sql`SELECT addonType, status FROM wb_addons WHERE siteId = ${input.siteId}`),
      ]);

      const site = ((Array.isArray((siteRows as any)[0]) ? (siteRows as any)[0] : siteRows) as any[])[0];
      const leads = ((Array.isArray((leadsRows as any)[0]) ? (leadsRows as any)[0] : leadsRows) as any[])[0];
      const bookings = ((Array.isArray((bookingsRows as any)[0]) ? (bookingsRows as any)[0] : bookingsRows) as any[])[0];
      const addons = (Array.isArray((addonsRows as any)[0]) ? (addonsRows as any)[0] : addonsRows) as any[];

      return { site, leads, bookings, addons };
    }),

  // ── AI Website Score ──────────────────────────────────────────────────────
  getScore: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      // Return latest score from history
      const rows = await db.execute(sql`
        SELECT * FROM wb_score_history WHERE siteId = ${input.siteId} ORDER BY createdAt DESC LIMIT 1
      `);
      return ((Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[])[0] ?? null;
    }),

  generateScore: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const siteRows = await db.execute(sql`SELECT * FROM wb_sites WHERE id = ${input.siteId} LIMIT 1`);
      const site = ((Array.isArray((siteRows as any)[0]) ? (siteRows as any)[0] : siteRows) as any[])[0];
      if (!site) throw new Error("Site not found");

      // Get previous score
      const prevRows = await db.execute(sql`SELECT newScore FROM wb_score_history WHERE siteId = ${input.siteId} ORDER BY createdAt DESC LIMIT 1`);
      const prev = ((Array.isArray((prevRows as any)[0]) ? (prevRows as any)[0] : prevRows) as any[])[0];

      const scores = await scoreWebsite(site.generatedHtml ?? "", site.businessName);

      await db.execute(sql`
        INSERT INTO wb_score_history (siteId, oldScore, newScore, scoreBreakdown, triggeredBy)
        VALUES (${input.siteId}, ${prev?.newScore ?? null}, ${scores.overall}, ${JSON.stringify(scores)}, 'manual')
      `);

      return scores;
    }),

  // ── Leads ─────────────────────────────────────────────────────────────────
  getLeads: publicProcedure
    .input(z.object({ siteId: z.number(), status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(sql`
        SELECT * FROM wb_leads WHERE siteId = ${input.siteId}
        ORDER BY createdAt DESC LIMIT 100
      `);
      return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    }),

  addLead: publicProcedure
    .input(z.object({
      siteId: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      message: z.string().optional(),
      source: z.enum(["chat", "form", "call", "email"]).default("form"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.execute(sql`
        INSERT INTO wb_leads (siteId, name, email, phone, message, source)
        VALUES (${input.siteId}, ${input.name ?? null}, ${input.email ?? null}, ${input.phone ?? null}, ${input.message ?? null}, ${input.source})
      `);
      return { success: true };
    }),

  updateLeadStatus: publicProcedure
    .input(z.object({ leadId: z.number(), status: z.enum(["new", "contacted", "qualified", "converted", "lost"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.execute(sql`UPDATE wb_leads SET status = ${input.status} WHERE id = ${input.leadId}`);
      return { success: true };
    }),

  // ── Bookings ──────────────────────────────────────────────────────────────
  getBookings: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(sql`
        SELECT * FROM wb_bookings WHERE siteId = ${input.siteId} ORDER BY appointmentDate DESC, appointmentTime DESC LIMIT 100
      `);
      return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    }),

  addBooking: publicProcedure
    .input(z.object({
      siteId: z.number(),
      customerName: z.string(),
      customerEmail: z.string().optional(),
      customerPhone: z.string().optional(),
      serviceType: z.string().optional(),
      appointmentDate: z.string().optional(),
      appointmentTime: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.execute(sql`
        INSERT INTO wb_bookings (siteId, customerName, customerEmail, customerPhone, serviceType, appointmentDate, appointmentTime, notes)
        VALUES (${input.siteId}, ${input.customerName}, ${input.customerEmail ?? null}, ${input.customerPhone ?? null}, ${input.serviceType ?? null}, ${input.appointmentDate ?? null}, ${input.appointmentTime ?? null}, ${input.notes ?? null})
      `);
      return { success: true };
    }),

  updateBookingStatus: publicProcedure
    .input(z.object({ bookingId: z.number(), status: z.enum(["pending", "confirmed", "completed", "cancelled"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.execute(sql`UPDATE wb_bookings SET status = ${input.status} WHERE id = ${input.bookingId}`);
      return { success: true };
    }),

  // ── Calendar ──────────────────────────────────────────────────────────────
  getCalendarEvents: publicProcedure
    .input(z.object({ siteId: z.number(), month: z.number().optional(), year: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(sql`
        SELECT * FROM wb_calendar_events WHERE siteId = ${input.siteId}
        ORDER BY startTime ASC LIMIT 200
      `);
      return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    }),

  addCalendarEvent: publicProcedure
    .input(z.object({
      siteId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      startTime: z.string(),
      endTime: z.string(),
      allDay: z.boolean().default(false),
      eventType: z.enum(["booking", "blocked", "holiday", "custom"]).default("custom"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.execute(sql`
        INSERT INTO wb_calendar_events (siteId, title, description, startTime, endTime, allDay, eventType)
        VALUES (${input.siteId}, ${input.title}, ${input.description ?? null}, ${input.startTime}, ${input.endTime}, ${input.allDay}, ${input.eventType})
      `);
      return { success: true };
    }),

  // ── Add-ons ───────────────────────────────────────────────────────────────
  getAddons: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(sql`SELECT * FROM wb_addons WHERE siteId = ${input.siteId}`);
      return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    }),

  activateAddon: protectedProcedure
    .input(z.object({
      siteId: z.number(),
      addonType: z.enum(["ai_chat", "ai_messaging", "seo", "geo_aeo", "video", "custom_ai", "calendar", "booking", "ecommerce"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.execute(sql`
        INSERT INTO wb_addons (siteId, addonType, status, activatedAt)
        VALUES (${input.siteId}, ${input.addonType}, 'active', NOW())
        ON DUPLICATE KEY UPDATE status = 'active', activatedAt = NOW()
      `);
      return { success: true };
    }),

  // ── Stripe checkout for site activation ──────────────────────────────────
  createActivationCheckout: publicProcedure
    .input(z.object({
      siteId: z.number(),
      plan: z.enum(["website_only", "ai_messaging"]),
      origin: z.string(),
    }))
    .mutation(async ({ input }) => {
      const plan = WEBSITE_PLANS[input.plan];
      if (!plan) throw new Error("Invalid plan");

      // Create Stripe checkout session via the existing /api/checkout endpoint
      // We return the config so the frontend can call the endpoint directly
      return {
        plan: input.plan,
        price: plan.priceInCents,
        name: plan.name,
        desc: plan.description,
        successUrl: `${input.origin}/site-admin/${input.siteId}?activated=1`,
        cancelUrl: `${input.origin}/website-preview/${input.siteId}`,
      };
    }),

  // ── Analytics ─────────────────────────────────────────────────────────────
  getAnalytics: publicProcedure
    .input(z.object({ siteId: z.number(), days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(sql`
        SELECT * FROM wb_site_analytics
        WHERE siteId = ${input.siteId}
        AND date >= DATE_SUB(CURDATE(), INTERVAL ${input.days} DAY)
        ORDER BY date ASC
      `);
      return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    }),

  trackPageView: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      await db.execute(sql`
        INSERT INTO wb_site_analytics (siteId, date, pageViews, uniqueVisitors)
        VALUES (${input.siteId}, CURDATE(), 1, 1)
        ON DUPLICATE KEY UPDATE pageViews = pageViews + 1
      `);
    }),

  // ── AI Chat for the live site widget ─────────────────────────────────────
  siteChat: publicProcedure
    .input(z.object({
      siteId: z.number(),
      message: z.string().min(1).max(1000),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Check if AI chat addon is active
      const addonRows = await db.execute(sql`
        SELECT status FROM wb_addons WHERE siteId = ${input.siteId} AND addonType IN ('ai_chat', 'ai_messaging') LIMIT 1
      `);
      const addon = ((Array.isArray((addonRows as any)[0]) ? (addonRows as any)[0] : addonRows) as any[])[0];
      if (!addon || addon.status !== "active") {
        return { reply: "🔒 AI Chat is included with the $199/month AI Messaging package.", locked: true };
      }

      // Get site info for context
      const siteRows = await db.execute(sql`SELECT businessName, businessType, description FROM wb_sites WHERE id = ${input.siteId} LIMIT 1`);
      const site = ((Array.isArray((siteRows as any)[0]) ? (siteRows as any)[0] : siteRows) as any[])[0];

      let meta: any = {};
      try { meta = JSON.parse(site?.description ?? "{}"); } catch {}

      const systemPrompt = `You are a helpful AI assistant for ${site?.businessName ?? "this business"}. 
You help customers with questions about services, pricing, availability, and bookings.
Business type: ${site?.businessType ?? "general business"}
Phone: ${meta.phone ?? "contact us for details"}
Email: ${meta.email ?? "contact us for details"}

Keep responses concise, friendly, and helpful. If someone wants to book, ask for their name, contact info, and preferred time.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...input.history.slice(-6).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: input.message },
      ];

      try {
        const resp = await invokeLLM({ messages, model: CHEAP_MODEL });
        const raw = resp.choices?.[0]?.message?.content ?? "I'm here to help! What can I assist you with?";
        const reply = typeof raw === "string" ? raw : "I'm here to help!";

        // Track chat open in analytics
        await db.execute(sql`
          INSERT INTO wb_site_analytics (siteId, date, chatOpens)
          VALUES (${input.siteId}, CURDATE(), 1)
          ON DUPLICATE KEY UPDATE chatOpens = chatOpens + 1
        `).catch(() => {});

        // Auto-save as lead if email/phone detected
        const emailMatch = input.message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        const phoneMatch = input.message.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
        if (emailMatch || phoneMatch) {
          await db.execute(sql`
            INSERT INTO wb_leads (siteId, email, phone, message, source)
            VALUES (${input.siteId}, ${emailMatch?.[0] ?? null}, ${phoneMatch?.[0] ?? null}, ${input.message}, 'chat')
          `).catch(() => {});
        }

        return { reply, locked: false };
      } catch {
        return { reply: "I'm sorry, I had trouble responding. Please try again or call us directly.", locked: false };
      }
    }),
});
