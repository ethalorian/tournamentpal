"use client";

import { useEffect } from "react";

/** Registers the service worker once, app-wide, so Web Push can be delivered. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal */
      });
    }
  }, []);
  return null;
}
