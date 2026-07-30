"use client";

import { useEffect } from "react";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export default function AuthSessionRefresh() {
  useEffect(() => {
    let running = false;

    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch("/api/auth/center/refresh", {
          method: "POST",
          cache: "no-store",
        });
        if (response.status === 401) {
          const cb = window.location.pathname + window.location.search;
          const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(cb)}`;
          window.location.assign(`/api/auth/signout?callbackUrl=${encodeURIComponent(loginUrl)}`);
        }
      } catch {
        // A transient network failure should not log the user out; the next poll retries.
      } finally {
        running = false;
      }
    };

    void refresh();
    const intervalId = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return null;
}
