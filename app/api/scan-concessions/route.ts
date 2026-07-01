import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Menu OCR for the "scan a concessions menu" flow. A director uploads a photo
 * of their stand's menu board; Claude vision returns item names and prices,
 * which the client drops into a review list before saving to the tournament.
 * Same cost profile as the teams scanner (~$0.007-0.01 per scan on Sonnet 5).
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";
const ALLOWED_MEDIA = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const SYSTEM_PROMPT =
  "You read a concession-stand / food menu from a photo and extract the items " +
  "for sale. For each item return its name exactly as shown, its price as a " +
  "number in dollars (e.g. 5, 5.5, 3.25; null if none is visible), and a short " +
  "description if the menu shows one (what's in it / toppings / size) — else an " +
  'empty string "". Ignore headings, section titles, decorations, and anything ' +
  "that isn't a purchasable item. Respond with ONLY a JSON object of the form " +
  '{"items": [{"name": "Cheeseburger", "price": 5, "description": "1/4 lb, ' +
  'cheddar, brioche bun"}, {"name": "Water", "price": 1.5, "description": ""}]} ' +
  "and nothing else.";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Menu scanning isn't configured on this server yet." },
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
      { error: "Please upload a PNG, JPG, WEBP, or GIF photo." },
      { status: 400 }
    );
  }
  if (image.length > 10_000_000) {
    return NextResponse.json(
      { error: "That image is too large — try a smaller photo." },
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
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
              { type: "text", text: "List the menu items and prices as JSON." },
            ],
          },
        ],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the vision service. Try again." }, { status: 502 });
  }

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || err?.message || "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    console.error(`[scan-concessions] Anthropic ${res.status}: ${detail || "(no detail)"}`);
    return NextResponse.json(
      { error: `Vision service error (${res.status}): ${detail || "no detail"}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const text: string =
    (Array.isArray(data?.content) &&
      data.content.find((b: { type?: string }) => b?.type === "text")?.text) ||
    "";
  return NextResponse.json({ items: parseItems(text) });
}

type MenuItem = { name: string; price: number | null; description: string };

/** Extract the items array, tolerating a ```json fence or stray prose. */
function parseItems(text: string): MenuItem[] {
  if (!text) return [];
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const obj = JSON.parse(match ? match[0] : text);
    if (Array.isArray(obj?.items)) {
      return obj.items
        .map((it: unknown): MenuItem => {
          const rec = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
          const name = String(rec.name ?? "").trim();
          const description = String(rec.description ?? "").trim();
          const rawPrice = rec.price;
          let price: number | null = null;
          if (typeof rawPrice === "number" && isFinite(rawPrice)) price = rawPrice;
          else if (typeof rawPrice === "string") {
            const n = parseFloat(rawPrice.replace(/[^0-9.]/g, ""));
            price = isFinite(n) ? n : null;
          }
          return { name, price, description };
        })
        .filter((it: MenuItem) => it.name.length > 0);
    }
  } catch {
    // fall through
  }
  return [];
}
