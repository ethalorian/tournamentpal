import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Team-name OCR for the "prefill from a screenshot" flow on the Teams step.
 *
 * A director uploads a screenshot of a registration/schedule page (e.g. the
 * "Who's Playing" list on registerplay). We send it to the Claude vision API
 * and get back a clean list of team names, which the client drops into the
 * "Team names" textarea for the director to review before saving.
 *
 * Cost: a resized screenshot bills ~1.6k input tokens; the JSON reply is a few
 * hundred output tokens. On the default Sonnet 5 model that is ~$0.007 per scan
 * at intro pricing (~$0.01 after Aug 2026). Override via SCAN_TEAMS_MODEL (e.g.
 * claude-haiku-4-5 to cut cost further, or claude-opus-4-8 for max accuracy).
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";
const ALLOWED_MEDIA = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const SYSTEM_PROMPT =
  "You extract sports team names from a screenshot of a tournament " +
  "registration or schedule page. Return every team name that appears as a " +
  "registered or participating team, in the order shown. Do NOT include UI " +
  "labels, buttons, headings, or section titles (e.g. 'Actions', 'Facilities', " +
  "'Who's Playing', 'Register'), division/pool/bracket names, dates, times, " +
  "field or location names, scores, or coach names. Preserve each team name " +
  "exactly as written. Respond with ONLY a JSON object of the form " +
  '{"teams": ["Name 1", "Name 2"]} and nothing else.';

export async function POST(request: NextRequest) {
  // Gate on an authenticated director so the API key can't be used anonymously.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Screenshot scanning isn't configured on this server yet." },
      { status: 501 }
    );
  }

  let body: { image?: string; media_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const image = typeof body.image === "string" ? body.image : "";
  const mediaType = typeof body.media_type === "string" ? body.media_type : "";
  if (!image || !ALLOWED_MEDIA.has(mediaType)) {
    return NextResponse.json(
      { error: "Please upload a PNG, JPG, WEBP, or GIF screenshot." },
      { status: 400 }
    );
  }

  // Guard against oversized uploads (base64 ~4/3 of the raw bytes). ~7MB raw.
  if (image.length > 10_000_000) {
    return NextResponse.json(
      { error: "That image is too large — try a smaller screenshot." },
      { status: 413 }
    );
  }

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.SCAN_TEAMS_MODEL || DEFAULT_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: image },
              },
              {
                type: "text",
                text: "List the team names in this screenshot as JSON.",
              },
            ],
          },
        ],
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the vision service. Try again." },
      { status: 502 }
    );
  }

  if (!res.ok) {
    // Surface Anthropic's real error so misconfig (bad key, model, etc.) is
    // debuggable instead of a generic message. Logged server-side, and a short
    // detail is returned to this director-only endpoint.
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || err?.message || "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    console.error(
      `[scan-teams] Anthropic ${res.status}: ${detail || "(no detail)"}`
    );
    return NextResponse.json(
      {
        error: `Vision service error (${res.status}): ${detail || "no detail"}`,
      },
      { status: 502 }
    );
  }

  const data = await res.json();
  const text: string =
    Array.isArray(data?.content) &&
    data.content.find((b: { type?: string }) => b?.type === "text")?.text
      ? data.content.find((b: { type?: string }) => b?.type === "text").text
      : "";

  const teams = parseTeams(text);
  return NextResponse.json({ teams });
}

/**
 * Pull the team array out of the model's reply. Tolerates stray prose or a
 * ```json fence around the object by grabbing the first {...} block.
 */
function parseTeams(text: string): string[] {
  if (!text) return [];
  const match = text.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : text;
  try {
    const obj = JSON.parse(candidate);
    if (Array.isArray(obj?.teams)) {
      return obj.teams
        .map((t: unknown) => String(t).trim())
        .filter((t: string) => t.length > 0);
    }
  } catch {
    // fall through
  }
  return [];
}
