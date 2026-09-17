# VonWork AI Provider Readiness

**Audited:** 25 August 2026

This is a precise readiness statement. “Configured” means the project has the relevant environment variables; “verified” means a safe check completed without creating a call, message, cloned voice, avatar session, or paid event.

| Capability | Current implementation | Status | Safe validation completed | Remaining requirement |
|---|---|---|---|---|
| OpenRouter agent intelligence | `server/openrouter.ts` routes high-volume chat, website rebuilds, and prospect demos to `openai/gpt-4o-mini` | **Live and verified** | OpenRouter’s model catalog returned HTTP 200 with 419 detected model IDs | Run controlled conversational acceptance tests per agent prompt |
| AI chat agents | tRPC agent chat with memory injection, model routing, and cost logs | **Implemented** | Automated policy tests pass | Create named production agents and test their real knowledge bases |
| LiveKit meeting rooms | LiveKit client, server SDK, signed room-token generator, waiting room, and meeting UI | **Configured and reachable** | LiveKit HTTPS reachability returned HTTP 200; token code is server-side | Join a controlled real room with two participants and confirm audio/video publishing |
| Simli video avatar | Avatar Studio, consent records, Simli face storage, meeting session adapter | **Configured; session not yet live-validated** | Retired public stock-list call removed; Face ID workflow renders and compiles | Select a Face ID in the authenticated Simli dashboard and run one controlled meeting session |
| Custom avatar photo | Upload flow sends a consented photo through the configured Simli create path | **Implemented; provider response not live-validated** | Consent gate is server-enforced and UI-visible | Create one authorized test avatar and confirm provider turnaround and deletion handling |
| Built-in agent voices | Voice Studio provides built-in selections | **Implemented** | UI and configuration path available | Confirm selected voice in a controlled voice-meeting session |
| Fish Audio custom cloning | Consent-gated audio upload and provider adapter | **Not live** | Adapter and fallback storage path inspected | `FISH_AUDIO_API_KEY` is not configured; supply a provider key or deploy the approved self-hosted alternative |
| OpenVoice custom cloning | Consent-gated agent configuration, secure VonWork adapter, separate GPU gateway package, chatbot and video-agent playback path | **Staged for GPU deployment** | Service contract, Meta-safe tests, TypeScript, and UI configuration verified | Deploy the separate CUDA service, mount approved checkpoints, configure its gateway URL/token, then run a controlled consented voice test |
| LivePortrait custom avatar rendering | Evaluated GitHub candidate | **Not deployed** | Hosting requirements documented | Requires a dedicated GPU inference service, likeness controls, and performance testing |

## GitHub and open-source components

| Component | Role in VonWork | Deployment status |
|---|---|---|
| [LiveKit Agents][1] | Open-source reference and recommended agent/room orchestration path; VonWork currently uses the LiveKit client and server SDKs for browser rooms and signed tokens | SDK path active; full LiveKit Agents worker is not deployed |
| [LiveKit Simli plugin][2] | Supported Python agent-worker option for putting Simli avatars into LiveKit rooms | Evaluated; not deployed because it needs a Python agent worker |
| [OpenVoice][3] | Lower-cost self-hosted voice cloning for chatbot and video-agent speech | Separate GPU gateway package staged; not run inside the VonWork web application |
| [LivePortrait][4] | Candidate for self-hosted avatar animation | Evaluated; not deployed because it needs dedicated GPU infrastructure |
| [Simli OpenAI Realtime example][5] | Integration reference for conversational avatar sessions | Reference only; VonWork uses its own UI and keeps OpenRouter model routing server-side |

## Important operating boundaries

VonWork now requires signed consent for a custom avatar likeness or cloned voice. OpenVoice is selected for chatbot and video-agent speech once its separate GPU gateway is deployed; until then, the application keeps its built-in/browser-speech fallback. Simli stock-avatar listing is no longer treated as a production dependency; an authorized user connects a Face ID from their authenticated Simli dashboard instead. Facebook Messenger and Instagram Direct have a signature-verified inbound webhook and channel setup surface, but live messaging remains inactive until Meta app credentials, account IDs, and subscriptions are configured. The platform does not dispatch AI calls or messages as part of this readiness audit.

## References

[1]: https://github.com/livekit/agents "LiveKit Agents GitHub repository"
[2]: https://docs.livekit.io/agents/models/avatar/plugins/simli/ "LiveKit Simli avatar plugin"
[3]: https://github.com/myshell-ai/OpenVoice "OpenVoice GitHub repository"
[4]: https://github.com/KwaiVGI/LivePortrait "LivePortrait GitHub repository"
[5]: https://github.com/simliai/simli-openai-realtime "Simli OpenAI Realtime example"
