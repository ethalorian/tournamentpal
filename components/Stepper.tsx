export function Stepper({ step, total = 4, label }: { step: number; total?: number; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i < step ? "#0a0a0a" : "#ededed" }}
          />
        ))}
      </div>
      <div className="mt-2 text-[11px] font-extrabold uppercase tracking-wider text-muted">
        Step {step} of {total} · {label}
      </div>
    </div>
  );
}
