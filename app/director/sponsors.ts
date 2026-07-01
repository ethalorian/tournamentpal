"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase };
}

export async function addSponsor(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  let url = String(formData.get("url") ?? "").trim();
  const tier = String(formData.get("tier") ?? "standard");
  if (!name) return;
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;

  const { supabase } = await authed();

  // Optional logo upload → public Storage URL, with a surfaced notice on failure.
  const logoFile = formData.get("logo");
  let logoUrl: string | null = null;
  let notice: string | null = null;
  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > 10_485_760) {
      notice = "toobig";
    } else {
      logoUrl = await uploadLogo(supabase, tournamentId, logoFile);
      if (!logoUrl) notice = "failed";
    }
  }

  const { count } = await supabase
    .from("sponsors")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  await supabase.from("sponsors").insert({
    tournament_id: tournamentId,
    name,
    url: url || null,
    logo_url: logoUrl,
    tier: tier === "headline" ? "headline" : "standard",
    sort: count ?? 0,
  });
  revalidatePath(`/director/${tournamentId}/sponsors`);
  revalidatePath(`/t/${tournamentId}`);
  if (notice) redirect(`/director/${tournamentId}/sponsors?logo=${notice}`);
}

/** Uploads a sponsor logo to the public bucket and returns its URL, or null. */
async function uploadLogo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  file: FormDataEntryValue | null
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 10_485_760) return null; // 10 MB cap (bucket enforces too)

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${tournamentId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("sponsor-logos")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) {
    console.error("[sponsors] logo upload failed:", error.message);
    return null;
  }
  return supabase.storage.from("sponsor-logos").getPublicUrl(path).data.publicUrl;
}

export async function removeSponsor(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const sponsorId = String(formData.get("sponsor_id") ?? "");
  const { supabase } = await authed();

  // Best-effort: remove the logo file from storage.
  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("logo_url")
    .eq("id", sponsorId)
    .single();
  const marker = "/sponsor-logos/";
  if (sponsor?.logo_url?.includes(marker)) {
    const path = sponsor.logo_url.split(marker)[1];
    if (path) await supabase.storage.from("sponsor-logos").remove([path]);
  }

  await supabase.from("sponsors").delete().eq("id", sponsorId);
  revalidatePath(`/director/${tournamentId}/sponsors`);
  revalidatePath(`/t/${tournamentId}`);
}
