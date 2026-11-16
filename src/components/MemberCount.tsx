"use client";
import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { db } from "./context";

export function MemberCount({ refreshKey = "" }: { refreshKey?: string }) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; count: number | null } | null>(null);
  const key = refreshKey + ":" + retry;
  const current = result?.key === key ? result : null;
  useEffect(() => {
    let live = true;
    let request: AbortController | null = null;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (!live || document.visibilityState === "hidden" || request) return;
      const controller = new AbortController();
      request = controller;
      deadline = setTimeout(() => {
        controller.abort();
        if (live && request === controller) {
          request = null;
          setResult({ key, count: null });
        }
      }, 12000);
      void (async () => {
        try {
          const { data, error } = await db.rpc("community_member_count").abortSignal(controller.signal);
          if (live && request === controller && !controller.signal.aborted)
            setResult({ key, count: !error && Number.isSafeInteger(data) && data >= 0 ? data : null });
        } catch {
          if (live && request === controller && !controller.signal.aborted) setResult({ key, count: null });
        } finally {
          if (request === controller) { clearTimeout(deadline); request = null; }
        }
      })();
    };
    refresh();
    // Other visitors can join while this page stays open. Only poll a visible
    // page; focus/reconnection also refresh the scalar, never account records.
    const interval = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      live = false;
      clearTimeout(deadline); clearInterval(interval); request?.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [key]);
  return <p className="home-member-count" role="status">
    <Users size={16} aria-hidden="true" />
    {!current ? <span>Loading member count…</span> : current.count === null ? <>
      <span>Member count unavailable.</span>
      <button type="button" className="text-link" onClick={() => setRetry(n => n + 1)}>Retry</button>
    </> : <span><strong>{current.count.toLocaleString()}</strong> registered {current.count === 1 ? "member" : "members"}</span>}
  </p>;
}
