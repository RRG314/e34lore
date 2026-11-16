"use client";
import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import { sanitizeVehicle, type Vehicle } from "../data/catalog";
import type { Series } from "../series/registry";
export type AppState = {
  series: Series;
  seriesEnabled: boolean;
  vehicle: Vehicle;
  vehicleReady: boolean;
  setVehicle: (vehicle: Vehicle) => void;
  user: User | null;
  authReady: boolean;
  authError: string;
  authRevision: number;
  toast: (message: string) => void;
  requireAuth: () => boolean;
};
export const AppContext = createContext<AppState>(null!);
export const useApp = () => useContext(AppContext);

export function rememberVehicle(series: Series, vehicle: Vehicle) {
  try {
    localStorage.setItem(series + ".vehicle.v1", JSON.stringify(sanitizeVehicle(vehicle)));
  } catch {
    // Browser storage may be unavailable.
  }
}
