"use client";
import { DocumentLink } from "./DocumentLink";
import { catalogPositionAllowed, catalogOrderingRows } from "../lib/catalog-integrity";
import { catalogSearchQuery } from "../domain/catalog";
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import { db, useApp } from './context';
import { PageIntro, Notice } from './common';
import { useVehicleCatalog } from '../lib/use-vehicle-catalog';
import { formatPartNumber } from '../domain/fitment';
import { catalogPositionHref, type CatalogIdentityHit } from '../domain/catalog';
import { PartCompatibility } from './PartCompatibility';
import { seriesForModel, seriesHref, seriesDefinitions } from "../series/registry";
import { ShareControls } from './ShareControls';
type Part = {
    id: string;
    name: string;
    number_normalized: string | null;
};
type Replacement = {
    id: string;
    conditions: {
        name: string;
        value: string;
    }[];
    replacement: Part;
    position: {
        id: string;
        context_id: string;
        assembly_id: string;
        reference: string;
        active: boolean;
        context: {
            name: string;
        };
    };
};
function replacementPage(partId: string, offset: number, signal: AbortSignal) {
    return db.from('part_supersessions').select('id,conditions,replacement:parts!part_supersessions_replacement_part_id_fkey(id,name,number_normalized),position:part_assembly_positions!part_supersessions_position_id_fkey(id,context_id,assembly_id,reference,active,context:vehicle_catalog_contexts(name))', { count: 'exact' })
        .eq('previous_part_id', partId).order('id').range(offset, offset + 99).abortSignal(signal);
}
export function Interchange({ initialPart }: {
    initialPart?: string;
}) {
    const { vehicle, series } = useApp(), catalog = useVehicleCatalog();
    const [q, setQ] = useState(''), [hits, setHits] = useState<CatalogIdentityHit[]>([]), [selected, setSelected] = useState<Part | null>(null), [partId, setPartId] = useState(initialPart || ''), [replacements, setReplacements] = useState<Replacement[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(!!initialPart), [searching, setSearching] = useState(false), [revision, retry] = useState(0);
    const [loadedHitKey, setLoadedHitKey] = useState('');
    const contextId = catalog.context?.id;
    const searchKey = (contextId || (vehicle.model ? 'missing' : 'all')) + '|' + q.trim();
    const shownHits = loadedHitKey === searchKey ? hits : [];
    const isSearching = catalog.ready && !catalog.error && (!vehicle.model || !!contextId) && q.trim().length >= 2 && (searching || loadedHitKey !== searchKey);
    const [total, setTotal] = useState(0), [moreLoading, setMoreLoading] = useState(false);
    const moreAbort = useRef<AbortController | null>(null);
    async function loadMore() {
        if (moreLoading || replacements.length >= total) return;
        const abort = new AbortController(); moreAbort.current = abort;
        const deadline = setTimeout(() => abort.abort(), 12000);
        setMoreLoading(true); setError('');
        try {
            const result = await replacementPage(partId, replacements.length, abort.signal);
            if (abort.signal.aborted) return;
            if (result.error) throw result.error;
            setReplacements(previous => [...previous, ...((result.data || []) as unknown as Replacement[])]);
            setTotal(result.count || 0);
        } catch { if (!abort.signal.aborted) setError('More replacement records could not load. Please try again.'); }
        finally { clearTimeout(deadline); if (moreAbort.current === abort) { moreAbort.current = null; setMoreLoading(false); } }
    }
    useEffect(() => { if (!catalog.ready)
        return; let active = true; const abort = new AbortController(), deadline = setTimeout(() => abort.abort(), 12000); if (q.trim().length < 2)
        return () => { clearTimeout(deadline); }; if (vehicle.model && !contextId)
        return () => { clearTimeout(deadline); }; const timer = setTimeout(() => { setSearching(true); setError(''); const req = vehicle.model ? db.rpc('catalog_find_parts', { search_query: catalogSearchQuery(q), context_filter: contextId!, max_results: 40 }) : db.rpc('catalog_search_parts', { search_query: catalogSearchQuery(q), max_results: 40 }); Promise.resolve(req.abortSignal(abort.signal)).then(({ data, error }) => { if (!active)
        return; if (error)
        setError('Parts search could not load. Please try again.');
    else {
        const seen = new Set<string>();
        setHits(catalogOrderingRows((data || []) as CatalogIdentityHit[]).filter((p: CatalogIdentityHit) => { if (seen.has(p.part_id))
            return false; seen.add(p.part_id); return true; }).slice(0, 12));
    } }).catch(() => { if (active) setError('Parts search could not load. Please try again.'); }).finally(() => { clearTimeout(deadline); if (active)
         {setSearching(false); setLoadedHitKey(searchKey);} }); }, 250); return () => { active = false; clearTimeout(timer); clearTimeout(deadline); abort.abort(); }; }, [q, catalog.ready, contextId, searchKey, vehicle.model, revision]);
    useEffect(() => { if (!partId)
        return; let active = true; const abort = new AbortController(), deadline = setTimeout(() => abort.abort(), 12000); Promise.all([db.from('parts').select('id,name,number_normalized').eq('id', partId).abortSignal(abort.signal).maybeSingle(), replacementPage(partId, 0, abort.signal)]).then(([p, r]) => { if (!active)
        return; if (p.error || r.error || !p.data)
        throw Error('Lookup failed'); setSelected(p.data); setReplacements((r.data || []) as unknown as Replacement[]); setTotal(r.count || 0); }).catch(() => { if (active)
        setError('The interchange records could not load. Check the number and try again.'); }).finally(() => { clearTimeout(deadline); if (active)
        setLoading(false); }); return () => { active = false; clearTimeout(deadline); abort.abort(); moreAbort.current?.abort(); moreAbort.current = null; }; }, [partId, revision]);
    const activeRows = replacements.filter(r => r.position?.active && seriesForModel(r.position.context_id) === series && catalogPositionAllowed(r.position.id)), sameScope = catalog.context ? activeRows.filter(r => r.position.context_id === catalog.context!.id) : activeRows, other = catalog.context ? activeRows.filter(r => r.position.context_id !== catalog.context!.id) : [];
    function choose(p: CatalogIdentityHit) { if (p.part_id === partId && selected) {setQ(''); setHits([]); return;} setLoading(true); setError(''); setSelected(null); setReplacements([]); setTotal(0); setMoreLoading(false); setPartId(p.part_id); setQ(''); setHits([]); history.replaceState(null, '', seriesHref('/parts/interchange?part=' + encodeURIComponent(p.part_id),series)); }
    function rows(items: Replacement[]) { return items.map(r => <article className="interchange-replacement" key={r.id}><span className="eyebrow">SOURCE-LISTED REPLACEMENT</span><div><code>{formatPartNumber(selected?.number_normalized || null)}</code><ArrowRight size={18}/><DocumentLink href={'/parts/interchange?part=' + encodeURIComponent(r.replacement.id)}><code>{formatPartNumber(r.replacement.number_normalized)}</code></DocumentLink></div><h3>{r.replacement.name}</h3><p>{r.position.context.name} · Callout {r.position.reference || 'not stated'}</p>{r.conditions.length > 0 && <dl>{r.conditions.map((c, i) => <div key={i}><dt>{c.name}</dt><dd>{c.value}</dd></div>)}</dl>}<DocumentLink className="text-link" href={catalogPositionHref(r.position)}>Check the original catalog position <ArrowUpRight size={14}/></DocumentLink></article>); }
    return <div className="page interchange-page"><PageIntro eyebrow={"BMW " + series.toUpperCase() + " / PARTS"} title="Interchange & replacements." description="Check replacement BMW numbers, documented substitutes and the conditions that go with them."/><div className="interchange-search"><label htmlFor="interchange-query">BMW number or part description</label><div className="input-icon"><Search size={18}/><input id="interchange-query" type="search" disabled={!catalog.ready} value={q} maxLength={200} placeholder="For example, 07129900681 or water pump" onChange={e => { setError(''); setQ(e.target.value); }}/></div><p className="small muted">{!catalog.ready ? 'Loading vehicle catalogs…' : vehicle.model ? 'Searching ' + (catalog.context?.name || 'your selected ' + vehicle.model) : 'Search all indexed BMW numbers, or select your vehicle above to narrow the catalog.'}</p>{catalog.missing && <Notice>{catalog.ambiguous?"More than one source catalog could apply. Choose one explicitly before searching its parts.":"No catalog matches all of your selected vehicle details yet."} <DocumentLink href="/parts/catalog">Choose another source catalog</DocumentLink> to compare its records explicitly.</Notice>}{catalog.error && <Notice><p>{catalog.error}</p><button onClick={catalog.retry}>Retry vehicle catalogs</button></Notice>}{isSearching && <p role="status">Searching catalog records…</p>}{shownHits.length > 0 && <div className="interchange-hits">{shownHits.map(p => <button key={p.part_id} onClick={() => choose(p)}><span><code>{formatPartNumber(p.number_normalized)}</code><strong>{p.name}</strong><small>{p.context_name || 'Number-only record'}</small></span><ArrowRight size={17}/></button>)}</div>}{q.trim().length >= 2 && !isSearching && loadedHitKey === searchKey && !error && !catalog.error && catalog.ready && !catalog.missing && !shownHits.length && <p>No listing found in this search scope. <DocumentLink href={'/parts/catalog?q=' + encodeURIComponent(q)}>Open catalog search</DocumentLink>.</p>}</div>{error && <Notice tone="warning"><p role="alert">{error}</p><button className="button outline" onClick={() => {setLoading(!!partId); retry(n => n + 1);}}>Retry lookup</button></Notice>}{loading && <p role="status">Loading interchange records…</p>}{selected ? <div className="interchange-selected"><div className="section-heading"><div><span className="eyebrow">SELECTED BMW NUMBER</span><h2>{selected.name}</h2><code className="interchange-number">{formatPartNumber(selected.number_normalized)}</code></div><DocumentLink className="button outline" href={'/parts/catalog?part=' + encodeURIComponent(selected.id)}>Catalog record <ArrowUpRight size={16}/></DocumentLink></div><section aria-label="Source-listed replacements"><h2>Replacement numbers</h2><p>A replacement is recorded for a particular source position. It does not establish reverse interchange or fitment to every car.</p>{sameScope.length ? rows(sameScope) : <p className="muted">No source-listed replacement is recorded{catalog.context ? ' in ' + catalog.context.name : ''}{replacements.length < total ? ' among the records loaded so far' : ''}.</p>}{other.length > 0 && <details className="interchange-other"><summary>Other catalog selections ({other.length})</summary><p>These records belong to other source selections. Compare their production and equipment restrictions with your car.</p>{rows(other)}</details>}{replacements.length < total && <div className="interchange-more"><p className="small muted">Showing {replacements.length} of {total} source-position records.</p><button className="button outline" disabled={moreLoading} onClick={loadMore}>{moreLoading ? 'Loading more records…' : 'Load more replacement records'}</button></div>}</section><PartCompatibility key={selected.id} partId={selected.id}/><div className="interchange-help"><DocumentLink href={'/community/new?part=' + encodeURIComponent(selected.id) + '&title=' + encodeURIComponent('Interchange question: ' + selected.name) + '&series=' + series}>Ask a linked interchange question <ArrowUpRight size={15}/></DocumentLink><ShareControls title={selected.name + ' interchange · ' + seriesDefinitions[series].name} href={'/parts/interchange?part=' + encodeURIComponent(selected.id)}/></div></div> : !loading && <div className="interchange-orientation"><section><span>01</span><h2>Find the number.</h2><p>Search the BMW number or component name, then choose its catalog record.</p></section><section><span>02</span><h2>Read the conditions.</h2><p>Check the production date, engine, equipment and exact catalog position before choosing a replacement.</p></section><section><span>03</span><h2>Check the evidence.</h2><p>Documented substitutes appear separately from source-listed replacement numbers. Missing evidence stays unknown.</p></section></div>}</div>;
}
