export type CallCenterUser = { id?: number | null } | null | undefined;

/**
 * Protected Call Center queries must never begin before the authenticated user
 * is available. This avoids unauthenticated query churn during OAuth startup.
 */
export function canLoadCallCenterData(user: CallCenterUser): boolean {
  return typeof user?.id === "number" && user.id > 0;
}
