import e30SourceIndexes from "../../data/series/e30-catalog-indexes.json";
import type { Vehicle } from "../data/catalog";
import { db } from "../lib/supabase";
import { catalogSearchQuery, type CatalogContext, type CatalogIdentityHit } from "../domain/catalog";
import { catalogOrderingRows } from "../lib/catalog-integrity";
import { vehicleSeriesEnabled } from "./availability";
import { displayModel, type Series } from "./registry";

export function seriesInventory(series: Series) {
  const query = db.from("catalog_inventory").select("*");
  return vehicleSeriesEnabled ? query.eq("series", series) : query.not("model_id", "like", "e__-%");
}

export async function findSeriesCatalogParts(
  series: Series, query: string, contextId: string | undefined,
  limit: number, signal: AbortSignal,
) {
  const { data, error } = await db.rpc("catalog_find_series_parts", {
    search_query: catalogSearchQuery(query),
    series_filter: series,
    context_preference: contextId || null,
    max_results: limit,
  }).abortSignal(signal);
  if (error) throw error;
  return catalogOrderingRows((data || []) as CatalogIdentityHit[]).map(row => ({
    id: row.part_id,
    name: row.name,
    number_normalized: row.number_normalized,
    positionId: row.position_id || undefined,
    assemblyId: row.assembly_id || undefined,
    contextId: row.context_id || undefined,
    contextName: row.context_name || undefined,
  }));
}

export function displayCatalogModels(rows: CatalogContext[]): CatalogContext[] {
  return rows.map(row => {
    const model = displayModel(row.model_id);
    const heading = row.model_year + " " + model;
    const name = row.name.toLowerCase().startsWith(heading.toLowerCase() + " ")
      ? heading + row.name.slice(heading.length)
      : row.name;
    return { ...row, name, model_id: model };
  });
}

export function e30CatalogIndexFor(vehicle: Vehicle) {
  return e30SourceIndexes.find(row => row.model === vehicle.model && row.year === vehicle.year && row.body === vehicle.body);
}

export function e30CatalogSources(model?: string) {
  return e30SourceIndexes.filter(row => !model || row.model === model)
    .toSorted((a, b) => a.model.localeCompare(b.model, "en", {numeric:true}) || Number(a.year) - Number(b.year) || a.body.localeCompare(b.body));
}
