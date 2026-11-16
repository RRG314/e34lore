"use client";
import { e30CatalogArchive } from "../series/e30-manual";
import { displayCatalogModels, e30CatalogIndexFor, e30CatalogSources, seriesInventory } from "../series/catalog";
import { useKeyedResource } from "../hooks/use-keyed-resource";
import { useScopedState } from "../hooks/use-scoped-state";

import { DocumentLink, navigateDocument } from "./DocumentLink";
import { availableDrawingImage } from "../domain/drawing-rights";
import { PartWorkspace } from "./PartWorkspace";
import { componentHref } from "../servicing/context";
import { referenceRelease } from "../digital-twin/public/load-reference";
import { componentCatalog } from "../digital-twin/public/catalog";
import { track } from "../analytics/client";
import { assemblyInTransmission, assemblyTransmission, catalogForModel, catalogBrowseHref, transmissionView, type TransmissionView } from "../domain/catalog-variants";
import { useRepairJourney } from "../repair/use-journey";
import { JourneyBar } from "../repair/JourneyBar";
import { catalogPositionAllowed, catalogOrderingRows, correctedCatalogInventory } from "../lib/catalog-integrity";
import { catalogSearchQuery } from "../domain/catalog";
import { RelatedJournalEntries } from "./Journals";
import { RelatedDiscussions } from "./RelatedDiscussions";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { ArrowUpRight, ArrowLeft, Search, ChevronRight, Copy, Download, ExternalLink, Box } from "lucide-react";
import { db, useApp } from "./context";
import { PageIntro, Notice, Empty, Tag, SaveButton } from "./common";
import { AssemblyModel } from "./AssemblyModel";
import { Diagram } from "./Diagram";
import { initialTwinGraph } from "../digital-twin/reference-configuration";
import { referenceModelForPart } from "../digital-twin/model-registry";
import { PartCompatibility } from "./PartCompatibility";
import { PartMedia } from './PartMedia';
import { WhereToBuy } from "./Commercial";
import { CatalogProcedureLinks } from "../digital-twin/public/CatalogProcedures";
import { CatalogApplications } from "./CatalogApplications";
import { CatalogDrawingPreview } from "./CatalogDrawingPreview";
import { Correction } from "./Reference";
import { fetchAllRows } from "../lib/data-export";
import { downloadJSON, downloadText } from "../lib/download";
import { formatPartNumber } from "../domain/fitment";
import { sanitizeVehicle } from "../data/catalog";
import { catalogIdentityHref, sourceDrawingAdapter, catalogContextMatch, preferredCatalogContext, catalogCsvCell, orderingNotes, formatCatalogCondition, catalogPositionHref, type CatalogContext, type CatalogAssembly, type CatalogPosition, type SourceDrawing, type CatalogIdentityHit } from "../domain/catalog";

const emptyAssemblies:CatalogAssembly[]=[];
export function CatalogBrowser({
  initialPart,
  initialPosition,
  presentation,
  workshopControls,
}: {
  initialPart?: string;
  initialPosition?: string;
  presentation?: "workshop";
  workshopControls?:import("react").ReactNode;
}) {
  const { toast, vehicle: referenceVehicle, vehicleReady, series } = useApp();
  const journey = useRepairJourney();
  const vehicle = journey.selected ? sanitizeVehicle(journey.selected.configuration) : referenceVehicle;
  const basePath = presentation === "workshop" ? "/workshop" : "/parts/catalog";
  const vehicleKey=JSON.stringify(vehicle),selectionScope=initialPart||initialPosition?JSON.stringify([initialPart,initialPosition]):vehicleKey;
  const [transmission,setTransmission]=useScopedState<TransmissionView>(selectionScope,transmissionView(vehicle.transmission));
  function browseHref(values: Parameters<typeof catalogBrowseHref>[1] = {}) {
    return journey.href(catalogBrowseHref(basePath, { context: contextId, transmission, category, ...values }));
  }
  function updateAddress(state: unknown, unused: string, path: string) {
    const url = new URL(path, 'https://e34lore.com');
    url.searchParams.set('transmission', transmission);
    if (category) url.searchParams.set('category', category);
    if (presentation === 'workshop') { url.pathname = basePath; url.searchParams.set('tab', 'diagrams'); }
    const previous=new URLSearchParams(location.search),reference=previous.get('reference'),revision=previous.get('model_revision');
    const release=referenceRelease(revision||undefined,reference||undefined);
    const referenceContext=release&&'contextId' in release?release.contextId:componentCatalog.context.id;
    if((reference||revision)&&url.searchParams.get('context')===referenceContext){if(reference)url.searchParams.set('reference',reference);if(revision)url.searchParams.set('model_revision',revision);}
    history.replaceState(state, unused, journey.href(url.pathname + url.search));
  }
  const [browseOpen,setBrowseOpen]=useState(false);
  const sourceIndex = series === "e30" ? e30CatalogIndexFor(vehicle) : undefined;
  const [sourceModel, setSourceModel] = useState("");
  const [seriesSearch, setSeriesSearch] = useState(true);
  type CanonicalPart={id:string;name:string;number_normalized:string;detail:Record<string,unknown>;sources:{title:string;url:string}|null};
  const [identity,setIdentity]=useScopedState<CanonicalPart|null>(selectionScope,null);
  const [contexts,setContexts]=useState<CatalogContext[]>([]),[contextId,setContextId]=useScopedState(selectionScope,preferredCatalogContext(contexts,vehicle)?.id||''),[assemblyId,setAssemblyId]=useScopedState(selectionScope,''),[preferredSelectedId,setSelectedId]=useScopedState(selectionScope,''),[archived,setArchived]=useScopedState<CatalogPosition|null>(selectionScope,null),[category,setCategory]=useScopedState(selectionScope,''),[assemblyFilter,setAssemblyFilter]=useScopedState(selectionScope,''),[positionFilter,setPositionFilter]=useScopedState(assemblyId,''),[reference,setReference]=useScopedState(assemblyId,''),[query,setQuery]=useScopedState(selectionScope,''),[debounced,setDebounced]=useState(''),[searchCursor,setSearchCursor]=useState<{number:string;id:string}|null>(null),[booting,setBooting]=useState(true),[localError,setError]=useScopedState(selectionScope,'');
  const searchAll = series === "e30" && (seriesSearch || !contextId);
  function changeSearchScope(all: boolean) {
    setSeriesSearch(all);
    setSearchCursor(null);
  }
  const boot=useEffectEvent(async(signal:AbortSignal)=>{
      try {
        const params = new URLSearchParams(location.search),
          inventory = await seriesInventory(series)
            .order("model_id")
            .order("model_year").abortSignal(signal);
        if (inventory.error) throw new Error("The catalog service is unavailable right now.");
        if (signal.aborted) return;
        const list = correctedCatalogInventory(displayCatalogModels((inventory.data || []) as CatalogContext[]));
        setContexts(list);
        setQuery(params.get("q") || "");
        setCategory(params.get("category") || "");
        setTransmission(transmissionView(params.get("transmission") ?? (params.has("assembly") || params.has("part") ? "all" : vehicle.transmission)));
        let context = params.get("context") || "",
          assembly = params.get("assembly") || "",
          position = initialPosition || params.get("position") || "";
        const part = initialPart || params.get("part") || journey.scan?.part_id;
        const preferred=preferredCatalogContext(list,vehicle);
        if (params.get('workspace') === 'part' && part) {
          if (position && !catalogPositionAllowed(position)) throw new Error('This source entry is an applicability note, not an ordering position.');
          const canonical = await db.from('parts').select('id,name,number_normalized,detail,sources(title,url)').eq('id',part).abortSignal(signal).maybeSingle();
          if (canonical.error || !canonical.data) throw new Error('This catalog identity could not load.');
          if (signal.aborted) return;
          setIdentity(canonical.data as unknown as typeof identity);
        } else if (position || part) {
          let lookup = db
            .from("part_assembly_positions")
            .select("*,parts(id,name,number_normalized)");
          lookup = position
            ? lookup.eq("id", position)
            : lookup
                .eq("part_id", part!)
                .order("active", { ascending: false })
                .order("id");
          if(!position&&(context||preferred))lookup=lookup.eq("context_id",context||preferred!.id);
          if (position && !catalogPositionAllowed(position)) throw new Error('This entry is an applicability note, not an ordering position. Choose the part from its assembly drawing.');
          const found = await lookup.limit(position ? 1 : 100).abortSignal(signal);
          const result = { ...found, data: !position&&!context&&vehicle.model&&!preferred?null:(found.data || []).find(row => catalogPositionAllowed(row.id)) || null };
          if (result.error) throw result.error;
          if (signal.aborted) return;
          if (!result.data) {
            if (position)
              throw new Error("This source position could not be found.");
            const canonical = await db
              .from("parts")
              .select("id,name,number_normalized,detail,sources(title,url)")
              .eq("id", part!)
              .abortSignal(signal).maybeSingle();
            if (canonical.error) throw canonical.error;
            if (signal.aborted) return;
            if (!canonical.data)
              throw new Error(
                "This BMW number is not registered in the catalog.",
              );
            setIdentity(canonical.data as unknown as typeof identity);
          } else {
            context = result.data.context_id;
            assembly = result.data.assembly_id;
            position = result.data.id;
            if (!result.data.active)
              setArchived(result.data as unknown as CatalogPosition);
          }
        }
        if (!context || !list.some((c) => c.id === context)) {
          let preference = "";
          let savedVehicle = vehicle;
          try {
            preference = localStorage.getItem(series+".catalog.context.v1") || "";
            const saved = JSON.parse(localStorage.getItem(series+".vehicle.v1") || "null");
            if (!journey.selected && saved && typeof saved === "object") savedVehicle = sanitizeVehicle(saved);
          } catch {}
          context = preferredCatalogContext(list, savedVehicle, preference)?.id || "";
        }
        setContextId(context);
        setAssemblyId(assembly);
        setSelectedId(position);
      } catch (reason) {
        if (!signal.aborted) setError(reason instanceof Error ? reason.message : "The catalog could not load this selection.");
      } finally {
        if (!signal.aborted) setBooting(false);
      }
  });
  const failBoot=useEffectEvent(()=>{setError("The catalog could not load. Reload the catalog to try again.");setBooting(false)});
  useEffect(()=>{
    if(!vehicleReady||!journey.ready||journey.scanLoading)return;
    const controller=new AbortController(),deadline=setTimeout(()=>{controller.abort();failBoot()},15000);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Bootstrap hydrates the browser URL/storage and awaits catalog inventory; later selections use scoped resources.
    void boot(controller.signal).finally(()=>clearTimeout(deadline));
    return()=>{clearTimeout(deadline);controller.abort();};
  },[initialPart,initialPosition,vehicleReady,journey.ready,journey.scanLoading,journey.scanId,journey.scan?.part_id]);
  useEffect(()=>{
    if(booting||!contextId||initialPart||initialPosition||assemblyId)return;
    const url=new URL(location.href);
    if(url.searchParams.get('context')!==contextId||url.searchParams.get('transmission')!==transmission)
      history.replaceState(null,'',journey.href(catalogBrowseHref(basePath,{context:contextId,transmission,category})));
  },[booting,contextId,initialPart,initialPosition,assemblyId,transmission,category,basePath,journey]);
  const contextResource=useKeyedResource<{assemblies:CatalogAssembly[];previews:Record<string,string>}>(contextId,async signal=>{
    const [rows,art]=await Promise.all([
      fetchAllRows((from,to)=>db.from('assemblies').select('id,title,source_category,source_id,boundary,catalog_context_id').eq('catalog_context_id',contextId).order('id').range(from,to).abortSignal(signal)),
      fetchAllRows((from,to)=>db.from('technical_drawings').select('assembly_id,image_path,remote_url,assemblies!inner(catalog_context_id)').eq('assemblies.catalog_context_id',contextId).order('id').range(from,to).abortSignal(signal))
    ]);
    return {assemblies:rows as unknown as CatalogAssembly[],previews:Object.fromEntries(art.filter(d=>availableDrawingImage(d.image_path,d.remote_url)).map(d=>[d.assembly_id,availableDrawingImage(d.image_path,d.remote_url)!]))};
  },{enabled:!!contextId&&!booting,failureMessage:'This catalog source could not load. Choose the source again to retry.'});
  const assemblies=contextResource.data?.assemblies||emptyAssemblies,previews=contextResource.data?.previews||{};
  const assemblyResource=useKeyedResource<{positions:CatalogPosition[];drawings:SourceDrawing[]}>(JSON.stringify([assemblyId,archived?.id]),async signal=>{
    const [rows,art]=await Promise.all([
      fetchAllRows((from,to)=>db.from('part_assembly_positions').select('*,parts(id,name,number_normalized)').eq('assembly_id',assemblyId).eq('active',true).order('reference').order('id').range(from,to).abortSignal(signal)),
      db.from('technical_drawings').select('*').eq('assembly_id',assemblyId).order('id').abortSignal(signal)
    ]);
    if(art.error)throw art.error;const positions=catalogOrderingRows(rows as unknown as CatalogPosition[]);
    if(archived?.assembly_id===assemblyId&&!positions.some(p=>p.id===archived.id))positions.unshift(archived);
    return {positions,drawings:(art.data||[])as SourceDrawing[]};
  },{enabled:!!assemblyId,failureMessage:'This assembly could not load. Choose the assembly again to retry.'});
  const positions=assemblyResource.data?.positions||[],drawings=assemblyResource.data?.drawings||[],selectedId=positions.some(p=>p.id===preferredSelectedId)?preferredSelectedId:positions[0]?.id||preferredSelectedId;
  const [preferredDrawingId,setDrawingId]=useScopedState(assemblyId,''),drawingId=drawings.some(d=>d.id===preferredDrawingId)?preferredDrawingId:drawings[0]?.id||'';
  const drawing=drawings.find(d=>d.id===drawingId),drawingSrc=drawing?availableDrawingImage(drawing.image_path,drawing.remote_url):'';
  const imageResource=useKeyedResource<{width:number;height:number}>(JSON.stringify([drawingId,drawingSrc]),signal=>new Promise((resolve,reject)=>{
    const image=new Image();image.referrerPolicy='no-referrer';
    const dispose=()=>{image.onload=null;image.onerror=null;signal.removeEventListener('abort',cancel);};
    const cancel=()=>{dispose();reject(Error('Drawing request stopped'));};
    signal.addEventListener('abort',cancel,{once:true});
    image.onload=()=>{dispose();resolve({width:image.naturalWidth,height:image.naturalHeight});};image.onerror=()=>{dispose();reject(Error('Drawing unavailable'));};image.src=drawingSrc!;
  }),{enabled:!!drawingSrc,failureMessage:'The drawing image could not load.'});
  const dimensions=imageResource.data||undefined,imageError=!!imageResource.error,loading=contextResource.loading||assemblyResource.loading;
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchCursor(null);
      setDebounced(query.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  type SearchPage={base:string;request:string;rows:CatalogIdentityHit[];more:boolean;next:{number:string;id:string}|null;error:string};
  const [searchPage,setSearchPage]=useState<SearchPage|null>(null),searchBase=JSON.stringify([contextId,debounced,searchAll]),searchRequest=JSON.stringify([searchBase,searchCursor]);
  const searchEnabled=debounced.length>=2&&(searchAll||!!contextId)&&query.trim()===debounced;
  useEffect(()=>{
    if(!searchEnabled)return;let active=true;const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),12000);
    const search_query = catalogSearchQuery(debounced);
    const request = searchAll
      ? db.rpc('catalog_find_series_parts',{search_query,series_filter:series,context_preference:contextId||null,max_results:31,after_number:searchCursor?.number||null})
      : db.rpc('catalog_find_parts',{search_query,context_filter:contextId,max_results:31,after_number:searchCursor?.number||null,after_position:searchCursor?.id||null});
    Promise.resolve(request.abortSignal(controller.signal)).then(({data,error})=>{
      if(!active)return;if(error)throw error;const raw=(data||[]).slice(0,30)as CatalogIdentityHit[],page=catalogOrderingRows(raw),last=raw.at(-1);
      setSearchPage(old=>({base:searchBase,request:searchRequest,rows:searchCursor&&old?.base===searchBase?[...old.rows,...page.filter(p=>!old.rows.some(o=>(o.position_id||o.part_id)===(p.position_id||p.part_id)))]:page,more:(data||[]).length>30,next:last?{number:last.number_normalized,id:last.position_id||''}:null,error:''}));
    }).catch(()=>{if(active)setSearchPage({base:searchBase,request:searchRequest,rows:[],more:false,next:null,error:'Catalog search could not load. Retry your search.'});}).finally(()=>clearTimeout(deadline));
    return()=>{active=false;clearTimeout(deadline);controller.abort();};
  },[searchEnabled,debounced,contextId,searchBase,searchRequest,searchCursor,searchAll,series]);
  const currentSearch=searchEnabled&&searchPage?.base===searchBase?searchPage:null,hits=currentSearch?.rows||[],searchMore=currentSearch?.more||false,nextSearchCursor=currentSearch?.next||null,searching=searchEnabled&&currentSearch?.request!==searchRequest;
  const selected=positions.find(p=>p.id===selectedId),context=contexts.find(c=>c.id===contextId),assembly=assemblies.find(a=>a.id===assemblyId);
  type Replacement={id:string;replacement_part_id:string;replacement:{id:string;name:string;number_normalized:string|null}|null};
  const replacementResource=useKeyedResource<Replacement[]>(selectedId,async signal=>{
    const r=await db.from('part_supersessions').select('*,replacement:parts!part_supersessions_replacement_part_id_fkey(id,name,number_normalized)').eq('position_id',selectedId).abortSignal(signal);
    if(r.error)throw r.error;return (r.data||[])as unknown as Replacement[];
  },{enabled:!!selected,failureMessage:'Replacement history could not load.'});
  const replacements=replacementResource.data||[],error=localError||contextResource.error||assemblyResource.error||currentSearch?.error||replacementResource.error;
  const categories = useMemo(
    () => [...new Set(assemblies.filter(a => assemblyInTransmission(a, transmission)).map((a) => a.source_category))].sort(),
    [assemblies, transmission],
  );
  const visibleAssemblies = assemblies
    .filter(
      (a) =>
        assemblyInTransmission(a, transmission) && (!category || a.source_category === category) &&
        (!assemblyFilter ||
          a.title.toLowerCase().includes(assemblyFilter.toLowerCase())),
    )
    .sort((a, b) => a.title.localeCompare(b.title));
  const visiblePositions = positions.filter(
    (p) =>
      (!reference || p.reference === reference) &&
      (!positionFilter ||
        (p.source_name + " " + p.parts.number_normalized + " " + p.reference)
          .toLowerCase()
          .includes(positionFilter.toLowerCase().replace(/[- ](?=\d)/g, ""))),
  );
  const assemblyMap = useMemo(() => new Map(assemblies.map(a => [a.id, a])), [assemblies]);
  const visibleHits = searchAll ? hits : hits.filter(hit => {
    const sourceAssembly = hit.assembly_id ? assemblyMap.get(hit.assembly_id) : undefined;
    return !sourceAssembly || assemblyInTransmission(sourceAssembly, transmission);
  });
  const names = Object.fromEntries(positions.map((p) => [p.id, p.source_name]));
  const notes = selected ? orderingNotes(selected) : [];
  const linkedModel = series === "e34" && selected
    ? referenceModelForPart(selected.part_id)
    : undefined;
  const adapted = drawing
    ? sourceDrawingAdapter(drawing, positions, dimensions)
    : undefined;
  const matchingContext = vehicle.model
    ? preferredCatalogContext(contexts, vehicle)
    : undefined;

  const transmissionGroup = transmission === 'manual' ? 'Manual Transmission' : 'Automatic Transmission';
  const missingTransmission = transmission !== 'all' && !loading && !!contextId && assemblies.length > 0 && !assemblies.some(a => a.source_category === transmissionGroup);
  const alternateBody = context?.body === 'Touring' ? catalogForModel(contexts.filter(c => c.body === 'Sedan'), context.model_id, context) : undefined;
  function chooseContext(next: string) {
    setContextId(next);
    try { localStorage.setItem(series+".catalog.context.v1", next); } catch {}
    setAssemblyId(""); setSelectedId(""); setArchived(null); setCategory(""); setAssemblyFilter("");
       setIdentity(null); setQuery("");  setSearchCursor(null);
    history.replaceState(null, '', browseHref({ context: next, category: '' }));
  }
  function chooseCategory(next: string) {
    setCategory(next); setAssemblyId(''); setSelectedId(''); setArchived(null); setQuery('');
    history.replaceState(null, '', browseHref({ category: next }));
  }
  function chooseTransmission(next: TransmissionView) {
    setTransmission(next);
    const keep = assembly && assemblyInTransmission(assembly, next);
    const nextCategory = assemblies.some(a => a.source_category === category && assemblyInTransmission(a, next)) ? category : '';
    setCategory(nextCategory);
    if (!keep) { setAssemblyId(''); setSelectedId(''); setArchived(null);   }
    history.replaceState(null, '', browseHref({ transmission: next, category: nextCategory, assembly: keep ? assemblyId : '', position: keep ? selectedId : '', q: query }));
  }
  function chooseAssembly(next: string, position = "") { track('assembly_view','drawing:'+next);
    setAssemblyId(next);
    setSelectedId(position);
    setArchived(null);
    setQuery("");
    setReference("");

    setBrowseOpen(false);
    updateAddress(
      null,
      "",
      "/parts/catalog?context=" +
        encodeURIComponent(contextId) +
        "&assembly=" +
        encodeURIComponent(next) +
        (position ? "&position=" + encodeURIComponent(position) : ""),
    );
  }
  function choosePosition(id: string) {
    const p = positions.find((p) => p.id === id);
    if (!p) return;
    track('component_select','part:'+p.part_id);setSelectedId(id);
    setReference(p.reference);
    updateAddress(null, "", catalogPositionHref(p));
    if (matchMedia("(max-width:900px)").matches)
      requestAnimationFrame(() =>
        document
          .querySelector(".catalog-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
  }
  function exportAssembly() {
    if (!assembly) return;
    const quote = catalogCsvCell;
    const lines = [
      [
        "Catalog selection",
        "Assembly",
        "Position",
        "BMW number",
        "Description",
        "Required quantity",
        "Package quantity",
        "Source conditions",
        "Source URL",
      ],
      ...positions
        .filter((p) => p.active)
        .map((p) => [
          context?.name,
          assembly.title,
          p.reference,
          p.parts.number_normalized,
          p.source_name,
          p.required_quantity,
          p.package_quantity,
          p.conditions.map((x) => x.name + ": " + x.value).join("; "),
          p.source_url,
        ]),
    ];
    downloadText(
      "\uFEFF" + lines.map((row) => row.map(quote).join(",")).join("\r\n"),
      series + "-" + assembly.id + ".csv",
      "text/csv;charset=utf-8",
    );
  }
  const archiveEvidence = identity?.detail.archive_evidence as
    | {
        source_url: string;
        source_diagram_count: number;
        diagram_references: { key: string; name: string; group: string }[];
        scope: string;
      }
    | undefined;
  const searchInput = (
    <div className="input-icon">
      <Search size={18} />
      <input
        aria-label="Search catalog part number or name"
        maxLength={200}
        disabled={!contextId && !searchAll}
        placeholder="BMW number or component name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );
  const seriesSearchActive = series === "e30" && query.trim().length >= 2;
  return (
    <div className="page catalog-page">
      <PageIntro
        eyebrow={"BMW "+series.toUpperCase()+" / COMPONENT IDENTIFICATION"}
        title={presentation === "workshop" ? series.toUpperCase() + " exploded diagrams." : "OEM number & assembly reference."}
        description={presentation === "workshop" ? "Choose a model, source year and body style. Explore engine, gearbox, body and trim diagrams with their BMW numbers and service references." : "Look up component diagrams, BMW numbers, quantities and application notes. E34 Lore does not sell vehicle parts."}
      >
        <DocumentLink className="button outline" href={series === "e30" ? "/workshop" : "/parts/reference"}>
          <Box size={16} />
          Service figures & 3D references
        </DocumentLink>
        <DocumentLink className="button outline" href="/garage/vins">Find a vehicle by VIN <ArrowUpRight size={16}/></DocumentLink>
      </PageIntro>
      <JourneyBar journey={journey}/>
      {error && <Notice tone="warning">{error} <button type="button" className="text-link" onClick={()=>location.reload()}>Reload catalog</button></Notice>}
      {identity && (
        <section className="source-box">
          <div>
            <Tag>BMW PART NUMBER</Tag>
            <h2>
              {identity.detail?.description_not_established
                ? "Source-listed replacement"
                : identity.name}
            </h2>
            <strong>{formatPartNumber(identity.number_normalized)}</strong>
            <p>
              Compare the source records and restrictions with the hardware in your car.
            </p>
            {identity.sources?.url && (
              <DocumentLink
                className="text-link"
                href={identity.sources.url}
                target="_blank"
                rel="noreferrer"
              >
                {identity.sources.title}
                <ExternalLink size={14} />
              </DocumentLink>
            )}
            {archiveEvidence && (
              <section className="archive-identity-evidence">
                <h3>Number-only record</h3>
                <p className="small muted">
                  The full BMW number and description are recorded in the E34
                  archive. Production and option conditions from this source
                  remain under review.
                </p>
                <details>
                  <summary>
                    Diagram references ({archiveEvidence.source_diagram_count})
                  </summary>
                  <ul>
                    {archiveEvidence.diagram_references
                      .slice(0, 20)
                      .map((d) => (
                        <li key={d.key}>
                          <code>{d.key}</code> {d.name} · {d.group}
                        </li>
                      ))}
                  </ul>
                  {archiveEvidence.source_diagram_count > 20 && (
                    <p className="small muted">
                      Showing the first 20 archive references.
                    </p>
                  )}
                </details>
                <DocumentLink
                  className="text-link"
                  href={archiveEvidence.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Archive source
                  <ExternalLink size={14} />
                </DocumentLink>
              </section>
            )}
            <div className="form-actions">
              <SaveButton kind="part" id={identity.id} title={identity.name} />
              <DocumentLink
                className="button outline"
                href={"/community/new?part=" + encodeURIComponent(identity.id) + "&series=" + series}
              >
                Ask about this part
                <ArrowUpRight size={15} />
              </DocumentLink>
              <DocumentLink
                className="button outline"
                href={journey.href("/garage?install_part=" + encodeURIComponent(identity.id))}
              >
                Record an installed part
                <ArrowUpRight size={15} />
              </DocumentLink>
              <button
                className="text-link"
                onClick={() => {
                  setIdentity(null);
                  updateAddress(null, "", "/parts/catalog");
                }}
              >
                Browse assemblies
              </button>
            </div>
            <PartWorkspace key={'workspace-'+identity.id} part={{...identity,positionId:typeof location==='undefined'?undefined:new URLSearchParams(location.search).get('position')||undefined,contextId:typeof location==='undefined'?undefined:new URLSearchParams(location.search).get('context')||undefined}} vehicle={vehicle} navigation={{ vehicle: journey.activeId, scan: journey.scanId }} initialReference={typeof location === 'undefined' ? undefined : new URLSearchParams(location.search).get('reference') || undefined} initialModelRevision={typeof location==='undefined'?undefined:Number(new URLSearchParams(location.search).get('model_revision'))||undefined}/>
            <CatalogApplications key={identity.id} partId={identity.id} />
            <RelatedJournalEntries kind="part" id={identity.id} /><RelatedDiscussions kind="part" id={identity.id} />
          </div>
        </section>
      )}
      <DocumentLink className="catalog-interchange-entry" href={"/parts/interchange"+(selected?"?part="+encodeURIComponent(selected.part_id):identity?"?part="+encodeURIComponent(identity.id):"")}>Interchange & replacement numbers <ArrowUpRight size={16}/></DocumentLink>
      {booting ? (
        <p className="loading-state">Loading catalog selections…</p>
      ) : identity ? null : !contexts.length ? (
        <Empty title={error ? "Browse reference sources" : "No catalog sources available"}>
          <DocumentLink href={series === "e30" ? "/workshop" : "/parts/reference"}>Open service figures and reference assemblies</DocumentLink>
          {series === "e30" && <> · <a href={sourceIndex?.href ?? e30CatalogArchive}>Open the original E30 catalog</a></>}
        </Empty>
      ) : (
        <>
          {series === "e30" && <div className="catalog-series-search">
            {searchInput}
            {contextId && <select aria-label="Catalog search scope" value={searchAll ? "series" : "vehicle"} onChange={event => changeSearchScope(event.target.value === "series")}>
              <option value="series">All E30 catalogs</option>
              <option value="vehicle">{context?.name || "Selected catalog"}</option>
            </select>}
          </div>}
          {!seriesSearchActive && <>
          <nav className="catalog-model-choices" aria-label={series.toUpperCase() + " model diagrams"}>
            {[...new Set(contexts.map(c => c.model_id))].map(model => <button key={model} aria-pressed={context?.model_id === model} onClick={() => { const next = catalogForModel(contexts, model, context); if (next) chooseContext(next.id); }}>{model}</button>)}
          </nav>
          <div className="catalog-context-bar">
            <label>
              Catalog vehicle
              <select
                aria-label="Catalog vehicle"
                value={contextId}
                onChange={(e) => chooseContext(e.target.value)}
              >
                {!contextId&&<option value="">Choose a source catalog for your vehicle</option>}
                {contexts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Transmission diagrams
              <select aria-label="Transmission diagrams" value={transmission} onChange={e => chooseTransmission(e.target.value as TransmissionView)}>
                <option value="all">All transmissions</option><option value="manual">Manual</option><option value="automatic">Automatic</option>
              </select>
            </label>
            {context ? <div className="catalog-coverage">
              <strong>
                {context?.distinct_parts.toLocaleString()} parts ·{" "}
                {context?.assembly_count?.toLocaleString?.() ||
                  assemblies.length}{" "}
                assemblies
              </strong>
              <span>
                {context?.imported_pages}/{context?.expected_pages} catalog
                pages imported ·{" "}
                {context?.engine ||
                  "Engine/option variants retained in source conditions"}
              </span>
            </div> : <div className="catalog-coverage"><strong>Select a source catalog</strong><span>No matching source is indexed for this vehicle.</span>{series === "e30" && <DocumentLink target="_blank" rel="noopener noreferrer" href={sourceIndex?.href ?? e30CatalogArchive}>{sourceIndex ? "Open the " + sourceIndex.year + " " + sourceIndex.model + " " + sourceIndex.body + " source ↗" : "Browse the original E30 catalog ↗"}</DocumentLink>}</div>}
            {series === "e34" && searchInput}
          </div>
          {workshopControls}
          {series === "e30" && <details className="catalog-coverage">
            <summary>Original catalogs by model and year</summary>
            <p>{contexts.length} configurations are indexed here. The links below open the original assembly listings.</p>
            <label>Filter original catalogs
              <select value={sourceModel} onChange={event => setSourceModel(event.target.value)}>
                <option value="">All models</option>
                {[...new Set(e30CatalogSources().map(row => row.model))].map(model => <option key={model}>{model}</option>)}
              </select>
            </label>
            <ul>{e30CatalogSources(sourceModel).map(row => <li key={row.href}><DocumentLink href={row.href} target="_blank" rel="noopener noreferrer">{row.year} {row.model} {row.body} <ArrowUpRight size={13}/></DocumentLink></li>)}</ul>
            <DocumentLink href={e30CatalogArchive} target="_blank" rel="noopener noreferrer">Other markets, engines and body styles <ArrowUpRight size={14}/></DocumentLink>
          </details>}
          {!contextId&&vehicle.model&&<Notice tone="warning">Choose a catalog that matches your {vehicle.year} {vehicle.model} {vehicle.body}.</Notice>}
          {context && (
            <p className="catalog-vehicle-note" role="status">
              {{
                sample: "Browsing a source catalog. Select your E34 to compare it with this catalog.",
                different: "This source catalog differs from your selected E34. Choose a matching catalog if one is available.",
                partial: "This catalog matches some of your E34 details. Check any unconfirmed details and the conditions at each position.",
                matching: "The catalog configuration matches your selection. Check production and equipment conditions at each position.",
              }[catalogContextMatch(context, vehicle)]}
              {matchingContext && matchingContext.id !== context.id &&
                catalogContextMatch(matchingContext, vehicle) !== "different" && (
                  <>{" "}<DocumentLink href={browseHref({context: matchingContext.id, category: ""})}>
                    Browse {matchingContext.name} ↗
                  </DocumentLink></>
                )}
            </p>
          )}
          {context && <div className="catalog-system-shortcuts" aria-label="Common exploded diagrams">
            {[['Engine', 'Engine'], ['Manual gearbox', 'Manual Transmission'], ['Automatic gearbox', 'Automatic Transmission'], ['Clutch & gearshift', 'Gearshift / Clutch'], ['Bodywork', 'Bodywork']].filter(([, group]) => assemblies.some(a => a.source_category === group)).map(([label, group]) => <button key={group} aria-pressed={category === group} onClick={() => {
              const next = group === 'Manual Transmission' ? 'manual' : group === 'Automatic Transmission' ? 'automatic' : transmission;
              setTransmission(next); setCategory(group); setAssemblyFilter(''); setAssemblyId(''); setSelectedId(''); setArchived(null); setQuery(''); setBrowseOpen(false);
              history.replaceState(null, '', browseHref({ category: group, transmission: next }));
            }}>{label}</button>)}
          </div>}
          {transmission !== 'all' && <p className="catalog-vehicle-note">Showing {transmission} and shared or unspecified assemblies. This browsing filter does not confirm the installed gearbox, or certify a manual conversion. Check the gearbox identification and each source condition.</p>}
          {missingTransmission && <Notice tone="warning">No {transmission} gearbox diagrams are indexed in this source selection.{alternateBody && <> <DocumentLink href={browseHref({context: alternateBody.id, category: transmissionGroup})}>Browse {alternateBody.name} {transmission} diagrams as a separate reference</DocumentLink>. This does not establish factory availability or conversion compatibility for the Touring.</>}</Notice>}
          {assembly && !assemblyInTransmission(assembly, transmission) && <Notice tone="warning">This linked assembly is listed for {assemblyTransmission(assembly)} transmission, outside your current browsing filter. <button className="text-link" onClick={() => chooseTransmission('all')}>Show all transmission diagrams</button></Notice>}
          </>}
          {(seriesSearchActive || (debounced.length >= 2 && (contextId || searchAll))) ? (
            <section className="catalog-search">
              <div className="section-heading">
                <h2>Catalog results</h2>
                <button className="text-link" onClick={() => setQuery("")}>
                  Return to assemblies
                </button>
              </div>
              {(seriesSearchActive && query.trim() !== debounced) || (searching && !searchCursor) ? (
                <p role="status">Searching catalog…</p>
              ) : visibleHits.length ? (
                <div className="catalog-result-list">
                  {visibleHits.map(hit => {
                    const direct = !searchAll && hit.assembly_id && hit.position_id;
                    return <button key={hit.position_id || hit.part_id} onClick={() => {
                      if (direct) chooseAssembly(hit.assembly_id!, hit.position_id!);
                      else navigateDocument(journey.href(catalogIdentityHref(hit)));
                    }}>
                      <code>{formatPartNumber(hit.number_normalized)}</code>
                      <span>
                        <strong>{hit.name}</strong>
                        <small>{hit.position_id ? [searchAll && hit.context_name, hit.assembly_title, "position " + hit.reference].filter(Boolean).join(" · ") : "Source-listed replacement number"}</small>
                      </span>
                      <ChevronRight size={17} />
                    </button>;
                  })}
                </div>
              ) : (
                <Empty
                  title={currentSearch?.error || (hits.length ? "No results in this transmission view" : searchAll ? "No matches in the E30 catalog" : "No matches in this source catalog")}
                  action={
                    !searchAll && (series === "e30"
                      ? <button className="button outline" onClick={() => changeSearchScope(true)}>Search all E30 catalogs</button>
                      : <DocumentLink className="button outline" href={"/search?q=" + encodeURIComponent(debounced)}>Search all catalog records</DocumentLink>)
                  }
                >
                  Try a different component name or the complete BMW number.
                </Empty>
              )}
              {searchMore && nextSearchCursor && (
                <button
                  className="button outline"
                  disabled={searching}
                  onClick={() => {
                    setSearchCursor(nextSearchCursor);
                  }}
                >
                  {searching ? "Loading…" : "More catalog results"}
                </button>
              )}
            </section>
          ) : (
            <div
              className={
                "catalog-workspace " + (assemblyId ? "has-assembly" : "")
              }
            >
              <aside
                className={
                  "catalog-navigation " + (browseOpen ? "browse-open" : "")
                }
              >
                <button
                  className="catalog-browse-toggle"
                  aria-expanded={browseOpen}
                  onClick={() => setBrowseOpen((open) => !open)}
                >
                  Browse assembly index
                  <ChevronRight size={16} />
                </button>
                <div className="catalog-navigation-body">
                  <label>
                    System / source group
                    <select
                      aria-label="Catalog source group"
                      value={category}
                      onChange={(e) => chooseCategory(e.target.value)}
                    >
                      <option value="">All groups</option>
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <div className="input-icon">
                    <Search size={15} />
                    <input
                      aria-label="Filter assembly names"
                      placeholder="Find an assembly"
                      value={assemblyFilter}
                      onChange={(e) => setAssemblyFilter(e.target.value)}
                    />
                  </div>
                  <nav aria-label="Catalog assemblies">
                    {visibleAssemblies.map((a) => (
                      <button
                        key={a.id}
                        className={a.id === assemblyId ? "selected" : ""}
                        onClick={() => chooseAssembly(a.id)}
                      >
                        <span>{a.title}</span>
                        <ChevronRight size={13} />
                      </button>
                    ))}
                  </nav>
                  <p className="small muted">
                    This is a model-year/body catalog selection. Source date,
                    transmission and equipment conditions must be checked for
                    the actual vehicle.
                  </p>
                </div>
              </aside>
              {!assemblyId ? (
                <section className="catalog-group-grid">
                  <div className="section-heading">
                    <h2>{category || "Vehicle systems"}</h2>
                    <span>{visibleAssemblies.length} assemblies</span>
                  </div>
                  {loading ? (
                    <p role="status">Loading assemblies…</p>
                  ) : category ? (
                    <div className="catalog-assembly-grid illustrated">
                      {!visibleAssemblies.length && <p>No assemblies match these filters. Clear the assembly name or choose another system.</p>}
                      {visibleAssemblies.map((a) => (
                        <button
                          className="catalog-assembly-card"
                          key={a.id}
                          onClick={() => chooseAssembly(a.id)}
                        >
                          <CatalogDrawingPreview key={previews[a.id]} src={previews[a.id]} title={a.title} />
                          <span>
                            {a.title}
                            <ArrowUpRight size={16} />
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="catalog-assembly-grid">
                      {categories.map((c) => {
                        const example = visibleAssemblies.find((a) => a.source_category === c && previews[a.id]);
                        const preview = example ? previews[example.id] : undefined;
                        return <button className="catalog-category-card" key={c} onClick={() => chooseCategory(c)}>
                          <CatalogDrawingPreview key={preview} src={preview} title={example?.title || c} />
                          <span>
                            {c}
                            <small>
                              {
                                visibleAssemblies.filter(
                                  (a) => a.source_category === c,
                                ).length
                              }{" "}
                              assemblies
                            </small>
                          </span>
                          <ChevronRight size={18} />
                        </button>;
                      })}
                    </div>
                  )}
                </section>
              ) : (
                <>
                  <section className="catalog-main">
                    <DocumentLink
                      className="back-link"
                      href={browseHref({category: ""})}
                      onClick={(e) => {
                        e.preventDefault();
                        chooseCategory("");
                      }}
                    >
                      <ArrowLeft size={15} />
                      Assembly index
                    </DocumentLink>
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">
                          {assembly?.source_category}
                        </span>
                        <h2>{assembly?.title || "Assembly"}</h2>
                      </div>
                      <div className="catalog-export-tools">
                        {selected?.part_id &&
                          referenceModelForPart(selected.part_id) &&
                          initialTwinGraph.nodes.some(
                            (n) => n.partId === selected.part_id,
                          ) && (
                            <DocumentLink
                              className="button"
                              href={
                                "/workshop?part=" +
                                encodeURIComponent(selected.part_id)
                              }
                            >
                              Open in workshop <Box size={16} />
                            </DocumentLink>
                          )}
                        <button
                          aria-label="Export assembly part list"
                          onClick={exportAssembly}
                        >
                          <Download size={14} />
                          CSV
                        </button>
                        <button
                          aria-label="Export assembly source records as JSON"
                          onClick={() =>
                            downloadJSON(
                              {
                                exported_at: new Date().toISOString(),
                                context,
                                assembly,
                                positions: positions.filter((p) => p.active),
                                drawings,
                              },
                              "e34-" + assemblyId + ".json",
                            )
                          }
                        >
                          JSON
                        </button>
                      </div>
                    </div>
                    {assembly && (
                      <details className="catalog-assembly-scope">
                        <summary>Source selection</summary>
                        <p>{assembly.boundary}</p>
                      </details>
                    )}
                    {drawings.length > 1 && (
                      <label className="catalog-drawing-picker">
                        Source illustration
                        <select
                          aria-label="Source illustration"
                          value={drawingId}
                          onChange={(e) => setDrawingId(e.target.value)}
                        >
                          {drawings.map((d, i) => (
                            <option key={d.id} value={d.id}>
                              Drawing {i + 1} ·{" "}
                              {d.source_label || "Catalog illustration"}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {imageError && (
                      <Notice tone="warning">
                        The diagram did not load.{" "}
                        {adapted && <DocumentLink href={adapted.source} target="_blank" rel="noopener noreferrer">
                          Open original diagram <ExternalLink size={14}/>
                        </DocumentLink>}
                      </Notice>
                    )}
                    {adapted && !imageError ? (
                      <Diagram
                        key={drawing?.id}
                        assembly={assemblyId}
                        selected={selectedId}
                        onSelect={choosePosition}
                        drawingOverride={adapted}
                        partNames={names}
                        modelOverride={
                          linkedModel && selected
                            ? {
                                assembly: linkedModel.assembly,
                                partId: selected.part_id,
                                isolated: true,
                                onSelect: (id) => {
                                  const position = positions.find(
                                    (p) => p.part_id === id,
                                  );
                                  if (position) choosePosition(position.id);
                                  else
                                    navigateDocument(componentHref({partId:id},{vehicle:journey.activeId,scan:journey.scanId}));
                                },
                              }
                            : undefined
                        }
                      />
                    ) : linkedModel && selected ? (
                      <AssemblyModel
                        assembly={linkedModel.assembly}
                        selected={selected.part_id}
                        initialIsolate
                        onSelect={(id) => {
                          const position = positions.find(
                            (p) => p.part_id === id,
                          );
                          if (position) choosePosition(position.id);
                          else
                            navigateDocument(componentHref({partId:id},{vehicle:journey.activeId,scan:journey.scanId}));
                        }}
                      />
                    ) : loading ? (
                      <p role="status">Loading source positions…</p>
                    ) : (
                      <Notice>
                        No source illustration is registered for this assembly.
                        The table retains all available ordering records.
                      </Notice>
                    )}
                    <div className="catalog-table-tools">
                      <h3>
                        {reference ? "Position " + reference : "Assembly parts"}
                        <span>{visiblePositions.length} records</span>
                      </h3>
                      {reference && (
                        <button
                          className="text-link"
                          onClick={() => setReference("")}
                        >
                          Show all positions
                        </button>
                      )}
                      <input
                        aria-label="Filter assembly parts"
                        placeholder="Filter number or description"
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                      />
                    </div>
                    <div className="table-scroll">
                      <table className="catalog-parts-table">
                        <thead>
                          <tr>
                            <th>Pos.</th>
                            <th>Part description</th>
                            <th>BMW number</th>
                            <th>Qty.</th>
                            <th>Production / equipment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visiblePositions.map((p) => (
                            <tr
                              key={p.id}
                              className={p.id === selectedId ? "selected" : ""}
                            >
                              <td>
                                <button
                                  aria-label={
                                    "Select position " +
                                    p.reference +
                                    " " +
                                    p.parts.number_normalized
                                  }
                                  onClick={() => choosePosition(p.id)}
                                >
                                  {p.reference || "—"}
                                </button>
                              </td>
                              <td>
                                <button onClick={() => choosePosition(p.id)}>
                                  {p.source_name}
                                </button>
                                {!p.active && <Tag>Archived source record</Tag>}
                                {p.conditions.find((c) =>
                                  /Production Date/i.test(c.name),
                                ) && (
                                  <small>
                                    {formatCatalogCondition(
                                      "Production Date",
                                      p.conditions.find((c) =>
                                        /Production Date/i.test(c.name),
                                      )!.value,
                                    )}
                                  </small>
                                )}
                              </td>
                              <td>
                                <code>
                                  {formatPartNumber(p.parts.number_normalized)}
                                </code>
                              </td>
                              <td>{p.required_quantity ?? "—"}</td>
                              <td className="catalog-row-notes">
                                {orderingNotes(p).map((note, i) => (
                                  <span key={i}>
                                    {note.name}:{" "}
                                    {formatCatalogCondition(
                                      note.name,
                                      note.value,
                                    )}
                                  </span>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="small muted">
                      Quantities are source-listed installation quantities.
                      Package counts and all conditions are shown in the
                      selected record. A matching drawing position can have
                      several production or equipment variants.
                    </p>
                  </section>
                  <aside
                    className="catalog-detail"
                    aria-label="Catalog part details"
                    aria-live="polite"
                  >
                    {selected ? (
                      <>
                        <div className="inspector-header">
                          <span>POSITION {selected.reference || "—"}</span>
                          <SaveButton
                            kind="part"
                            id={selected.part_id}
                            title={selected.source_name}
                          />
                        </div>
                        <div className="catalog-detail-body">
                          <Tag>
                            {selected.active
                              ? "SOURCE-LISTED"
                              : "ARCHIVED RECORD"}
                          </Tag>
                          <h2>{selected.source_name}</h2>
                          <div className="catalog-oem">
                            <strong>
                              {formatPartNumber(
                                selected.parts.number_normalized,
                              )}
                            </strong>
                            <button
                              className="icon-button"
                              aria-label="Copy catalog BMW number"
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(selected.parts.number_normalized)
                                  .then(() => toast("BMW number copied."))
                                  .catch(() =>
                                    toast(
                                      "Select and copy the displayed number.",
                                    ),
                                  )
                              }
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          <dl>
                            <dt>Installation quantity</dt>
                            <dd>
                              {selected.required_quantity ?? "Not specified"}
                            </dd>
                            <dt>Package quantity</dt>
                            <dd>
                              {selected.package_quantity ?? "Not specified"}
                            </dd>
                            <dt>Catalog selection</dt>
                            <dd>{context?.name}</dd>
                          </dl>
                          <h3>Production & equipment notes</h3>
                          {notes.length ? (
                            <dl className="catalog-conditions">
                              {notes.map((condition, i) => (
                                <div key={i}>
                                  <dt>{condition.name}</dt>
                                  <dd title={condition.value}>
                                    {formatCatalogCondition(
                                      condition.name,
                                      condition.value,
                                    )}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <p className="small muted">
                              No additional conditions were supplied with this
                              row. Vehicle-specific fitment is not established
                              by an empty conditions field.
                            </p>
                          )}
                          {replacements.length > 0 && (
                            <section className="catalog-replacements">
                              <h3>Source-listed replacements</h3>
                              {replacements.map((item) => (
                                <DocumentLink
                                  key={item.id}
                                  href={
                                    "/parts/catalog?part=" +
                                    encodeURIComponent(item.replacement_part_id)
                                  }
                                >
                                  <code>
                                    {formatPartNumber(
                                      item.replacement?.number_normalized ||
                                        null,
                                    )}
                                  </code>
                                  <ArrowUpRight size={14} />
                                </DocumentLink>
                              ))}
                              <p className="small muted">
                                These are direct source relationships. They do
                                not establish compatibility through a chain of
                                other parts.
                              </p>
                            </section>
                          )}
                          <DocumentLink
                            className="button primary full"
                            href={
                              "/community/new?part=" +
                              encodeURIComponent(selected.part_id) +
                              "&catalog_position=" +
                              encodeURIComponent(selected.id)
                            }
                          >
                            Ask about this position
                            <ArrowUpRight size={16} />
                          </DocumentLink>
                          <DocumentLink
                            className="button outline full"
                            href={
                              journey.href("/garage?install_part=" +
                              encodeURIComponent(selected.part_id))
                            }
                          >
                            Record an installed part
                            <ArrowUpRight size={16} />
                          </DocumentLink>
                          <DocumentLink
                            className="text-link"
                            href={selected.source_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Source listing
                            <ExternalLink size={14} />
                          </DocumentLink>
                          <PartCompatibility key={"fitment-"+selected.part_id} partId={selected.part_id}/>
                          <DocumentLink className="button outline full" href={componentHref({partId:selected.part_id,positionId:selected.id,assemblyId:selected.assembly_id,catalogContextId:selected.context_id},{vehicle:journey.activeId,scan:journey.scanId})}>Open part workspace ↗</DocumentLink>
                          <CatalogProcedureLinks partId={selected.part_id} partNumber={selected.parts.number_normalized} positionId={selected.id} assemblyId={selected.assembly_id} catalogContextId={selected.context_id} navigation={{ vehicle: journey.activeId, scan: journey.scanId }} vehicleOverride={vehicle}/>
                          <PartMedia number={selected.parts.number_normalized}/><WhereToBuy key={"offers-"+selected.id} partId={selected.part_id} positionId={selected.id}/>
                          <RelatedDiscussions kind="part" id={selected.part_id}/>
                          <RelatedJournalEntries kind="part" id={selected.part_id}/>
                          <Correction type="part" id={selected.part_id}/>
                          <CatalogApplications
                            key={selected.part_id + selected.id}
                            partId={selected.part_id}
                            currentPosition={selected.id}
                          />
                        </div>
                      </>
                    ) : (
                      <p>Select a numbered position or part-table row.</p>
                    )}
                  </aside>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
