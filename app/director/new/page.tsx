import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { Stepper } from "@/components/Stepper";
import { Field, inputClass, Button } from "@/components/ui";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { createTournamentDraft } from "@/app/director/actions";

export default function NewTournamentPage() {
  return (
    <DirectorShell showTabs={false}>
      <BackLink href="/director" label="Cancel" />
      <div className="mt-4">
        <Stepper step={1} total={5} label="Details" />
      </div>

      <h1 className="display mt-5 text-[26px]">The basics</h1>
      <p className="mt-1.5 text-[13px] text-muted">
        Name it, pick the sport, set dates and your age divisions.
      </p>

      <form action={createTournamentDraft} className="mt-6 flex flex-col gap-4">
        <Field label="Tournament name">
          <input name="name" required className={inputClass} placeholder="PNW Summer Slam" />
        </Field>

        <Field label="Sport">
          <div className="grid grid-cols-2 gap-2">
            <label className="cursor-pointer">
              <input type="radio" name="sport" value="softball" defaultChecked className="peer sr-only" />
              <div className="rounded-xl border-2 border-faint px-4 py-3 text-center text-[14px] font-bold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
                Softball
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="sport" value="baseball" className="peer sr-only" />
              <div className="rounded-xl border-2 border-faint px-4 py-3 text-center text-[14px] font-bold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
                Baseball
              </div>
            </label>
          </div>
        </Field>

        <Field label="Location" hint="Start typing your city or venue and pick a suggestion.">
          <PlacesAutocomplete name="location" placeholder="Tigard, OR" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input name="start_date" type="date" className={inputClass} />
          </Field>
          <Field label="End date">
            <input name="end_date" type="date" className={inputClass} />
          </Field>
        </div>

        <Field label="Age divisions" hint="Comma-separated, e.g. 10U, 12U, 16U. Leave blank for a single open division.">
          <input name="divisions" className={inputClass} placeholder="10U, 12U, 16U" />
        </Field>

        <Button type="submit" className="mt-2 w-full">
          Continue to teams →
        </Button>
      </form>
    </DirectorShell>
  );
}
