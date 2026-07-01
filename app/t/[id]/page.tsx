import Link from "next/link";
import { loadPublicTournament } from "@/lib/public";
import { FollowerShell } from "@/components/FollowerShell";
import { FollowButton } from "@/components/FollowButton";
import { AlertsPhone } from "@/components/AlertsPhone";
import { PushToggle } from "@/components/PushToggle";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Eyebrow, Badge, EmptyState } from "@/components/ui";
import { dayLabel, gameTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FollowerHome({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament, supabase, user } = await loadPublicTournament(id);
  const tid = tournament.id; // real UUID; `id` (route) may be a slug

  const [{ data: teams }, { data: games }, { data: divisions }, follows, { data: sponsors }, profileRes] =
    await Promise.all([
      supabase.from("teams").select("id,name,division_id").eq("tournament_id", tid).order("name"),
      supabase.from("games").select("*").eq("tournament_id", tid).order("scheduled_at"),
      supabase.from("divisions").select("*").eq("tournament_id", tid).order("sort"),
      user
        ? supabase.from("follows").select("team_id").eq("follower_id", user.id).eq("tournament_id", tid)
        : Promise.resolve({ data: [] as { team_id: string }[] }),
      supabase.from("sponsors").select("id,name,url,logo_url,tier").eq("tournament_id", tid).order("sort"),
      user
        ? supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null as { phone: string | null } | null }),
    ]);

  const teamList = teams ?? [];
  const teamName = new Map(teamList.map((t) => [t.id, t.name]));
  const allGames = games ?? [];
  const followed = new Set((follows.data ?? []).map((f) => f.team_id));

  // Director-uploaded rules summary (bulleted), shown to followers.
  const rulesSummary =
    ((tournament.rules ?? {}) as { documentSummary?: string }).documentSummary ?? "";
  const rulesLines = rulesSummary
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  const upcoming = allGames
    .filter((g) => g.status === "scheduled" && g.home_team_id && g.away_team_id)
    .slice(0, 3);

  return (
    <FollowerShell
      id={id}
      tournamentName={tournament.name}
      dayLabel={dayLabel(tournament)}
      hold={{ status: tournament.hold_status, note: tournament.hold_note, until: tournament.hold_until }}
    >
      <div className="-mt-2 mb-4 flex items-center gap-2 text-[12px] font-semibold text-muted">
        <Badge tone={tournament.status === "live" ? "accent" : "muted"}>{tournament.status}</Badge>
        <span>{tournament.location ?? ""}</span>
      </div>

      <InstallPrompt />

      {/* Sponsors — top of the follower view */}
      {sponsors && sponsors.length > 0 && (
        <div className="mb-6 rounded-2xl border border-faint bg-white p-3">
          <Eyebrow className="mb-2 text-center">Proudly sponsored by</Eyebrow>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {sponsors.map((s) => {
              const inner = s.logo_url ? (
                <span
                  className={`flex items-center justify-center rounded-xl p-2 ${
                    s.tier === "headline" ? "bg-accent" : "border border-faint bg-white"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.logo_url} alt={s.name} className="h-10 max-w-[140px] object-contain" />
                </span>
              ) : (
                <span
                  className={`display rounded-xl px-3 py-2 text-[13px] ${
                    s.tier === "headline" ? "bg-accent text-ink" : "border border-faint text-ink"
                  }`}
                >
                  {s.name}
                </span>
              );
              return s.url ? (
                <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              ) : (
                <span key={s.id}>{inner}</span>
              );
            })}
          </div>
        </div>
      )}

      {/* Next up */}
      <Eyebrow className="mb-3">Next up</Eyebrow>
      {upcoming.length === 0 ? (
        <EmptyState title="No upcoming games" body="Check the schedule for the full slate." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {upcoming.map((g, i) => (
            <div
              key={g.id}
              className={`rounded-2xl p-4 ${i === 0 ? "bg-ink text-white" : "border border-faint"}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-extrabold uppercase tracking-wider ${i === 0 ? "text-accent" : "text-muted"}`}>
                  {g.bracket_slot ?? "Pool play"}
                </span>
                <span className={`text-[11px] font-semibold ${i === 0 ? "text-white/70" : "text-muted"}`}>
                  {gameTime(g.scheduled_at, tournament.timezone)}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="display text-[20px]">{teamName.get(g.home_team_id ?? "")}</span>
              </div>
              <div className="my-0.5 text-[11px] font-bold text-muted">vs</div>
              <div className="flex items-center justify-between">
                <span className="display text-[20px]">{teamName.get(g.away_team_id ?? "")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tournament rules (collapsible) */}
      {rulesLines.length > 0 && (
        <details className="mt-7 rounded-2xl border border-faint">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="eyebrow">Tournament rules</span>
            <span className="text-[13px] font-bold text-muted transition-transform [details[open]_&]:rotate-180">
              ▾
            </span>
          </summary>
          <ul className="flex flex-col gap-2 px-4 pb-4">
            {rulesLines.map((line, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Follow teams */}
      <div className="mt-7 flex items-center justify-between">
        <Eyebrow>Follow your teams</Eyebrow>
        <span className="text-[11px] text-muted">Free · texts on every score</span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {teamList.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl border border-faint px-3.5 py-2.5">
            <Link href={`/t/${id}/team/${t.id}`} className="flex items-center gap-3">
              <span className="display flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[13px] text-white">
                {t.name.slice(0, 1)}
              </span>
              <span className="text-[14px] font-bold">{t.name}</span>
            </Link>
            <FollowButton
              tournamentId={tid}
              teamId={t.id}
              isFollowing={followed.has(t.id)}
              returnTo={`/t/${id}`}
              size="sm"
            />
          </div>
        ))}
        {teamList.length === 0 && <EmptyState title="Teams coming soon" />}
      </div>

      {user && (
        <>
          <AlertsPhone tournamentId={tid} phone={profileRes?.data?.phone ?? null} followingCount={followed.size} />
          <PushToggle />
        </>
      )}

      {divisions && divisions.length > 0 && (
        <p className="mt-6 text-center text-[11px] text-muted">
          {divisions.length} division{divisions.length > 1 ? "s" : ""} ·{" "}
          {divisions.map((d) => d.name).join(" · ")}
        </p>
      )}

      <p className="mt-4 text-center text-[11px] text-muted">
        <span className="font-bold text-ink">Tournament<span className="text-blue">Pal</span></span>{" "}
        · private beta
      </p>
    </FollowerShell>
  );
}
