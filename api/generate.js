// ============================================================
// RepostShield — serverless API (Vercel /api/generate.js)
// POST /api/generate   body: { content: string, platforms: string[] }
// Calls OpenRouter (single LLM call) to:
//   1) rewrite the content into native posts per chosen platform
//   2) run a compliance check (duplicate-content risk, AI-heavy
//      phrasing, community-guideline red flags) on each version
// Returns structured JSON for the frontend to render.
// ============================================================

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const ALL_PLATFORMS = [
  { id: "youtube",   label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok",    label: "TikTok" },
  { id: "twitter",   label: "X (Twitter)" },
  { id: "linkedin",  label: "LinkedIn" },
  { id: "facebook",  label: "Facebook" },
];

const PLATFORM_FORMAT = {
  youtube:
    "object with: title (catchy, under 60 chars, no clickbait), description (2-4 short paragraphs with a hook, value summary, and a natural call to action), tags (array of 4-6 relevant tags).",
  instagram:
    "object with: caption (2-4 short lines separated by line breaks, 1-2 relevant emojis max, ends with a question or call to action), hashtags (array of 4-6 relevant hashtags).",
  tiktok:
    "object with: script (a hook in the first sentence for a 30-60s video, punchy short lines), hashtags (array of 3-5 relevant hashtags).",
  twitter:
    "object with: post (a concise, scannable post under 240 chars with a strong hook), thread (optional array of 2-3 follow-up tweets).",
  linkedin:
    "object with: post (professional story-driven 2-3 paragraphs, one insight, ends with a question).",
  facebook:
    "object with: post (conversational, casual tone, one line break, a question to invite comments, 2-3 hashtags).",
};

const SYSTEM_PROMPT = `You are RepostShield, a repurposing + compliance assistant for real content creators.

Your job: take ONE piece of the creator's content and produce (1) a native, non-duplicate version for each requested platform, and (2) a compliance check that protects the creator from being flagged, shadow-banned, or demonetized.

RULES:
- The creator is a REAL creator, NOT a spam/faceless-channel farm. Never produce low-effort, mass-produced, or misleading content.
- Every platform version must express the SAME core message but with genuinely different wording, structure and length appropriate to that platform (this is what prevents "duplicate content" penalties).
- Keep the creator's authentic voice. Do not over-formalize. Avoid heavy AI tells: avoid stacking three parallel phrases, avoid "In today's fast-paced world", avoid generic "unlock / elevate / revolutionize / dive into" clichés, avoid perfect paragraph symmetry.
- Flag (do not silently fix) anything in the ORIGINAL content that risks violating community guidelines or advertising policies: profanity, medical/legal/financial claims, misleading or unverifiable claims, sexual/political/hate content, deceptive engagement bait, or spammy link drops.
- If the original content itself is low-quality or risky to repost, still deliver the versions but make the compliance issues loud and clear.

OUTPUT FORMAT: Respond with ONLY a single valid JSON object, no markdown fences, no commentary:
{
  "versions": {
    "youtube":   <PLATFORM_FORMAT>,
    "instagram": <PLATFORM_FORMAT>,
    "tiktok":    <PLATFORM_FORMAT>,
    "twitter":   <PLATFORM_FORMAT>,
    "linkedin":  <PLATFORM_FORMAT>,
    "facebook":  <PLATFORM_FORMAT>
  },
  "compliance": [
    {
      "platform": "<platform id>",
      "severity": "high" | "medium" | "low",
      "type": "duplicate_content_risk" | "ai_heavy_phrasing" | "guideline_risk" | "policy_risk",
      "detail": "what the issue is, quoting the exact offending phrase",
      "suggestion": "exact rewrite or action the creator should take"
    }
  ],
  "summary": "one short sentence summarizing what was produced and the most important risk."
}

Only include platforms that were requested. If a platform was not requested, omit its key from "versions".
`;

function buildUserPrompt(content, platforms) {
  const list = platforms
    .map((id) => `- ${id}: ${PLATFORM_FORMAT[id]}`)
    .join("\n");
  return `REPURPOSE THIS CONTENT INTO THESE PLATFORMS:\n\n${list}\n\n--- ORIGINAL CONTENT ---\n${content}\n--- END ---`;
}

// Robust JSON extraction: trims, strips ```json fences if present.
function parseJSON(raw) {
  if (typeof raw !== "string") throw new Error("AI returned non-text output.");
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) text = fence[1].trim();
  // If the model wrapped it with surrounding prose, grab the first { ... } block.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

async function callOpenRouter(apiKey, model, systemPrompt, userPrompt) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://repostshield.vercel.app", // optional, for OpenRouter stats
      "X-Title": "RepostShield",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }, // best-effort; ignored by some models
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || JSON.stringify(err).slice(0, 300);
    } catch (_) {
      detail = res.statusText;
    }
    throw new Error(`OpenRouter error ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("OpenRouter returned an empty response.");
  return parseJSON(raw);
}

// Shared core so it works both on Vercel (serverless) and local server.js.
async function generateCore({ content, platforms }) {
  const cleanContent = String(content || "").trim();
  if (cleanContent.length < 10) {
    const e = new Error("Please paste at least a short paragraph of content.");
    e.code = "BAD_INPUT";
    throw e;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-")) {
    const e = new Error(
      "Server is not configured: OPENROUTER_API_KEY is missing."
    );
    e.code = "SERVER_NOT_CONFIGURED";
    throw e;
  }
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  const chosen = (Array.isArray(platforms) ? platforms : ALL_PLATFORMS.map((p) => p.id))
    .filter((id) => ALL_PLATFORMS.some((p) => p.id === id));
  if (chosen.length === 0) {
    const e = new Error("No valid platform selected.");
    e.code = "BAD_INPUT";
    throw e;
  }

  const result = await callOpenRouter(
    apiKey,
    model,
    SYSTEM_PROMPT,
    buildUserPrompt(cleanContent, chosen)
  );

  return {
    versions: result.versions || {},
    compliance: Array.isArray(result.compliance) ? result.compliance : [],
    summary: result.summary || "",
  };
}

// ---- Vercel serverless handler ----
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    res.status(400).json({ error: "Request body must be JSON." });
    return;
  }

  try {
    const data = await generateCore(body);
    res.status(200).json(data);
  } catch (err) {
    const code = err.code || "AI_ERROR";
    const status = code === "SERVER_NOT_CONFIGURED" ? 500
      : code === "BAD_INPUT" ? 400
      : 502;
    res.status(status).json({ error: code, message: err.message });
  }
};

module.exports.generateCore = generateCore;
module.exports.parseJSON = parseJSON;
module.exports.ALL_PLATFORMS = ALL_PLATFORMS;
