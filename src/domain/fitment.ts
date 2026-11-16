import type { Part, Vehicle } from "../data/catalog";
export function normalizePartNumber(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}
export function evaluateFitment(
  part: Part,
  vehicle: Vehicle,
): {
  status: "unknown" | "incompatible" | "conditional";
  label: string;
  reasons: string[];
} {
  if (part.review === "reference-only")
    return {
      status: "unknown",
      label: "Fitment not established",
      reasons: ["OEM identity and configuration scope have not been reviewed."],
    };
  if (!vehicle.model)
    return {
      status: "unknown",
      label: "Select your E34",
      reasons: ["Model, engine, market and production date are needed."],
    };
  if (vehicle.model !== part.model)
    return {
      status: "unknown",
      label: "Not documented for this model",
      reasons: [
        "This catalog record does not establish applicability to " +
          vehicle.model +
          ".",
      ],
    };
  if (
    vehicle.engine &&
    part.engines.length &&
    !part.engines.includes(vehicle.engine)
  )
    return {
      status: "incompatible",
      label: "Different engine family",
      reasons: [
        "The cited catalog assembly uses " + part.engines.join(" / ") + ".",
      ],
    };
  const reasons: string[] = [];
  if (!vehicle.engine) reasons.push("Engine family is missing.");
  if (!vehicle.market) reasons.push("Sales market is missing.");
  else if (part.market && vehicle.market !== part.market)
    reasons.push(
      "Catalog market is " +
        part.market +
        "; " +
        vehicle.market +
        " applicability is not established.",
    );
  if (part.body && !vehicle.body) reasons.push("Body style is missing; catalog selection is " + part.body + ".");
  else if (part.body && vehicle.body !== part.body) reasons.push("This source selection is " + part.body + "; applicability to " + vehicle.body + " is not established.");
  if (!vehicle.year || !vehicle.month)
    reasons.push("Production month is missing.");
  else {
    const date = vehicle.year + "-" + vehicle.month;
    if (part.from && date < part.from)
      return {
        status: "incompatible",
        label: "Outside catalog date range",
        reasons: ["Catalog listing begins " + part.from + "."],
      };
    if (part.to && date > part.to)
      return {
        status: "incompatible",
        label: "Outside catalog date range",
        reasons: ["Catalog listing ends " + part.to + "."],
      };
  }
  reasons.push(
    "Check equipment, actual assembly, current supersession and supplier confirmation before ordering.",
  );
  return {
    status: "conditional",
    label: "Catalog match needs confirmation",
    reasons,
  };
}
export function formatPartNumber(value: string | null) {
  return value
    ? value.replace(/^(\d{2})(\d{2})(\d)(\d{3})(\d{3})$/, "$1 $2 $3 $4 $5")
    : "Not yet cataloged";
}

export type FitmentEvidence = {
  id: string;
  model_id: string | null;
  engine: string | null;
  market: string | null;
  body: string | null;
  production_from: string | null;
  production_to: string | null;
  status: "confirmed" | "conditional" | "unverified" | "incompatible";
  conditions: string;
};

const fitmentFields = [
  ["model", "model_id"],
  ["engine", "engine"],
  ["market", "market"],
  ["body", "body"],
] as const;

export function fitmentEvidenceScope(row: FitmentEvidence, vehicle: Vehicle) {
  let missing = !vehicle.model;
  for (const [field, column] of fitmentFields) {
    const required = row[column]?.toLowerCase();
    if (!required) continue;
    const actual = vehicle[field].toLowerCase();
    if (actual && actual !== required) return "outside";
    if (!actual) missing = true;
  }
  if (row.production_from || row.production_to) {
    const month = Number(vehicle.month);
    if (!/^[1-9]\d{3}$/.test(vehicle.year) || !/^\d{2}$/.test(vehicle.month) || month < 1 || month > 12) {
      missing = true;
    } else {
      const first = vehicle.year + "-" + vehicle.month + "-01";
      const last = first.slice(0, 8) + String(new Date(Date.UTC(Number(vehicle.year), month, 0)).getUTCDate());
      if ((row.production_from && last < row.production_from) || (row.production_to && first > row.production_to))
        return "outside";
      if ((row.production_from && first < row.production_from) || (row.production_to && last > row.production_to))
        missing = true;
    }
  }
  return missing ? "incomplete" : "matches";
}

export function summarizeFitmentEvidence(rows: FitmentEvidence[], vehicle: Vehicle) {
  const scoped = rows.map((row) => ({ ...row, scope: fitmentEvidenceScope(row, vehicle) }));
  const matching = scoped.filter((row) => row.scope === "matches");
  const positive = matching.some((row) => row.status === "confirmed" || row.status === "conditional");
  const negative = matching.some((row) => row.status === "incompatible");
  const status = positive && negative ? "conflicting"
    : negative ? "incompatible"
    : positive ? "conditional"
    : "unknown";
  return { status, rows: scoped } as const;
}

/** Explain recorded scope without extending a catalog entry to unrecorded equipment. */
export function fitmentEvidenceQuestions(row: FitmentEvidence, vehicle: Vehicle): string[] {
  const questions: string[] = [];
  const names = { model: "model", engine: "engine", market: "market", body: "body style" };
  for (const [field, column] of fitmentFields) {
    if (!vehicle[field]) questions.push("Choose your " + names[field] + ".");
    else if (!row[column]) questions.push("This record does not specify the " + names[field] + ".");
    else if (vehicle[field].toLowerCase() !== row[column]?.toLowerCase())
      questions.push("Your " + names[field] + " differs from this source.");
  }
  if (!vehicle.year || !/^0[1-9]$|^1[0-2]$/.test(vehicle.month)) questions.push("Check the production month.");
  if (!row.production_from && !row.production_to) questions.push("No production-date limits are recorded.");
  if (row.status === "unverified") questions.push("This application has not been verified.");
  if (fitmentEvidenceScope(row, vehicle) === "incomplete" && row.production_from && row.production_to && vehicle.year && vehicle.month)
    questions.push("The source uses a day-level date limit; the production month alone may not resolve it.");
  return questions;
}
