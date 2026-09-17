/**
 * VonWork AI Website Rebuilder — tRPC Router
 *
 * Flow:
 * 1. User pastes existing website URL
 * 2. Server fetches the page HTML and extracts business info
 * 3. AI rebuilds it as a beautiful modern site
 * 4. Preview link is generated — shareable / emailable as a pitch
 * 5. Business activates Website Only for $29/month
 * 6. AI Messaging is a $199/month package with chatbot and limited AI phone answering
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import {
  type WebsiteSource,
} from "../websiteDesign";
import {
  generateWebsiteWithManus,
  reviseWebsiteWithManus,
  type WebsiteCreativeBrief,
} from "../manusWebsiteGenerator";

// ── Scrape a URL and extract text content ─────────────────────────────────────
async function scrapeUrl(url: string): Promise<{ html: string; text: string; title: string; heroImage?: string }> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VonWorkBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() ?? "";
    const imageCandidate =
      html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i)?.[1] ??
      html.match(/<meta[^>]+(?:property|name)=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    let heroImage: string | undefined;
    if (imageCandidate && !imageCandidate.startsWith("data:")) {
      try { heroImage = new URL(imageCandidate, url).toString(); } catch {}
    }
    // Strip tags and collapse whitespace for text extraction
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 6000);
    return { html: html.substring(0, 8000), text, title, heroImage };
  } catch (e: any) {
    throw new Error(`Could not fetch website: ${e.message}`);
  }
}

// ── Build email pitch HTML ────────────────────────────────────────────────────
function buildPitchEmail(businessName: string, previewUrl: string, originalUrl: string) {
  return `Subject: We rebuilt your website — see the new version (free preview)

Hi ${businessName} team,

We noticed your website at ${originalUrl} and rebuilt it for free using our AI website builder.

👉 See your new website here: ${previewUrl}

What we improved:
✅ Modern, mobile-first design
✅ Faster loading
✅ Professional layout that converts visitors
✅ Optional AI Messaging package with chatbot and limited AI phone answering

Website Only is $29/month for hosting, SSL, and the secure business back-office.
AI Messaging is $199/month and includes Website Only, a chatbot, and limited AI phone answering.

Click here to activate: ${previewUrl}

Best,
The VonWork AI Team
vonwork-ai-tpdwgxnc.manus.space`;
}

export const websiteBuilderRouter = router({
  // Scrape URL and rebuild with AI
  rebuildFromUrl: publicProcedure
    .input(z.object({
      url: z.string().url(),
      ownerEmail: z.string().email().optional(),
      ownerName: z.string().optional(),
      colorScheme: z.enum(["blue", "green", "purple", "red", "orange", "teal", "auto"]).default("auto"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Normalize URL
      let url = input.url;
      if (!url.startsWith("http")) url = "https://" + url;

      // Scrape the existing site
      let scraped: { html: string; text: string; title: string; heroImage?: string };
      try {
        scraped = await scrapeUrl(url);
      } catch (e: any) {
        throw new Error(e.message);
      }

      // Extract business name from title
      const businessName = scraped.title.replace(/\s*[-|–]\s*.+$/, "").trim() || "Your Business";

      // Insert site record
      const result = await db.execute(sql`
        INSERT INTO wb_sites (userId, sessionId, businessName, businessType, colorScheme, style, status)
        VALUES (
          ${(ctx as any).user?.id ?? null},
          ${Math.random().toString(36).substring(2)},
          ${businessName},
          'business',
          ${input.colorScheme === "auto" ? "blue" : input.colorScheme},
          'modern',
          'generating'
        )
      `);
      const siteId = (result as any).insertId ?? ((result as any)[0] as any)?.insertId;

      // Generate a structured creative brief and premium website through the
      // internal Manus model stack. The deterministic renderer remains a true
      // fallback if the internal output does not pass the quality contract.
      const source: WebsiteSource = {
        text: scraped.text,
        title: scraped.title,
        url,
        heroImage: scraped.heroImage,
        colorScheme: input.colorScheme,
      };
      const generation = await generateWebsiteWithManus(businessName, source);
      const generatedHtml = generation.html;

      // Store owner email, original URL, and honest generation status in metadata.
      const meta = JSON.stringify({
        originalUrl: url,
        ownerEmail: input.ownerEmail,
        ownerName: input.ownerName,
        heroImage: scraped.heroImage,
        sourceExcerpt: scraped.text.slice(0, 7000),
        designVersion: "manus-studio-v3",
        aiGenerationStatus: generation.status,
        generationEngine: generation.engine,
        generationModel: generation.model,
        qualityStatus: generation.qualityStatus,
        creativeBrief: generation.creativeBrief,
        providerError: generation.fallbackReason,
      });

      const revisionResult = await db.execute(sql`
        INSERT INTO wb_revisions (
          siteId, parentRevisionId, instruction, htmlBefore, htmlAfter, engine, model, qualityStatus
        ) VALUES (
          ${siteId}, NULL, 'Initial internal Manus generation', NULL, ${generatedHtml},
          ${generation.engine}, ${generation.model}, ${generation.qualityStatus}
        )
      `);
      const revisionId = (revisionResult as any).insertId ?? ((revisionResult as any)[0] as any)?.insertId;

      // Update the site and point it to its first persistent version.
      await db.execute(sql`
        UPDATE wb_sites
        SET generatedHtml = ${generatedHtml}, activeRevisionId = ${revisionId}, status = 'preview', description = ${meta}
        WHERE id = ${siteId}
      `);

      return {
        siteId,
        businessName,
        status: "preview",
        aiGenerationStatus: generation.status,
        generationEngine: generation.engine,
        generationModel: generation.model,
        qualityStatus: generation.qualityStatus,
      };
    }),

  // Get a site by ID (public — for preview)
  getSite: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const rows = await db.execute(sql`SELECT * FROM wb_sites WHERE id = ${input.siteId} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      return data[0] ?? null;
    }),

  // Generate email pitch text for a site
  getPitchEmail: publicProcedure
    .input(z.object({ siteId: z.number(), previewBaseUrl: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const rows = await db.execute(sql`SELECT * FROM wb_sites WHERE id = ${input.siteId} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      const site = data[0];
      if (!site) throw new Error("Site not found");

      let meta: any = {};
      try { meta = JSON.parse(site.description ?? "{}"); } catch {}

      const previewUrl = `${input.previewBaseUrl}/website-preview/${input.siteId}`;
      const pitch = buildPitchEmail(site.businessName, previewUrl, meta.originalUrl ?? "your website");
      return { pitch, previewUrl, ownerEmail: meta.ownerEmail ?? "" };
    }),

  // AI chat to modify the website
  chatRevise: publicProcedure
    .input(z.object({
      siteId: z.number(),
      message: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const rows = await db.execute(sql`SELECT * FROM wb_sites WHERE id = ${input.siteId} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      const site = data[0];
      if (!site) throw new Error("Site not found");

      // Save user message
      await db.execute(sql`
        INSERT INTO wb_chat_messages (siteId, role, content) VALUES (${input.siteId}, 'user', ${input.message})
      `);

      let newHtml = site.generatedHtml ?? "";
      let assistantMessage = "Done! I've updated your website.";
      let acceptedRevisionId: number | null = null;

      try {
        let meta: Record<string, any> = {};
        try { meta = JSON.parse(site.description ?? "{}"); } catch {}
        const source: WebsiteSource = {
          url: meta.originalUrl ?? "",
          title: site.businessName ?? "Business website",
          text: meta.sourceExcerpt ?? `${site.businessName ?? "Business"} ${site.tagline ?? ""}`,
          heroImage: meta.heroImage,
          colorScheme: site.colorScheme ?? "auto",
        };
        const revision = await reviseWebsiteWithManus({
          currentHtml: newHtml,
          instruction: input.message,
          source,
          creativeBrief: (meta.creativeBrief as WebsiteCreativeBrief | null) ?? null,
        });
        newHtml = revision.html;
        assistantMessage = revision.message;

        const revisionResult = await db.execute(sql`
          INSERT INTO wb_revisions (
            siteId, parentRevisionId, instruction, htmlBefore, htmlAfter, engine, model, qualityStatus
          ) VALUES (
            ${input.siteId}, ${site.activeRevisionId ?? null}, ${input.message},
            ${site.generatedHtml ?? ""}, ${newHtml}, 'MANUS_INTERNAL', ${revision.model}, ${revision.qualityStatus}
          )
        `);
        acceptedRevisionId = (revisionResult as any).insertId ?? ((revisionResult as any)[0] as any)?.insertId;
      } catch (e) {
        assistantMessage = e instanceof Error
          ? `The revision was not applied because it did not pass the premium quality review: ${e.message}`
          : "The revision was not applied. The current premium design was kept.";
      }

      if (acceptedRevisionId) {
        await db.execute(sql`
          UPDATE wb_sites
          SET generatedHtml = ${newHtml}, activeRevisionId = ${acceptedRevisionId}
          WHERE id = ${input.siteId}
        `);
      }
      await db.execute(sql`
        INSERT INTO wb_chat_messages (siteId, role, content) VALUES (${input.siteId}, 'assistant', ${assistantMessage})
      `);

      return { html: newHtml, message: assistantMessage, revisionId: acceptedRevisionId };
    }),

  listRevisions: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { activeRevisionId: null, revisions: [] };
      const siteRows = await db.execute(sql`
        SELECT activeRevisionId FROM wb_sites WHERE id = ${input.siteId} LIMIT 1
      `);
      const sites = (Array.isArray((siteRows as any)[0]) ? (siteRows as any)[0] : siteRows) as any[];
      const revisionRows = await db.execute(sql`
        SELECT id, siteId, parentRevisionId, instruction, htmlAfter, engine, model, qualityStatus, createdAt
        FROM wb_revisions
        WHERE siteId = ${input.siteId}
        ORDER BY id ASC
      `);
      const revisions = (Array.isArray((revisionRows as any)[0]) ? (revisionRows as any)[0] : revisionRows) as any[];
      return { activeRevisionId: sites[0]?.activeRevisionId ?? null, revisions };
    }),

  navigateRevision: publicProcedure
    .input(z.object({ siteId: z.number(), direction: z.enum(["undo", "redo"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const siteRows = await db.execute(sql`
        SELECT activeRevisionId FROM wb_sites WHERE id = ${input.siteId} LIMIT 1
      `);
      const sites = (Array.isArray((siteRows as any)[0]) ? (siteRows as any)[0] : siteRows) as any[];
      const activeRevisionId = sites[0]?.activeRevisionId;
      if (!activeRevisionId) throw new Error("No active website version");

      const targetRows = input.direction === "undo"
        ? await db.execute(sql`
            SELECT parent.id, parent.htmlAfter
            FROM wb_revisions current
            JOIN wb_revisions parent ON parent.id = current.parentRevisionId
            WHERE current.id = ${activeRevisionId} AND current.siteId = ${input.siteId}
            LIMIT 1
          `)
        : await db.execute(sql`
            SELECT id, htmlAfter
            FROM wb_revisions
            WHERE parentRevisionId = ${activeRevisionId} AND siteId = ${input.siteId}
            ORDER BY id DESC LIMIT 1
          `);
      const targets = (Array.isArray((targetRows as any)[0]) ? (targetRows as any)[0] : targetRows) as any[];
      const target = targets[0];
      if (!target) throw new Error(input.direction === "undo" ? "No earlier version" : "No later version");
      await db.execute(sql`
        UPDATE wb_sites SET generatedHtml = ${target.htmlAfter}, activeRevisionId = ${target.id}
        WHERE id = ${input.siteId}
      `);
      return { activeRevisionId: target.id, html: target.htmlAfter };
    }),

  restoreRevision: publicProcedure
    .input(z.object({ siteId: z.number(), revisionId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const rows = await db.execute(sql`
        SELECT id, htmlAfter FROM wb_revisions
        WHERE id = ${input.revisionId} AND siteId = ${input.siteId} LIMIT 1
      `);
      const revisions = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      const revision = revisions[0];
      if (!revision?.htmlAfter) throw new Error("Website version not found");
      await db.execute(sql`
        UPDATE wb_sites SET generatedHtml = ${revision.htmlAfter}, activeRevisionId = ${revision.id}
        WHERE id = ${input.siteId}
      `);
      return { activeRevisionId: revision.id, html: revision.htmlAfter };
    }),

  // Get chat history
  getChatHistory: publicProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(sql`
        SELECT * FROM wb_chat_messages WHERE siteId = ${input.siteId} ORDER BY createdAt ASC LIMIT 50
      `);
      return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    }),


  // Send pitch email notification to platform owner
  sendPitchEmail: protectedProcedure
    .input(z.object({ siteId: z.number(), previewBaseUrl: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const rows = await db.execute(sql`SELECT * FROM wb_sites WHERE id = ${input.siteId} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      const site = data[0];
      if (!site) throw new Error("Site not found");
      let meta: any = {};
      try { meta = JSON.parse(site.description ?? "{}"); } catch {}
      const previewUrl = `${input.previewBaseUrl}/website-preview/${input.siteId}`;
      const emailContent = [
        `NEW WEBSITE PITCH — ${site.businessName}`,
        ``,
        `We rebuilt ${meta.originalUrl ?? "their website"} for FREE using VonWork AI.`,
        ``,
        `See the new website: ${previewUrl}`,
        ``,
        `What was improved:`,
        `- Modern, mobile-first design (2025 standards)`,
        `- Professional layout that converts visitors`,
        `- Optional AI Messaging package with chatbot and limited AI phone answering`,
        `- SEO-optimized headings and meta tags`,
        ``,
        `Website Only: $29/month for hosting + SSL + back-office dashboard.`,
        `AI Messaging: $199/month for Website Only + chatbot + 100 AI phone-answering minutes/month.`,
        ``,
        `Owner email: ${meta.ownerEmail ?? "Not provided"}`,
        `Owner name: ${meta.ownerName ?? "Not provided"}`,
        `Original URL: ${meta.originalUrl ?? "Unknown"}`,
      ].join("\n");
      await notifyOwner({ title: `Website Pitch Ready — ${site.businessName}`, content: emailContent });
      const updatedMeta = { ...meta, pitchSentAt: new Date().toISOString() };
      await db.execute(sql`UPDATE wb_sites SET description = ${JSON.stringify(updatedMeta)} WHERE id = ${input.siteId}`);
      return { success: true, ownerEmail: meta.ownerEmail ?? null };
    }),

  // Manually activate a site (admin/testing)
  activateSite: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.execute(sql`UPDATE wb_sites SET planStatus = 'paid' WHERE id = ${input.siteId}`);
      return { success: true };
    }),
  // List user's sites
  listMySites: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.execute(sql`
      SELECT id, businessName, businessType, status, planStatus, createdAt, description
      FROM wb_sites WHERE userId = ${ctx.user.id} ORDER BY createdAt DESC LIMIT 20
    `);
    return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
  }),
});
