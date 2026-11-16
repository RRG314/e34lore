"use client";
import {navigateDocument} from "./DocumentLink";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { db } from "../lib/supabase";
import { demoBackend } from "../lib/backend";
import { AppContext, rememberVehicle } from "../lib/app-state";
import { OwnedCarsProvider } from "../vehicle/use-owned-cars";
export { db } from "../lib/supabase";
export { useApp } from "../lib/app-state";
import { sanitizeVehicle, type Vehicle } from "../data/catalog";
import {
  initialAccountSnapshot,
  observeAccountSession,
} from "../lib/auth-session";
import { defaultSeries, seriesDefaultVehicle, type Series } from "../series/registry";
export function AppProvider({ children, series = defaultSeries, seriesEnabled = false }: { children: ReactNode; series?: Series; seriesEnabled?: boolean }) {
  const [vehicle, setV] = useState<Vehicle>(() => seriesDefaultVehicle(series)),
    [account, setAccount] = useState(initialAccountSnapshot),
    [message, setMessage] = useState(""),
    [vehicleReady,setVehicleReady]=useState(false);
  const { user, authReady, authError, authRevision } = account;
  useEffect(() => {
    return observeAccountSession(db.auth, setAccount);
  }, []);
  // Restore the existing device preference after SSR.
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(series + ".vehicle.v1") || "null",
      );
      if (saved && typeof saved.model === "string")
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the sanitized external localStorage preference.
        setV(sanitizeVehicle(saved));
    } catch {} finally {setVehicleReady(true);}
  }, [series]);
  const setVehicle = useCallback((v: Vehicle) => {
    const clean = sanitizeVehicle(v);
    setV(clean);
    rememberVehicle(series, clean);
  }, [series]);
  const toast = useCallback((s: string) => setMessage(s), []);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(id);
  }, [message]);
  const requireAuth = () => {
    if (user && !user.is_anonymous) return true;
    if (demoBackend) {
      toast("Connect a local Supabase instance to save or contribute.");
      return false;
    }
    navigateDocument(
      "/account?next=" +
        encodeURIComponent(window.location.pathname + window.location.search),
    );
    return false;
  };
  return (
    <AppContext.Provider
      value={{
        series, seriesEnabled, vehicle,
        vehicleReady,
        setVehicle,
        user,
        authReady,
        authError,
        authRevision,
        toast,
        requireAuth,
      }}
    >
      <OwnedCarsProvider>{children}</OwnedCarsProvider>
      {message && (
        <div role="status" className="toast">
          {message}
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
export async function saveBookmark(
  kind: "guide" | "part" | "article" | "thread",
  target_id: string,
  title: string,
) {
  const { error } = await db
    .from("bookmarks")
    .upsert(
      { kind, target_id, title },
      { onConflict: "user_id,kind,target_id" },
    );
  if (error) throw error;
}
