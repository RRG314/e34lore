import type { ManualGuide } from "./manual.ts";

export const coveredEngines = ["M20", "M30", "M50", "M50TU", "M60"];

type Draft = Omit<ManualGuide, "source" | "steps" | "reviewStatus" | "sourceChecked" | "durationBasis"> & {
  locator: string;
  pages: number[];
  actions: [title: string, body: string, check: string][];
};

export function workshopDraft({ locator, pages, actions, ...guide }: Draft): ManualGuide {
  return {
    ...guide,
    durationBasis: guide.kind === "planning"
      ? "Estimate for the checks listed here. Build time depends on the car and donor."
      : "Editorial estimate for an accessible, source-matching installation.",
    source: { id: "bentley-e34-upload", title: "BMW 5 Series (E34) Service Manual", section: locator, pdfPages: pages },
    reviewStatus: "draft",
    sourceChecked: true,
    steps: actions.map(([title, body, check]) => ({ title, body, check })),
  };
}
