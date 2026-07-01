import { setFollowerPhone } from "@/app/t/actions";
import { inputClass } from "@/components/ui";

/**
 * Score-alert phone capture for a signed-in follower. Shown on the follower
 * home so texts have somewhere to land.
 */
export function AlertsPhone({
  tournamentId,
  phone,
  followingCount,
}: {
  tournamentId: string;
  phone: string | null;
  followingCount: number;
}) {
  const hasPhone = Boolean(phone);
  return (
    <div className={`mt-6 rounded-2xl p-4 ${hasPhone ? "border border-faint" : "border-2 border-ink"}`}>
      <div className="flex items-center justify-between">
        <div className="display text-[14px]">{hasPhone ? "Text alerts on" : "Turn on text alerts"}</div>
        {hasPhone && <span className="display rounded-md bg-accent px-1.5 py-1 text-[10px] text-ink">ON</span>}
      </div>
      <p className="mt-1 text-[12px] text-muted">
        {followingCount > 0
          ? `Get the director's texts — scores, weather holds and updates — for your ${followingCount} team${followingCount === 1 ? "" : "s"}.`
          : "Follow a team, then get the director's text alerts."}
      </p>
      <form action={setFollowerPhone} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={phone ?? ""}
          className={inputClass}
          placeholder="(555) 123-4567"
        />
        <button type="submit" className="btn-accent flex h-[46px] shrink-0 items-center rounded-xl px-5 text-[13px]">
          {hasPhone ? "Update" : "Save"}
        </button>
      </form>
    </div>
  );
}
