import { ENV } from "./_core/env";

export type OpenVoiceSynthesisRequest = {
  text: string;
  profileId: string;
  language?: string;
};

function usesRunPodProxy(url: string): boolean {
  return /(^|\.)runpod\.ai(?:\/|$)/i.test(new URL(url).hostname);
}

function gatewayHeaders(contentType?: string): Record<string, string> {
  const serviceUrl = ENV.openVoiceServiceUrl;
  const gatewayToken = ENV.openVoiceServiceToken;
  if (!serviceUrl || !gatewayToken) {
    throw new Error("OpenVoice service is not configured. Add a GPU-hosted service URL and token before synthesis.");
  }

  if (usesRunPodProxy(serviceUrl)) {
    const runPodApiKey = process.env.RUNPOD_API_KEY ?? "";
    if (!runPodApiKey) {
      throw new Error("RunPod proxy authentication is not configured.");
    }
    return {
      ...(contentType ? { "Content-Type": contentType } : {}),
      Authorization: `Bearer ${runPodApiKey}`,
      "X-OpenVoice-Token": `Bearer ${gatewayToken}`,
    };
  }

  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    Authorization: `Bearer ${gatewayToken}`,
  };
}

/**
 * Contract for a GPU-hosted OpenVoice gateway. The gateway is intentionally
 * separate from the WebDev application because inference needs GPU resources.
 */
export function getOpenVoiceStatus() {
  const usingRunPod = ENV.openVoiceServiceUrl ? usesRunPodProxy(ENV.openVoiceServiceUrl) : false;
  return {
    configured: Boolean(ENV.openVoiceServiceUrl && ENV.openVoiceServiceToken && (!usingRunPod || process.env.RUNPOD_API_KEY)),
    endpointConfigured: Boolean(ENV.openVoiceServiceUrl),
    tokenConfigured: Boolean(ENV.openVoiceServiceToken),
    runPodProxyConfigured: !usingRunPod || Boolean(process.env.RUNPOD_API_KEY),
    provider: "OpenVoice",
    requiresGpuService: true,
  };
}

/**
 * Runs a low-impact liveness probe only. It never creates a voice profile or
 * requests synthesized audio. A synthetic, non-existent profile identifier
 * proves both proxy and gateway authentication without touching real data.
 */
export async function checkOpenVoiceHealth(): Promise<{ configured: boolean; healthy: boolean; status?: number }> {
  const status = getOpenVoiceStatus();
  if (!status.configured || !ENV.openVoiceServiceUrl) {
    return { configured: false, healthy: false };
  }

  let lastStatus: number | undefined;
  for (const waitMs of [0, 5_000, 10_000]) {
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    try {
      const response = await fetch(`${ENV.openVoiceServiceUrl.replace(/\/$/, "")}/v1/voice-profiles/vonwork_health_nonexistent_profile`, {
        method: "DELETE",
        headers: gatewayHeaders(),
      });
      lastStatus = response.status;
      // The gateway returns 404 after authenticating and safely evaluating a
      // non-existent profile. A prior cleanup returning 200 is also healthy.
      if (response.ok || response.status === 404) {
        return { configured: true, healthy: true, status: response.status };
      }
      // Only transient load-balancer gateway failures should be retried. A 4xx
      // is a deterministic configuration or authorization error.
      if (response.status !== 502 && response.status !== 503 && response.status !== 504) {
        return { configured: true, healthy: false, status: response.status };
      }
    } catch (error) {
      console.warn("[OpenVoice] protected liveness probe attempt failed", error);
    }
  }
  return { configured: true, healthy: false, status: lastStatus };
}

export async function synthesizeOpenVoice(request: OpenVoiceSynthesisRequest): Promise<{ audio: Buffer; contentType: string }> {
  const response = await fetch(`${ENV.openVoiceServiceUrl.replace(/\/$/, "")}/v1/audio/speech`, {
    method: "POST",
    headers: gatewayHeaders("application/json"),
    body: JSON.stringify({
      input: request.text,
      voice_profile_id: request.profileId,
      response_format: "wav",
      language: request.language ?? "en",
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenVoice synthesis failed (${response.status}).`);
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "audio/wav",
  };
}

export async function deleteOpenVoiceProfile(profileId: string): Promise<void> {
  if (!ENV.openVoiceServiceUrl || !ENV.openVoiceServiceToken || !profileId || profileId.startsWith("reference:")) return;
  const response = await fetch(`${ENV.openVoiceServiceUrl.replace(/\/$/, "")}/v1/voice-profiles/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
    headers: gatewayHeaders(),
  });
  if (!response.ok && response.status !== 404) throw new Error(`OpenVoice profile deletion failed (${response.status}).`);
}
