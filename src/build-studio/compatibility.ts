import {
  summarizeFitmentEvidence,
  type FitmentEvidence,
} from "../domain/fitment";
import type { Vehicle } from "../data/catalog";
import type { BuildComponent } from "./schema";
export type BuildCompatibility = {
  status:
    | "verified"
    | "conditional"
    | "incompatible"
    | "fabrication-required"
    | "unknown";
  label: string;
  reasons: string[];
};
/** Source application and owner progress are separate. Geometry never participates. */
export function buildCompatibility(
  component: Pick<
    BuildComponent,
    "kind" | "fabrication" | "wheelFitment" | "system"
  >,
  vehicle: Vehicle,
  evidence: FitmentEvidence[] = [],
): BuildCompatibility {
  const summary = summarizeFitmentEvidence(evidence, vehicle);
  if (summary.status === "incompatible")
    return {
      status: "incompatible",
      label: "Known incompatibility",
      reasons: [
        "An applicable source record documents incompatibility. Review its scope and conditions before proceeding.",
      ],
    };
  if (component.fabrication === "required")
    return {
      status: "fabrication-required",
      label: "Custom fabrication required",
      reasons: [
        "Fabrication was recorded by the owner. Mounting, dimensions, materials and inspection need a documented design.",
      ],
    };
  const reasons: string[] = [];
  if (component.system === "wheels") {
    const w = component.wheelFitment;
    if (
      !w ||
      [w.diameterIn, w.widthIn, w.offsetMm, w.centerBoreMm].some(
        (x) => x === null,
      ) ||
      !w.boltPattern
    )
      reasons.push(
        "Wheel diameter, width, offset, bolt pattern and center bore are incomplete.",
      );
    reasons.push(
      "Brake, tire/body clearance, load rating and suspension travel need measured evidence. A visual preview and an owner checkbox do not establish these.",
    );
  }
  if (summary.status === "conflicting")
    return {
      status: "unknown",
      label: "Conflicting evidence",
      reasons: [
        ...reasons,
        "Applicable source records disagree. Resolve that conflict first.",
      ],
    };
  if (summary.status === "conditional")
    return {
      status: "conditional",
      label: "Catalog application with conditions",
      reasons: [
        ...reasons,
        "Catalog applicability is documented for the selected scope. Check all cited restrictions, transmission/drivetrain interfaces and modified hardware.",
      ],
    };
  return {
    status: "unknown",
    label: "Insufficient compatibility evidence",
    reasons: [
      ...reasons,
      component.kind === "oem"
        ? "No applicable fitment record establishes this target configuration."
        : "Manufacturer/product details are owner-entered. Add source evidence before relying on fitment.",
      "Mounting, dimensions, transmission, drivetrain and electrical interfaces remain unverified.",
    ],
  };
}
