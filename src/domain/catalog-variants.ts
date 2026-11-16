import type { CatalogAssembly, CatalogContext } from './catalog';

export type TransmissionView = 'all' | 'manual' | 'automatic';

export function transmissionView(value?: string | null): TransmissionView {
  if (/\bauto(?:matic)?\b/i.test(value || '')) return 'automatic';
  if (/\bmanual\b|^[5-6][ -]?speed$/i.test(value || '')) return 'manual';
  return 'all';
}

/** A browsing filter, never a claim about fitment or the installed gearbox. */
export function assemblyTransmission(assembly: Pick<CatalogAssembly, 'source_category' | 'title'>): TransmissionView {
  if (/^automatic transmission$/i.test(assembly.source_category) || /\bautomatic (?:gearbox|transmission)\b/i.test(assembly.title)) return 'automatic';
  if (/^manual transmission$/i.test(assembly.source_category) || /\b(?:manual|mechanical) (?:gearbox|transmission)\b/i.test(assembly.title) || /^clutch control$/i.test(assembly.title)) return 'manual';
  return 'all';
}

export function assemblyInTransmission(assembly: Pick<CatalogAssembly, 'source_category' | 'title'>, view: TransmissionView) {
  const listed = assemblyTransmission(assembly);
  return view === 'all' || listed === 'all' || listed === view;
}

/** Preserve a known year/body/engine only when that combination is indexed. */
export function catalogForModel(contexts: CatalogContext[], model: string, previous?: CatalogContext) {
  return contexts.filter(c => c.model_id === model).toSorted((a, b) => {
    const score = (c: CatalogContext) => Number(c.model_year === previous?.model_year) * 4 + Number(c.body === previous?.body) * 8 + Number(!!c.engine && c.engine === previous?.engine) * 2;
    return score(b) - score(a) || b.model_year - a.model_year || a.name.localeCompare(b.name);
  })[0];
}

export function catalogBrowseHref(path: string, values: { context?: string; assembly?: string; position?: string; category?: string; transmission?: TransmissionView; q?: string }) {
  const params = new URLSearchParams();
  if (path === '/workshop') params.set('tab', 'diagrams');
  for (const key of ['context', 'assembly', 'position', 'category', 'transmission', 'q'] as const) {
    const value = values[key];
    if (value) params.set(key, value);
  }
  return path + (params.size ? '?' + params : '');
}
