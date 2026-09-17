import { ENV } from "./_core/env";

const FISH_BASE = "https://api.fish.audio/v1";

/**
 * Create a voice clone from a reference audio URL.
 * Returns the Fish Audio voice model ID to store on the agent.
 */
export async function createFishVoice({
  name,
  description,
  audioUrl,
}: {
  name: string;
  description?: string;
  audioUrl: string;
}): Promise<string> {
  // Download the audio file first
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`);
  const audioBuffer = await audioRes.arrayBuffer();

  // Fish Audio expects multipart form data for voice creation
  const form = new FormData();
  form.append("title", name);
  if (description) form.append("description", description);
  form.append("visibility", "private");
  form.append(
    "voices",
    new Blob([audioBuffer], { type: "audio/mpeg" }),
    "reference.mp3"
  );

  const res = await fetch(`${FISH_BASE}/model`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.fishAudioApiKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fish Audio createVoice failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data._id ?? data.id;
}

/**
 * Generate TTS audio from text using a cloned Fish Audio voice.
 * Returns audio as a Buffer (mp3).
 */
export async function fishTTS({
  text,
  voiceId,
  format = "mp3",
}: {
  text: string;
  voiceId: string;
  format?: "mp3" | "wav" | "opus";
}): Promise<Buffer> {
  const res = await fetch(`${FISH_BASE}/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.fishAudioApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId,
      format,
      mp3_bitrate: 128,
      normalize: true,
      latency: "normal",
    }),
  });

  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(`Fish Audio TTS failed: ${res.status} ${text2}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Preview TTS using a default Fish Audio voice (no cloning needed).
 * Uses one of Fish Audio's built-in voices for demo purposes.
 */
export async function fishTTSDefault({
  text,
  format = "mp3",
}: {
  text: string;
  format?: "mp3" | "wav";
}): Promise<Buffer> {
  const res = await fetch(`${FISH_BASE}/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.fishAudioApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      format,
      mp3_bitrate: 128,
      normalize: true,
      latency: "normal",
    }),
  });

  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(`Fish Audio TTS (default) failed: ${res.status} ${text2}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
