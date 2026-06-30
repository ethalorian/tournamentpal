"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { postScore } from "@/app/director/actions";

function Stepper({
  team,
  value,
  setValue,
}: {
  team: string;
  value: number;
  setValue: (n: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-ink p-5">
      <div className="display text-center text-[16px] leading-tight">{team}</div>
      <div className="display text-[64px] leading-none">{value}</div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setValue(Math.max(0, value - 1))}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink text-[28px] font-bold active:scale-95"
          aria-label={`Decrease ${team}`}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setValue(value + 1)}
          className="btn-accent flex h-14 w-14 items-center justify-center rounded-full text-[28px]"
          aria-label={`Increase ${team}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ isCorrection }: { isCorrection: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-accent flex h-[56px] w-full items-center justify-center rounded-2xl text-[17px] disabled:opacity-50">
      {pending ? "Posting…" : isCorrection ? "Save correction" : "Post final — notify followers"}
    </button>
  );
}

export function ScoreEntry({
  tournamentId,
  gameId,
  homeName,
  awayName,
  homeStart,
  awayStart,
  isCorrection,
}: {
  tournamentId: string;
  gameId: string;
  homeName: string;
  awayName: string;
  homeStart: number;
  awayStart: number;
  isCorrection: boolean;
}) {
  const [home, setHome] = useState(homeStart);
  const [away, setAway] = useState(awayStart);

  return (
    <form action={postScore} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="game_id" value={gameId} />
      <input type="hidden" name="home_score" value={home} />
      <input type="hidden" name="away_score" value={away} />
      {isCorrection && <input type="hidden" name="correction" value="1" />}

      <div className="grid grid-cols-2 gap-3">
        <Stepper team={homeName} value={home} setValue={setHome} />
        <Stepper team={awayName} value={away} setValue={setAway} />
      </div>

      <SubmitButton isCorrection={isCorrection} />
    </form>
  );
}
