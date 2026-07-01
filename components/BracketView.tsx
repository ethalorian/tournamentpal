type BracketGame = {
  id: string;
  round: number;
  bracket_pos: number | null;
  bracket_slot: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_seed: number | null;
  away_seed: number | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

function roundLabel(gamesInRound: number): string {
  switch (gamesInRound) {
    case 1:
      return "Final";
    case 2:
      return "Semifinals";
    case 4:
      return "Quarterfinals";
    default:
      return `Round of ${gamesInRound * 2}`;
  }
}

export function BracketView({
  games,
  teamName,
  focusTeamId,
}: {
  games: BracketGame[];
  teamName: Map<string, string>;
  focusTeamId?: string;
}) {
  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-faint px-5 py-10 text-center">
        <div className="display text-[15px]">No bracket for this format</div>
        <div className="mt-1.5 text-[13px] text-muted">This event is pool play only.</div>
      </div>
    );
  }

  const rounds = [...new Set(games.map((g) => g.round))].sort((a, b) => a - b);
  const byRound = new Map<number, BracketGame[]>();
  for (const r of rounds) {
    byRound.set(
      r,
      games.filter((g) => g.round === r).sort((a, b) => (a.bracket_pos ?? 0) - (b.bracket_pos ?? 0))
    );
  }

  const nm = (id: string | null) => (id ? teamName.get(id) ?? "TBD" : "TBD");

  return (
    <div className="no-scrollbar -mx-5 overflow-x-auto px-5 pb-2 md:-mx-9 md:px-9">
      <div className="flex gap-4">
        {rounds.map((r) => {
          const list = byRound.get(r)!;
          return (
            <div key={r} className="flex shrink-0 flex-col justify-around gap-3">
              <div className="eyebrow text-center">{roundLabel(list.length)}</div>
              {list.map((g) => {
                const final = g.status === "final";
                const homeWon = final && (g.home_score ?? 0) > (g.away_score ?? 0);
                const awayWon = final && (g.away_score ?? 0) > (g.home_score ?? 0);
                const focus =
                  focusTeamId && (g.home_team_id === focusTeamId || g.away_team_id === focusTeamId);
                return (
                  <div
                    key={g.id}
                    className={`w-[168px] rounded-xl border-2 p-2.5 ${focus ? "border-accent bg-accent/10" : "border-faint"}`}
                  >
                    <div className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-muted">
                      {g.bracket_slot ?? roundLabel(list.length)}
                    </div>
                    <Row
                      seed={g.home_seed}
                      name={nm(g.home_team_id)}
                      score={g.home_score}
                      won={homeWon}
                      focus={Boolean(focusTeamId && g.home_team_id === focusTeamId)}
                    />
                    <div className="my-1 h-px bg-faint" />
                    <Row
                      seed={g.away_seed}
                      name={nm(g.away_team_id)}
                      score={g.away_score}
                      won={awayWon}
                      focus={Boolean(focusTeamId && g.away_team_id === focusTeamId)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({
  seed,
  name,
  score,
  won,
  focus,
}: {
  seed: number | null;
  name: string;
  score: number | null;
  won: boolean;
  focus: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`truncate text-[13px] ${won ? "font-extrabold text-ink" : focus ? "font-bold text-ink" : "font-medium text-muted"}`}>
        {seed ? <span className="text-[10px] text-muted">#{seed} </span> : null}
        {name}
      </span>
      <span className={`display text-[14px] ${won ? "text-ink" : "text-muted"}`}>
        {score ?? ""}
      </span>
    </div>
  );
}
