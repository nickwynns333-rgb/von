# VonWork AI Stack — Low-Cost, High-Quality Deployment Plan

## Operating principle

VonWork uses the lowest-cost model that can safely perform each task, keeps memory tenant-scoped, and only enables synthetic voice or likeness creation after a signed rights record is stored. The platform should not copy a voice, animate a likeness, or place an AI voice call merely because a user supplied a file or lead record.

## Active model-routing policy

| Workload | Current route | Reason | Cost posture |
|---|---|---|---|
| Website rebuilding and refinements | OpenRouter `openai/gpt-4o-mini` | Strong structured HTML and marketing copy for a fraction of flagship-model cost | Default efficient route |
| Prospect demo generation and AI presentation chat | OpenRouter `openai/gpt-4o-mini` | Fast, inexpensive response suitable for private concept previews | Default efficient route |
| General chat, receptionist, booking, support, and sales turns | OpenRouter `openai/gpt-4o-mini` | High-volume interactions are cost-sensitive | Default efficient route |
| Video-sales reasoning | OpenRouter premium policy when the product owner chooses it | Allows quality escalation for complex, high-value conversations | Premium by exception |
| Failure path | Meta Llama 3.1 8B via OpenRouter where configured | Low-cost fallback for non-sensitive tasks | Fallback only |

The OpenRouter helper records the model and estimated token cost in `ai_interaction_logs`; estimated rates are deliberately model-specific rather than using a single flagship-model assumption.

## Persistent memory

VonWork already uses database-backed `user_memory` and `memory_interactions`. This is the production memory layer because it is tenant-scoped, auditable, and avoids importing an AGPL dependency into the proprietary product. Each new agent feature should read only the context required for the user, tenant, and approved purpose.

## Media stack

| Capability | Current production path | Open-source path evaluated | Status and guardrail |
|---|---|---|---|
| Real-time voice/video rooms | LiveKit | LiveKit Agents (Apache-2.0) | Existing integration retained; suitable session layer |
| Custom video avatars | Simli-backed Avatar Studio | LivePortrait | LivePortrait needs dedicated GPU inference; defer self-hosting until GPU hosting, likeness rights, deletion, and load tests are approved |
| Custom voice cloning | Existing Voice Studio / managed provider | OpenVoice (MIT) | OpenVoice is the selected self-hosted candidate; current WebDev compute cannot operate a reliable GPU inference service, so no self-hosted endpoint is enabled yet |
| Consent | `ai_media_consents` | N/A | Live: custom avatar and custom voice creation require an active signed consent record tied to the user and, where used, the agent |

## Required consent controls

1. The uploader records the subject name, purpose, typed signature, rights confirmation, and AI-disclosure confirmation.
2. The server checks that the consent is active, belongs to the current user, applies to the media type, and applies to the configured agent before submitting a cloning or avatar request.
3. Revocation records the withdrawal date. Future generation is blocked; operational policy must govern deletion or retention of already-created provider media.
4. AI voice and AI avatar outreach remains disabled unless the consent and outreach records satisfy the separate campaign controls.

## Self-hosted OpenVoice / LivePortrait decision gate

These projects are valuable for lowering marginal cost, but they are not installed in the current web service because real-time or near-real-time inference needs GPU capacity beyond the managed application ceiling. Before enabling either service, select a dedicated inference environment, add authenticated API-to-service routing, define retention/deletion jobs, run latency and capacity tests, and complete the consent/revocation operational review.

## OpenVoice service contract for chatbots and video agents

OpenVoice V1 and V2 are published under the MIT license and the repository describes native multilingual support in V2. VonWork treats OpenVoice as a separately hosted, GPU-capable internal service rather than a browser dependency. Its authenticated contract is `POST /v1/audio/speech` with text, a consented `voice_profile_id`, language, and requested audio format. The VonWork application sends no seed material or unsigned voice profile to this service; the profile must originate from a signed `ai_media_consents` record tied to the selected agent.

For a chatbot, OpenRouter produces the text reply while the OpenVoice service produces optional spoken audio. For a video agent, the LiveKit room carries the session, Simli supplies avatar video, and the generated OpenVoice audio is supplied to the avatar client for lip synchronization. If the service is unavailable, VonWork retains the built-in voice/browser speech fallback instead of silently claiming a cloned voice was used.

## References

- LiveKit Agents: https://github.com/livekit/agents
- OpenVoice: https://github.com/myshell-ai/OpenVoice
- LivePortrait: https://github.com/KwaiVGI/LivePortrait
