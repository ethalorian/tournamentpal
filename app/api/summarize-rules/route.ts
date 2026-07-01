import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Summarize an uploaded tournament rules document into the key points coaches
 * and players actually need. Accepts a PDF, an image of the rules, or plain
 * text, and returns a short bulleted summary via the Claude API.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";
const ALLOWED_IMAGE = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const SYSTEM_PROMPT =
  "You are condensing a youth sports tournament's rules document for busy " +
  "coaches and parents. Extract only the key points they need to know — game " +
  "format and length, run/mercy rules, time limits, tiebreakers, roster and " +
  "eligibility, equipment, conduct/ejections, protest procedure, weather, and " +
  "anything unusual. Be faithful to the document; do not invent rules. Write " +
  "8–14 short bullet lines, each starting with '- ', grouped sensibly, in plain " +
  "text (no markdown headers). If something important is missing from the " +
  "document, simply omit it.";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Rules summarizing isn't configured on this server yet." },
      { status: 501 }
    );
  }

  let body: { kind?: string; data?: string; media_type?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const kind = body.kind;
  let contentBlock: Record<string, unknown> | null = null;

  if (kind === "text") {
    const text = String(body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "The document was empty." }, { status: 400 });
    contentBlock = { type: "text", text: text.slice(0, 200_000) };
  } else if (kind === "pdf") {
    const data = String(body.data ?? "");
    if (!data) return NextResponse.json({ error: "No PDF data." }, { status: 400 });
    if (data.length > 14_000_000) {
      return NextResponse.json({ error: "That PDF is too large — try a smaller file." }, { status: 413 });
    }
    contentBlock = {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data },
    };
  } else if (kind === "image") {
    const data = String(body.data ?? "");
    const mediaType = String(body.media_type ?? "");
    if (!data || !ALLOWED_IMAGE.has(mediaType)) {
      return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
    }
    contentBlock = { type: "image", source: { type: "base64", media_type: mediaType, data } };
  } else {
    return NextResponse.json(
      { error: "Upload a PDF, an image, or a .txt rules file." },
      { status: 400 }
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
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              { type: "text", text: "Summarize the key rules as bullet points." },
            ],
          },
        ],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the summarizer. Try again." }, { status: 502 });
  }

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || err?.message || "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    console.error(`[summarize-rules] Anthropic ${res.status}: ${detail || "(no detail)"}`);
    return NextResponse.json(
      { error: `Summarizer error (${res.status}): ${detail || "no detail"}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const summary: string =
    (Array.isArray(data?.content) &&
      data.content.find((b: { type?: string }) => b?.type === "text")?.text) ||
    "";
  return NextResponse.json({ summary: summary.trim() });
}
