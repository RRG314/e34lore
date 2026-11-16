import { sanitizeVehicle, type Vehicle } from "../data/catalog";
export const attributes = [
  "manufacturer",
  "platform",
  "model",
  "year",
  "month",
  "market",
  "body",
  "engine",
  "transmission",
  "drivetrain",
  "steering",
  "options",
] as const;
export type Attribute = (typeof attributes)[number];
export type EvidenceKind =
  | "factory"
  | "observed"
  | "modified"
  | "inferred"
  | "unknown";
export type ConfigurationEvidence = {
  id: string;
  attribute: Attribute;
  value: string;
  kind: EvidenceKind;
  source: string;
  created_at?: string;
  supersedes?: string | null;
};
export type Resolution = Partial<Record<Attribute, string>>;
export function resolveConfiguration(
  evidence: ConfigurationEvidence[],
  selection: Resolution,
  baseline: Vehicle,
) {
  const chosen: Partial<Record<Attribute, ConfigurationEvidence>> = {},
    conflicts: Attribute[] = [];
  for (const attribute of attributes) {
    const rows = evidence.filter((e) => e.attribute === attribute),
      explicit = rows.find((e) => e.id === selection[attribute]);
    if (explicit) chosen[attribute] = explicit;
    else {
      const current = rows.filter(
        (e) =>
          ["observed", "modified"].includes(e.kind) &&
          e.value &&
          !rows.some((n) => n.supersedes === e.id),
      );
      if (current.length === 1) chosen[attribute] = current[0];
      else if (new Set(current.map((e) => e.value.toLowerCase())).size > 1)
        conflicts.push(attribute);
    }
  }
  const values = Object.fromEntries(
    Object.entries(chosen)
      .filter(([, e]) => e?.kind !== "unknown")
      .map(([k, e]) => [k, e!.value]),
  );
  const vehicle = sanitizeVehicle({ ...baseline, ...values });
  // An unresolved installed-engine conflict must never fall back to a factory guess.
  if (conflicts.includes("engine")) vehicle.engine = "";
  return {
    vehicle,
    chosen,
    conflicts,
    factory: evidence.filter((e) => e.kind === "factory"),
    inferred: evidence.filter((e) => e.kind === "inferred"),
  };
}
export function validateVin(input: string) {
  const vin = input.trim().toUpperCase();
  return {
    vin,
    valid: /^[A-HJ-NPR-Z0-9]{17}$/.test(vin),
    partial: /^[A-HJ-NPR-Z0-9]{7}$/.test(vin),
  };
}
export function vinCandidates(text: string) {
  return [
    ...new Set(text.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/g) || []),
  ];
}
export function decodeEvidence(
  result: Record<string, unknown>,
): Omit<ConfigurationEvidence, "id">[] {
  const map: Record<string, Attribute> = {
    Make: "manufacturer",
    Model: "model",
    ModelYear: "year",
    BodyClass: "body",
    EngineModel: "engine",
    TransmissionStyle: "transmission",
    DriveType: "drivetrain",
  };
  return Object.entries(map).flatMap(([key, attribute]) => {
    const value = result[key];
    return typeof value === "string" && value.trim() && value.length <= 200
      ? [
          {
            attribute,
            value,
            kind: "factory" as const,
            source:
              "NHTSA vPIC basic decode; manufacturer-submitted, not a BMW build sheet",
          },
        ]
      : [];
  });
}
export function repairApplicability(vehicle: Vehicle) {
  if (vehicle.model && vehicle.model !== "525i") return { status: "incompatible", reason: "This M50/M50TU 525i procedure is not established for your " + vehicle.model + ". Use a walkthrough matching the installed engine and hardware." };
  if (vehicle.engine && !["M50", "M50TU"].includes(vehicle.engine))
    return {
      status: "incompatible",
      reason:
        "This procedure covers the M50/M50TU, not the recorded installed engine.",
    };
  if (
    vehicle.model !== "525i" ||
    !vehicle.engine ||
    !vehicle.year ||
    !vehicle.market
  )
    return {
      status: "unknown",
      reason:
        "Confirm 525i, installed M50/M50TU, U.S. market, production date and matching four-stud cooling hardware.",
    };
  if (
    Number(vehicle.year) < 1991 ||
    Number(vehicle.year) > 1995 ||
    vehicle.market !== "US"
  )
    return {
      status: "unknown",
      reason:
        "The cited procedure covers U.S. 1991–95 525i. Applicability to this configuration needs review.",
    };
  return {
    status: "conditional",
    reason:
      "Confirm the actual pump, tensioner and cooling hardware, especially after modifications.",
  };
}
