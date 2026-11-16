/** Owner approved the bounded photo finder on 9 November 2026.
 * Exact-part experiments, animated repairs and configuration remain local. */
export function featuresFor(environment: string | undefined) {
  const localPreview = environment === "development";
  return Object.freeze({ scanner: true, scannerExperiments: localPreview, interactiveRepairs: localPreview, vehicleConfiguration: localPreview });
}
export const previewFeatures = featuresFor(process.env.NODE_ENV);

/** Provider enablement alone is not evidence of a completed sign-in round trip. */
export function releasedSocialProvider(provider:string){return provider==='google';}

export function heldRoute(path: readonly string[], environment: string | undefined, task?:string) {
  const features = featuresFor(environment);
  return (path[0] === "scanner" && !features.scanner) ||
    (path[0] === "workshop" && path[1] === "repair" && !features.interactiveRepairs && task !== 'center-support-bearing') ||
    (path[0] === "garage" && path[1] === "configuration" && !features.vehicleConfiguration);
}
