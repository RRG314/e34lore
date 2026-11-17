declare global {
  interface ImportMetaEnv {
    readonly E34_E30_BUILD?: boolean;
  }
}

export const vehicleSeriesEnabled = import.meta.env.E34_E30_BUILD === true;
