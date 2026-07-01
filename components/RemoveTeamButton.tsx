"use client";

import { removeTeam } from "@/app/director/actions";

/**
 * Remove-team control. Once the tournament is past draft (schedule generated),
 * it warns before removing, since that empties the team's slots in existing
 * games and the schedule should be regenerated afterward.
 */
export function RemoveTeamButton({
  teamId,
  tournamentId,
  teamName,
  warn,
}: {
  teamId: string;
  tournamentId: string;
  teamName: string;
  warn: boolean;
}) {
  return (
    <form
      action={removeTeam}
      onSubmit={(e) => {
        if (
          warn &&
          !window.confirm(
            `Remove ${teamName}?\n\nThis event is live, so its games are already scheduled. Removing the team empties its slots in those games — regenerate the schedule from Review afterward.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <button type="submit" className="text-[12px] font-bold text-muted hover:text-danger">
        Remove
      </button>
    </form>
  );
}
