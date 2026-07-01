"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, deletePushSubscription } from "@/app/push/actions";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied" | "working";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapid) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, [vapid]);

  async function enable() {
    if (!vapid) return;
    setState("working");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });
      const res = await savePushSubscription(sub.toJSON() as never);
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="mt-3 flex items-center justify-between rounded-2xl border border-faint p-4">
      <div>
        <div className="display text-[14px]">Push notifications</div>
        <div className="mt-0.5 text-[12px] text-muted">
          {state === "denied"
            ? "Blocked in your browser settings."
            : state === "on"
              ? "On for this device."
              : "Instant alerts on this device — no phone number needed."}
        </div>
      </div>
      {state === "denied" ? null : state === "on" ? (
        <button onClick={disable} className="display rounded-full border-2 border-ink px-3 py-1.5 text-[11px] tracking-wide">
          Turn off
        </button>
      ) : (
        <button
          onClick={enable}
          disabled={state === "working"}
          className="btn-accent display rounded-full px-4 py-1.5 text-[11px] tracking-wide disabled:opacity-50"
        >
          {state === "working" ? "…" : "Enable"}
        </button>
      )}
    </div>
  );
}
