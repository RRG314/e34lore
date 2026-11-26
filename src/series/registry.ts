import { emptyVehicle, models } from "../data/catalog";
import e30Evidence from "../../data/series/e30-evidence.json";

type Model = { id: string; engines: readonly string[]; label: string; coverage: string };
type SeriesDefinition = {
  name: string;
  designation: string;
  grille: string;
  models: readonly Model[];
  years: readonly [number, number];
  bodies: readonly string[];
  reference: string;
  defaultModel?: { model: string; engine: string; body: string; year: string; transmission: string };
};

export const seriesDefinitions = {
  e34: {
    name: "E34 Lore", designation: "BMW 5 Series", grille: "/brand/e34-grille.svg",
    models, years: [1987, 1996], bodies: ["Sedan", "Touring"],
    reference: "e34-525i-sedan-automatic",
  },
  e30: {
    name: "E30 Lore", designation: "BMW 3 Series", grille: "/brand/e30-grille.svg",
    models: e30Evidence.models.map(row => ({
      id: row.model, engines: row.engineFamilies, label: row.model,
      coverage: row.documentedProduction.from + "–" + row.documentedProduction.to,
    })),
    years: [1982, 1994], bodies: ["Sedan", "Coupe", "Touring", "Convertible", "Baur TC"],
    reference: "e30-325i-coupe-manual",
    defaultModel: { model: "325i", engine: "M20", body: "Coupe", year: "1991", transmission: "Manual" },
  },
} satisfies Record<string, SeriesDefinition>;

export type Series = keyof typeof seriesDefinitions;
export const seriesIds = Object.keys(seriesDefinitions) as Series[];
export const defaultSeries: Series = "e34";
export const isSeries = (value: unknown): value is Series =>
  typeof value === "string" && Object.hasOwn(seriesDefinitions, value);

const technical = new Set(["scanner", "encyclopedia", "repairs", "parts", "electrical", "workshop", "diagnostics", "resources", "search", "manual", "quick-reference", "models", "guides", "articles"]);

export const isTechnicalSection = (section: string) => technical.has(section);

export function seriesRoute(path: readonly string[]) {
  const prefix = path[0];
  const series = isSeries(prefix) ? prefix : defaultSeries;
  return { series, path: isSeries(prefix) ? path.slice(1) : [...path] };
}

export function seriesHref(href: string, series: Series) {
  if (series === defaultSeries || !href.startsWith("/") || href.startsWith("//")) return href;
  if (/^\/garage(?:[?#]|$)/.test(href)) {
    const garage = new URL(href, "https://e34lore.com");
    garage.searchParams.set("series", series);
    return garage.pathname + garage.search + garage.hash;
  }
  if (/^\/community(?:[/?#]|$)/.test(href)) {
    const community = new URL(href, 'https://e34lore.com');
    if (!isSeries(community.searchParams.get('series'))) community.searchParams.set('series',series);
    return community.pathname+community.search+community.hash;
  }
  const segment = href.split(/[/?#]/)[1];
  if (segment && !isTechnicalSection(segment)) return href;
  return "/" + series + (href === "/" ? "" : href);
}

export function modelKey(series: Series, model: string) {
  return series === defaultSeries ? model : series + "-" + model.toLowerCase();
}

export function seriesForModel(modelId: string): Series {
  const prefix = modelId.split("-")[0];
  return isSeries(prefix) ? prefix : defaultSeries;
}

export function displayModel(modelId: string) {
  const series = seriesForModel(modelId);
  return seriesDefinitions[series].models.find(m => modelKey(series, m.id) === modelId)?.id || modelId;
}

export function seriesDefaultVehicle(series: Series) {
  const definition: SeriesDefinition = seriesDefinitions[series];
  return { ...emptyVehicle, ...definition.defaultModel };
}

export const seriesYears = (series: Series) => {
  const [first, last] = seriesDefinitions[series].years;
  return Array.from({ length: last - first + 1 }, (_, i) => String(first + i));
};
