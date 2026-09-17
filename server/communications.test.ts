import { describe, expect, it } from "vitest";
import { SAFE_INBOUND_TEST_DISPATCHES_EXTERNALLY, SOCIAL_CONTROL_CHANNELS } from "./routers/communications";

describe("Unified social control center", () => {
  it("declares the supported social, messaging, web-chat, email, and voice control channels", () => {
    expect(SOCIAL_CONTROL_CHANNELS.map((channel) => channel.type)).toEqual(expect.arrayContaining([
      "instagram", "facebook", "telegram", "whatsapp", "sms", "webchat", "email", "voice",
    ]));
  });

  it("keeps inbound readiness tests local and non-dispatching", () => {
    expect(SAFE_INBOUND_TEST_DISPATCHES_EXTERNALLY).toBe(false);
  });
});
