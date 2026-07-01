"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodePlace } from "@/lib/geocode";

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/* ---------------------- Facility library CRUD ---------------------- */

/** Add a reusable facility (site) to the director's library. */
export async function addFacilitySite(formData: FormData) {
  const { supabase, user } = await client();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const parking = String(formData.get("parking_info") ?? "").trim() || null;
  if (!name && !address) return;

  const clat = parseFloat(String(formData.get("lat") ?? ""));
  const clng = parseFloat(String(formData.get("lng") ?? ""));
  const hasCoords = Number.isFinite(clat) && Number.isFinite(clng);
  const placeName = String(formData.get("place_name") ?? "").trim();
  const geo = !hasCoords && (address || name) ? await geocodePlace(address || name) : null;

  const finalName = name || placeName || geo?.name || "Facility";
  const finalAddress = (geo?.address ?? address) || null;
  const lat = hasCoords ? clat : geo?.lat ?? null;
  const lng = hasCoords ? clng : geo?.lng ?? null;

  // Don't create duplicates in the director's library. Match an existing
  // facility by normalized name, identical address, or near-identical coords.
  // If we find one, skip the insert and suggest the existing facility instead.
  const norm = (s: string | null) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const { data: mine } = await supabase
    .from("facility_sites")
    .select("id, name, address, lat, lng")
    .eq("director_id", user.id);

  const candName = norm(finalName);
  const candAddr = norm(finalAddress);
  const dup = (mine ?? []).find((s) => {
    if (candName && norm(s.name) === candName) return true;
    if (candAddr && norm(s.address) === candAddr) return true;
    if (lat != null && lng != null && s.lat != null && s.lng != null) {
      const dLat = (s.lat - lat) * 111_320;
      const dLng = (s.lng - lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
      if (Math.hypot(dLat, dLng) < 75) return true; // within ~75 m
    }
    return false;
  });

  if (dup) {
    // Suggest the existing facility (see the banner on the facilities page).
    redirect(`/director/facilities?dup=${dup.id}`);
  }

  await supabase.from("facility_sites").insert({
    director_id: user.id,
    name: finalName,
    address: finalAddress,
    lat,
    lng,
    parking_info: parking,
  });

  revalidatePath("/director/facilities");
}

export async function removeFacilitySite(formData: FormData) {
  const { supabase } = await client();
  const id = String(formData.get("site_id") ?? "");
  await supabase.from("facility_sites").delete().eq("id", id);
  revalidatePath("/director/facilities");
}

/** Add a field/diamond under one of the director's facilities. */
export async function addFacilityField(formData: FormData) {
  const { supabase, user } = await client();
  const facilitySiteId = String(formData.get("facility_site_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const fence = Number(formData.get("fence_distance") ?? 0) || null;
  const lights = formData.get("lights") === "on";
  const surface = String(formData.get("surface") ?? "grass");
  if (!facilitySiteId || !name) return;

  await supabase.from("facility_fields").insert({
    director_id: user.id,
    facility_site_id: facilitySiteId,
    name,
    fence_distance: fence,
    lights,
    surface,
  });

  revalidatePath("/director/facilities");
}

export async function removeFacilityField(formData: FormData) {
  const { supabase } = await client();
  const id = String(formData.get("field_id") ?? "");
  await supabase.from("facility_fields").delete().eq("id", id);
  revalidatePath("/director/facilities");
}

/* ---------------- Pull a facility into a tournament ---------------- */

/**
 * Copy a library facility (its site + all its fields) into a tournament as
 * tournament-scoped rows, so the scheduler and directions keep working on
 * tournament data. Snapshot semantics: later edits to the library don't
 * change events already set up.
 */
export async function addFacilityToTournament(formData: FormData) {
  const { supabase, user } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const facilitySiteId = String(formData.get("facility_site_id") ?? "");
  const setup = String(formData.get("setup") ?? "") === "1";
  // Which library diamonds to bring in. Empty = all of them (back-compat).
  const selectedFieldIds = formData.getAll("field_ids").map((v) => String(v)).filter(Boolean);
  if (!tournamentId || !facilitySiteId) return;

  // Only the owning director can copy their own facility into their own event
  // (both queries are RLS-scoped to the signed-in user).
  const [{ data: site }, { data: libFields }] = await Promise.all([
    supabase
      .from("facility_sites")
      .select("*")
      .eq("id", facilitySiteId)
      .eq("director_id", user.id)
      .maybeSingle(),
    supabase.from("facility_fields").select("*").eq("facility_site_id", facilitySiteId),
  ]);
  if (!site) return;

  // Avoid duplicating a site already pulled in (match on name + address).
  const { data: existing } = await supabase
    .from("sites")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("name", site.name)
    .maybeSingle();

  let siteId = existing?.id ?? null;
  if (!siteId) {
    const { data: newSite } = await supabase
      .from("sites")
      .insert({
        tournament_id: tournamentId,
        name: site.name,
        address: site.address,
        lat: site.lat,
        lng: site.lng,
        parking_info: site.parking_info,
      })
      .select()
      .single();
    siteId = newSite?.id ?? null;
  }

  // Keep only the diamonds the director chose (or all if none specified).
  let fields = libFields ?? [];
  if (selectedFieldIds.length > 0) {
    fields = fields.filter((f) => selectedFieldIds.includes(f.id));
  }

  // Don't re-add diamonds already pulled into this site (by name).
  if (siteId) {
    const { data: alreadyIn } = await supabase
      .from("fields")
      .select("name")
      .eq("tournament_id", tournamentId)
      .eq("site_id", siteId);
    const have = new Set((alreadyIn ?? []).map((f) => f.name.toLowerCase()));
    fields = fields.filter((f) => !have.has(f.name.toLowerCase()));
  }

  if (fields.length > 0) {
    await supabase.from("fields").insert(
      fields.map((f) => ({
        tournament_id: tournamentId,
        site_id: siteId,
        name: f.name,
        fence_distance: f.fence_distance,
        lights: f.lights,
        surface: f.surface,
        allowed_divisions: [] as string[],
      }))
    );
  }

  revalidatePath(`/director/${tournamentId}/fields`);
  redirect(`/director/${tournamentId}/fields${setup ? "?setup=1" : ""}`);
}
