import { toggleFollow } from "@/app/t/actions";

/**
 * Follow toggle. Works for anyone: if the visitor isn't signed in, the server
 * action redirects them to a free follower sign-up that returns here.
 */
export function FollowButton({
  tournamentId,
  teamId,
  isFollowing,
  returnTo,
  size = "md",
}: {
  tournamentId: string;
  teamId: string;
  isFollowing: boolean;
  returnTo: string;
  size?: "sm" | "md";
}) {
  const cls =
    size === "sm"
      ? "h-9 px-3 text-[12px]"
      : "h-11 px-4 text-[13px]";
  return (
    <form action={toggleFollow}>
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <button
        type="submit"
        className={`display inline-flex items-center justify-center rounded-full tracking-wide ${cls} ${
          isFollowing ? "border-2 border-ink text-ink" : "btn-accent"
        }`}
      >
        {isFollowing ? "Following ✓" : "Follow"}
      </button>
    </form>
  );
}
