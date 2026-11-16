"use client";
import { useEffect, useMemo, useState } from 'react';
import { DocumentLink } from "../../components/DocumentLink";
import { ArrowUpRight } from 'lucide-react';
import { useApp } from '../../components/context';
import { catalogHref, componentCatalog as defaultCatalog, loadCatalogSearch, type CatalogSearchItem, type CatalogIndex } from './catalog';
import type { ReferenceModel } from './model';
export function CatalogSearchMatches({ query, catalog=defaultCatalog }: {
    query: string; catalog?:CatalogIndex;
}) {
    const [items, setItems] = useState<CatalogSearchItem[]>([]), [error, setError] = useState(false);
    const {series} = useApp();
    const componentCatalog=catalog;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Remove results from the previous source catalog before starting its replacement request.
    useEffect(() => { let active = true; const abort = new AbortController(), deadline = setTimeout(() => abort.abort(), 12000); setItems([]);setError(false);loadCatalogSearch(abort.signal,catalog).then(rows => { if (active)
        setItems(rows); }).catch(() => { if (active)
        setError(true); }).finally(() => clearTimeout(deadline)); return () => { active = false; clearTimeout(deadline); abort.abort(); }; }, [catalog]);
    const rows = useMemo(() => { const tokens = query.toLowerCase().replaceAll(/[^a-z0-9]/g, ' ').trim().split(/\s+/).filter(Boolean); return items.filter(r => tokens.every(t => (r.name + ' ' + r.number+' '+(componentCatalog.assemblies[r.assemblyId]?.title||'')).toLowerCase().includes(t))).sort((a, b) => Number(b.number === query.replaceAll(/\D/g, '')) - Number(a.number === query.replaceAll(/\D/g, ''))).slice(0, 6); }, [items, query,componentCatalog.assemblies]);
    return <div className="component-search-catalog"><strong>{series === 'e30' ? 'This reference’s catalog' : 'Catalog records'}</strong>{rows.map(r => <DocumentLink key={r.positionId} href={catalogHref(r.assemblyId, r.positionId,catalog)}><span>{r.name}<small>{r.number} · {componentCatalog.assemblies[r.assemblyId]?.title||''}</small></span><ArrowUpRight size={14}/></DocumentLink>)}{!items.length && !error && <p className="small">Loading catalog search…</p>}{error && <p className="small">Open the full catalog to continue searching.</p>}<DocumentLink href={'/parts/catalog?' + new URLSearchParams({ context: componentCatalog.context.id, q: query }).toString()}>{series === 'e30' ? 'Search all E30 catalogs' : 'Search the complete source selection'} <ArrowUpRight size={14}/></DocumentLink></div>;
}
export function WorkshopCatalogBrowser({ model, scope }: {
    model: ReferenceModel | null;
    scope: string;
}) {
    const componentCatalog=model?.catalog||defaultCatalog;
    const [system, setSystem] = useState('system:engine'), [query, setQuery] = useState('');
    useEffect(() => { if (scope.startsWith('system:')){
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize the external workshop system selection with this catalog filter.
        setSystem(scope); } }, [scope]);
    const current = system;
    const ids = current==='all'?Object.keys(componentCatalog.assemblies):componentCatalog.systems[current] || [];
    const assemblies = ids.map(id => componentCatalog.assemblies[id]).filter(a => a&&a.title.toLowerCase().includes(query.toLowerCase()));
    return <details className="workshop-catalog-browser"><summary>Browse parts by system <span>{componentCatalog.coverage.distinctNumbers.toLocaleString()} source-listed BMW numbers</span></summary><p>Browse service parts, seals, fixings and trim beyond the individual modeled surfaces. Source options and production restrictions remain attached to each catalog position.</p><div className="workshop-catalog-filters"><label>System<select value={current} onChange={e => setSystem(e.target.value)}><option value="all">Entire catalog selection</option>{(model?.nodes.filter(n => n.kind === 'system') || []).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label><label>Find an assembly<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="For example, steering linkage"/></label></div><div className="workshop-catalog-assemblies">{assemblies.map(a => <DocumentLink key={a.id} href={catalogHref(a.id,undefined,componentCatalog)}><strong>{a.title}</strong><span>{a.itemCount} source positions <ArrowUpRight size={14}/></span></DocumentLink>)}</div>{!assemblies.length && <p>No assemblies match this filter.</p>}<p className="small muted">The displayed reference is {model?.reference||'the 1995 525i Sedan'}. Individual catalog records do not certify fitment to your car, and not every catalog item has its own mesh.</p></details>;
}
