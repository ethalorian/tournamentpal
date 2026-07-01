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

type Mode = "none" | "prompt" | "ios-safari" | "ios-other";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [mode, setMode] = useState<Mode>("none");
  const [dismissed, setDismissed] = useState(true); // hidden until we decide to show

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (sessionStorage.getItem("tp-install-dismissed")) return;

    const ua = window.navigator.userAgent;
    const isIOSDevice = /iphone|ipad|ipod/i.test(ua);
    if (isIOSDevice) {
      // iOS can only install PWAs from Safari — other browsers can't.
      const isSafari = !/crios|fxios|edgios|opios/i.test(ua);
      setMode(isSafari ? "ios-safari" : "ios-other");
      setDismissed(false);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setMode("prompt");
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

  if (dismissed || mode === "none") return null;

  return (
    <div className="mb-4 rounded-2xl border-2 border-ink bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-[11px] text-accent">
          TP
        </span>
        <div className="flex-1">
          <div className="display text-[14px]">
            {mode === "ios-other" ? "Install on iPhone" : "Add to your home screen"}
          </div>
          {mode === "ios-safari" && (
            <p className="mt-1 text-[12px] text-muted">
              Tap the <b className="text-ink">Share</b> button, then{" "}
              <b className="text-ink">Add to Home Screen</b> — that also turns on push alerts on iPhone.
            </p>
          )}
          {mode === "ios-other" && (
            <p className="mt-1 text-[12px] text-muted">
              On iPhone, apps can only be installed from <b className="text-ink">Safari</b>. Open this page
              in Safari, then <b className="text-ink">Share → Add to Home Screen</b>.
            </p>
          )}
          {mode === "prompt" && (
            <p className="mt-1 text-[12px] text-muted">
              Install the app for fullscreen, home-screen access and instant alerts.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {mode === "prompt" && (
              <button onClick={install} className="btn-accent flex h-9 items-center rounded-full px-4 text-[12px]">
                Install
              </button>
            )}
            <button onClick={close} className="rounded-full border border-faint px-4 text-[12px] font-bold text-muted">
              {mode === "prompt" ? "Not now" : "Got it"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
