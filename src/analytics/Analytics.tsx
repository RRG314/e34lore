"use client";
import { useEffect, useState } from "react";
import { useApp, db } from "../components/context";
import { countPublicActivity } from "./activity";
import {
  preferences,
  setPreferences,
  emptyPreferences,
  preferenceEvent,
  preferenceKey,
  startRecording,
  stopRecording,
  forgetBrowser,
  type Preferences,
} from "./client";
export function Analytics({
  path,
  privateView = false,
}: {
  path: string;
  privateView?: boolean;
}) {
  const { authReady } = useApp();
  useEffect(() => {
    if (!privateView && /^\/(?:e30\/)?scanner$/.test(path)) countPublicActivity("scanner_open");
  }, [path, privateView]);
  useEffect(() => {
    let live = true,
      cleanup: undefined | (() => void);
    const run = () => {
      cleanup?.();
      stopRecording();
      if (authReady)
        void startRecording(path, !privateView)
          .then((dispose) => {
            if (live) cleanup = dispose;
            else dispose();
          })
          .catch(() => {});
    };
    run();
    const storage = (e: StorageEvent) => {
      if (e.key === preferenceKey || e.key === null) run();
    };
    window.addEventListener(preferenceEvent, run);
    window.addEventListener("storage", storage);
    return () => {
      live = false;
      cleanup?.();
      stopRecording();
      window.removeEventListener(preferenceEvent, run);
      window.removeEventListener("storage", storage);
    };
  }, [path, privateView, authReady]);
  return null;
}
export function AnalyticsPreferences() {
  const [prefs, setPrefs] = useState<Preferences>(emptyPreferences),
    [enabled, setEnabled] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const update = () => setPrefs(preferences());
    update();
    window.addEventListener(preferenceEvent, update);
    db.rpc("analytics_public_config").then(({ data }) =>
      setEnabled(data?.enabled === true),
    );
    return () => window.removeEventListener(preferenceEvent, update);
  }, []);
  const change = (
    key: "traffic" | "search" | "performance",
    value: boolean,
  ) => {
    const next = { ...prefs, [key]: value };
    if (!next.traffic) {
      next.search = false;
      next.performance = false;
    }
    setPrefs(next);
    setPreferences(next);
  };
  return (
    <div className="analytics-preferences">
      <h3>Optional visit measurements</h3>
      <p>
        {enabled
          ? "You can choose the measurements below. All are off until you opt in."
          : "Expanded visit measurements are not active. Changing a preference does not enable a disabled measurement service."}
      </p>
      <p>
        When enabled and accepted, a random browser identifier lasts 30 days.
        Public pages and interactions are kept for 90 days, with sessions ending
        after 30 minutes of inactivity or four hours. This identifies a browser,
        not a person. Private account, garage, support and management pages are
        excluded.
      </p>
      {(
        [
          [
            "traffic",
            "Public pages and interactions",
            "Page views, technical content, workshop selections, scanner actions and result counts (never photos, OCR text or VINs), approximate browser/device, referring website domain and registered campaign codes. No account IDs, IP addresses, precise location or camera movements.",
          ],
          [
            "search",
            "Technical search topics",
            "Only recognized technical words, selected model and result counts. Raw searches, unmatched numbers, emails, VINs and unknown words are discarded. Requires public-page measurements.",
          ],
          [
            "performance",
            "Performance and failure counts",
            "Core Web Vitals, model-loading time and predefined error categories on public pages. No error messages, stack traces, photographs or private URLs. Requires public-page measurements.",
          ],
        ] as const
      ).map(([key, label, description]) => (
        <div className="privacy-choice" key={key}>
          <label>
            <input
              type="checkbox"
              checked={prefs[key]}
              disabled={!enabled || (key !== "traffic" && !prefs.traffic)}
              onChange={(e) => change(key, e.target.checked)}
            />
            {label}
          </label>
          <p>{description}</p>
        </div>
      ))}
      <p>
        Turning these off stops collection. The identifier stays on this device
        until its 30-day expiry so you can still request deletion. To remove its
        already collected visit history, use the button below before clearing
        browser data. History without a remaining identifier expires within 90
        days. Deletion keeps a hashed marker for 31 days to stop queued retries
        from recreating history. Blocking analytics does not affect your account
        or access to references.
      </p>
      <button
        className="button outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            await forgetBrowser();
            setPrefs(emptyPreferences);
            setMessage(
              "This browser’s visit history was removed and optional visit measurements are off.",
            );
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Remove this browser’s visit history
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
