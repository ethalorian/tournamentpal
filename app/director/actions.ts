"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { regenerateSchedule, advanceBracket } from "@/lib/schedule-builder";
import { geocodePlace } from "@/lib/geocode";
import { notifyFollowers } from "@/lib/notify";
import { computeStandings, DEFAULT_RULES } from "@/lib/engine/standings";
import { bracketSeedOrder } from "@/lib/engine/schedule";
import { getPreset, powerOfTwoCeil } from "@/lib/engine/presets";
import type { GameResult, Rules, TiebreakerKey } from "@/lib/engine/types";

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/* --------------------------- Create draft -------------------------- */

export async function createTournamentDraft(formData: FormData) {
  const { supabase, user } = await client();
  const name = String(formData.get("name") ?? "").trim();
  const sport = String(formData.get("sport") ?? "softball");
  const location = String(formData.get("location") ?? "").trim();
  const start_date = String(formData.get("start_date") ?? "") || null;
  const end_date = String(formData.get("end_date") ?? "") || null;
  const divisionsRaw = String(formData.get("divisions") ?? "").trim();

  if (!name) throw new Error("Your event needs a name.");

  // Prefer coordinates chosen via Places Autocomplete; otherwise geocode the
  // typed text server-side (best-effort).
  const clat = parseFloat(String(formData.get("lat") ?? ""));
  const clng = parseFloat(String(formData.get("lng") ?? ""));
  const hasCoords = Number.isFinite(clat) && Number.isFinite(clng);
  const geo = !hasCoords && location ? await geocodePlace(location) : null;

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({
      director_id: user.id,
      name,
      sport: sport === "baseball" ? "baseball" : "softball",
      location: (geo?.address ?? location) || null,
      lat: hasCoords ? clat : geo?.lat ?? null,
      lng: hasCoords ? clng : geo?.lng ?? null,
      start_date,
      end_date,
      status: "draft",
      rules: DEFAULT_RULES as never,
    })
    .select()
    .single();
  if (error || !tournament) throw new Error(error?.message ?? "Could not create event.");

  const divisions = divisionsRaw
    .split(/[,\n]/)
    .map((d) => d.trim())
    .filter(Boolean);
  if (divisions.length > 0) {
    await supabase.from("divisions").insert(
      divisions.map((name, i) => ({ tournament_id: tournament.id, name, sort: i }))
    );
  }

  revalidatePath("/director");
  redirect(`/director/${tournament.id}/teams`);
}

/* ------------------------------ Teams ------------------------------ */

export async function addTeams(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const divisionId = String(formData.get("division_id") ?? "") || null;
  const raw = String(formData.get("teams") ?? "");

  // Accept one-per-line OR pasted CSV — take the first column as the team name,
  // strip quotes, and drop a leading header row if present.
  const names = raw
    .split(/\r?\n/)
    .map((line) => (line.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .filter((n, i) => !(i === 0 && /^(team|team name|name)$/i.test(n)));
  if (names.length === 0) return;

  const { count } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);
  const base = count ?? 0;

  await supabase.from("teams").insert(
    names.map((name, i) => ({
      tournament_id: tournamentId,
      division_id: divisionId,
      name,
      seed: base + i + 1,
    }))
  );

  revalidatePath(`/director/${tournamentId}/teams`);
}

export async function removeTeam(formData: FormData) {
  const { supabase } = await client();
  const teamId = String(formData.get("team_id") ?? "");
  const tournamentId = String(formData.get("tournament_id") ?? "");
  await supabase.from("teams").delete().eq("id", teamId);
  revalidatePath(`/director/${tournamentId}/teams`);
}

/* ------------------------------ Format ----------------------------- */

export async function setFormat(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const presetId = String(formData.get("preset_id") ?? "");
  const poolSize = Number(formData.get("pool_size") ?? 0) || undefined;
  const bracketTeams = Number(formData.get("bracket_teams") ?? 0) || undefined;

  if (!getPreset(presetId)) throw new Error("Choose a valid format.");

  await supabase
    .from("tournaments")
    .update({ format: { presetId, poolSize, bracketTeams } as never })
    .eq("id", tournamentId);

  revalidatePath(`/director/${tournamentId}/review`);
  redirect(`/director/${tournamentId}/review`);
}

/* ----------------------- Generate / Publish ------------------------ */

export async function generateScheduleAction(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const { data: t } = await supabase.from("tournaments").select("*").eq("id", tournamentId).single();
  if (!t) throw new Error("Event not found.");
  await regenerateSchedule(supabase, t);
  revalidatePath(`/director/${tournamentId}/review`);
}

export async function publishTournament(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const { data: t } = await supabase.from("tournaments").select("*").eq("id", tournamentId).single();
  if (!t) throw new Error("Event not found.");

  // Ensure a schedule exists.
  const { count } = await supabase
    .from("games")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);
  if (!count) await regenerateSchedule(supabase, t);

  // Publishing only makes the event public. Notifying followers is a separate,
  // deliberate action (see announceToFollowers) — never automatic.
  await supabase.from("tournaments").update({ status: "published" }).eq("id", tournamentId);

  revalidatePath(`/director/${tournamentId}`);
  redirect(`/director/${tournamentId}`);
}

/** Manually text/push followers — sent only when the director chooses to. */
export async function announceToFollowers(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { data: t } = await supabase
    .from("tournaments")
    .select("name")
    .eq("id", tournamentId)
    .single();

  await notifyFollowers({
    tournamentId,
    type: "broadcast",
    title: t?.name ?? "Tournament update",
    body,
  });

  revalidatePath(`/director/${tournamentId}`);
  redirect(`/director/${tournamentId}?announced=1`);
}

export async function deleteTournament(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  await supabase.from("tournaments").delete().eq("id", tournamentId);
  revalidatePath("/director");
  redirect("/director");
}

/* ------------------------------ Fields ----------------------------- */

export async function addField(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const fence = Number(formData.get("fence_distance") ?? 0) || null;
  const lights = formData.get("lights") === "on";
  const surface = String(formData.get("surface") ?? "grass");
  const allowed = formData
    .getAll("allowed_divisions")
    .map((d) => String(d))
    .filter(Boolean);
  if (!name) return;

  let siteId: string | null = null;
  const siteName = String(formData.get("site_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const clat = parseFloat(String(formData.get("lat") ?? ""));
  const clng = parseFloat(String(formData.get("lng") ?? ""));
  const hasCoords = Number.isFinite(clat) && Number.isFinite(clng);
  const placeName = String(formData.get("place_name") ?? "").trim();
  if (siteName || address) {
    // Prefer the Places Autocomplete selection; geocode as a fallback.
    const geo = !hasCoords ? await geocodePlace(address || siteName) : null;
    const { data: site } = await supabase
      .from("sites")
      .insert({
        tournament_id: tournamentId,
        name: siteName || placeName || geo?.name || "Site",
        address: (geo?.address ?? address) || null,
        lat: hasCoords ? clat : geo?.lat ?? null,
        lng: hasCoords ? clng : geo?.lng ?? null,
      })
      .select()
      .single();
    siteId = site?.id ?? null;
  }

  await supabase.from("fields").insert({
    tournament_id: tournamentId,
    site_id: siteId,
    name,
    fence_distance: fence,
    lights,
    surface,
    allowed_divisions: allowed,
  });

  revalidatePath(`/director/${tournamentId}/fields`);
}

/* ------------------------------ Rules ------------------------------ */

export async function saveRules(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const order = String(formData.get("tiebreaker_order") ?? "");
  const tiebreakers = order
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as TiebreakerKey[];
  const runRule = Number(formData.get("run_rule") ?? 0);
  const timeLimitMins = Number(formData.get("time_limit") ?? 0);

  const rules: Rules = {
    tiebreakers: tiebreakers.length ? tiebreakers : DEFAULT_RULES.tiebreakers,
    runRule,
    timeLimitMins,
  };
  await supabase.from("tournaments").update({ rules: rules as never }).eq("id", tournamentId);
  revalidatePath(`/director/${tournamentId}/rules`);
}

/* ------------------------------ Scores ----------------------------- */

export async function postScore(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const gameId = String(formData.get("game_id") ?? "");
  const home = Number(formData.get("home_score") ?? 0);
  const away = Number(formData.get("away_score") ?? 0);
  const isCorrection = formData.get("correction") === "1";
  const returnTo = String(formData.get("return_to") ?? `/director/${tournamentId}/scores`);

  await supabase
    .from("games")
    .update({ home_score: home, away_score: away, status: "final" })
    .eq("id", gameId);

  // Winners flow into later bracket rounds.
  await advanceBracket(supabase, tournamentId);

  // First time a score is posted, flip the event to "live". Followers are NOT
  // texted automatically — the director sends updates manually (announceToFollowers).
  await supabase
    .from("tournaments")
    .update({ status: "live" })
    .eq("id", tournamentId)
    .eq("status", "published");

  void isCorrection;

  revalidatePath(`/director/${tournamentId}/scores`);
  revalidatePath(`/director/${tournamentId}/standings`);
  revalidatePath(`/score/${tournamentId}`);
  redirect(`${returnTo}?posted=${gameId}`);
}

/* ----------------- Seed bracket from pool standings ---------------- */

export async function seedBracket(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");

  const { data: t } = await supabase.from("tournaments").select("*").eq("id", tournamentId).single();
  if (!t) return;
  const format = (t.format ?? {}) as { presetId?: string; bracketTeams?: number };
  const preset = format.presetId ? getPreset(format.presetId) : undefined;
  const bracketTeams = format.bracketTeams ?? preset?.bracketTeams ?? 0;
  if (!bracketTeams) return;

  const rules = (t.rules ?? DEFAULT_RULES) as Rules;

  const [{ data: teams }, { data: games }, { data: bracketGames }] = await Promise.all([
    supabase.from("teams").select("*").eq("tournament_id", tournamentId),
    supabase.from("games").select("*").eq("tournament_id", tournamentId).eq("stage", "pool"),
    supabase
      .from("games")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("stage", "bracket")
      .eq("round", 1)
      .order("created_at"),
  ]);

  const results: GameResult[] = (games ?? []).map((g) => ({
    homeTeamId: g.home_team_id,
    awayTeamId: g.away_team_id,
    homeScore: g.home_score,
    awayScore: g.away_score,
    status: g.status,
  }));

  const standings = computeStandings(
    (teams ?? []).map((t) => ({ id: t.id, name: t.name, seed: t.seed })),
    results,
    rules
  );
  const seedToTeam = standings.slice(0, bracketTeams).map((s) => s.teamId);

  // Map seed numbers in first-round games to team ids using bracket order.
  const size = powerOfTwoCeil(bracketTeams);
  const order = bracketSeedOrder(size);
  const teamBySeedNumber = (seed: number | null): string | null => {
    if (!seed) return null;
    return seedToTeam[seed - 1] ?? null;
  };

  for (const g of bracketGames ?? []) {
    await supabase
      .from("games")
      .update({
        home_team_id: teamBySeedNumber(g.home_seed),
        away_team_id: teamBySeedNumber(g.away_seed),
      })
      .eq("id", g.id);
  }

  // Cascade any already-decided rounds forward.
  await advanceBracket(supabase, tournamentId);

  void order;
  revalidatePath(`/director/${tournamentId}/standings`);
}
