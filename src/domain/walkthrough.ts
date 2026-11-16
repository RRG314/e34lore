import { seriesForModel } from "../series/registry";
import revisions from "../data/guide-revisions.json";
export const guideRevision = (slug: string) =>
  revisions.find((g) => g.guide === slug);
export function guideStepContext(
  guide: string,
  revision: string,
  step: string | number,
) {
  const g = guideRevision(guide),
    number = Number(step);
  return g &&
    g.revision === revision &&
    Number.isInteger(number) &&
    number > 0 &&
    number <= g.steps.length
    ? {
        guide: g.guide,
        revision: g.revision,
        step: number,
        title: g.steps[number - 1],
      }
    : null;
}
export function normalizedChecks(value: unknown, stepCount: number): number[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (x): x is number => Number.isInteger(x) && x >= 0 && x < stepCount,
          ),
        ),
      ].sort((a, b) => a - b)
    : [];
}
export function stepDiscussionHref(
  guide: string,
  step: number,
  system: string,
  pinned?: { revision: string; title: string },
) {
  const g = guideRevision(guide);
  const series = seriesForModel(guide);
  return (
    "/community/new?" +
    new URLSearchParams({
      guide,
      guide_revision: pinned?.revision || g?.revision || "",
      guide_step: String(step),
      ...(series === "e34" ? {} : { series }),
      component: system,
      title: `${pinned?.title || g?.steps[step - 1] || "Walkthrough question"} — step ${step}`,
    }).toString()
  );
}
