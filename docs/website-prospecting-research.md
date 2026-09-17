# Website Prospecting Studio — Research Notes

## Sources reviewed

| Source | Finding | Product implication |
|---|---|---|
| Google Places API Text Search (New) | The official text-search endpoint supports location- and category-based discovery. A field mask can return `displayName`, `formattedAddress`, `websiteUri`, and related business details; an absent `websiteUri` can be used as a candidate signal. Results must be handled according to the applicable Google Maps policies and attributions. | Use an approved Places integration, request only necessary fields, store source attribution and the `websiteUri` check result. A missing field should be labelled **"No official website returned — verify"**, not asserted as a fact. |
| `geethikaisuru/business-website-classifier` (MIT) | The No Site Business Finder demonstrates a Google Places-driven discovery workflow with batch processing, CSV output, and AI-assisted website-missing classification. | Reuse the *product pattern*—search, qualify, review, export—not its Streamlit/Tkinter implementation. Rebuild the workflow natively in VonWork with data isolation, auditability, and approvals. |
| `OpenPlaceGuide/openplaceguide` (AGPL-3.0) | An OpenStreetMap-based open business-directory concept, useful as a supplemental discovery source. | Do **not** copy source code into the proprietary product. Use OpenStreetMap/Overpass as an optional data source under its applicable data-license/attribution obligations, with source labeling and separate implementation. |

## Proposed discovery workflow

1. A user selects geography, industry, and source (approved Places search or an uploaded/owned lead list).
2. The system records the discovery run and source attribution, then checks the official `websiteUri` field.
3. Businesses with an absent official website field enter a **Needs verification** queue. A user must approve a record before a demo website can be generated.
4. The Website Rebuilder creates a private, watermark-protected demo from the approved business profile and available public business facts. The original site is never copied verbatim and the demo is not published as the business's real site.
5. The user reviews the pitch, optional AI video presentation, consent/list source, local calling window, and suppression status before any outreach dispatch is enabled.

## Compliance-by-design requirements

- No Google Maps scraping or browser automation against consumer-facing Google Maps pages.
- No automatic calls or messages to unreviewed leads.
- Maintain a do-not-contact/suppression list and source-of-contact record.
- Keep call and message launch controls behind explicit user approval, with a clear opt-out path.
- Show a prominent demo watermark until a business explicitly purchases/activates its site.

## Outreach control findings

| Official source | Finding | Required product control |
|---|---|---|
| FTC Telemarketing Sales Rule Q&A | The FTC states that most business-to-business calls that solicit sales from a business are exempt from the National Do Not Call provisions, but also cautions that applicability depends on the specific practices and that entity-specific requests must be honored where relevant. | Model every outreach item with a business-contact classification, contact source, internal suppression state, outreach status, and an immediately available do-not-contact action. Show a review notice rather than making a legal eligibility determination. |
| FCC Declaratory Ruling FCC-24-17 | The FCC states that TCPA restrictions on artificial or prerecorded voice encompass current AI technologies that generate human voices; calls using them require prior express consent of the called party. | Do not enable AI-voice presentation calls to scraped or unconsented phone numbers. The product may create an AI presentation link and a human-reviewed script for B2B leads, but AI voice dispatch must require stored consent plus an explicit launch confirmation. |

The initial release should therefore prioritize: (1) approved-data discovery, (2) private AI demo websites, (3) shareable browser-based AI presentations, and (4) human-reviewed email/manual calling workflows. AI-voice outreach becomes a gated feature for leads with independently recorded consent.

## Open-source use posture

The module will borrow general workflow ideas from the MIT-licensed NSBF project but be implemented natively inside VonWork. For OpenStreetMap, VonWork may integrate a documented public data endpoint rather than incorporating AGPL source code.

## AI media stack — verified component posture

| Component | Verified license / capability | VonWork position |
|---|---|---|
| LiveKit Agents | The framework repository is Apache-2.0 and is designed for real-time voice AI agents. The repo separately identifies a LiveKit model license for its turn-detection models. | **Primary real-time orchestration layer.** VonWork already has LiveKit credentials and video-room UI. Continue using this framework for media session control and plug in open or commercial STT/TTS/avatar providers only where approved. |
| OpenVoice V1/V2 | The canonical repository states that V1 and V2 are MIT licensed and free for commercial and research use; it provides instant voice-cloning capabilities. | **Preferred self-hosted voice-cloning candidate.** Add only behind a separate GPU service and a strict recorded-consent, reference-audio ownership, revocation, and retention policy. |
| Pipecat | The evaluated project is BSD-2-Clause and provides modular multimodal voice-agent orchestration, but needs a persistent Python service. | **Optional architecture alternative.** Do not run both Pipecat and LiveKit Agents for the first release; retain it for a later provider-agnostic voice pipeline if LiveKit plugins are insufficient. |
| LivePortrait | The evaluated project is MIT and provides image/video-driven portrait animation, but requires a CUDA-capable GPU service for usable real-time output. | **Deferred GPU add-on.** Use only with documented avatar/likeness rights and an external GPU runtime. |
| OpenWolf | The evaluated project is AGPL-3.0 and focuses on local coding-agent memory, not product-user memory. | **Do not embed in the proprietary production stack without a separate licensing decision.** Continue the native `user_memory` approach and borrow only non-copyrightable architectural ideas. |
| OpenHarness | The evaluated project is MIT and provides persistent harness/memory and multi-provider routing concepts. | **Architecture reference / possible future service.** For now, extend VonWork's native OpenRouter router and database-backed memory to avoid a second runtime. |

### Required consent controls for voice and avatar features

- Capture explicit consent from the voice/likeness owner before upload or cloning.
- Link each consent record to the source audio/image, allowed purposes, status, and revocation timestamp.
- Watermark or visibly disclose AI-generated media where appropriate.
- Never generate a clone for a person who is not the authenticated rights-holder or verified authorized representative.
- Store biometric reference files in isolated, access-controlled storage and make deletion/revocation actionable.
