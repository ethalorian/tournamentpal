"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hidden until we decide to show

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (sessionStorage.getItem("tp-install-dismissed")) return;

    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua); // Safari only
    if (ios) {
      setIsIOS(true);
      setDismissed(false);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function close() {
    setDismissed(true);
    try {
      sessionStorage.setItem("tp-install-dismissed", "1");
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    close();
  }

  if (dismissed || (!deferred && !isIOS)) return null;

  return (
    <div className="mb-4 rounded-2xl border-2 border-ink bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-[11px] text-accent">
          TP
        </span>
        <div className="flex-1">
          <div className="display text-[14px]">Add to your home screen</div>
          {isIOS ? (
            <p className="mt-1 text-[12px] text-muted">
              Tap the Share button, then <b className="text-ink">Add to Home Screen</b> — that also
              turns on push alerts on iPhone.
            </p>
          ) : (
            <p className="mt-1 text-[12px] text-muted">
              Install the app for fullscreen, home-screen access and instant alerts.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {!isIOS && (
              <button onClick={install} className="btn-accent flex h-9 items-center rounded-full px-4 text-[12px]">
                Install
              </button>
            )}
            <button onClick={close} className="rounded-full border border-faint px-4 text-[12px] font-bold text-muted">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
