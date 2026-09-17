/**
 * VonWork Site Serving Route
 * Serves rebuilt website HTML at /sites/:slug
 * In production, this would be served at businessname.vonwork.site via DNS wildcard.
 * For now, it's accessible at /sites/:slug on the main domain.
 */

import { type Express, type Request, type Response } from "express";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

export function registerSiteServeRoutes(app: Express) {
  // Serve a rebuilt site by slug (business name slug)
  app.get("/sites/:slug", async (req: Request, res: Response) => {
    const slug = req.params.slug?.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug) { res.status(404).send("Site not found"); return; }

    try {
      const db = await getDb();
      if (!db) { res.status(503).send("Service unavailable"); return; }

      // Look up site by slug (businessName converted to slug)
      const rows = await db.execute(sql`
        SELECT id, businessName, generatedHtml, planStatus, status
        FROM wb_sites
        WHERE LOWER(REPLACE(REPLACE(businessName, ' ', '-'), '.', '')) = ${slug}
        OR LOWER(REPLACE(businessName, ' ', '-')) = ${slug}
        LIMIT 1
      `);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      const site = data[0];

      if (!site) {
        res.status(404).send(`
          <!DOCTYPE html><html><head><title>Site Not Found</title>
          <style>body{font-family:system-ui;text-align:center;padding:4rem;background:#F5F7FA}h1{color:#1A6FFF}a{color:#1A6FFF}</style>
          </head><body>
          <h1>Site Not Found</h1>
          <p>The website "${slug}" doesn't exist yet.</p>
          <p><a href="/">Create a free website with VonWork AI →</a></p>
          </body></html>
        `);
        return;
      }

      // If site is in demo mode, show demo banner overlay
      if (site.planStatus !== "paid") {
        const demoHtml = site.generatedHtml.replace(
          "</body>",
          `<div id="vonwork-demo-banner" style="position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#1A6FFF,#3B8BFF);color:#fff;padding:.75rem 1.5rem;display:flex;align-items:center;justify-content:space-between;font-family:system-ui;font-size:.875rem;box-shadow:0 2px 12px rgba(26,111,255,.4)">
            <div style="display:flex;align-items:center;gap:.75rem">
              <span style="background:rgba(255,255,255,.2);padding:.2rem .6rem;border-radius:1rem;font-size:.75rem;font-weight:700">DEMO</span>
              <span>This is a free preview of <strong>${site.businessName}</strong>'s new website — rebuilt by VonWork AI</span>
            </div>
            <a href="/website-preview/${site.id}" style="background:#fff;color:#1A6FFF;padding:.4rem 1rem;border-radius:.5rem;font-weight:700;text-decoration:none;font-size:.8rem;white-space:nowrap">Website Only — $29/mo →</a>
          </div>
          <style>body{padding-top:52px!important}</style>
          </body>`
        );
        res.setHeader("Content-Type", "text/html");
        res.send(demoHtml);
        return;
      }

      // Serve the live site
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Cache-Control", "public, max-age=300"); // 5 min cache
      res.send(site.generatedHtml);
    } catch (e) {
      console.error("[SiteServe] Error:", e);
      res.status(500).send("Internal server error");
    }
  });

  // Serve by site ID (for preview links)
  app.get("/live/:siteId", async (req: Request, res: Response) => {
    const siteId = parseInt(req.params.siteId ?? "0");
    if (!siteId) { res.status(404).send("Not found"); return; }

    try {
      const db = await getDb();
      if (!db) { res.status(503).send("Service unavailable"); return; }

      const rows = await db.execute(sql`SELECT id, businessName, generatedHtml, planStatus FROM wb_sites WHERE id = ${siteId} LIMIT 1`);
      const data = (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
      const site = data[0];

      if (!site?.generatedHtml) { res.status(404).send("Site not found"); return; }

      // Track page view
      db.execute(sql`
        INSERT INTO wb_site_analytics (siteId, date, pageViews, uniqueVisitors)
        VALUES (${siteId}, CURDATE(), 1, 1)
        ON DUPLICATE KEY UPDATE pageViews = pageViews + 1
      `).catch(() => {});

      if (site.planStatus !== "paid") {
        const demoHtml = site.generatedHtml.replace(
          "</body>",
          `<div id="vonwork-demo-banner" style="position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#1A6FFF,#3B8BFF);color:#fff;padding:.75rem 1.5rem;display:flex;align-items:center;justify-content:space-between;font-family:system-ui;font-size:.875rem;box-shadow:0 2px 12px rgba(26,111,255,.4)">
            <div style="display:flex;align-items:center;gap:.75rem">
              <span style="background:rgba(255,255,255,.2);padding:.2rem .6rem;border-radius:1rem;font-size:.75rem;font-weight:700">DEMO</span>
              <span>Free preview — rebuilt by <strong>VonWork AI</strong></span>
            </div>
            <a href="/website-preview/${site.id}" style="background:#fff;color:#1A6FFF;padding:.4rem 1rem;border-radius:.5rem;font-weight:700;text-decoration:none;font-size:.8rem;white-space:nowrap">Website Only — $29/mo →</a>
          </div>
          <style>body{padding-top:52px!important}</style>
          </body>`
        );
        res.setHeader("Content-Type", "text/html");
        res.send(demoHtml);
        return;
      }

      res.setHeader("Content-Type", "text/html");
      res.send(site.generatedHtml);
    } catch (e) {
      res.status(500).send("Internal server error");
    }
  });
}
