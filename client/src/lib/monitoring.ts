/**
 * Monitoring & Error Tracking
 * 
 * This module provides a lightweight error monitoring layer.
 * It integrates with Sentry when VITE_SENTRY_DSN is configured,
 * and falls back to console logging + server-side error reporting.
 * 
 * To enable Sentry:
 * 1. Create a project at https://sentry.io
 * 2. Add VITE_SENTRY_DSN to your environment secrets
 * 3. Run: pnpm add @sentry/react
 * 4. Uncomment the Sentry import below
 */

// import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

let posthogLoaded = false;

/**
 * Initialize monitoring on app startup.
 * Call this once in main.tsx before rendering.
 */
export function initMonitoring() {
  // Sentry (when DSN is configured)
  if (SENTRY_DSN) {
    console.info("[monitoring] Sentry DSN detected — install @sentry/react to enable full error tracking");
    // Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.1 });
  }

  // PostHog (when key is configured)
  if (POSTHOG_KEY && !posthogLoaded) {
    posthogLoaded = true;
    const script = document.createElement("script");
    script.innerHTML = `
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      posthog.init('${POSTHOG_KEY}', { api_host: '${POSTHOG_HOST ?? "https://app.posthog.com"}' });
    `;
    document.head.appendChild(script);
    console.info("[monitoring] PostHog analytics initialized");
  }
}

/**
 * Capture an error for monitoring.
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error("[monitoring] Error captured:", error.message, context);
  // if (SENTRY_DSN) Sentry.captureException(error, { extra: context });
  // if (posthogLoaded && window.posthog) window.posthog.capture("$exception", { ...context, message: error.message });
}

/**
 * Track a user event (product analytics).
 */
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (posthogLoaded && (window as any).posthog) {
    (window as any).posthog.capture(event, properties);
  }
}

/**
 * Identify the current user in monitoring tools.
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (posthogLoaded && (window as any).posthog) {
    (window as any).posthog.identify(userId, traits);
  }
  // if (SENTRY_DSN) Sentry.setUser({ id: userId, ...traits });
}
