import type { CatalogAssembly, CatalogContext, CatalogHit, CatalogPosition, SourceDrawing } from "../domain/catalog";
import type { Series } from "../series/registry";

export const fixtureSource = {
  title: "Workshop demonstration",
  url: "/resources",
};

const entries = {
  e34: { year: 1995, model: "525i", engine: "M50TU", body: "Sedan", transmission: "Automatic", number: "99000034001" },
  e30: { year: 1991, model: "325i", engine: "M20", body: "Coupe", transmission: "Manual", number: "99000030001" },
};

function catalogFor(series: Series) {
  const entry = entries[series];
  const contextId = series + "-demo-catalog", assemblyId = series + "-demo-cooling";
  const partId = series + "-demo-pump", positionId = assemblyId + "-01";
  const context: CatalogContext & { series: Series } = {
    id: contextId, series, name: `Demo · ${entry.model} ${entry.body}`, model_id: entry.model,
    model_year: entry.year, body: entry.body, engine: entry.engine, market: null,
    expected_pages: 1, imported_pages: 1, assembly_count: 1, position_count: 1, distinct_parts: 1,
    scope: "Synthetic example. Use a manufacturer catalog for ordering.", import_status: "complete",
  };
  const assembly: CatalogAssembly = {
    id: assemblyId, title: "Sample cooling assembly", source_category: "Cooling",
    source_id: "demo", boundary: "Demo assembly", catalog_context_id: contextId,
  };
  const part = {
    id: partId, name: "Sample coolant pump", number_normalized: entry.number,
    detail: { description: "Synthetic part record for testing search and assembly navigation." },
    sources: fixtureSource,
  };
  const conditions = [{ name: "Use", value: "Demonstration only" }];
  const position: CatalogPosition = {
    id: positionId, part_id: partId, assembly_id: assemblyId, context_id: contextId,
    reference: "01", source_name: part.name, required_quantity: 1, package_quantity: null,
    conditions, source_url: fixtureSource.url, source_sha256: "0".repeat(64), active: true, parts: part,
  };
  const hit: CatalogHit = {
    position_id: positionId, part_id: partId, number_normalized: entry.number, name: part.name,
    assembly_id: assemblyId, assembly_title: assembly.title, context_id: contextId, context_name: context.name,
    reference: position.reference, required_quantity: 1, conditions,
  };
  const drawing: SourceDrawing & { assemblies: { catalog_context_id: string } } = {
    id: assemblyId + "-drawing", assembly_id: assemblyId, image_path: "/demo/cooling.svg", remote_url: null,
    pixel_width: 420, pixel_height: 260, credit: fixtureSource.title,
    applicability: "Synthetic assembly for testing. Dimensions and fitment are fictional.",
    rights_status: "original", coordinate_space: "percent",
    hotspots: [{ reference: "01", left: 44, top: 31, width: 30, height: 34 }],
    assemblies: { catalog_context_id: contextId },
  };
  return { entry, context, assembly, part, position, hit, drawing };
}

export const demoCatalog = { e34: catalogFor("e34"), e30: catalogFor("e30") };
