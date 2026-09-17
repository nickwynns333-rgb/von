/**
 * Data Marketplace — unit tests
 * Tests CSV parsing, lead validation, package pricing, and campaign logic.
 */
import { describe, it, expect } from "vitest";

// ─── Helpers (inline) ─────────────────────────────────────────────────────────

interface LeadRecord {
  businessName: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  email?: string;
  website?: string;
}

function parseLeadCsv(csvText: string): { records: LeadRecord[]; errors: string[] } {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return { records: [], errors: ["CSV must have a header row and at least one data row"] };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const records: LeadRecord[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });

    if (!row.business_name && !row.name) {
      errors.push(`Row ${i}: missing business name`);
      continue;
    }
    if (!row.phone) {
      errors.push(`Row ${i}: missing phone`);
      continue;
    }

    records.push({
      businessName: row.business_name || row.name || "",
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      email: row.email,
      website: row.website,
    });
  }

  return { records, errors };
}

function calculatePackagePrice(recordCount: number, industry: string): number {
  const baseRatePerRecord: Record<string, number> = {
    dentists: 0.15,
    doctors: 0.20,
    lawyers: 0.25,
    plumbers: 0.10,
    roofers: 0.10,
    hvac: 0.10,
    default: 0.12,
  };
  const rate = baseRatePerRecord[industry.toLowerCase()] ?? baseRatePerRecord.default;
  return Math.round(recordCount * rate * 100) / 100; // round to cents
}

function estimateCampaignCredits(leadCount: number, channelType: "call" | "sms" | "email"): number {
  const creditsPerLead: Record<string, number> = {
    call: 10,
    sms: 2,
    email: 1,
  };
  return leadCount * (creditsPerLead[channelType] ?? 5);
}

function isValidState(state: string): boolean {
  const US_STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
    "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
    "VA","WA","WV","WI","WY","DC",
  ];
  return US_STATES.includes(state.toUpperCase());
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────
describe("Lead CSV Parsing", () => {
  it("parses valid CSV with all fields", () => {
    const csv = [
      "business_name,phone,city,state,email",
      "Smith Dental,+15551234567,Austin,TX,smith@dental.com",
      "Jones Plumbing,+15559876543,Dallas,TX,jones@plumbing.com",
    ].join("\n");
    const { records, errors } = parseLeadCsv(csv);
    expect(records).toHaveLength(2);
    expect(errors).toHaveLength(0);
    expect(records[0].businessName).toBe("Smith Dental");
    expect(records[0].state).toBe("TX");
  });

  it("rejects CSV with only header row", () => {
    const csv = "business_name,phone,city,state";
    const { records, errors } = parseLeadCsv(csv);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("skips rows missing business name", () => {
    const csv = [
      "business_name,phone",
      ",+15551234567",
      "Valid Business,+15559876543",
    ].join("\n");
    const { records, errors } = parseLeadCsv(csv);
    expect(records).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });

  it("skips rows missing phone", () => {
    const csv = [
      "business_name,phone",
      "No Phone Business,",
    ].join("\n");
    const { records, errors } = parseLeadCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it("handles CSV with 'name' column instead of 'business_name'", () => {
    const csv = [
      "name,phone",
      "Acme Corp,+15551234567",
    ].join("\n");
    const { records } = parseLeadCsv(csv);
    expect(records[0].businessName).toBe("Acme Corp");
  });

  it("parses 1000 records without errors for valid data", () => {
    const rows = Array.from({ length: 1000 }, (_, i) => `Business ${i},+1555${String(i).padStart(7, "0")}`);
    const csv = ["business_name,phone", ...rows].join("\n");
    const { records, errors } = parseLeadCsv(csv);
    expect(records).toHaveLength(1000);
    expect(errors).toHaveLength(0);
  });
});

// ─── Package pricing ──────────────────────────────────────────────────────────
describe("Data Package Pricing", () => {
  it("prices dentist leads at $0.15/record", () => {
    expect(calculatePackagePrice(100, "dentists")).toBe(15);
  });

  it("prices lawyer leads at $0.25/record (premium)", () => {
    expect(calculatePackagePrice(100, "lawyers")).toBe(25);
  });

  it("prices plumber leads at $0.10/record", () => {
    expect(calculatePackagePrice(500, "plumbers")).toBe(50);
  });

  it("uses default rate for unknown industry", () => {
    expect(calculatePackagePrice(100, "unknown_industry")).toBe(12);
  });

  it("scales linearly with record count", () => {
    const price100 = calculatePackagePrice(100, "dentists");
    const price200 = calculatePackagePrice(200, "dentists");
    expect(price200).toBe(price100 * 2);
  });

  it("returns 0 for 0 records", () => {
    expect(calculatePackagePrice(0, "dentists")).toBe(0);
  });
});

// ─── Campaign credit estimation ───────────────────────────────────────────────
describe("Campaign Credit Estimation", () => {
  it("estimates 10 credits per lead for AI calls", () => {
    expect(estimateCampaignCredits(100, "call")).toBe(1000);
  });

  it("estimates 2 credits per lead for SMS", () => {
    expect(estimateCampaignCredits(100, "sms")).toBe(200);
  });

  it("estimates 1 credit per lead for email", () => {
    expect(estimateCampaignCredits(100, "email")).toBe(100);
  });

  it("scales linearly with lead count", () => {
    const c50 = estimateCampaignCredits(50, "call");
    const c100 = estimateCampaignCredits(100, "call");
    expect(c100).toBe(c50 * 2);
  });

  it("returns 0 for 0 leads", () => {
    expect(estimateCampaignCredits(0, "call")).toBe(0);
  });
});

// ─── State validation ─────────────────────────────────────────────────────────
describe("US State Validation", () => {
  it("accepts valid US state codes", () => {
    expect(isValidState("TX")).toBe(true);
    expect(isValidState("CA")).toBe(true);
    expect(isValidState("NY")).toBe(true);
    expect(isValidState("FL")).toBe(true);
    expect(isValidState("DC")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isValidState("tx")).toBe(true);
    expect(isValidState("Ca")).toBe(true);
  });

  it("rejects invalid state codes", () => {
    expect(isValidState("XX")).toBe(false);
    expect(isValidState("ZZ")).toBe(false);
    expect(isValidState("Texas")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidState("")).toBe(false);
  });
});
