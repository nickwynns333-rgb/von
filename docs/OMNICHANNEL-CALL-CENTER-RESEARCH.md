# Unified Social Chatbot and Call Center Research

## Verified event-delivery requirements

| Channel family | Verified delivery model | Production requirement | VonWork implementation implication |
|---|---|---|---|
| Meta: Messenger and Instagram | Meta sends subscribed object-field changes as HTTPS POST JSON webhooks | Valid public TLS endpoint, correct permissions, and the relevant app review/access flow for live data | Implement signed webhook verification, raw-event retention, idempotency, and per-tenant channel credentials |
| WhatsApp Business Platform | Meta webhooks send inbound messages, outbound status, call events, and business-account changes | `whatsapp_business_messaging` and `whatsapp_business_management` permissions; subscribe to required fields; duplicate retries may occur | Normalize messages and delivery states into the shared conversation model; make webhook handling idempotent |
| Telegram Bot API | Telegram supports HTTPS webhook delivery of bot updates | A bot token and a configured HTTPS webhook endpoint | Normalize Telegram update payloads into the shared conversation model and retain the source update ID for deduplication |

## Architecture decision inputs

All three social-channel families support an event-driven inbound model, so VonWork should use signed webhooks—not polling—for inbound chat monitoring. Each incoming event must be stored with a provider event ID, tenant/channel connection ID, timestamp, and raw payload hash before the AI routing layer processes it. Outbound sends must remain policy-aware and pause when a conversation is assigned to a human or marked as suppressed.

## Approved local-business discovery and campaign-data model

Google Places Text Search supports location-and-industry queries and explicit response field masks. It is suitable for an approved discovery adapter when configured with required attribution, data-retention, and API-key restrictions; direct Google Maps page scraping is intentionally excluded. The official `googlemaps/google-maps-services-js` repository is a server-side Node.js client option, so API credentials remain on the VonWork server rather than in a browser.

The list-builder will combine three source types: a client-uploaded CSV/database export, approved place-data search, and optional OpenStreetMap enrichment. Every imported prospect will preserve source, source record ID, fields returned, data freshness, business-purpose explanation, suppression state, and an owner-review state. A missing website value is only a review signal—not proof that a business has no website.

## Client-owned data intake

The Prospecting Studio accepts CSV imports of up to 500 rows per batch. It maps common business-name, industry, address, phone, email, decision-maker, website, and source-ID headers; requires a business-purpose declaration and a confirmation that the user is authorized to use the list; preserves import attribution; and never dispatches outreach as part of import. Phone, domain, and business-name/address keys are normalized to skip duplicates. Internal suppression values move matching records directly into the suppressed state. Every accepted record begins in the review queue.

## Prospect-to-presentation campaign flow

Only owner-approved prospects can be selected for a campaign. Campaign staging defaults to test mode and creates an audit link to each selected prospect. A record reaches a calling queue only if it has both a verified phone number and an `OPTED_IN` voice-contact record; every other record remains marked for contact-permission review. A campaign cannot dispatch while test mode is enabled or until its owner explicitly completes the consent-and-suppression approval control.

Once a private demo is approved, VonWork creates an expiring interactive presentation link with a transparent AI presenter. Opening the presentation and asking questions are logged. Email or SMS content can be prepared with a link, but it remains in `PENDING_REVIEW`; SMS preparation also requires a documented opt-in. The display cost is a planning estimate using the current low-cost OpenRouter model policy and explicitly excludes place-data, telecom, delivery, video, avatar, and GPU costs.

## VICIdial benchmark

The practical minimum benchmark includes lead preview and scripts, inbound and outbound campaign support, blended routing, campaign pacing, time-zone windows, callbacks, dispositions, transfer/conference, recording controls, do-not-call controls, queue/agent monitoring, and real-time campaign reporting. VonWork already has campaign pacing, schedules, voice selection, script generation, and live campaign polling; the new matrix will make the remaining evidence and gaps explicit before any claim of operational superiority.

## References

[1]: https://developers.facebook.com/docs/graph-api/webhooks/ "Meta Webhooks"
[2]: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview "WhatsApp Business Platform Webhooks"
[3]: https://core.telegram.org/bots/api "Telegram Bot API"
[4]: https://developers.google.com/maps/documentation/places/web-service/text-search "Google Places Text Search (New)"
[5]: https://github.com/googlemaps/google-maps-services-js "Google Maps Services Node.js Client"
[6]: https://www.vicidial.com/?page_id=5 "VICIdial Features"

## References

[1]: https://developers.facebook.com/docs/graph-api/webhooks/ "Meta Webhooks"
[2]: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview "WhatsApp Business Platform Webhooks"
[3]: https://core.telegram.org/bots/api "Telegram Bot API"
