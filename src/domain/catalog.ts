import type { TechnicalDrawing } from "../data/diagrams";
import { availableDrawingImage } from "./drawing-rights";
export type CatalogContext = {
  id: string;
  name: string;
  model_id: string;
  model_year: number;
  body: string | null;
  engine: string | null;
  market: string | null;
  expected_pages: number;
  imported_pages: number;
  assembly_count: number;
  position_count: number;
  distinct_parts: number;
  scope: string;
  import_status: string;
};
export type CatalogAssembly = {
  id: string;
  title: string;
  source_category: string;
  source_id: string;
  boundary: string;
  catalog_context_id: string;
};
export type CatalogPosition = {
  id: string;
  part_id: string;
  assembly_id: string;
  context_id: string;
  reference: string;
  source_name: string;
  required_quantity: number | null;
  package_quantity: number | null;
  conditions: { name: string; value: string }[];
  source_url: string;
  source_sha256: string;
  active: boolean;
  parts: { id: string; name: string; number_normalized: string };
};
export type SourceDrawing = {
  id: string;
  source_label?: string;
  assembly_id: string;
  image_path: string | null;
  remote_url: string | null;
  pixel_width: number | null;
  pixel_height: number | null;
  credit: string;
  applicability: string;
  rights_status: string;
  coordinate_space: "native" | "percent";
  hotspots: {
    reference: string;
    left: number;
    top: number;
    width: number;
    height: number;
  }[];
};
export type CatalogHit = {
  position_id: string;
  part_id: string;
  number_normalized: string;
  name: string;
  assembly_id: string;
  assembly_title: string;
  context_id: string;
  context_name: string;
  reference: string;
  required_quantity: number | null;
  conditions: { name: string; value: string }[];
};
export function sourceDrawingAdapter(
  drawing: SourceDrawing,
  positions: CatalogPosition[],
  dimensions?: { width: number; height: number },
): TechnicalDrawing {
  const width = dimensions?.width || drawing.pixel_width || 1288,
    height = dimensions?.height || drawing.pixel_height || 910;
  return {
    id: drawing.id,
    assembly: drawing.assembly_id,
    image: availableDrawingImage(drawing.image_path, drawing.remote_url),
    width,
    height,
    label: drawing.source_label || "Catalog drawing",
    credit: drawing.credit,
    source: positions[0]?.source_url || "/resources",
    scope: drawing.applicability,
    hotspots: drawing.hotspots.flatMap((spot) => {
      const ids = positions
        .filter((p) => p.reference === spot.reference)
        .map((p) => p.id);
      if (!ids.length) return [];
      const divisorX = drawing.coordinate_space === "percent" ? 100 : width,
        divisorY = drawing.coordinate_space === "percent" ? 100 : height;
      return [
        {
          partIds: ids,
          label: spot.reference,
          x: (spot.left + spot.width / 2) / divisorX,
          y: (spot.top + spot.height / 2) / divisorY,
          width: Math.max(0.04, spot.width / divisorX),
          height: Math.max(0.05, spot.height / divisorY),
        },
      ];
    }),
  };
}
export function formatCatalogCondition(name: string, value: string) {
  return /production date/i.test(name)
    ? value.replace(/\b((?:19|20)\d{2})(0[1-9]|1[0-2])\b/g, "$2/$1")
    : value;
}

export function catalogProductionDateStatus(conditions: CatalogPosition["conditions"], vehicle: Pick<CatalogVehicle, "year"> & { month: string }) {
  const values = conditions.filter(row => /^production date$/i.test(row.name.trim())).map(row => row.value);
  if (!values.length) return "unstated";
  const month = Number(vehicle.month);
  if (!/^\d{4}$/.test(vehicle.year) || !/^\d{1,2}$/.test(vehicle.month) || month < 1 || month > 12) return "need-date";
  const actual = vehicle.year + String(month).padStart(2, "0");
  const statuses = values.flatMap(value => value.split(",")).map(value => {
    const range = value.trim().match(/^((?:19|20)\d{2}(?:0[1-9]|1[0-2]))\s*[-–]\s*((?:19|20)\d{2}(?:0[1-9]|1[0-2]))$/);
    const boundary = value.trim().match(/^(from|till|until)\s+((?:19|20)\d{2}(?:0[1-9]|1[0-2]))$/i);
    const from = range?.[1] || (boundary?.[1].toLowerCase() === "from" ? boundary[2] : undefined);
    const to = range?.[2] || (boundary && boundary[1].toLowerCase() !== "from" ? boundary[2] : undefined);
    if ((!from && !to) || (from && to && from > to)) return "check";
    if (actual === from || actual === to) return "boundary";
    return (from && actual < from) || (to && actual > to) ? "outside" : "within";
  });
  if (statuses.includes("check")) return "check";
  if (statuses.includes("boundary")) return "boundary";
  return statuses.every(status => status === "outside") ? "outside" : "within";
}
export function catalogPositionHref(position: {
  context_id: string;
  assembly_id: string;
  id?: string;
  position_id?: string;
}) {
  return (
    "/parts/catalog?context=" +
    encodeURIComponent(position.context_id) +
    "&assembly=" +
    encodeURIComponent(position.assembly_id) +
    "&position=" +
    encodeURIComponent(position.id || position.position_id || "")
  );
}

export type CatalogIdentityHit = {
  position_id: string | null;
  part_id: string;
  number_normalized: string;
  name: string;
  assembly_id: string | null;
  assembly_title: string | null;
  context_id: string | null;
  context_name: string | null;
  reference: string | null;
};
export function catalogIdentityHref(hit: CatalogIdentityHit) {
  return hit.position_id && hit.context_id && hit.assembly_id
    ? catalogPositionHref({
        context_id: hit.context_id,
        assembly_id: hit.assembly_id,
        position_id: hit.position_id,
      })
    : "/parts/catalog?part=" + encodeURIComponent(hit.part_id);
}

export function catalogCsvCell(value: unknown) {
  const text = String(value ?? "");
  return (
    '"' +
    (/^[\s]*[=+\-@]/.test(text) ? "'" : "") +
    text.replaceAll('"', '""') +
    '"'
  );
}

export function orderingNotes(
  position: Pick<
    CatalogPosition,
    "conditions" | "required_quantity" | "package_quantity"
  >,
) {
  return position.conditions.filter(
    (c) =>
      !(
        c.name.toLowerCase() === "require quantity" &&
        position.required_quantity !== null &&
        String(position.required_quantity) === c.value
      ) &&
      !(
        c.name.toLowerCase() === "package quantity" &&
        position.package_quantity !== null &&
        String(position.package_quantity) === c.value
      ),
  );
}

type CatalogVehicle = Pick<import("../data/catalog").Vehicle, "model" | "year" | "body" | "engine" | "market">;

const contextFields = [
  ["year", "model_year"],
  ["body", "body"],
  ["engine", "engine"],
  ["market", "market"],
] as const;

export function catalogContextMatch(context: CatalogContext, vehicle: CatalogVehicle) {
  if (!vehicle.model) return "sample";
  if (context.model_id !== vehicle.model) return "different";
  let complete = true;
  for (const [vehicleKey, contextKey] of contextFields) {
    const actual = vehicle[vehicleKey].toLowerCase();
    const listed = String(context[contextKey] ?? "").toLowerCase();
    if (actual && listed && actual !== listed) return "different";
    if (!actual || !listed) complete = false;
  }
  return complete ? "matching" : "partial";
}

export function preferredCatalogContext(
  contexts: CatalogContext[],
  vehicle: CatalogVehicle,
  remembered = "",
) {
  const saved = contexts.find((context) => context.id === remembered);
  if (!vehicle.model) {
    return saved || contexts.find((context) => context.name === "1994 525i Sedan") || contexts[0];
  }
  const compatible = contexts.filter((context) => catalogContextMatch(context, vehicle) !== "different");
  const score = (context: CatalogContext) => contextFields.filter(([key, field]) =>
    vehicle[key] && context[field] != null,
  ).length;
  const ordered=compatible.toSorted((a,b)=>score(b)-score(a));
  if(!ordered.length)return undefined;
  const best=ordered.filter(c=>score(c)===score(ordered[0]));
  return best.find(c=>c.id===remembered)||(best.length===1?best[0]:undefined);
}

/** Common owner wording mapped to the source's component vocabulary. */
export function catalogSearchQuery(value: string) {
  const query = value.trim().slice(0,180).replace(/\bbrake rotors?\b/gi,'brake disc');
  if (/^(?:(?:drive[ -]?shaft|propeller shaft) )?cent(?:er|re) (?:(?:drive[ -]?shaft|propeller shaft) )?support(?: bearing)?$/i.test(query)) {
    return '"centre mount" OR "center support bearing" OR "centre support bearing"';
  }
  if (/\bwater[ -]?pump\b/i.test(query)) {
    const alternatives = query.replace(/\bwater[ -]?pump\b/gi,'"water pump"') +
      ' OR ' + query.replace(/\bwater[ -]?pump\b/gi,'"coolant pump"');
    return alternatives.length <= 200 ? alternatives : query;
  }
  return query;
}
