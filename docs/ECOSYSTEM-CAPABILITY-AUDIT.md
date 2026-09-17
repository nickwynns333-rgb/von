# VonWork Ecosystem Capability Audit

**Scope:** Humans First Network (HFN), JoinForce, VonWork, Nexus Recovery Trust, Website Prospecting Studio, and the AI media stack.

**Audit basis:** Supplied HFN/JoinForce/VonWork/Nexus brief, system validation brief, OpenRouter memory brief, and the current VonWork codebase.

> **Important separation principle.** The supplied brief requires four legally distinct organizations with independent agreements, records, privacy disclosures, and administration. The current codebase is a VonWork application with upstream credential checks; it is **not** yet four independently deployed systems. The implementation roadmap must preserve this boundary rather than treating an external membership or claims status as VonWork-owned data.

## 1. Executive status

| Area | Current status | Evidence in current codebase | Required next action |
|---|---|---|---|
| **VonWork qualification gate** | Implemented in the VonWork app | `server/routers/vonwork-gates.ts` checks HFN active status, JoinForce Proof of Loyalty, and JoinForce level; caches status; fails closed on upstream errors/staleness. | Replace placeholder upstream URLs with production, separately governed HFN and JoinForce credential endpoints; add signature verification and test fixtures. |
| **Proof of Work (POW)** | Implemented in VonWork | `VonWorkHub.tsx` and `vonwork-gates.ts` provide submission, sequential `POW-XXXXXXXX`, review status, revisions, admin review, audit logging, business information, and agreement acceptance. | Add final end-to-end tests, S3 evidence flow verification, and clear operational review procedures. |
| **VonWork business agreement** | Implemented as a workflow | Scroll-to-end, affirmative checkbox, typed signature, version persistence, activation condition, and audit log are in the current router and UI. | Counsel supplies and approves the actual agreement text and the e-signature compliance process for the relevant jurisdiction. |
| **HFN membership site** | External / not implemented as a separately governed system | VonWork consumes an `hfnMemberId` and calls a configurable upstream status URL. | Build or integrate the independent HFN membership application, $99 recurring billing, member ID, agreement versioning, and signed status credential API. |
| **JoinForce wallet & historical-loyalty verification** | External / not implemented in VonWork by design | VonWork only consumes `proof_of_loyalty`, level, and validity fields. | Build this in the separate JoinForce system: wallet-message signing first, optional OTP-linked micro-transaction, historical balance verification, frozen coefficient versioning, and no-custody controls. |
| **Reward points / loyalty level engine** | External / not implemented in VonWork | VonWork consumes the level but does not calculate token holdings or HODL points. | Build this in JoinForce with versioned token standardization tables, publishable methodology, editable tier thresholds, and a minimal signed credential response. |
| **Nexus claims, affidavits, forensic review, transfer, pools** | Not implemented as a separate Nexus system | Only `server/nexusCredentialApi.ts` exists for limited VonWork credential output. | Build a separate Nexus application, separate encrypted evidence storage, claim/transfer event distinction, counsel-supplied documents, forensic case permissions, pool subledgers, and member-safe visibility rules. |
| **HFN own-use member pricing** | Implemented | A protected, non-transferable entitlement table, HFN eligibility checks, server-side checkout enforcement, and `/hfn-pricing` now provide a 50% own-use benefit. | Connect the production HFN signed-status endpoint and complete payment-webhook entitlement updates before commercial launch. |
| **JoinForce member pricing** | Implemented | Member-only pricing procedures, server-side eligibility checks, protected checkout, and `/joinforce-pricing` are wired. | Connect the production JoinForce signed-status endpoint before commercial launch. |
| **Website Prospecting Studio** | Implemented in compliance-first mode | Official-place discovery, source attribution, missing-website signals, owner review, suppression, private demos, and browser-based AI presentations are now in the VonWork app. | Add production data-provider configuration, final outreach policy, and end-to-end operational testing. |
| **AI video / avatar / custom voice** | Consent-gated managed workflow; self-hosted candidate documented | LiveKit, Simli, and existing media pages; `ai_media_consents` now protects custom avatar and voice creation. | Retain LiveKit; deploy consent-gated OpenVoice or LivePortrait only after a GPU inference environment and deletion/revocation operations are approved. |
| **System-wide validation** | Partial | TypeScript checks and feature-level tests exist; a platform-wide real-user test matrix has not been completed. | Add a formal role/flow/end-to-end validation matrix and run regression tests after each major capability change. |

## 2. Architecture decision: four separate systems, minimal credentials

The desired target is **not** a shared master database. It is a credentialed progression in which each system receives only the minimum facts necessary for its own decision.

| System | Owns | Must not receive by default | Minimal credential it may expose |
|---|---|---|---|
| **HFN** | Membership identity, $99 subscription, membership agreement, member status | Wallets, loyalty balances, VonWork business activity, Nexus claim documents | Member ID, active/past-due/suspended status, membership start date, signed validity window |
| **JoinForce** | Wallet-control verification, historical holdings, Proof of Loyalty, reward points, loyalty level | Claim evidence, VonWork activity details, HFN agreement text | Proof of Loyalty status, verified level, credential expiry, signed verification token |
| **VonWork** | Proof of Work, VonWork business agreement, business account, AI platform activity, subscriptions | Private keys, seed phrases, historical wallet data, full Nexus evidence | POW status, business active status, tier, signed credential token |
| **Nexus** | Claim evidence, affidavits, forensic case work, transfer documents, recovery pools and accounting | More VonWork platform activity than eligibility requires | Claim status / pool status only, subject to a counsel-approved agreement and data policy |

## 3. Non-negotiable security and counsel gates

The following requirements are mandatory before rollout:

| Control | Implementation rule |
|---|---|
| Wallet verification | Never request or store a seed phrase, private key, wallet password, or remote access. Use wallet signatures where available; any micro-transaction must be opt-in, disclosed, uniquely linked to a challenge, and must never be described as proof of historical holdings by itself. |
| Claims and assignments | Software may collect information and route a counsel-supplied document workflow. It must not independently decide that a claim is valid, transferable, legally assigned, collectible, or likely to recover. |
| Data isolation | Claims evidence must live in separate, encrypted storage governed by Nexus access controls. Cross-site APIs return signed status credentials only. |
| AI voice and avatars | Consent, rights ownership, allowed purpose, retention, and revocation must be captured before cloning a voice or likeness. AI-generated media must be disclosed or marked where required. |
| Outreach | Website demos remain private and watermarked until a purchaser activates them. AI voice calling must be blocked unless recorded consent is available; all outreach needs source, suppression, and human-approval controls. |

## 4. Recommended open-source posture

| Capability | Recommended path | Reason |
|---|---|---|
| Realtime voice/video sessions | **LiveKit Agents** | Apache-2.0 framework and current VonWork integration; keep as the media session layer. [1] |
| Voice cloning | **OpenVoice**, deployed as a separately isolated GPU service | MIT license and commercial-use permission; only after consent and deletion controls are implemented. [2] |
| Avatar animation | **LivePortrait** as a later GPU add-on | Permissive license but real-time inference needs GPU infrastructure and strong likeness-right controls. |
| Persistent product memory | Extend the existing database-backed `user_memory` system | Avoid embedding an AGPL tool into the proprietary production product; memory can remain tenant-scoped and auditable. |
| AI model routing | Extend the existing OpenRouter router | Route low-risk, high-volume tasks to low-cost models; reserve stronger reasoning models for gated, high-value tasks; log model, cost, and purpose per job. |

## 5. Immediate implementation sequence

1. Build HFN 50%-off own-use entitlement and protect it with a live HFN status check at checkout.
2. Create the Website Prospecting Studio in compliance-first mode: approved data sources, lead review, private demo generation, and browser-based AI presentation links.
3. Add the global validation matrix and tests for existing gates, agreements, pricing eligibility, role isolation, and media consent.
4. Define the separate HFN, JoinForce, and Nexus deployment/API contracts before adding wallet or claims data to any live system.

## 6. Visual verification addendum — 2026-08-25

- The public home-page pricing section renders the revised **Free**, **Starter $499**, **AI Video Pro $999**, and **Enterprise $1,497** offers.
- The protected HFN pricing page renders the 50%-off own-use benefit and withholds member-only offers until active HFN status is verified.
- The JoinForce pricing import existed without an application route; `/joinforce-pricing` has been registered and requires a fresh visual verification pass.
- Fresh visual verification confirms that the JoinForce portal renders the $299 Starter and $699 AI Video Pro member offers, while the Prospecting Studio renders its official-place discovery form, review-first notice, and private-demo workflow entry point.

## 7. Validation evidence — 2026-08-25

| Check | Result | Evidence |
|---|---|---|
| TypeScript | Pass | `pnpm exec tsc --noEmit` completed successfully after the membership, prospecting, media-consent, and model-routing changes. |
| Regression suite | Pass | `pnpm test --run` completed with **146 passing tests across 11 files**. |
| Protected pricing | Pass | Public, HFN, and JoinForce product-policy tests cover the $499 Starter, $999 AI Video Pro, Enterprise plan, and restricted member catalog. |
| Private demo safety | Pass | Regression test confirms the fallback demo labels itself as a private VonWork concept rather than a live business website. |
| OpenRouter cost policy | Pass | Regression tests confirm website rebuilding, prospect demos, and high-volume chat default to `openai/gpt-4o-mini`. |

> Production activation remains intentionally gated on separately governed upstream HFN/JoinForce endpoints, actual Google Places provider configuration, payment-webhook verification, and the operational consent/revocation procedures described in this audit.

## References

[1]: https://github.com/livekit/agents "LiveKit Agents — Apache-2.0 framework"
[2]: https://github.com/myshell-ai/OpenVoice "OpenVoice — MIT licensed instant voice cloning"
