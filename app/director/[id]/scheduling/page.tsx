import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Eyebrow, Field, inputClass, Button, Badge, Card } from "@/components/ui";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import {
  saveScheduleConfig,
  saveDivisionWindow,
  saveTeamConstraints,
  regenerateWithConstraints,
  addMatchup,
  removeMatchup,
  saveGameWindows,
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
    supabase.from("games").select("id,home_team_id,away_team_id,scheduled_at,field_id,stage").eq("tournament_id", id),
  ]);
  const divList = divisions ?? [];
  const teamList = teams ?? [];
  const fieldList = fields ?? [];
  const teamName = new Map(teamList.map((t) => [t.id, t.name]));

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
  const windowDays = enumerateDays(tournament.start_date, tournament.end_date).map((day) => {
    const blocks: { key: string; label: string }[] = [];
    for (let t = winStart; t + gLen <= winEnd; t += winStep) {
      blocks.push({ key: `${day}__${t}`, label: fmtMin(t) });
    }
    return { day, blocks };
  });
  const allWindowKeys = windowDays.flatMap((d) => d.blocks.map((b) => b.key));

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
          <div className="grid grid-cols-2 gap-3">
            <Field label="First game start">
              <input name="day_start" type="time" defaultValue={cfg.dayStart} className={inputClass} />
            </Field>
            <Field label="Day end (last game out by)">
              <input name="day_end" type="time" defaultValue={cfg.dayEnd} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Game length (min)">
              <input name="game_length" type="number" inputMode="numeric" defaultValue={cfg.gameLengthMins} className={inputClass} />
            </Field>
            <Field label="Buffer between games (min)">
              <input name="buffer" type="number" inputMode="numeric" defaultValue={cfg.bufferMins} className={inputClass} />
            </Field>
          </div>
          <Button type="submit" variant="ink" className="w-full">Save playing window</Button>
        </form>
      </Card>

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
                  <Button type="submit" variant="ink" className="w-full">Save</Button>
                </form>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 2b · Game windows painted by division */}
      {divList.length > 0 && allWindowKeys.length > 0 && (
        <>
          <Eyebrow className="mt-7 mb-3">Game windows by division</Eyebrow>
          <p className="-mt-1 mb-3 text-[12px] text-muted">
            Tag each time block with the divisions allowed to play then — e.g. give 16U
            the first two blocks and 18U the third. Leave a block untagged to open it to
            all divisions.
          </p>
          <Card>
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
              <Button type="submit" variant="ink" className="w-full">
                Save game windows
              </Button>
            </form>
          </Card>
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
                <Button type="submit" variant="ink" className="w-full">Save team rules</Button>
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
              <Button type="submit" variant="ink" className="w-full">
                Add rule
              </Button>
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
