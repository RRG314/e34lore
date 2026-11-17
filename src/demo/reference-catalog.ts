import { loadCatalogPage, loadCatalogSearch, type CatalogIndex } from "../digital-twin/public/catalog";
import { loadReference } from "../digital-twin/public/load-reference";
import type { CatalogContext, CatalogHit, CatalogPosition } from "../domain/catalog";
import type { Series } from "../series/registry";

const references = {
  e30: "e30-325i-coupe-manual",
  e34: "e34-525i-sedan-automatic",
} satisfies Record<Series, string>;

type BrowseReference = Awaited<ReturnType<typeof browseReference>>;
const loaded = new Map<Series, Promise<BrowseReference>>();

async function browseReference(series: Series) {
  const ref = await loadReference(AbortSignal.timeout(20000), undefined, references[series]);
  const { catalog, vehicleReference: vehicle } = ref;
  if (!catalog || !vehicle) throw Error("The local catalog reference could not load.");
  const context: CatalogContext & { series: Series } = {
    id: catalog.context.id, name: catalog.context.name, scope: catalog.context.scope,
    series, model_id: vehicle.model, model_year: vehicle.year, body: vehicle.body,
    engine: vehicle.engine, market: null, expected_pages: catalog.coverage.expectedPages,
    imported_pages: catalog.coverage.sourcePages, assembly_count: Object.keys(catalog.assemblies).length,
    position_count: catalog.coverage.sourcePositions, distinct_parts: catalog.coverage.distinctNumbers,
    import_status: catalog.coverage.sourcePages >= catalog.coverage.expectedPages ? "complete" : "partial",
  };
  return { catalog, context };
}

function reference(series: Series) {
  const cached = loaded.get(series);
  if (cached) return cached;
  const fetch = browseReference(series).catch(error => {
    loaded.delete(series);
    throw error;
  });
  loaded.set(series, fetch);
  return fetch;
}

const eq = (params: URLSearchParams, field: string) => {
  const raw = params.get(field);
  return raw?.startsWith("eq.") ? raw.slice(3) : null;
};

function assemblyRow(page: CatalogIndex["assemblies"][string]) {
  return { id: page.id, title: page.title, source_category: page.category,
    source_id: page.key, boundary: page.key, catalog_context_id: page.contextId };
}

async function positionRows(ref: BrowseReference, assemblyId: string, signal: AbortSignal) {
  const page = await loadCatalogPage(assemblyId, signal, ref.catalog);
  return page.items.map(item => ({
    id: item.id, part_id: item.partId, assembly_id: assemblyId, context_id: ref.context.id,
    reference: item.reference, source_name: item.name, required_quantity: item.quantity,
    package_quantity: item.packageQuantity, conditions: item.conditions, source_url: page.sourceUrl,
    source_sha256: page.sourceSha256, active: true,
    parts: { id: item.partId, name: item.name, number_normalized: item.number },
    assemblies: assemblyRow(ref.catalog.assemblies[assemblyId]), vehicle_catalog_contexts: ref.context,
  } satisfies CatalogPosition & { assemblies: ReturnType<typeof assemblyRow>; vehicle_catalog_contexts: CatalogContext; package_quantity: number | null }));
}

export async function referenceCatalogRows(table: string, params: URLSearchParams, signal: AbortSignal): Promise<object[]> {
  const series = !eq(params,"series") ? Object.keys(references) as Series[] :
    (Object.keys(references) as Series[]).filter(key => key === eq(params,"series"));
  const refs = await Promise.all(series.map(reference));
  signal.throwIfAborted();
  if (table === "catalog_inventory") return refs.map(ref => ref.context);
  if (table === "assemblies") return refs.flatMap(ref => Object.values(ref.catalog.assemblies).map(assemblyRow));

  const assembly = eq(params,"assembly_id"), position = table === "part_assembly_positions" && eq(params,"id");
  const part = eq(params,table === "parts" ? "id" : "part_id");
  const requestedAssembly = assembly || (position ? position.split("-").slice(0,-1).join("-") : null);
  if (requestedAssembly) {
    const ref = refs.find(ref => !!ref.catalog.assemblies[requestedAssembly]);
    return ref ? await positionRows(ref,requestedAssembly,signal) : [];
  }
  if (!part) return [];
  const parts: object[] = [], positions: CatalogPosition[] = [];
  for (const ref of refs) {
    const index = await loadCatalogSearch(signal,ref.catalog);
    const matches = index.filter(row => row.partId === part);
    if (!matches.length) continue;
    if (table === "parts") {
      const match = matches[0], page = ref.catalog.assemblies[match.assemblyId];
      parts.push({ id: match.partId, name: match.name, number_normalized: match.number, detail: {},
        sources: { title: page.title, url: page.sourceUrl } });
      break;
    }
    for (const id of new Set(matches.map(row => row.assemblyId))) {
      positions.push(...(await positionRows(ref,id,signal)).filter(row => row.part_id === part));
    }
  }
  return table === "parts" ? parts : positions;
}

export async function referenceCatalogSearch(data: Record<string, unknown>, signal: AbortSignal): Promise<CatalogHit[]> {
  const words = typeof data.search_query === "string" ? data.search_query.toLowerCase().match(/[a-z0-9]+/g) || [] : [];
  const series = (Object.keys(references) as Series[]).filter(key => !data.series_filter || data.series_filter === key);
  const results: CatalogHit[] = [];
  for (const ref of await Promise.all(series.map(reference))) {
    if (data.context_filter && data.context_filter !== ref.context.id) continue;
    const rows = await loadCatalogSearch(signal,ref.catalog);
    for (const row of rows) {
      if (!words.every(word => (row.name.toLowerCase()+" "+row.number).includes(word))) continue;
      const { number, positionId, assemblyId } = row;
      if (typeof data.after_number === "string" && (number < data.after_number || number === data.after_number &&
        (typeof data.after_position !== "string" || positionId <= data.after_position))) continue;
      results.push({ position_id: positionId, part_id: row.partId, number_normalized: number, name: row.name,
        assembly_id: assemblyId, assembly_title: ref.catalog.assemblies[assemblyId].title,
        context_id: ref.context.id, context_name: ref.context.name, reference: "", required_quantity: null, conditions: [] });
    }
  }
  results.sort((a,b) => a.number_normalized.localeCompare(b.number_normalized) || a.position_id.localeCompare(b.position_id));
  const unique = data.after_position || data.context_filter ? results :
    [...new Map([...results].reverse().map(row => [row.part_id,row])).values()].reverse();
  return unique.slice(0,typeof data.max_results === "number" ? Math.min(100,Math.max(1,data.max_results)) : 31);
}
