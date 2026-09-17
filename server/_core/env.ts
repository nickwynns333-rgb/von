import "dotenv/config";

export const ENV = {
  appId: process.env.VITE_APP_ID || "vonwork",
  cookieSecret: process.env.JWT_SECRET || "vonwork-super-secret-jwt-key-2026-production-ready",
  databaseUrl: process.env.DATABASE_URL || "mysql://root@127.0.0.1:3306/vonwork",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID || "demo-admin",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  livekitUrl: process.env.LIVEKIT_URL ?? "",
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? "",
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? "",
  simliApiKey: process.env.SIMLI_API_KEY ?? "",
  fishAudioApiKey: process.env.FISH_AUDIO_API_KEY ?? "",
  openVoiceServiceUrl: process.env.OPENVOICE_SERVICE_URL ?? "",
  openVoiceServiceToken: process.env.OPENVOICE_SERVICE_TOKEN ?? "",
};
