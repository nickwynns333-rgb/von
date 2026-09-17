import { AccessToken } from "livekit-server-sdk";
import { ENV } from "./_core/env";

/**
 * Generate a LiveKit room access token for a participant.
 */
export async function generateLiveKitToken({
  roomName,
  participantName,
  participantIdentity,
  isAgent = false,
}: {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  isAgent?: boolean;
}): Promise<string> {
  const at = new AccessToken(ENV.livekitApiKey, ENV.livekitApiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: "4h",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: !isAgent, // human participant can publish audio/video
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Generate a LiveKit token for the AI agent (server-side bot participant).
 */
export async function generateAgentToken(roomName: string): Promise<string> {
  return generateLiveKitToken({
    roomName,
    participantName: "AI Agent",
    participantIdentity: `agent-${roomName}`,
    isAgent: true,
  });
}
