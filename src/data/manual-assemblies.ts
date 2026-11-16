import figures from "./manual-figures.json" with { type: "json" };
import type { Part } from "./catalog";
export const manualFigureAssemblyIds: Record<string, string> = {
  "front-strut-exploded": "front-strut",
  "radiator-assembly-m20-m50": "radiator-service",
  "front-brake-caliper-exploded": "front-caliper-service",
  "rear-brake-caliper-exploded": "rear-caliper-service",
  "master-cylinder-exploded": "master-cylinder-service",
  "parking-brake-exploded": "parking-brake-service",
};
export const strutFigurePartIds: Record<string, string> = {
  "1": "strut-cap",
  "2": "strut-top-nut",
  "3": "strut-washer",
  "4": "strut-mount",
  "5": "upper-seat",
  "6": "spring-pad",
  "7": "strut-retaining-collar",
  "8": "coil-spring",
  "9": "strut-insert",
  "10": "strut-housing",
  "11": "bump-stop",
  "12": "strut-dust-tube",
};
export function manualFigurePartId(figure: string, part: string) {
  return figure === "front-strut-exploded"
    ? strutFigurePartIds[part]
    : "manual-" + figure + "-" + part;
}
export const manualFigureParts: Part[] = figures.flatMap((figure) =>
  figure.parts.map((part) => ({
    id: manualFigurePartId(figure.id, part.id),
    number: null,
    name: part.label,
    detail: "Bentley Fig. " + figure.figure + " · " + figure.printedPage,
    quantity: 1,
    assembly: manualFigureAssemblyIds[figure.id],
    ref: part.nativeCallout || part.label,
    source: "manual:" + figure.printedPage,
    sourceLabel: "Bentley · " + figure.printedPage + " / PDF " + figure.pdfPage,
    engines: [],
    model: "",
    market: "",
    review: "reference-only" as const,
    note:
      figure.scope +
      " The figure identifies the component; an OEM ordering number is not established by this manual label. The listed item is a drawing reference, not a vehicle ordering quantity.",
    shape: "reference",
  })),
);
export const manualFigureAssemblies = figures
  .filter((f) => f.id !== "front-strut-exploded")
  .map((figure) => ({
    id: manualFigureAssemblyIds[figure.id],
    title: (
      {
        "radiator-assembly-m20-m50": "Radiator & cooling layout",
        "front-brake-caliper-exploded": "Front caliper — service figure",
        "rear-brake-caliper-exploded": "Rear caliper — service figure",
        "master-cylinder-exploded": "Brake master cylinder",
        "parking-brake-exploded": "Parking brake mechanism",
      } as Record<string, string>
    )[figure.id],
    system: figure.id.startsWith("radiator") ? "cooling" : "brakes",
    group: figure.id.startsWith("radiator") ? "17" : "34",
    code: "MANUAL / " + figure.printedPage,
    source: figure.printedPage,
    description: figure.title,
    boundary: figure.scope,
  }));
