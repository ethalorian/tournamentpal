import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Eyebrow, Field, inputClass, Button, Badge, Card } from "@/components/ui";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import { SaveButton } from "@/components/SaveButton";
import {
  saveScheduleConfig,
  saveDivisionWindow,
  saveTeamConstraints,
  regenerateWithConstraints,
  addMatchup,
  removeMatchup,
  saveGameWindows,
  saveDayStages,
  saveDayGrids,
  setBracketFieldPin,
  saveMinPoolGames,
  addExtraGame,
  removeExtraGame,
} from "@/app/director/scheduling";

export const dynamic = "force-dynamic";

const DEFAULTS = { dayStart: "08:00", dayEnd: "20:00", gameLengthMins: 90, bufferMins: 15 };

export default async function SchedulingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rebuilt?: string }>;
}) {
  const { id } = await params;
  const { rebuilt } = await searchParams;
  const { tournament, supabase } = await loadOwnedTournament(id);

  const [{ data: divisions }, { data: teams }, { data: fields }, { data: games }] = await Promise.all([
    supabase.from("divisions").select("*").eq("tournament_id", id).order("sort"),
    supabase.from("teams").select("*").eq("tournament_id", id).order("seed"),
    supabase.from("fields").select("*").eq("tournament_id", id).order("name"),
    supabase
      .from("games")
      .select(
        "id,home_team_id,away_team_id,home_seed,away_seed,scheduled_at,field_id,stage,round,bracket_pos,bracket_slot,division_id"
      )
      .eq("tournament_id", id),
  ]);
  const divList = divisions ?? [];
  const teamList = teams ?? [];
  const fieldList = fields ?? [];
  const teamName = new Map(teamList.map((t) => [t.id, t.name]));

  // Bracket games, grouped by division for manual field assignment. The pin key
  // matches the engine's stable game key so it survives regeneration.
  const bracketGames = (games ?? []).filter((g) => g.stage === "bracket");
  const fieldPins =
    ((tournament.schedule_config ?? {}) as { fieldPins?: Record<string, string> }).fieldPins ?? {};
  const pinKey = (g: { division_id: string | null; round: number; bracket_pos: number | null }) =>
    `${g.division_id}-bracket-r${g.round}-g${(g.bracket_pos ?? 0) + 1}`;
  const bracketFieldSections = [
    ...divList.map((d) => ({
      id: d.id,
      name: d.name as string | undefined,
      games: bracketGames
        .filter((g) => g.division_id === d.id)
        .sort((a, b) => a.round - b.round || (a.bracket_pos ?? 0) - (b.bracket_pos ?? 0)),
    })),
    {
      id: "_none",
      name: undefined,
      games: bracketGames
        .filter((g) => !g.division_id)
        .sort((a, b) => a.round - b.round || (a.bracket_pos ?? 0) - (b.bracket_pos ?? 0)),
    },
  ].filter((s) => s.games.length > 0);

  // Pool-game counts per team + the minimum-games guarantee.
  const poolCountByTeam = new Map<string, number>();
  for (const g of games ?? []) {
    if (g.stage !== "pool") continue;
    if (g.home_team_id) poolCountByTeam.set(g.home_team_id, (poolCountByTeam.get(g.home_team_id) ?? 0) + 1);
    if (g.away_team_id) poolCountByTeam.set(g.away_team_id, (poolCountByTeam.get(g.away_team_id) ?? 0) + 1);
  }
  const minPoolGames =
    ((tournament.schedule_config ?? {}) as { minPoolGames?: number }).minPoolGames ?? 0;
  const extraGames =
    ((tournament.schedule_config ?? {}) as { extraGames?: { a: string; b: string }[] }).extraGames ??
    [];
  const belowMin = teamList.filter((t) => (poolCountByTeam.get(t.id) ?? 0) < minPoolGames);

  const cfg = { ...DEFAULTS, ...((tournament.schedule_config ?? {}) as Partial<typeof DEFAULTS>) };

  // Matchup rules stored alongside the slot config.
  type Matchup = { a: string; b: string; type: "forbid" | "force" | "separate" };
  const matchups =
    ((tournament.schedule_config ?? {}) as { matchups?: Matchup[] }).matchups ?? [];
  const teamsByDiv = divList.map((d) => ({
    div: d,
    teams: teamList.filter((t) => t.division_id === d.id),
  }));
  const noDivTeams = teamList.filter((t) => !t.division_id);
  const renderTeamOptions = () => (
    <>
      {teamsByDiv.map(({ div, teams }) =>
        teams.length ? (
          <optgroup key={div.id} label={div.name}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
        ) : null
      )}
      {noDivTeams.length ? (
        <optgroup label="No division">
          {noDivTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </optgroup>
      ) : null}
    </>
  );
  const MATCHUP_LABEL: Record<Matchup["type"], string> = {
    forbid: "never play",
    force: "must meet in pool",
    separate: "never at the same time",
  };

  // Build the same time-block grid the scheduler uses, so the director can paint
  // which divisions may play in each window. Keyed `${day}__${timeMin}`.
  const savedWindows =
    ((tournament.schedule_config ?? {}) as { windows?: Record<string, string[]> }).windows ?? {};
  const toMin = (s: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s ?? "");
    return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
  };
  const fmtMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const ap = h < 12 ? "am" : "pm";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
  };
  const enumerateDays = (start: string | null, end: string | null) => {
    if (!start) return [] as string[];
    const days: string[] = [];
    const s = new Date(`${start}T00:00:00Z`);
    const e = new Date(`${end ?? start}T00:00:00Z`);
    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
      if (days.length > 30) break;
    }
    return days;
  };
  const winStep = (cfg.gameLengthMins || 90) + (cfg.bufferMins || 0);
  const winStart = toMin(cfg.dayStart);
  const winEnd = toMin(cfg.dayEnd);
  const gLen = cfg.gameLengthMins || 90;
  // Default number of windows implied by the global playing window.
  const defaultWindows = Math.max(1, Math.floor((winEnd - winStart - gLen) / winStep) + 1);
  const savedDayGrids =
    ((tournament.schedule_config ?? {}) as {
      dayGrids?: Record<string, { start?: string; windows?: number }>;
    }).dayGrids ?? {};
  const gridFor = (day: string) => {
    const g = savedDayGrids[day];
    const start = g?.start ?? cfg.dayStart;
    const windows = g?.windows && g.windows > 0 ? g.windows : defaultWindows;
    return { start, windows, startMin: toMin(start) };
  };
  const windowDays = enumerateDays(tournament.start_date, tournament.end_date).map((day) => {
    const { start, windows, startMin } = gridFor(day);
    const blocks: { key: string; label: string }[] = [];
    for (let n = 0; n < windows; n++) {
      const t = startMin + n * winStep;
      if (t + gLen > 24 * 60) break;
      blocks.push({ key: `${day}__${t}`, label: fmtMin(t) });
    }
    return { day, blocks, start, windows };
  });
  const allWindowKeys = windowDays.flatMap((d) => d.blocks.map((b) => b.key));

  // Per-day pool/elimination tags.
  const savedDayStages =
    ((tournament.schedule_config ?? {}) as { dayStages?: Record<string, "pool" | "bracket"> })
      .dayStages ?? {};
  const scheduleDays = windowDays.map((d) => d.day);

  // Games the constraints left unplaced (only meaningful once a schedule exists).
  const unplaced = (games ?? []).filter((g) => !g.scheduled_at || !g.field_id);
  const hasSchedule = (games ?? []).length > 0;

  return (
    <DirectorShell>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Scheduling</h1>
      <TournamentNav id={id} />

      {rebuilt && (
        <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-[13px] font-semibold text-success">
          Schedule rebuilt with your constraints.
        </p>
      )}

      {/* Conflicts banner */}
      {hasSchedule && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-[13px] font-semibold ${
            unplaced.length ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
          }`}
        >
          {unplaced.length === 0
            ? "Every game fits your constraints."
            : `${unplaced.length} game${unplaced.length > 1 ? "s" : ""} couldn't be placed without breaking a rule.`}
          {unplaced.length > 0 && (
            <ul className="mt-2 list-disc pl-5 font-normal">
              {unplaced.slice(0, 8).map((g) => (
                <li key={g.id}>
                  {g.home_team_id ? teamName.get(g.home_team_id) ?? "TBD" : "TBD"} vs{" "}
                  {g.away_team_id ? teamName.get(g.away_team_id) ?? "TBD" : "TBD"} ({g.stage})
                </li>
              ))}
              {unplaced.length > 8 && <li>…and {unplaced.length - 8} more</li>}
            </ul>
          )}
        </div>
      )}

      {/* 1 · Time window */}
      <Eyebrow className="mt-7 mb-3">Playing window</Eyebrow>
      <Card>
        <div className="display text-[15px]">First game &amp; daily window</div>
        <p className="mt-1 text-[12px] text-muted">
          The first game each day starts at this time; nothing is scheduled to run past the day end.
        </p>
        <form action={saveScheduleConfig} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="tournament_id" value={id} />
          <Field label="Timezone" hint="All game times are shown in this zone for everyone.">
            <TimezoneSelect value={tournament.timezone} />
          </Field>
          <div className="grid grid-cols-2 items-end gap-3">
            <label className="flex flex-col">
              <span className="eyebrow mb-2">First game</span>
              <input name="day_start" type="time" defaultValue={cfg.dayStart} className={inputClass} />
            </label>
            <label className="flex flex-col">
              <span className="eyebrow mb-2">Last game out</span>
              <input name="day_end" type="time" defaultValue={cfg.dayEnd} className={inputClass} />
            </label>
          </div>
          <div className="grid grid-cols-2 items-end gap-3">
            <label className="flex flex-col">
              <span className="eyebrow mb-2">Game length</span>
              <input name="game_length" type="number" inputMode="numeric" defaultValue={cfg.gameLengthMins} className={inputClass} />
            </label>
            <label className="flex flex-col">
              <span className="eyebrow mb-2">Buffer</span>
              <input name="buffer" type="number" inputMode="numeric" defaultValue={cfg.bufferMins} className={inputClass} />
            </label>
          </div>
          <p className="-mt-1 text-[11px] text-muted">Game length &amp; buffer are in minutes.</p>
          <SaveButton>Save playing window</SaveButton>
        </form>
      </Card>

      {/* 1b · Pool vs elimination days */}
      {scheduleDays.length >= 2 && (
        <>
          <Eyebrow className="mt-7 mb-3">Pool &amp; elimination days</Eyebrow>
          <p className="-mt-1 mb-3 text-[12px] text-muted">
            Split a multi-day event — e.g. pool play Saturday, brackets Sunday. Days left
            on &ldquo;Both&rdquo; can host either.
          </p>
          <Card>
            <form action={saveDayStages} className="flex flex-col gap-3">
              <input type="hidden" name="tournament_id" value={id} />
              <input type="hidden" name="days" value={scheduleDays.join(",")} />
              {scheduleDays.map((day) => (
                <div key={day} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold">
                    {new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                  <div className="w-40 shrink-0">
                    <select
                      name={`stage:${day}`}
                      defaultValue={savedDayStages[day] ?? "both"}
                      className={inputClass}
                    >
                      <option value="both">Both</option>
                      <option value="pool">Pool play only</option>
                      <option value="bracket">Elimination only</option>
                    </select>
                  </div>
                </div>
              ))}
              <SaveButton savedLabel="Days saved ✓">Save day types</SaveButton>
            </form>
          </Card>
        </>
      )}

      {/* 2 · Division windows */}
      {divList.length > 0 && (
        <>
          <Eyebrow className="mt-7 mb-3">Division time windows</Eyebrow>
          <p className="-mt-1 mb-3 text-[12px] text-muted">
            Confine an age group to part of the day (e.g. 10U mornings). Leave blank for any time.
          </p>
          <div className="flex flex-col gap-2">
            {divList.map((d) => (
              <Card key={d.id}>
                <form action={saveDivisionWindow} className="flex flex-col gap-3">
                  <input type="hidden" name="tournament_id" value={id} />
                  <input type="hidden" name="division_id" value={d.id} />
                  <div className="text-[14px] font-extrabold">{d.name}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Not before">
                      <input name="window_start" type="time" defaultValue={d.window_start ?? ""} className={inputClass} />
                    </Field>
                    <Field label="Done by">
                      <input name="window_end" type="time" defaultValue={d.window_end ?? ""} className={inputClass} />
                    </Field>
                  </div>
                  <SaveButton>Save</SaveButton>
                </form>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 2b · Game windows: per-day grid + division painting */}
      {scheduleDays.length > 0 && (
        <>
          <Eyebrow className="mt-7 mb-3">Game windows</Eyebrow>
          <p className="-mt-1 mb-3 text-[12px] text-muted">
            Set when the first game starts each day and how many windows there are — then
            (optionally) tag which divisions play in each window.
          </p>

          {/* Per-day start time + number of windows */}
          <Card>
            <div className="display text-[14px]">Each day&rsquo;s windows</div>
            <p className="mt-1 text-[12px] text-muted">
              First-game time and how many {gLen}-minute windows run that day.
            </p>
            <form action={saveDayGrids} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="tournament_id" value={id} />
              <input type="hidden" name="days" value={scheduleDays.join(",")} />
              {windowDays.map(({ day, start, windows }) => (
                <div key={day} className="rounded-lg bg-haze p-2.5">
                  <div className="mb-2 text-[12px] font-bold">
                    {new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col">
                      <span className="eyebrow mb-1">Start</span>
                      <input name={`start:${day}`} type="time" defaultValue={start} className={inputClass} />
                    </label>
                    <label className="flex flex-col">
                      <span className="eyebrow mb-1">Windows</span>
                      <input
                        name={`windows:${day}`}
                        type="number"
                        min={1}
                        max={20}
                        defaultValue={windows}
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>
              ))}
              <SaveButton savedLabel="Windows saved ✓">Save day windows</SaveButton>
            </form>
          </Card>

          {divList.length > 0 && allWindowKeys.length > 0 && (
          <Card className="mt-3">
            <div className="display mb-3 text-[14px]">Paint divisions onto windows</div>
            <form action={saveGameWindows} className="flex flex-col gap-4">
              <input type="hidden" name="tournament_id" value={id} />
              <input type="hidden" name="keys" value={allWindowKeys.join(",")} />
              {windowDays.map(({ day, blocks }) => (
                <div key={day}>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                    {new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </div>
                  <div className="flex flex-col gap-2">
                    {blocks.map((b) => (
                      <div key={b.key} className="flex flex-wrap items-center gap-2">
                        <span className="w-16 shrink-0 text-[12px] font-bold">{b.label}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {divList.map((d) => (
                            <label key={d.id} className="cursor-pointer">
                              <input
                                type="checkbox"
                                name={`win:${b.key}`}
                                value={d.name}
                                defaultChecked={(savedWindows[b.key] ?? []).includes(d.name)}
                                className="peer sr-only"
                              />
                              <span className="block rounded-full border-2 border-faint px-2.5 py-1 text-[11px] font-bold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
                                {d.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <SaveButton savedLabel="Painted ✓">Save game windows</SaveButton>
            </form>
          </Card>
          )}
        </>
      )}

      {/* 3 · Team restrictions */}
      <Eyebrow className="mt-7 mb-3">Team restrictions</Eyebrow>
      <p className="-mt-1 mb-3 text-[12px] text-muted">
        Pin a team to specific fields, or set when it can play. Unchecked fields = any field; blank times = any time.
      </p>
      {teamList.length === 0 ? (
        <p className="text-[13px] text-muted">Add teams first.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {teamList.map((t) => (
            <Card key={t.id}>
              <form action={saveTeamConstraints} className="flex flex-col gap-3">
                <input type="hidden" name="tournament_id" value={id} />
                <input type="hidden" name="team_id" value={t.id} />
                <div className="flex items-center gap-2">
                  <span className="display flex h-6 w-6 items-center justify-center rounded-md bg-haze text-[11px]">{t.seed}</span>
                  <span className="text-[14px] font-extrabold">{t.name}</span>
                </div>

                {fieldList.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Only plays on</div>
                    <div className="flex flex-wrap gap-2">
                      {fieldList.map((f) => (
                        <label key={f.id} className="cursor-pointer">
                          <input
                            type="checkbox"
                            name="allowed_field_ids"
                            value={f.id}
                            defaultChecked={(t.allowed_field_ids ?? []).includes(f.id)}
                            className="peer sr-only"
                          />
                          <span className="block rounded-full border-2 border-faint px-3 py-1.5 text-[12px] font-bold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
                            {f.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Can't play before">
                    <input name="avail_start" type="time" defaultValue={t.avail_start ?? ""} className={inputClass} />
                  </Field>
                  <Field label="Can't play after">
                    <input name="avail_end" type="time" defaultValue={t.avail_end ?? ""} className={inputClass} />
                  </Field>
                </div>
                <SaveButton>Save team rules</SaveButton>
              </form>
            </Card>
          ))}
        </div>
      )}

      {/* 4 · Field → division note */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-faint px-4 py-3">
        <div className="text-[12px] text-muted">
          Field-by-division limits (which fields each age group can use) are set on each field.
        </div>
        <Badge tone="muted">Fields tab</Badge>
      </div>

      {/* 4b · Pool game guarantee */}
      {teamList.length > 0 && (
        <>
          <Eyebrow className="mt-7 mb-3">Pool games per team</Eyebrow>
          <p className="-mt-1 mb-3 text-[12px] text-muted">
            Set a minimum, then add extra games for any team that falls short. Counts
            update after you rebuild the schedule.
          </p>

          <Card>
            <form action={saveMinPoolGames} className="flex flex-col gap-3">
              <input type="hidden" name="tournament_id" value={id} />
              <label className="flex flex-col">
                <span className="eyebrow mb-2">Minimum pool games</span>
                <div className="w-24">
                  <input
                    name="min"
                    type="number"
                    min={0}
                    max={20}
                    defaultValue={minPoolGames}
                    className={inputClass}
                  />
                </div>
              </label>
              <SaveButton savedLabel="Saved ✓">Save minimum</SaveButton>
            </form>

            {/* Per-team counts */}
            <div className="mt-4 flex flex-col gap-1.5">
              {teamList.map((t) => {
                const n = poolCountByTeam.get(t.id) ?? 0;
                const short = minPoolGames > 0 && n < minPoolGames;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-[13px] ${
                      short ? "bg-danger/10" : "bg-haze"
                    }`}
                  >
                    <span className="truncate font-bold">{t.name}</span>
                    <span className={short ? "font-extrabold text-danger" : "font-bold text-muted"}>
                      {n} {n === 1 ? "game" : "games"}
                      {short ? ` · needs ${minPoolGames - n} more` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            {minPoolGames > 0 && belowMin.length === 0 && (
              <p className="mt-3 text-[12px] font-bold text-success">
                Every team meets the {minPoolGames}-game minimum.
              </p>
            )}
          </Card>

          {/* Add an extra game */}
          <Card className="mt-3">
            <form action={addExtraGame} className="flex flex-col gap-3">
              <input type="hidden" name="tournament_id" value={id} />
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col">
                  <span className="eyebrow mb-2">Team</span>
                  <select name="team_a" className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Pick a team
                    </option>
                    {renderTeamOptions()}
                  </select>
                </label>
                <label className="flex flex-col">
                  <span className="eyebrow mb-2">Plays</span>
                  <select name="team_b" className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Pick a team
                    </option>
                    {renderTeamOptions()}
                  </select>
                </label>
              </div>
              <SaveButton savedLabel="Game added ✓">Add extra game</SaveButton>
            </form>

            {extraGames.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {extraGames.map((eg, i) => (
                  <div
                    key={`${eg.a}-${eg.b}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-faint px-3.5 py-2.5 text-[13px]"
                  >
                    <span>
                      <span className="font-bold">{teamName.get(eg.a) ?? "—"}</span>
                      <span className="text-muted"> vs </span>
                      <span className="font-bold">{teamName.get(eg.b) ?? "—"}</span>
                    </span>
                    <form action={removeExtraGame}>
                      <input type="hidden" name="tournament_id" value={id} />
                      <input type="hidden" name="index" value={i} />
                      <button type="submit" className="text-[12px] font-bold text-muted hover:text-danger">
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
                <p className="text-[11px] text-muted">Rebuild the schedule below to place these games.</p>
              </div>
            )}
          </Card>
        </>
      )}

      {/* 5 · Matchup rules */}
      <Eyebrow className="mt-7 mb-3">Matchup rules</Eyebrow>
      <p className="-mt-1 mb-3 text-[12px] text-muted">
        Force or forbid a pairing within a division, or keep two teams (e.g. a shared
        coach) off the same time slot even across divisions.
      </p>

      {teamList.length < 2 ? (
        <p className="text-[13px] text-muted">Add at least two teams first.</p>
      ) : (
        <>
          <Card>
            <form action={addMatchup} className="flex flex-col gap-3">
              <input type="hidden" name="tournament_id" value={id} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Team">
                  <select name="team_a" className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Pick a team
                    </option>
                    {renderTeamOptions()}
                  </select>
                </Field>
                <Field label="Other team">
                  <select name="team_b" className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Pick a team
                    </option>
                    {renderTeamOptions()}
                  </select>
                </Field>
              </div>
              <Field label="Rule">
                <select name="type" className={inputClass} defaultValue="forbid">
                  <option value="forbid">Never play each other (same division)</option>
                  <option value="force">Must meet in pool play (same division)</option>
                  <option value="separate">Never at the same time (any division)</option>
                </select>
              </Field>
              <SaveButton savedLabel="Rule added ✓">Add rule</SaveButton>
            </form>
          </Card>

          {matchups.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {matchups.map((m, i) => {
                const an = teamName.get(m.a) ?? "—";
                const bn = teamName.get(m.b) ?? "—";
                return (
                  <div
                    key={`${m.a}-${m.b}-${m.type}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-faint px-3.5 py-2.5"
                  >
                    <div className="text-[13px]">
                      <span className="font-bold">{an}</span>{" "}
                      <span className="text-muted">{MATCHUP_LABEL[m.type]}</span>{" "}
                      <span className="font-bold">{bn}</span>
                    </div>
                    <form action={removeMatchup}>
                      <input type="hidden" name="tournament_id" value={id} />
                      <input type="hidden" name="index" value={i} />
                      <button type="submit" className="text-[12px] font-bold text-muted hover:text-danger">
                        Remove
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 6 · Bracket field assignments */}
      {bracketFieldSections.length > 0 && (
        <>
          <Eyebrow className="mt-7 mb-3">Bracket field assignments</Eyebrow>
          <p className="-mt-1 mb-3 text-[12px] text-muted">
            Pin any bracket game to a field — the rest of the schedule re-flows around it
            automatically. Leave on &ldquo;Auto&rdquo; to let the scheduler choose.
          </p>
          <div className="flex flex-col gap-4">
            {bracketFieldSections.map((sec) => (
              <div key={sec.id}>
                {sec.name && (
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                    {sec.name}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {sec.games.map((g) => {
                    const key = pinKey(g);
                    const current = fieldPins[key] ?? g.field_id ?? "";
                    const matchup =
                      g.home_team_id || g.away_team_id
                        ? `${teamName.get(g.home_team_id ?? "") ?? "TBD"} v ${teamName.get(g.away_team_id ?? "") ?? "TBD"}`
                        : g.home_seed && g.away_seed
                          ? `#${g.home_seed} v #${g.away_seed}`
                          : "TBD";
                    return (
                      <Card key={g.id}>
                        <form action={setBracketFieldPin} className="flex flex-col gap-3">
                          <input type="hidden" name="tournament_id" value={id} />
                          <input type="hidden" name="game_key" value={key} />
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-[13px] font-bold">
                              {g.bracket_slot ?? `Round ${g.round}`}
                              <span className="ml-1 font-medium text-muted">· {matchup}</span>
                            </span>
                            <div className="w-40 shrink-0">
                              <select name="field_id" defaultValue={current} className={inputClass}>
                                <option value="">Auto</option>
                                {fieldList.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <SaveButton savedLabel="Pinned · schedule updated ✓">
                            Pin field &amp; re-flow
                          </SaveButton>
                        </form>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Regenerate */}
      <form action={regenerateWithConstraints} className="mt-7">
        <input type="hidden" name="tournament_id" value={id} />
        <Button type="submit" className="w-full">
          {hasSchedule ? "Rebuild schedule with these rules" : "Generate schedule with these rules"}
        </Button>
      </form>
      <p className="mt-2 text-center text-[11px] text-muted">
        Constraints apply when the schedule is (re)built. Rebuilding replaces the current games.
      </p>
    </DirectorShell>
  );
}
