import "server-only";

/**
 * Resolves free-typed location text (a park name, an address, "Cook Park
 * Tigard") to a canonical address + coordinates using Google Places Text
 * Search (New). Server-side only — the key never reaches the browser.
 *
 * Returns null when no key is configured or nothing matches, so callers keep
 * the user's raw text as a graceful fallback.
 *
 * Setup: create a Google Maps Platform API key with the **Places API (New)**
 * enabled, and set GOOGLE_MAPS_API_KEY (server env, NOT NEXT_PUBLIC_).
 */
export type GeocodeResult = {
  address: string;
  lat: number | null;
  lng: number | null;
  name: string | null;
};

const KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!KEY || !q) return null;

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": "places.formattedAddress,places.location,places.displayName",
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 1 }),
    });
    if (!res.ok) {
      console.error(`[geocode] ${res.status}:`, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as {
      places?: {
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        displayName?: { text?: string };
      }[];
    };
    const p = data.places?.[0];
    if (!p) return null;
    return {
      address: p.formattedAddress ?? q,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      name: p.displayName?.text ?? null,
    };
  } catch (err) {
    console.error("[geocode] request failed:", err);
    return null;
  }
}
