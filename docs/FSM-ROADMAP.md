# VonWork AI Field Service Management Platform
## Product Roadmap & Feature Blueprint

**Version:** 1.0 — July 2026  
**Author:** Manus AI for VonWork  
**Classification:** Internal Strategy Document

---

## Executive Summary

VonWork's Field Service Management (FSM) platform is an AI-first, industry-agnostic service business operating system. Where ServiceTitan serves the trades (HVAC, plumbing, electrical), VonWork extends the same intelligence across every service vertical — from auto repair and dental to home services and medical clinics. The platform's core thesis is that **every service transaction has three participants who all need AI help**: the business (get more jobs, price correctly, coach technicians), the technician (know what to fix, what to upsell, when to refer), and the customer (understand what they're paying for, validate the recommendation, make a confident decision).

VonWork's affiliate network is the growth engine: when an affiliate signs up a service business, that business immediately gains access to the full FSM stack. When a technician sees a problem outside their specialty, the platform's referral engine routes that lead to another VonWork-affiliated business — creating a closed-loop revenue network that compounds over time.

---

## The Three-Sided Value Proposition

| Participant | Core Problem | VonWork AI Solution |
|---|---|---|
| **Service Business** | Missed calls, no-shows, underpriced jobs, untrained techs | AI pre-call, smart booking, dynamic pricing, performance coaching |
| **Technician** | Uncertainty on diagnosis, missed upsell, no referral system | AI-guided diagnostics, upsell prompts, cross-referral rewards |
| **Customer** | Can't validate if repair is needed, don't know fair price | AI Customer Report: price benchmark, quality rating, decision guide |

---

## Industries Supported

VonWork goes beyond ServiceTitan's trade-only focus to cover every service vertical where a technician visits a customer.

### Tier 1 — Home Services (ServiceTitan overlap)
HVAC, Plumbing, Electrical, Roofing, Garage Door, Chimney Sweep, Pest Control, Pool Service, Lawn Care, Landscaping, Irrigation, Painting, Handyman, Appliance Repair, Air Duct Cleaning, Gutter, Siding, Locksmith, Refrigeration, Water Treatment, Septic, Fire & Life Safety, Alarm Systems, Audio Visual

### Tier 2 — Automotive Services (new territory)
Auto Repair, Oil Change, Tire Service, Auto Detailing, Windshield Repair, Transmission, Brake Service, Auto Body & Collision, Mobile Mechanic, Fleet Maintenance

### Tier 3 — Medical & Wellness (new territory)
Dental, Optometry, Chiropractic, Physical Therapy, Veterinary, Massage Therapy, Personal Training, Mental Health Counseling, Home Health Aide, Medical Equipment Repair

### Tier 4 — Professional & Specialty Services (new territory)
IT Support & Managed Services, Cleaning Services (residential/commercial), Moving & Storage, Photography/Videography, Tutoring, Pet Grooming, Catering, Security Systems, Solar Installation, EV Charging Installation

---

## Core Platform Modules

### Module 1: Business Operations Hub

The central command center for service business owners and office staff.

**Job Pipeline Board** — Kanban-style view of all jobs across stages: New Lead → Booked → Dispatched → In Progress → Completed → Invoiced → Paid. Each card shows customer name, job type, assigned tech, estimated value, and AI risk flags.

**Smart Booking Engine** — Customers book online 24/7 through an embeddable widget or AI phone agent. The engine respects technician availability, skill sets, geographic zones, and job duration estimates. Integrates with Google Calendar and Outlook.

**Dispatch Board** — Map-based view of all technicians in the field. AI recommends optimal job assignments based on proximity, technician skill match, current workload, and average ticket potential. Mirrors ServiceTitan's Dispatch Pro but adds an AI "revenue opportunity score" per assignment.

**Customer CRM** — Full history per customer: all jobs, invoices, equipment installed, warranty dates, service agreements, communication log, and AI-generated customer health score (likelihood to churn, likelihood to buy membership).

**Invoicing & Payments** — Generate invoices from job completion, collect payment in the field via Stripe, offer financing options, track accounts receivable. Integrates with QuickBooks and Xero.

**Membership & Service Agreements** — Recurring revenue through annual maintenance plans. AI recommends which customers to target for membership upsell based on job history and equipment age.

---

### Module 2: AI Pre-Appointment System

The most differentiated feature in VonWork's stack. Before any technician rolls a truck, the AI does the work.

**AI Pre-Call Agent** — 24–48 hours before a scheduled appointment, an AI voice agent calls the customer to:
- Confirm the appointment time and address
- Ask preliminary diagnostic questions ("Is the unit making a clicking sound or a grinding sound?")
- Collect photos or videos via SMS link
- Warn the customer of potential issues found in their service history
- Upsell a pre-visit inspection add-on if appropriate

The pre-call data feeds directly into the technician's job brief, so they arrive prepared with likely parts, estimated repair time, and a suggested price range.

**AI Job Brief Generator** — Before dispatch, the AI compiles a job brief for the technician including: customer history, equipment age and model, last service notes, pre-call findings, likely diagnosis, recommended parts to bring, average repair cost for this job type in this zip code, and upsell opportunities based on equipment age.

**Parts Pre-Staging** — Based on the AI diagnosis, the system can automatically generate a parts request to the warehouse or supplier so parts are staged before the technician departs.

---

### Module 3: AI Estimate & Pricing Intelligence

**Dynamic Pricebook** — Every service item has a base price, but the AI adjusts recommendations based on: local market rates (zip code pricing), equipment age, customer lifetime value, membership status, and seasonal demand. Mirrors ServiceTitan's Pricebook Pro but adds real-time market benchmarking.

**AI Estimate Builder** — In the field, the technician describes the problem and the AI generates a structured estimate with: itemized parts and labor, three pricing tiers (Good/Better/Best), market benchmark comparison ("This repair typically costs $X–$Y in your area"), and a plain-English explanation the tech can read to the customer.

**Price Validation Engine** — The AI cross-references the estimate against:
- National repair cost databases (aggregated from public sources and partner data)
- Historical VonWork job data for the same repair type and region
- Manufacturer recommended service intervals and typical costs
- Competitor pricing signals from public data

This gives the customer confidence that the price is fair, and gives the business confidence they are not underpricing.

**Financing Integration** — For large estimates, the AI automatically offers financing options (powered by Stripe or a lending partner) and calculates monthly payment scenarios.

---

### Module 4: AI Repair Validation

This module addresses the customer's deepest fear: "Do I actually need this repair?"

**Diagnostic Confidence Score** — When a technician submits a diagnosis, the AI assigns a confidence score (0–100%) based on: the symptoms described, photos/videos uploaded, equipment age and failure rate data, and historical accuracy of similar diagnoses on the platform. A score below 70% triggers a "second opinion" recommendation.

**Repair Necessity Validator** — The AI analyzes whether the recommended repair is consistent with:
- Manufacturer service bulletins and known failure modes
- Industry-standard diagnostic protocols for the equipment type
- The customer's usage patterns and service history
- Statistical failure rates for the equipment age and model

The result is a plain-English verdict: **"This repair is strongly recommended," "This repair can be deferred 6–12 months," or "A second opinion is advised."**

**Customer Transparency Report** — A PDF/web report generated for the customer after the diagnosis that includes: what was found, why it needs to be fixed (or can wait), what happens if left unaddressed, the price benchmark, and the technician's confidence score. This report is the single most powerful trust-building tool in the platform.

---

### Module 5: Customer AI Report

The Customer AI Report is VonWork's answer to the question every service customer asks: *"Can I trust this?"*

**Report Sections:**
1. **Diagnosis Summary** — Plain-English explanation of what the technician found, with photos
2. **Price Benchmark** — "This repair costs $X–$Y nationally. Your quote of $Z is [below average / at market / above market]."
3. **Urgency Rating** — Fix Now / Fix Soon / Monitor / Optional (color-coded)
4. **Technician Profile** — Star rating, years of experience, certifications, number of jobs completed, customer reviews
5. **Business Profile** — License status, insurance verification, BBB rating, Google reviews aggregated
6. **Recommended Next Steps** — What to watch for after the repair, when to schedule next service, related services to consider
7. **Second Opinion Option** — One-click request for a second opinion from another VonWork-affiliated provider

The report is delivered via SMS/email link immediately after diagnosis. Customers can share it, save it, and reference it for warranty claims.

---

### Module 6: Technician Performance & Coaching

**Technician Scorecard** — Each technician has a live dashboard showing: average ticket size, conversion rate (estimates accepted vs. declined), customer satisfaction score, callback rate (jobs that needed a return visit), on-time arrival rate, and upsell rate.

**AI Post-Job Coaching** — After each job, the AI reviews the job recording (if enabled), the estimate vs. actual, and the customer feedback, then generates a coaching note: "On this job, you could have offered a maintenance plan — the equipment is 8 years old and the customer has no service agreement."

**Upsell Prompt Engine** — During the job, the technician's mobile app surfaces AI-generated upsell prompts based on what they observe: "You mentioned the water heater is 12 years old — the average lifespan is 10–15 years. Would you like to offer a replacement quote?"

**Cross-Referral Engine** — When a technician observes a problem outside their specialty (e.g., an HVAC tech notices the electrical panel looks unsafe), the platform generates a referral to another VonWork-affiliated business in the area. The referring technician earns a referral commission. This is the network flywheel.

**Certification & Training Tracker** — Track technician licenses, certifications, and training completions. AI flags when certifications are expiring and recommends training modules.

---

### Module 7: Reviews & Reputation Management

**Automated Review Requests** — After job completion and payment, the AI sends a personalized SMS/email asking for a review. The message is timed optimally (typically 2–4 hours after job completion) and personalized with the technician's name and job summary.

**Review Routing** — Happy customers (4–5 stars in the internal rating) are directed to Google, Yelp, or Facebook. Unhappy customers (1–3 stars) are routed to an internal feedback form so the business can resolve the issue before it becomes a public review.

**Reputation Dashboard** — Aggregate view of all reviews across platforms, sentiment analysis, response suggestions, and trend tracking.

---

### Module 8: Marketing & Lead Generation

**AI Marketing Campaigns** — Automated campaigns targeting: past customers due for maintenance, customers with aging equipment, seasonal promotions, and reactivation of dormant customers. Mirrors ServiceTitan's Marketing Pro.

**SEO & Local Listings** — AI-optimized Google Business Profile management, local SEO content generation, and citation building.

**Referral Program** — Customer referral program with trackable links, automated reward fulfillment, and leaderboard.

**Lead Capture Widget** — Embeddable booking widget for the business's website, powered by the Smart Booking Engine.

---

## AI Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **LLM Core** | OpenRouter (GPT-4o, Claude Sonnet) | Diagnosis, coaching, report generation, estimate writing |
| **Voice AI** | Telnyx + VonWork Voice Agent | Pre-appointment calls, inbound booking |
| **Pricing Data** | Aggregated from public sources + platform data | Price benchmarking |
| **Document AI** | PDF generation via server-side rendering | Customer AI Reports |
| **Scheduling** | Custom engine + Google Calendar API | Smart booking |
| **Payments** | Stripe | Invoicing, financing, affiliate commissions |

---

## Build Phases

### Phase 1 — FSM Foundation (Current Sprint)
Database schema for jobs, customers, technicians, and service businesses. Job pipeline UI. Basic booking flow. Industry selector.

### Phase 2 — AI Pre-Appointment
AI pre-call agent integration. Job brief generator. Parts pre-staging workflow.

### Phase 3 — Estimate & Pricing Intelligence
Dynamic pricebook. AI estimate builder. Price validation engine. Good/Better/Best pricing tiers.

### Phase 4 — Repair Validation & Customer Report
Diagnostic confidence scoring. Repair necessity validator. Customer AI Report PDF generation.

### Phase 5 — Technician Performance
Scorecard dashboard. Post-job AI coaching. Upsell prompt engine. Cross-referral engine.

### Phase 6 — Reviews & Marketing
Automated review requests. Reputation dashboard. AI marketing campaigns. Lead capture widget.

### Phase 7 — Industry Expansion
Automotive, medical, and professional service verticals with industry-specific diagnostic protocols.

### Phase 8 — Marketplace & Network
VonWork service provider directory. Customer-facing search and booking. Affiliate referral network integration.

---

## Competitive Positioning

| Feature | ServiceTitan | VonWork |
|---|---|---|
| Industries | Trades only (25 verticals) | All service industries (50+ verticals) |
| AI Pre-Call | Contact Center Pro (add-on) | Built-in, included |
| Customer Transparency Report | Not available | Core feature |
| Repair Validation | Not available | Core feature |
| Price Benchmarking | Pricebook Pro (internal only) | Market-validated, customer-facing |
| Cross-Referral Network | Not available | Built-in affiliate engine |
| Affiliate/Agency Channel | Not available | Core go-to-market |
| White Label | Not available | Full white-label for agencies |
| Pricing | $200–$600+/mo per location | Subscription + credit-based |

---

## Success Metrics

The platform will be measured against these KPIs for each service business on the platform:

- **Booking rate** — % of inbound inquiries that convert to booked jobs (target: +15% vs. baseline)
- **Average ticket size** — Revenue per completed job (target: +20% via AI upsell prompts)
- **Customer satisfaction score** — Post-job NPS (target: 4.5+ stars average)
- **Technician utilization** — % of available hours spent on billable work (target: 85%+)
- **Callback rate** — % of jobs requiring a return visit (target: <5%)
- **Referral conversion** — % of cross-referral suggestions that result in a booked job (target: 20%+)
- **Review acquisition rate** — % of completed jobs that generate a public review (target: 30%+)

---

*This document is a living roadmap. Features will be prioritized based on affiliate feedback, customer demand, and competitive intelligence. Updated monthly.*
