"use client";
import {PartMedia} from '../../components/PartMedia';
import { ComponentCoverage } from '../../components/ComponentCoverage';
import type { Journey } from '../../domain/repair-journey';
import {DocumentLink} from "../../components/DocumentLink";
import { componentHref, type ComponentContext } from "../../servicing/context";
import { useOwnedCars } from "../../vehicle/use-owned-cars";
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Copy, ExternalLink } from 'lucide-react';
import { WhereToBuy } from '../../components/Commercial';
import { RelatedDiscussions } from '../../components/RelatedDiscussions';
import { RelatedJournalEntries } from '../../components/Journals';
import { ShareControls } from '../../components/ShareControls';
import { formatCatalogCondition } from '../../domain/catalog';
import { useApp } from '../../components/context';
import { partHref, type ReferenceNode } from './model';
import { bindingFor, componentCatalog as defaultCatalog, catalogHref, initialCatalogChoice, loadCatalogPage, type CatalogChoice, type CatalogIndex } from './catalog';
import { ServiceLinks } from './CatalogProcedures';
import {specsForNode,supplementalServiceLinks} from '../../servicing/repair-specs';
import { WorkshopServicePanel } from './WorkshopServicePanel';
import { formatPartNumber } from '../../domain/fitment';
const labels = { component: 'Component', assembly: 'Assembly · several service items', 'supplied-with': 'Listed with its parent assembly', set: 'Listed as a repair set', reference: 'Display reference' };
export function ComponentPartReference({ node, initialPosition, referenceRevision, catalog=defaultCatalog,referenceId,assetSha256,visible,navigation }: {
    node: ReferenceNode;
    initialPosition?: string;
    referenceRevision?:number;
    catalog?:CatalogIndex;referenceId?:string;assetSha256?:string;visible?:boolean;navigation?:Journey;
}) {
    const componentCatalog=catalog,href=(id:string,position?:string)=>catalogHref(id,position,catalog);
    const binding = bindingFor(node.id,catalog), { toast,series } = useApp(),owned=useOwnedCars();
    const journey=navigation||{vehicle:owned.activeId};
    const [rows, setRows] = useState<CatalogChoice[]>([]), [selected, setSelected] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0), [filter, setFilter] = useState(''), [limit, setLimit] = useState(8);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear source records at a component/catalog boundary before the cancellable external fetch.
    useEffect(() => { let active = true; const abort = new AbortController(), deadline = setTimeout(() => abort.abort(), 15000); setLoading(true); setError(''); setRows([]); setSelected(''); if (!binding) {
        setLoading(false);
        return () => { clearTimeout(deadline); abort.abort(); };
    } Promise.all(binding.assemblyIds.map(id => loadCatalogPage(id, abort.signal,catalog))).then(pages => { const ids = new Set(binding.positions.map(p => p.id)), items = pages.flatMap(p => p.items.filter(i => ids.has(i.id)).map(i => ({ ...i, assemblyId: p.assemblyId, contextId: p.contextId }))); if (!active)
        return; if (items.length !== ids.size)
        throw Error('The component links did not match their source records.'); setRows(items); setSelected(initialCatalogChoice(binding, items, initialPosition, node.oem || undefined)); }).catch(() => { if (active)
        setError('Catalog details could not load. You can still open the source assembly below.'); }).finally(() => { clearTimeout(deadline); if (active)
        setLoading(false); }); return () => { active = false; clearTimeout(deadline); abort.abort(); }; }, [binding, node.id, node.oem, initialPosition, retry,catalog]);
    const active = rows.find(r => r.id === selected), uniqueNumbers = new Set(rows.map(r => r.number)), matches = useMemo(() => { const q = filter.toLowerCase().trim(); return q ? rows.filter(r => (r.number + ' ' + r.name + ' ' + r.conditions.map(c => c.value).join(' ')).toLowerCase().includes(q)) : rows; }, [rows, filter]);
    const source = node.sourceContext;
    const component: Partial<ComponentContext> = {
        partId: active?.partId || (source ? node.canonicalId || undefined : undefined),
        positionId: active?.id || source?.positionId,
        assemblyId: active?.assemblyId || source?.assemblyId,
        catalogContextId: active?.contextId || source?.contextId,
        nodeId: node.id,
        referenceId,
        modelRevision: referenceRevision,
    };
    const servicePanel=<WorkshopServicePanel series={series} node={node} binding={binding} referenceId={referenceId} navigation={journey} component={component}/>;
    async function copy(number: string) { try {
        await navigator.clipboard.writeText(number);
        toast('BMW part number copied.');
    }
    catch {
        toast('Select the number to copy it.');
    } }
    if (!binding) {
        const source=node.sourceContext?partHref(node):'/parts/catalog?'+new URLSearchParams({q:node.oem||node.name});
        return <><h2>{node.name}</h2>
            {node.oem&&<p className="reference-oem">{formatPartNumber(node.oem)}</p>}
            {servicePanel}
            <DocumentLink className="button outline" href={source}>{node.sourceContext ? 'Open the catalog diagram' : 'Search parts and diagrams'} <ArrowUpRight size={15}/></DocumentLink>
        </>;
    }
    const exactService=specsForNode(series,node.id);
    const {guideIds:extraGuides,manual:extraManual}=supplementalServiceLinks(exactService,binding.guideIds,binding.manual);
    const relatedGuides=[...new Set([...extraGuides,...exactService.flatMap(job=>job.guide ? [job.guide] : [])])];
    const catalogUrl = active ? componentHref({...component, partId:active.partId},journey) : href(binding.assemblyIds[0]);
    const displayedNumber = active?.number || node.oem;
    return <><h2>{binding.title}</h2>{binding.title.toLowerCase() !== node.name.toLowerCase() && !/envelope only/.test(node.name) && <p className="component-instance">{node.name}</p>}{binding.kind!=='component'&&<span className="component-kind">{labels[binding.kind]}</span>}
 {(binding.positions.length>0||displayedNumber)&&<dl><dt>{binding.kind === 'supplied-with' ? 'Parent assembly BMW number' : binding.kind === 'set' ? 'Repair set BMW number' : 'BMW part number'}</dt><dd>{displayedNumber ? <span className="reference-oem">{formatPartNumber(displayedNumber)}<button aria-label="Copy BMW part number" onClick={() => copy(displayedNumber)}><Copy size={14}/></button></span> : <span>{loading ? 'Loading catalog records…' : error ? 'Catalog details unavailable' : uniqueNumbers.size + ' catalog numbers — choose below'}</span>}</dd><dt>Source selection</dt><dd>{componentCatalog.context.name}</dd></dl>}
 {!binding.positions.length&&!displayedNumber&&binding.assemblyIds.length>0&&<p className="small">Catalog source · {componentCatalog.context.name}</p>}
 {servicePanel}
 <ComponentCoverage node={node} binding={binding} referenceId={referenceId} revision={referenceRevision} assetSha256={assetSha256} visible={visible}/>
 {binding.assemblyIds.length>0&&<DocumentLink className="button outline" href={catalogUrl}>{active ? 'Open this catalog position' : 'Open the catalog assembly'}<ArrowUpRight size={15}/></DocumentLink>}
 {active&&<DocumentLink className="reference-related-guide" href={'/parts/interchange?part='+encodeURIComponent(active.partId)}>Interchange & replacements <ArrowUpRight size={14}/></DocumentLink>}
 {!binding.positions.length&&!binding.visualSources?.length&&<DocumentLink className="button outline" href={'/parts/catalog?'+new URLSearchParams({context:catalog.context.id,q:node.name})}>Search this vehicle’s catalog<ArrowUpRight size={15}/></DocumentLink>}
 {active&&<PartMedia number={active.number}/>}
 {node.thumbnail && <img className="reference-part-image" src={node.thumbnail} alt={binding.title + ' modeled reference'} width={256} height={256}/>}
 {binding.note && <p className="small component-note">{binding.note}</p>}
 {!!binding.visualSources?.length&&<section className="component-source-illustrations" aria-label="Factory illustrations">
  <h3>Factory illustrations</h3>
  {binding.visualSources.map(source=><DocumentLink key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={13}/></DocumentLink>)}
 </section>}
 {error && <div role="status"><p>{error}</p><button className="button outline" onClick={() => setRetry(n => n + 1)}>Retry catalog details</button></div>}
 {active && <section className="component-occurrence"><h3>{active.name}</h3><p className="small">Callout {active.reference || 'unmarked'} · {active.quantity === null ? 'Installation quantity not stated' : active.quantity + ' required'}{active.packageQuantity !== null ? ' · Pack of ' + active.packageQuantity : ''}</p><dl className="component-conditions">{active.conditions.filter(c => !['require quantity', 'package quantity', 'replaced by'].includes(c.name.toLowerCase())).map((c, i) => <div key={i}><dt>{c.name}</dt><dd>{formatCatalogCondition(c.name, c.value)}</dd></div>)}</dl>{active.replacedBy.length > 0 && <p className="small">Source-listed replacements: {active.replacedBy.map((n, i) => <span key={n}>{i > 0 ? ', ' : ''}<DocumentLink href={'/parts/catalog?part=bmw-' + n}>{n}</DocumentLink></span>)}</p>}<DocumentLink className="text-link" target="_blank" rel="noreferrer" href={componentCatalog.assemblies[active.assemblyId].sourceUrl}>Source listing <ExternalLink size={13}/></DocumentLink></section>}
 {!loading && rows.length > 0 && <section className="component-candidates"><h3>{binding.kind === 'assembly' || binding.kind === 'reference' ? 'Catalog items in this assembly' : 'Catalog options'} <small>{rows.length} source {rows.length === 1 ? 'position' : 'positions'}</small></h3><p className="small muted">Check the production, equipment and size notes against your car. Catalog alternatives are not interchangeable by default.</p>{rows.length > 8 && <input type="search" aria-label="Filter component catalog options" placeholder="Filter number, description or specification" value={filter} onChange={e => { setFilter(e.target.value); setLimit(8); }}/>}<div className="component-options-list">{matches.slice(0, limit).map(r => <button key={r.id} className={'component-option' + (r.id === selected ? ' selected' : '')} aria-pressed={r.id === selected} onClick={() => setSelected(r.id)}><strong>{r.number}</strong><span>{r.name}</span><small>{r.conditions.filter(c => /production|extra info|for vehicles|only in|supplement/i.test(c.name)).map(c => formatCatalogCondition(c.name, c.value)).join(' · ') || 'No additional source conditions stated'}</small></button>)}</div>{matches.length > limit && <button className="button outline" onClick={() => setLimit(n => n + 20)}>Show more catalog options ({matches.length - limit})</button>}{matches.length === 0 && <p>No options match this filter.</p>}</section>}
 {(extraGuides.length>0||extraManual.length>0)&&<details className="component-source-assemblies"><summary>More service references</summary>
  <ServiceLinks guideIds={extraGuides} manual={extraManual} navigation={journey} vehicleOverride={owned.selected?.configuration} component={component}/>
 </details>}
 {!!binding.assemblyIds.length&&<details className="component-source-assemblies"><summary>Related catalog assemblies</summary>{binding.assemblyIds.map(id => <DocumentLink key={id} href={href(id)}>{componentCatalog.assemblies[id].title}<ArrowUpRight size={13}/></DocumentLink>)}</details>}
 <ShareControls title={binding.title + ' · E34 Lore'} href={'/workshop?' + new URLSearchParams({ node: node.id,...(referenceRevision?{model_revision:String(referenceRevision)}:{}),...(referenceId?{reference:referenceId}:{}), ...(active ? { catalog_position: active.id } : {}) }).toString()}/>
 {active && <><WhereToBuy key={'offer-' + active.id} partId={active.partId} positionId={active.id}/><RelatedJournalEntries key={'journal-' + active.partId} kind="part" id={active.partId}/><RelatedDiscussions key={'discussion-' + active.partId} kind="part" id={active.partId} referenceId={referenceId} related={[...relatedGuides.map(id=>({kind:'guide' as const,id})),...node.systemIds.map(id=>({kind:'component' as const,id:id.replace(/^system:/,'').replace(/^hvac$/,'climate')}))]}/></>}
 {!active && <DocumentLink className="reference-related-guide" href={'/community/new?title=' + encodeURIComponent('Help identifying ' + binding.title)}>Ask the community about this assembly <ArrowUpRight size={14}/></DocumentLink>}
 </>;
}
