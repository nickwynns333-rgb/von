# VonWork End-to-End Validation Matrix

**Version:** 2026-08-25

This matrix distinguishes automated evidence available in the current codebase from production operations that remain intentionally blocked until external credentials, legal materials, or payment-provider configuration are supplied.

| Journey | Expected control | Current evidence | Release status | Required production confirmation |
|---|---|---|---|---|
| Public landing and pricing | Public visitors see Free, Starter $499, AI Video Pro $999, and Enterprise $1,497 only | Visual review of `/`; Stripe product tests | Ready | Confirm production Stripe price IDs and checkout branding |
| HFN own-use price | Only verified active HFN members can request the 50%-off own-use offer; rate cannot be resold or transferred | Entitlement table, server-side eligibility router, protected checkout, `/hfn-pricing` visual review | Staged | Connect signed HFN status API and validate the live webhook lifecycle |
| JoinForce price | Only verified JoinForce members can request restricted pricing | Eligibility router, protected products, `/joinforce-pricing` visual review | Staged | Connect signed JoinForce credential API and verify token expiry behavior |
| VonWork gate sequence | HFN, JoinForce proof, level, POW, and agreement gates fail closed when stale or unavailable | `vonwork-gates.ts`, qualification hub, schema audit | Staged | Run against real independently governed upstream endpoints |
| Wallet-proof boundary | No VonWork wallet flow may request a seed phrase, private key, wallet password, or custody credential | No wallet data collection route exists in VonWork; ecosystem audit documents the prohibition | Guardrail documented | Perform a separate JoinForce application security review before introducing wallet signing |
| Claim / recovery boundary | VonWork does not adjudicate a claim, transfer, recovery likelihood, or legal assignment | Nexus integration only emits bounded status credentials; counsel restriction documented | Guardrail documented | Use counsel-supplied Nexus documents and separate storage before launch |
| Website prospecting | Approved source data creates review-only candidates; missing official website is treated as a signal, not proof | Prospecting tables, official provider adapter, review queue, suppression, demo test | Ready for internal use | Configure production Maps provider, attribution, retention, and team review SOP |
| Private demo sharing | Generated concepts remain private and labeled until owner approval | Demo status workflow, expiry, private preview, regression test | Ready for internal use | Verify share-link expiration and owner review process with production data |
| AI presentation | Browser AI presenter discusses only an approved private concept and does not promise results | Presentation procedure and public page | Ready for internal use | Confirm actual marketing copy and disclosure policy |
| Outreach | Suppression blocks contact and AI voice remains consent-gated | Suppression model, review state, consent requirements | Safety gate active | Configure policy, calling windows, channel registrations, and legal review before dispatch |
| Custom avatar / voice | User must attest rights, intended purpose, synthetic-media disclosure, and typed signature | `ai_media_consents`, server-side enforcement, Avatar/Voice Studio forms | Ready for internal use | Establish revocation/deletion process with each media provider |
| AI memory and model spend | Memory is tenant-scoped; high-volume work defaults to a low-cost OpenRouter policy | `user_memory`, OpenRouter policy tests, cost logs | Ready | Monitor real usage and revise provider model allowlist quarterly |
| Payment activation | Websites leave demo state only on confirmed payment webhook | Stripe endpoint and website activation flow | Staged | Claim Stripe test environment and execute a controlled live webhook test |
| Tenant isolation | Prospect, demo, consent, and pricing records are scoped to the authenticated user | tRPC protected procedures and user-scoped queries | Ready | Add multi-user penetration tests before broad production use |

## Automated validation results

The full Vitest suite completed on 2026-08-25 with **153 passing tests across 14 test files**. TypeScript compilation completed without errors using `pnpm exec tsc --noEmit`.

## Final workflow verification

The verified in-app path is: select an industry from the 64-category catalog and geography; run an attributed approved-place-data search or import a client-owned CSV; normalize and deduplicate records; review or suppress each prospect; create a private Website Creator concept; approve it; create an Interactive Presentation Creator link; track presentation opens and questions; prepare a pending-review email or opted-in SMS draft; and stage a Call Center campaign in test mode. The unified Social AI Control Center renders all supported connection states and local, non-delivering inbound tests. The Communications Hub exposes AI routing, low-cost OpenRouter AI replies, and an explicit human-handoff action.

No real calls, texts, emails, social messages, voice clones, or paid provider sessions were sent during this verification. Those operations require their respective provider configuration and the existing consent, suppression, test-mode, and approval controls.

## Production hold points

The following are purposely not treated as complete merely because a UI or integration stub exists: HFN and JoinForce signed upstream credentials, Google Places production configuration, Stripe subscription/webhook confirmation, phone/SMS registration and consent operations, third-party media provider retention/deletion controls, GPU-backed OpenVoice or LivePortrait deployment, and all counsel-supplied claims or assignment documentation.
