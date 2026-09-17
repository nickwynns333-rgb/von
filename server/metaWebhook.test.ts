import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaSignature } from "./metaWebhook";

describe("Meta webhook verification", () => {
  it("accepts a correct sha256 app-secret signature", () => {
    const body = '{"object":"page"}';
    const secret = "test-secret";
    const signature = `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyMetaSignature(body, signature, secret)).toBe(true);
  });

  it("rejects missing or mismatched signatures", () => {
    expect(verifyMetaSignature("{}", undefined, "test-secret")).toBe(false);
    expect(verifyMetaSignature("{}", "sha256=invalid", "test-secret")).toBe(false);
  });
});
