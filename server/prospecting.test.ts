import { describe, expect, it } from "vitest";
import { CLIENT_IMPORT_MAX_ROWS, fallbackDemo, PRESENTATION_TRACKED_EVENTS, STAGED_CAMPAIGNS_START_IN_TEST_MODE } from "./routers/prospecting";
import { prospectingIndustries } from "@shared/prospectingIndustries";

describe("Website Prospecting Studio private demo", () => {
  it("always labels the generated fallback as a private concept rather than a live business website", () => {
    const html = fallbackDemo({ businessName: "Example Service Co.", formattedAddress: "100 Main Street", phone: "555-0100" });
    expect(html).toContain("Private VonWork AI concept demo");
    expect(html).toContain("not yet the business's live website");
    expect(html).toContain("Example Service Co.");
  });

  it("includes every requested appointment-heavy and local-service discovery preset", () => {
    expect(prospectingIndustries).toHaveLength(64);
    expect(prospectingIndustries.map((item) => item.label)).toEqual(expect.arrayContaining([
      "Dental practices",
      "HVAC companies",
      "Law firms",
      "Auto repair shops",
      "Restaurants",
      "Senior-care providers",
      "Photography studios",
    ]));
    expect(new Set(prospectingIndustries.map((item) => item.id)).size).toBe(64);
  });

  it("keeps client-owned imports bounded and campaign staging safely in test mode", () => {
    expect(CLIENT_IMPORT_MAX_ROWS).toBe(500);
    expect(STAGED_CAMPAIGNS_START_IN_TEST_MODE).toBe(true);
  });

  it("tracks the engagement events needed for presentation review and follow-up", () => {
    expect(PRESENTATION_TRACKED_EVENTS).toEqual(["OPENED", "QUESTION_ASKED", "CONTACT_CAPTURED", "FOLLOW_UP_PREPARED"]);
  });
});
