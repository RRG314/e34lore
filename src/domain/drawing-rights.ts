/** Copies awaiting permission stay outside the release. Their source links and
 * callout metadata remain usable; don't replace them with an unlicensed hotlink. */
export const sourceOnlyDrawingPaths = new Set([
  "/assets/diagrams/strut-upper.png", "/assets/diagrams/water-pump.png",
  "/assets/diagrams/strut-damper.jpg", "/assets/diagrams/brake-disc.png",
  "/assets/diagrams/front-caliper.png",
]);
export function availableDrawingImage(local?: string | null, remote?: string | null): string {
  if (local && sourceOnlyDrawingPaths.has(local)) return "";
  return local || remote || "";
}
