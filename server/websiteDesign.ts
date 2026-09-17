export type WebsiteSource = {
  title: string;
  text: string;
  url: string;
  heroImage?: string;
  colorScheme?: "blue" | "green" | "purple" | "red" | "orange" | "teal" | "auto";
};

type IndustryDesign = {
  id: string;
  label: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
};

const INDUSTRIES: Array<{ pattern: RegExp; design: IndustryDesign }> = [
  {
    pattern: /dent|orthodont|medical|clinic|chiropr|therapy|veterinar|optometr|dermat|wellness|health/i,
    design: {
      id: "care",
      label: "Care & Wellness",
      eyebrow: "A better experience starts here",
      headline: "Feel confident about your next step.",
      subhead: "Clear information, thoughtful service, and an easier way to connect with the team.",
      primary: "#071a2f",
      secondary: "#087e8b",
      accent: "#5eead4",
      glow: "#22d3ee",
    },
  },
  {
    pattern: /hvac|plumb|electric|roof|garage|tree|landscap|pest|clean|paint|floor|fence|concrete|locksmith|moving|junk/i,
    design: {
      id: "home-service",
      label: "Local Service",
      eyebrow: "Skilled help. Straightforward service.",
      headline: "The right team for the work that matters.",
      subhead: "Explore the service, connect quickly, and get the information you need to move forward.",
      primary: "#101827",
      secondary: "#f97316",
      accent: "#facc15",
      glow: "#fb923c",
    },
  },
  {
    pattern: /auto|collision|dealer|towing|detail|repair shop|mechanic/i,
    design: {
      id: "automotive",
      label: "Automotive",
      eyebrow: "Built for the road ahead",
      headline: "Service that keeps you moving.",
      subhead: "A sharper, simpler way to understand your options and connect with the right team.",
      primary: "#090b10",
      secondary: "#dc2626",
      accent: "#fbbf24",
      glow: "#ef4444",
    },
  },
  {
    pattern: /salon|barber|nail|spa|massage|beauty|fitness|trainer|studio/i,
    design: {
      id: "lifestyle",
      label: "Lifestyle",
      eyebrow: "Designed around you",
      headline: "Make time for what feels extraordinary.",
      subhead: "Discover a more polished way to explore services, connect, and plan your visit.",
      primary: "#251335",
      secondary: "#db2777",
      accent: "#f9a8d4",
      glow: "#c084fc",
    },
  },
  {
    pattern: /law|account|bookkeep|tax|insurance|mortgage|financial|consult|recruit|staffing|property management|real estate/i,
    design: {
      id: "professional",
      label: "Professional Services",
      eyebrow: "Clarity creates momentum",
      headline: "Confident decisions start with a better conversation.",
      subhead: "Understand the service, meet the team, and take the next step with clarity.",
      primary: "#09162b",
      secondary: "#1d4ed8",
      accent: "#f5c96a",
      glow: "#60a5fa",
    },
  },
  {
    pattern: /restaurant|cater|venue|wedding|food|dining|chef/i,
    design: {
      id: "hospitality",
      label: "Hospitality",
      eyebrow: "A memorable experience begins here",
      headline: "Come for the moment. Remember the experience.",
      subhead: "Explore what makes this place distinctive and make your next visit feel effortless.",
      primary: "#26120f",
      secondary: "#b45309",
      accent: "#fde68a",
      glow: "#f59e0b",
    },
  },
];

const COLOR_OVERRIDES: Record<string, Pick<IndustryDesign, "secondary" | "accent" | "glow">> = {
  blue: { secondary: "#2563eb", accent: "#67e8f9", glow: "#38bdf8" },
  green: { secondary: "#059669", accent: "#86efac", glow: "#34d399" },
  purple: { secondary: "#7c3aed", accent: "#d8b4fe", glow: "#a78bfa" },
  red: { secondary: "#dc2626", accent: "#fca5a5", glow: "#f87171" },
  orange: { secondary: "#ea580c", accent: "#fdba74", glow: "#fb923c" },
  teal: { secondary: "#0f766e", accent: "#5eead4", glow: "#2dd4bf" },
};

const DEFAULT_DESIGN: IndustryDesign = {
  id: "modern-business",
  label: "Modern Business",
  eyebrow: "Built around what matters",
  headline: "A remarkable experience starts with one clear step.",
  subhead: "Discover what the team offers, get the answers you need, and move forward with confidence.",
  primary: "#07152d",
  secondary: "#2563eb",
  accent: "#67e8f9",
  glow: "#22d3ee",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeExternalUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function detectWebsiteIndustry(source: Pick<WebsiteSource, "title" | "text">): IndustryDesign {
  const corpus = `${source.title} ${source.text}`.slice(0, 9000);
  return INDUSTRIES.find((entry) => entry.pattern.test(corpus))?.design ?? DEFAULT_DESIGN;
}

function designFor(source: WebsiteSource): IndustryDesign {
  const detected = detectWebsiteIndustry(source);
  const override = source.colorScheme && source.colorScheme !== "auto" ? COLOR_OVERRIDES[source.colorScheme] : null;
  return override ? { ...detected, ...override } : detected;
}

function extractContact(text: string) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] ?? "";
  return { email, phone };
}

function cleanSourceSummary(text: string): string {
  const cleaned = text
    .replace(/cookie|privacy policy|terms of use|skip to content/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) ?? [];
  const useful = sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 45 && sentence.length <= 180)
    .slice(0, 2)
    .join(" ");
  return useful || "Explore the services, learn what makes the team different, and find the best way to get started.";
}

export function buildPremiumWebsitePrompt(source: WebsiteSource): string {
  const design = designFor(source);
  const heroImage = safeExternalUrl(source.heroImage);
  return `You are the creative director and senior front-end engineer for an award-winning conversion design studio. Rebuild the supplied business website into a distinctive, cinematic, high-converting one-page experience. It must feel custom-made for the business—not like a generic SaaS template.

SOURCE
URL: ${source.url}
TITLE: ${source.title}
EXTRACTED CONTENT:
${source.text}
${heroImage ? `APPROVED SOURCE HERO IMAGE: ${heroImage}` : "No approved source image is available. Create visual impact with CSS gradients, geometry, texture, and typography instead of inventing image URLs."}

CREATIVE DIRECTION
- Detected design archetype: ${design.label} (${design.id}).
- Palette: deep base ${design.primary}, primary accent ${design.secondary}, highlight ${design.accent}, glow ${design.glow}.
- Use a bold asymmetric editorial hero, expressive typography, layered depth, luminous gradients, subtle grid/noise texture, floating detail cards, and an overlapping trust/action strip.
- Follow the hero with a visually varied bento services section, an outcome/process narrative, a strong contact CTA, and a refined footer. Avoid a repetitive centered headline + three identical cards layout.
- Use generous whitespace and contrast. The design should feel premium and energetic, not crowded or gimmicky.

STRICT OUTPUT CONTRACT
1. Return ONLY complete valid HTML beginning with <!DOCTYPE html>. No markdown, code fences, or explanation.
2. Put all CSS in one <style> tag and all JavaScript in one small inline <script> at the end. No frameworks or external JavaScript.
3. Google Fonts may be loaded via CDN. Use a distinctive display/sans pairing such as Manrope + DM Sans, Space Grotesk + Inter, or Syne + Manrope.
4. Use CSS custom properties, clamp() typography, responsive grids, visible focus states, semantic landmarks, and accessible color contrast.
5. Include a compact sticky navigation with a mobile menu, asymmetric hero, 4–6 service/value cards based ONLY on source content, a process or benefit section, contact section using real contact details when available, and footer.
6. Add premium motion: reveal transitions, subtle hover lift, animated gradient orbs, and one lightweight pointer spotlight. Respect prefers-reduced-motion and never animate layout properties.
7. If the approved source hero image is present, use it in a high-impact masked or framed visual. Otherwise use polished CSS art. Do not invent or hotlink stock-image URLs.
8. Preserve truthful business facts. Do NOT fabricate testimonials, reviews, star ratings, customer counts, certifications, awards, years in business, prices, guarantees, or performance statistics.
9. Do not use lorem ipsum, placeholder contact details, fake logos, or fake social proof.
10. Include a floating AI Messaging button and hidden panel with id="vonwork-chat-panel". The demo panel must remain locked and clearly say "AI Messaging — $199/month" with website chatbot and limited AI phone answering. Do not imply it is active.
11. Add a subtle "Rebuilt by VonWork AI" footer label.
12. Add data-vonwork-design="premium-v2" to <html>. Keep total HTML concise enough to load quickly and work inside an iframe.

Generate the complete site now.`;
}

export function validateGeneratedWebsiteHtml(html: string): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const normalized = html.toLowerCase();
  if (!normalized.startsWith("<!doctype html")) reasons.push("missing-doctype");
  if (html.length < 10_000) reasons.push("too-short-for-premium-layout");
  if (!normalized.includes("<meta name=\"viewport\"")) reasons.push("missing-viewport");
  if (!normalized.includes("<style")) reasons.push("missing-styles");
  if (!normalized.includes('data-vonwork-design="premium-v2"')) reasons.push("missing-premium-marker");
  if ((normalized.match(/<section/g) ?? []).length < 4) reasons.push("insufficient-section-variety");
  const responsiveGridCount = (normalized.match(/grid-template-columns/g) ?? []).length;
  if (!normalized.includes("bento") && responsiveGridCount < 2) reasons.push("insufficient-layout-variety");
  if (!normalized.includes("backdrop-filter")) reasons.push("missing-layered-depth");
  if (!normalized.includes("clamp(")) reasons.push("missing-responsive-type-scale");
  if (!normalized.includes("vonwork-chat-panel")) reasons.push("missing-chat-panel");
  if (!normalized.includes("prefers-reduced-motion")) reasons.push("missing-reduced-motion");
  if (/lorem ipsum|john doe|555-\d{4}/i.test(html)) reasons.push("placeholder-content");
  if (/customer testimonials|five[- ]star|5[- ]star|rated 5/i.test(html)) reasons.push("unverified-social-proof");
  return { valid: reasons.length === 0, reasons };
}

export function buildPremiumFallbackHtml(businessNameRaw: string, source: WebsiteSource): string {
  const businessName = escapeHtml(businessNameRaw || "Your Business");
  const design = designFor(source);
  const originalUrl = safeExternalUrl(source.url) ?? "#";
  const heroImage = safeExternalUrl(source.heroImage);
  const { email, phone } = extractContact(source.text);
  const summary = escapeHtml(cleanSourceSummary(source.text));
  const contactLink = phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : email ? `mailto:${email}` : "#contact";
  const contactLabel = phone ? escapeHtml(phone) : email ? escapeHtml(email) : "Start a conversation";
  const year = new Date().getFullYear();
  const visualMedia = heroImage
    ? `<img class="hero-photo" src="${escapeHtml(heroImage)}" alt="${businessName}" loading="eager" referrerpolicy="no-referrer"><div class="photo-shade"></div>`
    : `<div class="orb orb-one"></div><div class="orb orb-two"></div><div class="visual-grid"></div><div class="signal"><span></span><span></span><span></span><span></span><span></span></div>`;

  return `<!DOCTYPE html>
<html lang="en" data-vonwork-design="premium-v2" data-industry="${design.id}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Discover ${businessName} and connect with the team.">
  <title>${businessName} | A Better Way Forward</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root{--ink:${design.primary};--brand:${design.secondary};--accent:${design.accent};--glow:${design.glow};--paper:#f8fafc;--white:#fff;--muted:#617087;--line:rgba(15,23,42,.11);--ease:cubic-bezier(.23,1,.32,1)}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:"DM Sans",system-ui,sans-serif;color:var(--ink);background:var(--paper);overflow-x:hidden}a{color:inherit}button,a{transition:transform .18s var(--ease),box-shadow .22s var(--ease),background .22s var(--ease)}button:active,.button:active{transform:scale(.97)}:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
    .site-shell{position:relative;isolation:isolate}.grain{position:fixed;inset:0;z-index:20;pointer-events:none;opacity:.045;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E")}
    .nav{position:fixed;top:18px;left:50%;transform:translateX(-50%);width:min(1160px,calc(100% - 28px));z-index:50;display:flex;align-items:center;justify-content:space-between;padding:12px 14px 12px 20px;border:1px solid rgba(255,255,255,.22);border-radius:18px;background:rgba(7,21,45,.72);backdrop-filter:blur(18px);box-shadow:0 18px 60px rgba(2,8,23,.2);color:#fff}.brand{display:flex;align-items:center;gap:11px;text-decoration:none;font-family:Manrope,sans-serif;font-weight:800;letter-spacing:-.03em}.brand-mark{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,var(--accent),var(--brand));display:grid;place-items:center;box-shadow:0 0 30px color-mix(in srgb,var(--glow) 46%,transparent)}.brand-mark:after{content:"";width:12px;height:12px;border:2px solid var(--ink);border-radius:50%;box-shadow:7px -5px 0 -4px var(--ink)}.nav-links{display:flex;align-items:center;gap:24px}.nav-links a{text-decoration:none;font-size:.92rem;font-weight:700;color:rgba(255,255,255,.78)}.nav-links a:hover{color:#fff}.nav-cta{padding:11px 17px;border-radius:12px!important;background:var(--accent);color:var(--ink)!important;box-shadow:0 10px 28px color-mix(in srgb,var(--accent) 25%,transparent)}
    .hero{position:relative;min-height:800px;padding:150px max(24px,calc((100vw - 1160px)/2)) 120px;background:radial-gradient(circle at 78% 20%,color-mix(in srgb,var(--glow) 24%,transparent),transparent 31%),linear-gradient(135deg,var(--ink) 0%,color-mix(in srgb,var(--ink) 88%,var(--brand)) 55%,#030712 100%);color:#fff;overflow:hidden}.hero:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:54px 54px;mask-image:linear-gradient(to bottom,#000,transparent 84%)}.hero-inner{position:relative;z-index:2;display:grid;grid-template-columns:1.08fr .92fr;gap:64px;align-items:center;max-width:1160px;margin:auto}.eyebrow{display:inline-flex;align-items:center;gap:9px;padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);font:700 .77rem Manrope,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}.eyebrow-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 16px var(--accent)}h1{font:800 clamp(3.4rem,7vw,6.7rem)/.94 Manrope,sans-serif;letter-spacing:-.068em;margin:28px 0 24px;max-width:760px}.gradient-word{display:block;color:transparent;background:linear-gradient(90deg,#fff 0%,var(--accent) 45%,var(--glow) 100%);-webkit-background-clip:text;background-clip:text}.hero-copy{max-width:610px;font-size:clamp(1.05rem,1.7vw,1.28rem);line-height:1.72;color:rgba(255,255,255,.72)}.hero-actions{display:flex;flex-wrap:wrap;gap:13px;margin-top:34px}.button{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:0 24px;border-radius:15px;text-decoration:none;font-weight:800}.button-primary{background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 58%,#fff));color:var(--ink);box-shadow:0 16px 45px color-mix(in srgb,var(--glow) 26%,transparent)}.button-primary:hover{transform:translateY(-3px);box-shadow:0 24px 60px color-mix(in srgb,var(--glow) 38%,transparent)}.button-ghost{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff}.button-ghost:hover{background:rgba(255,255,255,.12);transform:translateY(-2px)}
    .hero-visual{position:relative;min-height:510px;border-radius:34px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.035));box-shadow:0 40px 120px rgba(0,0,0,.36);overflow:hidden;transform:perspective(1000px) rotateY(-4deg) rotateX(2deg)}.hero-visual:after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 1px rgba(255,255,255,.25);pointer-events:none}.hero-photo{width:100%;height:100%;min-height:510px;object-fit:cover;display:block}.photo-shade{position:absolute;inset:0;background:linear-gradient(to top,var(--ink),transparent 64%)}.orb{position:absolute;border-radius:50%;filter:blur(2px)}.orb-one{width:330px;height:330px;right:-70px;top:-65px;background:radial-gradient(circle at 35% 35%,#fff,var(--accent) 18%,var(--brand) 52%,transparent 72%);opacity:.92;animation:float 7s ease-in-out infinite}.orb-two{width:210px;height:210px;left:20px;bottom:15px;border:44px solid color-mix(in srgb,var(--glow) 38%,transparent);box-shadow:0 0 80px color-mix(in srgb,var(--glow) 24%,transparent);animation:float 9s ease-in-out infinite reverse}.visual-grid{position:absolute;inset:0;background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.12)),radial-gradient(circle at 30% 70%,rgba(255,255,255,.12) 0 2px,transparent 3px);background-size:auto,24px 24px}.signal{position:absolute;left:38px;right:38px;bottom:40px;display:flex;align-items:end;gap:10px;height:95px}.signal span{flex:1;border-radius:10px;background:linear-gradient(to top,var(--brand),var(--accent));box-shadow:0 0 30px color-mix(in srgb,var(--glow) 25%,transparent);animation:pulse 2.4s ease-in-out infinite}.signal span:nth-child(1){height:32%}.signal span:nth-child(2){height:67%;animation-delay:.1s}.signal span:nth-child(3){height:46%;animation-delay:.2s}.signal span:nth-child(4){height:88%;animation-delay:.3s}.signal span:nth-child(5){height:58%;animation-delay:.4s}.floating-card{position:absolute;z-index:3;padding:16px 18px;border-radius:17px;border:1px solid rgba(255,255,255,.2);background:rgba(8,20,43,.78);backdrop-filter:blur(14px);box-shadow:0 18px 45px rgba(0,0,0,.24)}.floating-card strong{display:block;font:800 1rem Manrope,sans-serif}.floating-card span{display:block;margin-top:3px;color:rgba(255,255,255,.62);font-size:.8rem}.card-top{right:-22px;top:45px}.card-bottom{left:-28px;bottom:42px}
    .quick-strip{position:relative;z-index:4;width:min(1080px,calc(100% - 32px));margin:-54px auto 0;padding:18px;display:grid;grid-template-columns:repeat(3,1fr);border-radius:24px;background:#fff;box-shadow:0 28px 80px rgba(15,23,42,.15);border:1px solid var(--line)}.quick-item{display:flex;align-items:center;gap:14px;padding:14px 22px}.quick-item+ .quick-item{border-left:1px solid var(--line)}.quick-icon{width:42px;height:42px;flex:none;border-radius:14px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 20%,#fff);color:var(--brand);font-weight:900}.quick-item strong{display:block;font:800 .96rem Manrope,sans-serif}.quick-item span{display:block;margin-top:3px;color:var(--muted);font-size:.82rem}
    .section{padding:120px 24px}.container{max-width:1160px;margin:auto}.section-label{font:800 .78rem Manrope,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--brand)}.section-title{font:800 clamp(2.4rem,5vw,4.7rem)/1 Manrope,sans-serif;letter-spacing:-.055em;max-width:810px;margin:16px 0 18px}.section-intro{max-width:690px;font-size:1.08rem;line-height:1.75;color:var(--muted)}.bento{display:grid;grid-template-columns:1.15fr .85fr .85fr;grid-auto-rows:minmax(210px,auto);gap:18px;margin-top:54px}.bento-card{position:relative;overflow:hidden;padding:30px;border:1px solid var(--line);border-radius:26px;background:#fff;box-shadow:0 18px 55px rgba(15,23,42,.07)}.bento-card:first-child{grid-row:span 2;background:linear-gradient(145deg,var(--ink),color-mix(in srgb,var(--ink) 76%,var(--brand)));color:#fff}.bento-card:nth-child(4){grid-column:span 2;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 25%,#fff),#fff)}.bento-card:hover{transform:translateY(-7px);box-shadow:0 28px 70px rgba(15,23,42,.13)}.card-number{font:800 .76rem Manrope,sans-serif;letter-spacing:.13em;color:var(--brand)}.bento-card:first-child .card-number{color:var(--accent)}.bento-card h3{font:800 clamp(1.35rem,2vw,2rem)/1.12 Manrope,sans-serif;letter-spacing:-.035em;margin:52px 0 13px}.bento-card p{line-height:1.68;color:var(--muted);max-width:420px}.bento-card:first-child p{color:rgba(255,255,255,.68)}.halo{position:absolute;width:230px;height:230px;border-radius:50%;right:-80px;top:-80px;background:radial-gradient(circle,var(--glow),transparent 68%);opacity:.35}
    .story{background:var(--ink);color:#fff;position:relative;overflow:hidden}.story:before{content:"";position:absolute;width:600px;height:600px;border:130px solid color-mix(in srgb,var(--brand) 28%,transparent);border-radius:50%;right:-240px;top:-250px}.story-grid{position:relative;display:grid;grid-template-columns:.8fr 1.2fr;gap:90px;align-items:start}.story-copy{font-size:clamp(1.55rem,3vw,2.8rem);font-family:Manrope,sans-serif;font-weight:700;line-height:1.25;letter-spacing:-.04em}.steps{display:grid;gap:18px}.step{display:grid;grid-template-columns:48px 1fr;gap:18px;padding:22px;border-radius:20px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055)}.step-index{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:var(--accent);color:var(--ink);font-weight:900}.step h3{margin:1px 0 7px;font:800 1.05rem Manrope,sans-serif}.step p{margin:0;color:rgba(255,255,255,.62);line-height:1.55}
    .contact-wrap{position:relative;overflow:hidden;border-radius:34px;padding:clamp(38px,7vw,84px);background:linear-gradient(135deg,color-mix(in srgb,var(--brand) 92%,#000),var(--ink));color:#fff;box-shadow:0 30px 100px color-mix(in srgb,var(--brand) 20%,transparent)}.contact-wrap:before{content:"";position:absolute;width:400px;height:400px;border-radius:50%;right:-120px;bottom:-220px;background:var(--accent);filter:blur(80px);opacity:.32}.contact-grid{position:relative;display:grid;grid-template-columns:1fr auto;gap:40px;align-items:end}.contact-wrap h2{font:800 clamp(2.7rem,5vw,5rem)/.98 Manrope,sans-serif;letter-spacing:-.06em;margin:14px 0 16px;max-width:780px}.contact-wrap p{max-width:650px;color:rgba(255,255,255,.68);font-size:1.05rem;line-height:1.7}.contact-link{white-space:nowrap}
    footer{padding:34px 24px;background:#030712;color:rgba(255,255,255,.62)}.footer-inner{max-width:1160px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:24px;font-size:.82rem}.footer-inner a{color:rgba(255,255,255,.7)}.vonwork-mark{color:var(--accent);font-weight:700}
    .chat-btn{position:fixed;right:22px;bottom:22px;z-index:70;width:62px;height:62px;border:0;border-radius:20px;background:linear-gradient(135deg,var(--brand),var(--glow));color:#fff;box-shadow:0 18px 55px color-mix(in srgb,var(--glow) 40%,transparent);font-size:0;cursor:pointer}.chat-btn:before,.chat-btn:after{content:"";position:absolute;background:#fff;border-radius:50%;top:27px;width:5px;height:5px}.chat-btn:before{left:21px;box-shadow:9px 0 #fff,18px 0 #fff}.chat-btn:after{width:26px;height:20px;left:18px;top:20px;background:transparent;border:2px solid #fff;border-radius:8px}.chat-panel{position:fixed;right:22px;bottom:96px;z-index:69;width:min(360px,calc(100vw - 28px));display:none;overflow:hidden;border-radius:24px;border:1px solid var(--line);background:#fff;box-shadow:0 28px 90px rgba(2,8,23,.27)}.chat-panel.open{display:block}.chat-header{padding:18px 20px;background:var(--ink);color:#fff;font:800 .98rem Manrope,sans-serif}.chat-lock{padding:28px;text-align:left}.chat-lock strong{display:block;font:800 1.25rem Manrope,sans-serif;margin-bottom:8px}.chat-lock p{color:var(--muted);line-height:1.6;margin:0 0 18px}.chat-lock .button{width:100%;min-height:48px;background:var(--brand);color:#fff}.powered{display:block;text-align:center;margin-top:14px;color:#94a3b8;font-size:.72rem}
    .reveal{opacity:1;transform:none;transition:transform .7s var(--ease),filter .7s var(--ease)}.reveal.visible{transform:none}.reveal:hover{filter:brightness(1.015)}@keyframes float{50%{transform:translateY(-16px) rotate(3deg)}}@keyframes pulse{50%{filter:brightness(1.45);transform:scaleY(.92)}}
    @media(max-width:900px){.nav-links a:not(.nav-cta){display:none}.hero{min-height:auto;padding-top:130px}.hero-inner,.story-grid,.contact-grid{grid-template-columns:1fr}.hero-visual{min-height:400px;transform:none}.hero-photo{min-height:400px}.card-top{right:14px}.card-bottom{left:14px}.quick-strip{grid-template-columns:1fr}.quick-item+ .quick-item{border-left:0;border-top:1px solid var(--line)}.bento{grid-template-columns:1fr 1fr}.bento-card:first-child{grid-row:auto;grid-column:span 2}.bento-card:nth-child(4){grid-column:span 2}.contact-link{justify-self:start}}
    @media(max-width:620px){.nav{top:10px}.hero{padding-left:20px;padding-right:20px;padding-bottom:90px}h1{font-size:clamp(3rem,16vw,4.5rem)}.hero-actions{flex-direction:column}.button{width:100%}.hero-visual{min-height:330px}.hero-photo{min-height:330px}.floating-card{padding:12px}.card-top{top:18px}.card-bottom{bottom:18px}.section{padding:84px 20px}.bento{grid-template-columns:1fr}.bento-card:first-child,.bento-card:nth-child(4){grid-column:auto}.footer-inner{align-items:flex-start;flex-direction:column}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
  </style>
</head>
<body>
  <div class="site-shell">
    <div class="grain" aria-hidden="true"></div>
    <nav class="nav" aria-label="Primary navigation">
      <a class="brand" href="#top"><span class="brand-mark" aria-hidden="true"></span>${businessName}</a>
      <div class="nav-links"><a href="#services">Explore</a><a href="#approach">Approach</a><a class="nav-cta" href="#contact">Contact</a></div>
    </nav>
    <main id="top">
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-content reveal">
            <span class="eyebrow"><span class="eyebrow-dot"></span>${escapeHtml(design.eyebrow)}</span>
            <h1>${businessName}<span class="gradient-word">${escapeHtml(design.headline)}</span></h1>
            <p class="hero-copy">${summary}</p>
            <div class="hero-actions"><a class="button button-primary" href="${escapeHtml(contactLink)}">${contactLabel}<span aria-hidden="true">→</span></a><a class="button button-ghost" href="#services">See what’s possible</a></div>
          </div>
          <div class="hero-visual reveal" aria-label="${businessName} visual">
            ${visualMedia}
            <div class="floating-card card-top"><strong>${escapeHtml(design.label)}</strong><span>A more polished experience</span></div>
            <div class="floating-card card-bottom"><strong>Easy to explore</strong><span>Designed for every screen</span></div>
          </div>
        </div>
      </section>
      <div class="quick-strip reveal" aria-label="Quick actions">
        <div class="quick-item"><span class="quick-icon">01</span><div><strong>Explore the service</strong><span>Find the information that matters</span></div></div>
        <div class="quick-item"><span class="quick-icon">02</span><div><strong>Connect directly</strong><span>Reach the team in fewer steps</span></div></div>
        <div class="quick-item"><span class="quick-icon">03</span><div><strong>Move forward</strong><span>Choose the next step that fits</span></div></div>
      </div>
      <section class="section" id="services">
        <div class="container">
          <span class="section-label reveal">The experience</span>
          <h2 class="section-title reveal">Everything you need, without the friction.</h2>
          <p class="section-intro reveal">${summary}</p>
          <div class="bento">
            <article class="bento-card reveal"><div class="halo"></div><span class="card-number">FEATURE 01</span><h3>Start with clarity</h3><p>Understand the available options and find the right direction before taking the next step.</p></article>
            <article class="bento-card reveal"><span class="card-number">FEATURE 02</span><h3>Built around your needs</h3><p>A focused experience that makes important information easier to find.</p></article>
            <article class="bento-card reveal"><span class="card-number">FEATURE 03</span><h3>Connect with confidence</h3><p>Use the direct contact options to ask questions and plan what comes next.</p></article>
            <article class="bento-card reveal"><span class="card-number">FEATURE 04</span><h3>A modern experience on every screen</h3><p>Thoughtful structure, clear calls to action, and a fast mobile-friendly layout.</p></article>
          </div>
        </div>
      </section>
      <section class="section story" id="approach">
        <div class="container story-grid">
          <div><span class="section-label reveal" style="color:var(--accent)">A simpler path</span><p class="story-copy reveal">From first question to next step, the experience stays focused and clear.</p></div>
          <div class="steps">
            <article class="step reveal"><span class="step-index">1</span><div><h3>Discover</h3><p>Explore the information and options relevant to what you need.</p></div></article>
            <article class="step reveal"><span class="step-index">2</span><div><h3>Connect</h3><p>Reach the team directly when you are ready to ask a question.</p></div></article>
            <article class="step reveal"><span class="step-index">3</span><div><h3>Take the next step</h3><p>Move forward with the context and support you need.</p></div></article>
          </div>
        </div>
      </section>
      <section class="section" id="contact">
        <div class="container contact-wrap reveal">
          <div class="contact-grid"><div><span class="section-label" style="color:var(--accent)">Let’s connect</span><h2>Ready when you are.</h2><p>Start a conversation with ${businessName} and find the right next step.</p></div><a class="button button-primary contact-link" href="${escapeHtml(contactLink)}">${contactLabel}<span aria-hidden="true">→</span></a></div>
        </div>
      </section>
    </main>
    <footer><div class="footer-inner"><span>© ${year} ${businessName}. All rights reserved.</span><span><span class="vonwork-mark">Rebuilt by VonWork AI</span> · <a href="${escapeHtml(originalUrl)}">Original site</a></span></div></footer>
    <button class="chat-btn" type="button" aria-label="Open AI Messaging information" aria-controls="vonwork-chat-panel" aria-expanded="false"></button>
    <aside class="chat-panel" id="vonwork-chat-panel" aria-label="AI Messaging upgrade"><div class="chat-header">AI Messaging</div><div class="chat-lock"><strong>Turn conversations into opportunities.</strong><p>Website chatbot and limited AI phone answering are included with AI Messaging.</p><a class="button" href="#contact">Add AI Messaging — $199/month</a><small class="powered">Powered by VonWork AI</small></div></aside>
  </div>
  <script>
    const chatButton=document.querySelector('.chat-btn');const chatPanel=document.getElementById('vonwork-chat-panel');chatButton.addEventListener('click',()=>{const open=chatPanel.classList.toggle('open');chatButton.setAttribute('aria-expanded',String(open))});
    const revealObserver=new IntersectionObserver((entries)=>entries.forEach((entry)=>{if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach((element)=>revealObserver.observe(element));
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.addEventListener('pointermove',(event)=>{document.documentElement.style.setProperty('--pointer-x',event.clientX+'px');document.documentElement.style.setProperty('--pointer-y',event.clientY+'px')},{passive:true})}
  </script>
</body>
</html>`;
}
