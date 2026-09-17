import { ENV } from "./_core/env";

const SIMLI_BASE = "https://api.simli.ai";

export interface SimliAvatar {
  avatar_id: string;
  avatar_name: string;
  thumbnail_url?: string;
  status?: string;
}

/**
 * Simli's current API does not expose a stable public stock-face listing route.
 * Face IDs are selected in the authenticated Simli dashboard and connected below.
 */
export async function listSimliAvatars(): Promise<SimliAvatar[]> {
  return [];
}

/**
 * Create a custom Simli avatar from a face image URL.
 * Returns the avatar_id to store on the agent.
 */
export async function createSimliAvatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string;
}): Promise<string> {
  const res = await fetch(`${SIMLI_BASE}/createCustomAvatar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-simli-api-key": ENV.simliApiKey,
    },
    body: JSON.stringify({
      avatar_name: name,
      image_url: imageUrl,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Simli createAvatar failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.avatar_id ?? data.id;
}

/**
 * Start a Simli streaming session for a given avatar.
 * Returns the session token and ICE servers needed by the frontend WebRTC client.
 */
export async function startSimliSession({
  avatarId,
  voiceId,
}: {
  avatarId: string;
  voiceId?: string;
}): Promise<{
  session_token: string;
  ice_servers: Array<{ urls: string | string[]; username?: string; credential?: string }>;
}> {
  const body: Record<string, unknown> = {
    apiKey: ENV.simliApiKey,
    faceId: avatarId,
    handleSilence: true,
  };
  if (voiceId) body.voiceId = voiceId;

  const res = await fetch(`${SIMLI_BASE}/startAudioToVideoSession`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Simli startSession failed: ${res.status} ${text}`);
  }
  return res.json();
}
