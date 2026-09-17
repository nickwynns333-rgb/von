import { describe, expect, it, vi } from "vitest";
import { checkOpenVoiceHealth, getOpenVoiceStatus } from "./openvoice";

describe("OpenVoice service contract", () => {
  it("reports configuration state without exposing a service token", () => {
    const status = getOpenVoiceStatus();
    expect(status.provider).toBe("OpenVoice");
    expect(status.requiresGpuService).toBe(true);
    expect(typeof status.configured).toBe("boolean");
    expect(typeof status.runPodProxyConfigured).toBe("boolean");
    expect(Object.keys(status)).not.toContain("token");
  });

  it("exposes a non-synthesis health result without returning credentials", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchSpy);
    const health = await checkOpenVoiceHealth();
    expect(typeof health.configured).toBe("boolean");
    expect(typeof health.healthy).toBe("boolean");
    expect(Object.keys(health)).not.toContain("token");
    if (fetchSpy.mock.calls.length) {
      expect(fetchSpy.mock.calls[0][1]?.method).toBe("DELETE");
      expect(String(fetchSpy.mock.calls[0][0])).toContain("vonwork_health_nonexistent_profile");
    }
    vi.unstubAllGlobals();
  });
});
