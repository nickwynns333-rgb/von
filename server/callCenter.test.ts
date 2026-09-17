import { describe, expect, it } from "vitest";
import { CALL_CENTER_SAFETY_DEFAULTS } from "./routers/callCenter";
import { canLoadCallCenterData } from "../client/src/lib/callCenterAccess";

describe("Call Center dispatch safeguards", () => {
  it("creates campaigns in test mode and requires an explicit consent-review confirmation for live dispatch", () => {
    expect(CALL_CENTER_SAFETY_DEFAULTS.testMode).toBe(true);
    expect(CALL_CENTER_SAFETY_DEFAULTS.outreachApprovalStatus).toBe("DRAFT");
    expect(CALL_CENTER_SAFETY_DEFAULTS.requiredLiveDispatchConfirmation).toBe("I_REVIEWED_CONSENT_AND_SUPPRESSION");
  });

  it("does not start protected campaign queries until a valid user session is available", () => {
    expect(canLoadCallCenterData(undefined)).toBe(false);
    expect(canLoadCallCenterData(null)).toBe(false);
    expect(canLoadCallCenterData({ id: 0 })).toBe(false);
    expect(canLoadCallCenterData({ id: 1 })).toBe(true);
  });
});
