import backend from "../data/backend.json";

declare global {
  interface ImportMetaEnv {
    readonly E34_E30_BUILD?: boolean;
  }
}

export const vehicleSeriesEnabled = import.meta.env.E34_E30_BUILD === true
  || (import.meta.env.DEV && (backend as {e30OwnerReview?: boolean}).e30OwnerReview === true);
