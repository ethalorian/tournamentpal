import { inputClass } from "@/components/ui";

export type ThreadMessage = {
  id: string;
  sender_role: string;
  body: string;
  created_at: string;
  broadcast?: boolean;
};

export function MessageThread({
  messages,
  viewerRole,
  action,
  tournamentId,
  teamId,
  placeholder = "Write a message…",
}: {
  messages: ThreadMessage[];
  viewerRole: "director" | "manager";
  action: (formData: FormData) => void | Promise<void>;
  tournamentId: string;
  teamId: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col">
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-faint px-5 py-10 text-center">
          <div className="display text-[15px]">No messages yet</div>
          <div className="mt-1.5 text-[13px] text-muted">Say hello to get the thread started.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {messages.map((m) => {
            const mine = m.sender_role === viewerRole;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[14px] ${
                    mine ? "bg-ink text-white" : "bg-haze text-ink"
                  }`}
                >
                  {m.broadcast && (
                    <div className={`mb-1 text-[9px] font-extrabold uppercase tracking-wider ${mine ? "text-accent" : "text-muted"}`}>
                      Broadcast
                    </div>
                  )}
                  <div className="whitespace-pre-wrap leading-snug">{m.body}</div>
                  <div className={`mt-1 text-[10px] ${mine ? "text-white/50" : "text-muted"}`}>
                    {new Date(m.created_at).toLocaleString("en-US", {
                      weekday: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form action={action} className="mt-5 flex items-end gap-2">
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="team_id" value={teamId} />
        <textarea name="body" rows={2} required className={`${inputClass} resize-none`} placeholder={placeholder} />
        <button type="submit" className="btn-accent flex h-[46px] shrink-0 items-center rounded-xl px-5 text-[14px]">
          Send
        </button>
      </form>
    </div>
  );
}
