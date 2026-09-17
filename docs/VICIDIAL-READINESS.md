# VonWork Call Center Readiness Matrix

VonWork is not a VICIdial clone. It is designed to deliver the operating controls a modern AI-enabled contact center needs while maintaining explicit review and dispatch safeguards.

| Capability | VonWork implementation | Readiness |
|---|---|---|
| Inbound call entry | Telnyx inbound webhook route with conversation creation and AI routing | Requires provisioned number and verified webhook |
| Outbound campaigns | Campaign scripts, voice selection, calls/hour, concurrency, schedule windows, and campaign dashboard | Implemented; starts in test mode |
| Dial pacing | `callsPerHour` and `maxConcurrent` controls with in-window evaluation | Implemented |
| Lead dispositions | Pending, calling, answered, voicemail, no answer, busy, failed, and do-not-call | Implemented |
| Consent guard | Campaigns require explicit consent-and-suppression approval before live dispatch | Implemented |
| AI / human routing | Communications Hub AI router and human-handoff assignment | Implemented |
| Recordings / transcripts | Provider integration points exist; live storage and retention policy require configuration | Staged |
| Social omnichannel | Web chat, SMS, WhatsApp, Instagram, Messenger, Telegram, email, and voice connection status in one control center | Control center ready; each provider still needs OAuth/webhook setup |
| Safe readiness tests | Local inbound test conversations do not deliver to an external party | Implemented |

## Dispatch policy

Every new campaign is written with `testMode = true` and `outreachApprovalStatus = DRAFT`. The launch path refuses dispatch until the campaign is explicitly approved with the required consent-and-suppression confirmation. The platform therefore supports operational testing without causing live calls or messages as a side effect.

## Remaining provider work

Telnyx needs a verified number, connection ID, and callback configuration for controlled calls. Meta channels need a Meta app, professional account/Page association, valid tokens, and subscribed webhooks. Telegram needs a bot token stored in server-side secrets and a registered webhook. OpenVoice needs a GPU-capable service before it can supply live custom TTS at scale.
