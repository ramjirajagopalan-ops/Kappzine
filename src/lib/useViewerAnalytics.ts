"use client";

import { useEffect, useRef } from "react";

function getSessionId(slug: string): string {
  const key = `kzn_session_${slug}`;
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    if (typeof window !== "undefined") localStorage.setItem(key, id);
  }
  return id;
}

function deviceType(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

/** Pings /api/view/[slug]/track on mount, periodically, and on unload. */
export function useViewerAnalytics(slug: string, maxPageRef: React.RefObject<number>) {
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
    const sessionId = getSessionId(slug);

    function send(keepalive: boolean) {
      const payload = JSON.stringify({
        sessionId,
        maxPageReached: maxPageRef.current,
        durationSeconds: Math.round((Date.now() - (startRef.current ?? Date.now())) / 1000),
        referrer: document.referrer || null,
        deviceType: deviceType(),
      });
      if (keepalive && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/view/${slug}/track`, new Blob([payload], { type: "application/json" }));
      } else {
        fetch(`/api/view/${slug}/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive,
        }).catch(() => {});
      }
    }

    send(false);
    const interval = setInterval(() => send(false), 20000);
    const onHide = () => send(true);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") send(true);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", onHide);
      send(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
}
