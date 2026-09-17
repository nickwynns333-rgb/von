import Stripe from "stripe";
import express, { type Express, type Request, type Response } from "express";
import { PRODUCTS, WEBSITE_PLANS } from "./products";
import { getCreditPacks, getDb } from "./db";
import { sql } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-06-24.dahlia",
});

/**
 * Register Stripe checkout and webhook routes on the Express app.
 * The webhook route MUST be registered with express.raw() BEFORE express.json().
 */
export function registerStripeRoutes(app: Express) {
  // Webhook endpoint — must use raw body for signature verification
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Webhook] Signature verification failed:", message);
        res.status(400).send(`Webhook Error: ${message}`);
        return;
      }

      // Handle test events for webhook verification
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.user_id;
          const plan = session.metadata?.plan;
          const siteId = session.metadata?.site_id;
          const addonType = session.metadata?.addon_type;
          console.log(`[Webhook] Checkout completed — user: ${userId}, plan: ${plan}, siteId: ${siteId}, session: ${session.id}`);

          if (siteId) {
            try {
              const db = await getDb();
              if (db) {
                await db.execute(sql`UPDATE wb_sites SET planStatus = 'paid' WHERE id = ${parseInt(siteId)}`);
                console.log(`[Webhook] Site ${siteId} activated`);
                if (addonType) {
                  await db.execute(sql`INSERT INTO wb_addons (siteId, addonType, status, activatedAt) VALUES (${parseInt(siteId)}, ${addonType}, 'active', NOW()) ON DUPLICATE KEY UPDATE status = 'active', activatedAt = NOW()`);
                }
              }
            } catch (e) { console.error("[Webhook] Failed to activate site:", e); }
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          console.log(
            `[Webhook] Subscription ${event.type} — id: ${subscription.id}, status: ${subscription.status}`
          );
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          console.log(`[Webhook] Subscription cancelled — id: ${subscription.id}`);
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[Webhook] Invoice paid — id: ${invoice.id}`);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[Webhook] Invoice payment failed — id: ${invoice.id}`);
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    }
  );

  // Website hosting checkout endpoint
  app.post("/api/checkout/website", express.json(), async (req: Request, res: Response) => {
    const { siteId, plan, userEmail, userName } = req.body as { siteId: number; plan: string; userEmail?: string; userName?: string; };
    const planConfig = WEBSITE_PLANS[plan as keyof typeof WEBSITE_PLANS];
    if (!planConfig || !siteId) { res.status(400).json({ error: "Invalid plan or siteId" }); return; }
    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price_data: { currency: "usd", product_data: { name: planConfig.name, description: planConfig.description }, unit_amount: planConfig.priceInCents, recurring: { interval: "month" } }, quantity: 1 }],
        customer_email: userEmail,
        allow_promotion_codes: true,
        metadata: { type: "website_hosting", site_id: String(siteId), plan, addon_type: planConfig.addonType ?? "", user_email: userEmail ?? "", user_name: userName ?? "" },
        success_url: `${origin}/site-admin/${siteId}?activated=1`,
        cancel_url: `${origin}/website-preview/${siteId}?checkout=cancelled`,
      });
      res.json({ url: session.url });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Website Checkout] Failed:", message);
      res.status(500).json({ error: message });
    }
  });

  // Credit pack one-time purchase endpoint
  app.post("/api/checkout/credits", express.json(), async (req: Request, res: Response) => {
    const { packId, userEmail, userName, userId } = req.body as {
      packId: number;
      userEmail?: string;
      userName?: string;
      userId?: string;
    };

    const packs = await getCreditPacks();
    const pack = packs.find((p) => p.id === packId);
    if (!pack) {
      res.status(400).json({ error: "Invalid credit pack" });
      return;
    }

    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: pack.name,
                description: `${pack.credits.toLocaleString()} VonWork Credits`,
              },
              unit_amount: Math.round(parseFloat(String(pack.priceUsd)) * 100),
            },
            quantity: 1,
          },
        ],
        customer_email: userEmail,
        allow_promotion_codes: true,
        client_reference_id: userId,
        metadata: {
          type: "credit_pack",
          pack_id: String(packId),
          credits: String(pack.credits),
          user_id: userId ?? "",
          customer_email: userEmail ?? "",
          customer_name: userName ?? "",
        },
        success_url: `${origin}/dashboard/credits?checkout=success`,
        cancel_url: `${origin}/dashboard/credits?checkout=cancelled`,
      });

      res.json({ url: session.url });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Credits Checkout] Failed:", message);
      res.status(500).json({ error: message });
    }
  });

  // Subscription checkout session creation endpoint
  app.post("/api/checkout", express.json(), async (req: Request, res: Response) => {
    const { plan, userEmail, userName, userId } = req.body as {
      plan: string;
      userEmail?: string;
      userName?: string;
      userId?: string;
    };

    const product = PRODUCTS[plan];
    if (!product) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }
    if (product.isJoinForce || product.isHfnOwnUse || product.ownUseOnly) {
      res.status(403).json({ error: "This protected member rate must be started from its verified member portal." });
      return;
    }

    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: product.name,
                description: product.description,
              },
              unit_amount: product.priceInCents,
              recurring: {
                interval: product.interval,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: userEmail,
        allow_promotion_codes: true,
        client_reference_id: userId,
        metadata: {
          plan,
          user_id: userId ?? "",
          customer_email: userEmail ?? "",
          customer_name: userName ?? "",
        },
        success_url: product.category === "seo"
          ? `${origin}/seo?checkout=success&plan=${plan}`
          : product.category === "aicfo"
          ? `${origin}/aicfo?checkout=success&plan=${plan}`
          : `${origin}/?checkout=success&plan=${plan}`,
        cancel_url: product.category === "seo"
          ? `${origin}/seo/pricing?checkout=cancelled`
          : product.category === "aicfo"
          ? `${origin}/aicfo/pricing?checkout=cancelled`
          : `${origin}/?checkout=cancelled`,
      });

      res.json({ url: session.url });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Checkout] Failed to create session:", message);
      res.status(500).json({ error: message });
    }
  });
}
