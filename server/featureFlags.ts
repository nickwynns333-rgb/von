/**
 * Feature Flags System
 * Supports global flags, role-based flags, and per-user overrides.
 * Admin can toggle flags in real-time without redeployment.
 */
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { featureFlags, featureFlagOverrides } from "../drizzle/schema";

// Default flags — these are the platform defaults before any DB config
export const DEFAULT_FLAGS: Record<string, { enabled: boolean; allowedRoles?: string[]; description: string }> = {
  "ai_video_sales_agent": { enabled: true, allowedRoles: ["user", "admin", "agency"], description: "AI Video Sales Agent meeting rooms" },
  "data_marketplace": { enabled: true, allowedRoles: ["user", "admin", "agency"], description: "Data Marketplace for purchasing contact lists" },
  "affiliate_program": { enabled: true, allowedRoles: ["user", "admin", "agency"], description: "Affiliate & Partner Program" },
  "white_label": { enabled: false, allowedRoles: ["admin", "agency"], description: "White-Label Agency Portal" },
  "ai_outbound_campaigns": { enabled: true, allowedRoles: ["user", "admin", "agency"], description: "AI outbound calling campaigns" },
  "appointment_engine": { enabled: true, allowedRoles: ["user", "admin", "agency"], description: "AI Appointment & Schedule Engine" },
  "knowledge_base_rag": { enabled: true, allowedRoles: ["user", "admin", "agency"], description: "Knowledge Base RAG integration" },
  "sub_accounts": { enabled: false, allowedRoles: ["admin", "agency"], description: "Sub-account management" },
  "master_chat": { enabled: true, allowedRoles: ["user", "admin", "agency"], description: "MasterChat unified inbox" },
  "advanced_analytics": { enabled: false, allowedRoles: ["admin", "agency"], description: "Advanced analytics and reporting" },
  "beta_features": { enabled: false, description: "Beta features for early access users" },
};

export interface FlagContext {
  userId?: number;
  role?: string;
}

/**
 * Check if a feature flag is enabled for a given user context.
 * Checks: per-user override → role-based override → global flag → default
 */
export async function isFeatureEnabled(flagName: string, ctx?: FlagContext): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      // Fall back to defaults if DB unavailable
      return DEFAULT_FLAGS[flagName]?.enabled ?? false;
    }

    // 1. Per-user override (highest priority)
    if (ctx?.userId) {
      const userOverride = await db
        .select()
        .from(featureFlagOverrides)
        .where(and(eq(featureFlagOverrides.flagName, flagName), eq(featureFlagOverrides.userId, ctx.userId)))
        .limit(1);
      if (userOverride.length > 0) {
        return userOverride[0].enabled === 1;
      }
    }

    // 2. Role-based override
    if (ctx?.role) {
      const roleOverride = await db
        .select()
        .from(featureFlagOverrides)
        .where(and(eq(featureFlagOverrides.flagName, flagName), eq(featureFlagOverrides.role, ctx.role), isNull(featureFlagOverrides.userId)))
        .limit(1);
      if (roleOverride.length > 0) {
        return roleOverride[0].enabled === 1;
      }
    }

    // 3. Global flag in DB
    const globalFlag = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.name, flagName))
      .limit(1);
    if (globalFlag.length > 0) {
      const flag = globalFlag[0];
      if (!flag.enabled) return false;
      // Check role restriction
      if (flag.allowedRoles && Array.isArray(flag.allowedRoles) && flag.allowedRoles.length > 0) {
        if (!ctx?.role) return false;
        return flag.allowedRoles.includes(ctx.role);
      }
      return true;
    }

    // 4. Default
    const def = DEFAULT_FLAGS[flagName];
    if (!def) return false;
    if (!def.enabled) return false;
    if (def.allowedRoles && def.allowedRoles.length > 0) {
      if (!ctx?.role) return false;
      return def.allowedRoles.includes(ctx.role);
    }
    return true;
  } catch {
    return DEFAULT_FLAGS[flagName]?.enabled ?? false;
  }
}

/**
 * Seed default feature flags into the DB if they don't exist.
 * Call this on server startup.
 */
export async function seedDefaultFlags(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    for (const [name, def] of Object.entries(DEFAULT_FLAGS)) {
      const existing = await db.select().from(featureFlags).where(eq(featureFlags.name, name)).limit(1);
      if (existing.length === 0) {
        await db.insert(featureFlags).values({
          name,
          enabled: def.enabled,
          allowedRoles: def.allowedRoles ?? null,
          description: def.description,
        });
      }
    }
  } catch (err) {
    console.error("[featureFlags] Failed to seed defaults:", err);
  }
}
