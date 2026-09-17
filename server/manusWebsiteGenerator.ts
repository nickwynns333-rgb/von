import { invokeLLM, listLLMModels } from "./_core/llm";
import {
  buildPremiumFallbackHtml,
  buildPremiumWebsitePrompt,
  detectWebsiteIndustry,
  validateGeneratedWebsiteHtml,
  type WebsiteSource,
} from "./websiteDesign";

export type WebsiteCreativeBrief = {
  industry: string;
  audience: string;
  positioning: string;
  tone: string;
  visualConcept: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryAction: string;
  secondaryAction: string;
  paletteDirection: string;
  typographyDirection: string;
  sectionSequence: string[];
  approvedClaims: string[];
  prohibitedClaims: string[];
};

export type ManusWebsiteResult = {
  html: string;
  status: "MANUS_GENERATED" | "FALLBACK_DEMO";
  engine: "MANUS_INTERNAL" | "PREMIUM_FALLBACK";
  model: string;
  qualityStatus: "accepted" | "fallback";
  creativeBrief: WebsiteCreativeBrief | null;
  fallbackReason?: string;
};

const BRIEF_MODEL_PREFERENCE = ["claude-haiku-4-5", "gpt-5-mini", "gemini-3-flash-preview"];
const DESIGN_MODEL_PREFERENCE = ["claude-sonnet-4-6", "gpt-5", "gemini-3.1-pro-preview"];
let cachedModelIds: string[] | null = null;

async function availableModelIds(): Promise<string[]> {
  if (cachedModelIds) return cachedModelIds;
  try {
    const catalog = await listLLMModels();
    cachedModelIds = catalog.data.map((model) => model.id);
  } catch {
    cachedModelIds = [...BRIEF_MODEL_PREFERENCE, ...DESIGN_MODEL_PREFERENCE];
  }
  return cachedModelIds;
}

async function selectModel(preference: string[]): Promise<string> {
  const available = await availableModelIds();
  return preference.find((id) => available.includes(id)) ?? preference[0];
}

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part && typeof part === "object" && "text" in part ? String((part as { text: unknown }).text) : ""))
      .join("");
  }
  return "";
}

function cleanHtml(content: unknown): string {
  return textContent(content)
    .replace(/^```html\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function stabilizePreviewVisibility(html: string): string {
  if (!html || html.includes('id="vonwork-preview-visibility"')) return html;
  const safetyStyle = `<style id="vonwork-preview-visibility">
    .reveal,[data-reveal],.fade-up,.fade-in,.animate-in{opacity:1!important;visibility:visible!important;transform:none!important}
  </style>`;
  return html.includes("</head>") ? html.replace("</head>", `${safetyStyle}</head>`) : `${safetyStyle}${html}`;
}

function parseBrief(content: unknown): WebsiteCreativeBrief {
  const parsed = JSON.parse(textContent(content)) as WebsiteCreativeBrief;
  if (!parsed.heroHeadline || !parsed.visualConcept || !Array.isArray(parsed.sectionSequence)) {
    throw new Error("Internal creative brief was incomplete");
  }
  return parsed;
}

function fallbackCreativeBrief(source: WebsiteSource): WebsiteCreativeBrief {
  const design = detectWebsiteIndustry(source);
  const approvedClaims = source.text
    .split(/[\n.!?]+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12 && line.length <= 160)
    .slice(0, 8);
  return {
    industry: design.label,
    audience: `People evaluating ${source.title || design.label} services`,
    positioning: `${source.title || design.label} presented with clarity, confidence, and a direct path to contact`,
    tone: "Specific, confident, human, and action-oriented",
    visualConcept: `${design.label} editorial storytelling with a distinctive ${design.secondary} accent and service-specific visual cues`,
    heroEyebrow: design.eyebrow,
    heroHeadline: source.title && source.title.length > 3 ? `${source.title}, made easier to explore.` : design.headline,
    heroSubheadline: design.subhead,
    primaryAction: "Contact the team",
    secondaryAction: "Explore services",
    paletteDirection: `${design.primary}, ${design.secondary}, ${design.accent}, and warm neutral surfaces`,
    typographyDirection: "Editorial geometric display type paired with a highly legible interface sans serif",
    sectionSequence: ["hero", "service overview", "approach", "source-backed details", "contact"],
    approvedClaims,
    prohibitedClaims: ["Unverified reviews", "Unverified ratings", "Invented statistics", "Invented awards", "Invented credentials", "Invented prices"],
  };
}

async function createCreativeBrief(source: WebsiteSource): Promise<{ brief: WebsiteCreativeBrief; model: string }> {
  const model = await selectModel(BRIEF_MODEL_PREFERENCE);
  try {
    const response = await invokeLLM({
    model,
    maxTokens: 3200,
    messages: [
      {
        role: "system",
        content:
          "You are a brand strategist for a high-end web design studio. Extract only supported business facts and create a distinctive conversion-focused creative brief. Never invent reviews, ratings, statistics, awards, credentials, prices, guarantees, years in business, client names, or locations.",
      },
      {
        role: "user",
        content: `Create the website creative brief for this source.\n\nURL: ${source.url}\nTITLE: ${source.title}\nCONTENT:\n${source.text.slice(0, 7000)}\n\nThe result must feel specific to this business and industry, not like a generic SaaS landing page.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "website_creative_brief",
        strict: true,
        schema: {
          type: "object",
          properties: {
            industry: { type: "string" },
            audience: { type: "string" },
            positioning: { type: "string" },
            tone: { type: "string" },
            visualConcept: { type: "string" },
            heroEyebrow: { type: "string" },
            heroHeadline: { type: "string" },
            heroSubheadline: { type: "string" },
            primaryAction: { type: "string" },
            secondaryAction: { type: "string" },
            paletteDirection: { type: "string" },
            typographyDirection: { type: "string" },
            sectionSequence: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 8 },
            approvedClaims: { type: "array", items: { type: "string" }, maxItems: 12 },
            prohibitedClaims: { type: "array", items: { type: "string" }, minItems: 5 },
          },
          required: [
            "industry",
            "audience",
            "positioning",
            "tone",
            "visualConcept",
            "heroEyebrow",
            "heroHeadline",
            "heroSubheadline",
            "primaryAction",
            "secondaryAction",
            "paletteDirection",
            "typographyDirection",
            "sectionSequence",
            "approvedClaims",
            "prohibitedClaims",
          ],
          additionalProperties: false,
        },
      },
    },
    });

    return { brief: parseBrief(response.choices[0]?.message?.content), model };
  } catch (error) {
    console.warn("[WebsiteBuilder] Internal brief response was unusable; continuing with industry-specific recovery", error);
    return { brief: fallbackCreativeBrief(source), model: `${model} + deterministic brief recovery` };
  }
}

function manuscriptPrompt(source: WebsiteSource, brief: WebsiteCreativeBrief): string {
  return `${buildPremiumWebsitePrompt(source)}

INTERNAL MANUS CREATIVE BRIEF
${JSON.stringify(brief, null, 2)}

CURATED COMPONENT VOCABULARY
- Pick one distinctive hero composition: editorial split, cinematic image frame, oversized typographic poster, or diagonal service-story composition.
- Use at least four different section compositions from: asymmetric service bento, sticky process narrative, horizontal outcome rail, visual FAQ, editorial contact stage, image-led story, or comparison strip.
- Do not repeat identical cards. Vary span, hierarchy, background, alignment, and interaction purpose.
- Make every headline business-specific and action-oriented. Avoid phrases such as "unlock potential", "next level", "digital solutions", "remarkable experience", or "built for success" unless they appear in source content.
- Decorative UI must reinforce this business's service, not depict unrelated AI dashboards or generic SaaS metrics.
- Include a visible mobile menu button and a keyboard-accessible menu interaction.
- Use the approved source image only if provided. CSS/SVG art may be generated inline; do not invent external asset URLs.
- Retain data-vonwork-design="premium-v2", the locked #vonwork-chat-panel, reduced-motion handling, and truthful-content safeguards.

QUALITY BAR
The result should look like a bespoke $10,000+ agency homepage, not an AI template. Make one coherent art direction, strong visual rhythm, and production-grade mobile behavior. Return only the complete HTML.`;
}

export async function generateWebsiteWithManus(
  businessName: string,
  source: WebsiteSource
): Promise<ManusWebsiteResult> {
  let brief: WebsiteCreativeBrief | null = null;
  let briefModel = "";
  let designModel = "";

  try {
    const briefResult = await createCreativeBrief(source);
    brief = briefResult.brief;
    briefModel = briefResult.model;
    designModel = await selectModel(DESIGN_MODEL_PREFERENCE);
    const response = await invokeLLM({
      model: designModel,
      maxTokens: 14000,
      thinking: designModel.startsWith("claude-")
        ? { type: "enabled", budget_tokens: 2048 }
        : undefined,
      reasoning: designModel.startsWith("gpt-") ? { effort: "medium" } : undefined,
      messages: [
        {
          role: "system",
          content:
            "You are Manus Website Director, an elite brand designer and front-end engineer. Produce polished, factual, responsive HTML that follows the supplied creative brief and quality contract exactly.",
        },
        { role: "user", content: manuscriptPrompt(source, brief) },
      ],
    });
    const html = stabilizePreviewVisibility(cleanHtml(response.choices[0]?.message?.content));
    const validation = validateGeneratedWebsiteHtml(html);
    if (!validation.valid) {
      throw new Error(`Internal Manus output failed quality review: ${validation.reasons.join(", ")}`);
    }
    return {
      html,
      status: "MANUS_GENERATED",
      engine: "MANUS_INTERNAL",
      model: `${briefModel} → ${designModel}`,
      qualityStatus: "accepted",
      creativeBrief: brief,
    };
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message.slice(0, 360) : "Internal Manus generation unavailable";
    return {
      html: buildPremiumFallbackHtml(businessName, source),
      status: "FALLBACK_DEMO",
      engine: "PREMIUM_FALLBACK",
      model: designModel || briefModel || "deterministic-premium-v2",
      qualityStatus: "fallback",
      creativeBrief: brief,
      fallbackReason,
    };
  }
}

export async function reviseWebsiteWithManus(input: {
  currentHtml: string;
  instruction: string;
  source: WebsiteSource;
  creativeBrief?: WebsiteCreativeBrief | null;
}): Promise<{ html: string; model: string; qualityStatus: "accepted"; message: string }> {
  const model = await selectModel(DESIGN_MODEL_PREFERENCE);
  const response = await invokeLLM({
    model,
    maxTokens: 14000,
    thinking: model.startsWith("claude-") ? { type: "enabled", budget_tokens: 1536 } : undefined,
    reasoning: model.startsWith("gpt-") ? { effort: "medium" } : undefined,
    messages: [
      {
        role: "system",
        content:
          "You are Manus Website Director. Revise an existing premium website without degrading its design system, accessibility, responsiveness, factual integrity, or conversion hierarchy. Return complete HTML only.",
      },
      {
        role: "user",
        content: `REVISION REQUEST\n${input.instruction}\n\nORIGINAL SOURCE\nURL: ${input.source.url}\nTITLE: ${input.source.title}\nCONTENT: ${input.source.text.slice(0, 5000)}\n\nCREATIVE BRIEF\n${JSON.stringify(input.creativeBrief ?? null, null, 2)}\n\nCURRENT HTML\n${input.currentHtml.slice(0, 30000)}\n\nRULES\n- Keep data-vonwork-design="premium-v2", at least four varied sections, the bento class, layered depth, clamp typography, reduced-motion support, mobile navigation, and the locked #vonwork-chat-panel.\n- Apply the requested change visibly and cohesively across the design.\n- Do not invent testimonials, reviews, ratings, customer counts, statistics, certifications, awards, prices, guarantees, addresses, or credentials.\n- Do not replace the site with a generic centered hero and repeated cards.\n- Return only complete HTML beginning with <!DOCTYPE html>.`,
      },
    ],
  });
  const html = stabilizePreviewVisibility(cleanHtml(response.choices[0]?.message?.content));
  const validation = validateGeneratedWebsiteHtml(html);
  if (!validation.valid) {
    throw new Error(`Revision failed premium quality review: ${validation.reasons.join(", ")}`);
  }
  return {
    html,
    model,
    qualityStatus: "accepted",
    message: "Revision accepted. The premium preview has been updated and saved as a new version.",
  };
}
