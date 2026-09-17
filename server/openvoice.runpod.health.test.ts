import { describe, expect, it } from "vitest";
import { checkOpenVoiceHealth } from "./openvoice";

const endpoint = process.env.OPENVOICE_SERVICE_URL;
const gatewayToken = process.env.OPENVOICE_SERVICE_TOKEN;
const runPodApiKey = process.env.RUNPOD_API_KEY;

describe.skipIf(!endpoint || !gatewayToken || !runPodApiKey)("RunPod OpenVoice gateway", () => {
  it("accepts separate RunPod proxy and gateway credentials on a harmless protected route after a scale-to-zero cold start", async () => {
    const health = await checkOpenVoiceHealth();
    expect(health.configured).toBe(true);
    expect(health.healthy).toBe(true);
    expect([200, 404]).toContain(health.status);
  }, 180_000);
});
