"use client";
import { isCenterSupportServicePart, supplementalPartLocation } from "../../servicing/part-location";
import { DocumentLink } from "../../components/DocumentLink";
import { previewFeatures } from "../../release/features";
import { track } from "../../analytics/client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, EyeOff, Focus, Layers, Maximize2, Minimize2, RotateCcw, Search, SlidersHorizontal, X, Save, Trash2 } from 'lucide-react';
import { loadReference, referenceRelease } from './load-reference';
import currentRelease from '../../../data/digital-twin/public-reference.json';
import { ComponentPartReference } from './ComponentPartReference';
import { CatalogSearchMatches, WorkshopCatalogBrowser } from './WorkshopCatalogBrowser';
import { catalogModelMatches, findCatalogNode, bindingFor } from './catalog';
import { PageIntro } from '../../components/common';
import { useApp } from '../../components/context';
import { useFullscreen } from '../../components/useFullscreen';
import { automaticGearboxScope, manualGearboxScope, isGearboxInspection, bodyTrimScope, engineInspectionScopes, isEngineInspection, engineBayScope, frontSuspensionScope, rearSuspensionScope, defaultView, canOpenPanels, toggleOpening, findNode, matches, members, visibleNodes, resolveInitial, savedView, mergeReferenceViews, type OpeningPanel, type ReferenceModel, type ReaderView, type Viewpoint } from './model';
import { isWiringNode, isWiringScope, wiringFor, wiringNodeId, wiringScope } from '../../data/wiring-routes';
import { wiringBranch, withWiring } from './wiring-model';
import { WiringDetails } from './WiringDetails';
import type { ReferenceRenderer, ModelCamera } from './renderer';
import { WorkshopVehicle } from '../../vehicle/WorkshopVehicle';
import { engineMatches } from '../../vehicle/reference-context';
import { useOwnedCars } from '../../vehicle/use-owned-cars';
import { BearingInspection } from '../../repair/BearingInspection';
import { RepairPanel } from '../../repair/RepairPanel';
import { useRepairJourney } from '../../repair/use-journey';
import { quickReferenceHighlights } from '../../data/quick-reference-model';
type Saved = {
    name: string;
    view: ReaderView;
    camera: ModelCamera | null;
    revision: number;
};
export function ReferenceWorkshop({embedded=false,referenceControls,buildAppearance,repairMode,repairTask,initialVehicle,initialScan, initialPart, initialNode, initialSystem, initialCatalogPosition, initialModelRevision,initialReference, referenceFocus }: {
    embedded?:boolean;
    buildAppearance?:import("../../build-studio/schema").BuildAppearance;
    referenceControls?:import("react").ReactNode;
    repairTask?:string;repairMode?:boolean;initialVehicle?:string;initialScan?:string;
    initialModelRevision?:string;initialReference?:string;
    initialPart?: string;
    initialNode?: string;
    initialSystem?: string;
    initialCatalogPosition?: string;
    referenceFocus?: string;
}) {
    const { user, toast,vehicle,series } = useApp(); const owned = useOwnedCars(),journey=useRepairJourney(initialScan);
    const[appearanceStatus,setAppearanceStatus]=useState('');
    const appearanceRef=useRef(buildAppearance);
    const wiringEnabled = !embedded && !buildAppearance && !repairMode;
    useEffect(()=>{appearanceRef.current=buildAppearance;renderer.current?.setBuildAppearance(buildAppearance||null);},[buildAppearance]);
    const[configurationHidden,setConfigurationHidden]=useState<string[]>([]);
    const[repairXray,setRepairXray]=useState(true),[repairSelection,setRepairSelection]=useState<{node:string|null;seq:number}>({node:null,seq:0});
    const procedureFocus=useRef(true),pendingRepairScene=useRef<{hidden:string[];selected:string}|null>(null);
    const release=referenceRelease(initialModelRevision,repairMode?undefined:initialReference)||currentRelease;
    const[earlier,setEarlier]=useState<{revision:number;count:number}[]>([]);
    const [model, setModel] = useState<ReferenceModel | null>(null), [view, setView] = useState<ReaderView>(defaultView), [query, setQuery] = useState(''), [details, setDetails] = useState(false), [status, setStatus] = useState('Loading the vehicle model…'), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0), [cameraAction, setCameraAction] = useState({ seq: 0, preset: 'overview' as Viewpoint }), [fitAction, setFitAction] = useState<{seq:number;id?:string;parts?:readonly string[];preset?:Viewpoint}>({ seq: 0 }), [saved, setSaved] = useState<Saved[]>([]), [name, setName] = useState('My inspection'), [options, setOptions] = useState(false);
    const referenceScene=useMemo(()=>model&&referenceFocus?quickReferenceHighlights(model,referenceFocus):null,[model,referenceFocus]);
    const detailRef = useRef<HTMLElement>(null), host = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null), renderer = useRef<ReferenceRenderer | null>(null), previous = useRef<ReaderView>(view), fullscreen = useFullscreen(), savedKey = 'e34.reference.views.v1.' + (user?.id || 'visitor');
    const pick = useCallback((id: string, isolate = false) => { track(isolate?'isolate':'component_select','node:'+id); setRepairSelection(v=>({node:id,seq:v.seq+1})); setView(v => {
        if (isWiringNode(id)) {
            const inWiring = isWiringScope(v.scope);
            return {
                ...(inWiring ? v : defaultView()),
                scope: isolate ? id : inWiring ? v.scope : wiringScope,
                selected: id, shell: inWiring ? v.shell : 'hidden',
            };
        }
        if (isWiringScope(v.scope)) return { ...defaultView(), scope: isolate ? id : 'vehicle', selected: id };
        return { ...v, selected: id, ...(isolate ? { scope: id, hidden: [], explosion: 0, cabin: null } : {}) };
    }); setDetails(true); setQuery(''); requestAnimationFrame(()=>{if(window.matchMedia('(max-width:700px)').matches)detailRef.current?.scrollIntoView({block:'nearest',behavior:'smooth'});}); }, []);
    const selectOpeningPanel = useCallback((model: ReferenceModel, panelId: string) => {
        track('component_select', 'node:' + panelId);
        setDetails(true);
        setQuery('');
        setView(view => toggleOpening(model, { ...view, selected: panelId }, panelId));
    }, []);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the external model load status when its pinned URL changes.
    useEffect(() => { let active = true; const abort = new AbortController(); setStatus('Loading the vehicle model…'); setFailed(false); const loadStarted=performance.now();let loadReported=false; Promise.all([loadReference(abort.signal,initialModelRevision,repairMode?undefined:initialReference), import('./renderer')]).then(([data, module]) => { if (!active || !host.current)
        return; const m = wiringEnabled ? withWiring(data) : data; if (m.id !== release.id || m.revision !== release.revision)
        throw Error('The vehicle reference version did not match.'); const initial = resolveInitial(m, initialPart, initialNode, initialSystem); if(repairMode){initial.scope='vehicle';initial.selected=pendingRepairScene.current?.selected||'m50:water-pump';initial.hidden=pendingRepairScene.current?.hidden.filter(n=>n!==initial.selected)||[];initial.internals=true;initial.shell='ghost';} if(embedded&&initial.selected){initial.internals=true;initial.shell="ghost";} if(initial.selected&&!initialSystem&&!repairMode)initial.scope=initial.selected; if(isWiringScope(initial.scope))initial.shell='hidden'; const catalogNode=findCatalogNode(m,initialPart,initialCatalogPosition)||supplementalPartLocation(m,initialPart)?.node; if(!initial.selected&&catalogNode){initial.selected=catalogNode.id;initial.scope=embedded?'vehicle':catalogNode.id;if(embedded){initial.internals=true;initial.shell='ghost';}} setModel(m); setView(initial); setDetails(!embedded&&!repairMode&&!!initial.selected); previous.current = initial; renderer.current = new module.ReferenceRenderer(host.current, m, initial, pick, (text, error = false) => { if (active) {
        setStatus(text);
        setFailed(error);
        if(error)track(loadReported?'render_error':'model_error','/workshop',{code:loadReported?'webgl':'model'});
        else if(!text&&!loadReported){loadReported=true;if(embedded&&initial.selected&&isCenterSupportServicePart(initialPart||''))setCameraAction(a=>({seq:a.seq+1,preset:'underbody'}));track('model_loaded','/workshop',{value:Math.min(300000,performance.now()-loadStarted)});}
    } },setAppearanceStatus,embedded||repairMode?undefined:id=>selectOpeningPanel(m,id));renderer.current.setBuildAppearance(appearanceRef.current||null);renderer.current.setProcedureFocus(!!repairMode&&procedureFocus.current); }).catch(() => { if (active && !abort.signal.aborted) {
        track('model_error','/workshop',{code:'model'});setFailed(true);
        setStatus(referenceRelease(initialModelRevision,initialReference)?'The car model could not load. Check your connection and reload it.':'That saved reference is not available. Open the current workshop to continue.');
    } }); return () => { active = false; abort.abort(); renderer.current?.dispose(); renderer.current = null; }; }, [retry, initialPart, initialNode, initialSystem, initialCatalogPosition, initialModelRevision,initialReference, pick,selectOpeningPanel,repairMode,embedded,wiringEnabled,release.id,release.revision]);
    useEffect(() => {
        if (!model || referenceFocus === undefined) return;
        const parts = referenceScene?.parts.map(part=>part.id) ?? [];
        const preset = referenceScene?.viewpoint ?? 'overview';
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Reposition the shared WebGL viewer for a reference lookup.
        setView(v=>({...defaultView(), explosion:v.explosion, ...(parts.length ? {shell:'ghost',internals:true,highlights:parts,highlightViewpoint:preset} : {})}));
        setDetails(false);
        setFitAction(action=>({seq:action.seq+1,parts:parts.length?parts:undefined,preset}));
    }, [model, referenceFocus, referenceScene]);
    useEffect(() => { const r = renderer.current; if (!r)
        return; r.update({...view,hidden:[...view.hidden,...(repairMode?configurationHidden:[])]}); const old = previous.current; if (view.cabin !== old.cabin && view.cabin)
        r.viewpoint(view.cabin === 'driver' ? 'driver' : 'rear-seat');
    else if (view.scope !== old.scope || old.cabin && !view.cabin)
        r.viewpoint('overview'); previous.current = view; }, [view,configurationHidden,repairMode]);
    useEffect(() => { if (cameraAction.seq)
        renderer.current?.viewpoint(cameraAction.preset); }, [cameraAction]);
    useEffect(() => { if (fitAction.seq)
        renderer.current?.fit(fitAction.parts??fitAction.id,fitAction.preset); }, [fitAction]);
    useEffect(() => { try {
        const rows = JSON.parse(localStorage.getItem(savedKey) || '[]');
        const valid=Array.isArray(rows)?rows.map(s=>savedView(s)).filter((s):s is Saved=>!!s).slice(0,640):[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore bounded device views from the active account/revision storage key.
        setSaved(valid.filter(s=>s.revision===release.revision).slice(0,20));
        setEarlier([...new Set(valid.filter(s=>s.revision!==release.revision&&referenceRelease(s.revision)).map(s=>s.revision))].map(revision=>({revision,count:valid.filter(s=>s.revision===revision).length})));
    }
    catch {
        setSaved([]);
        setEarlier([]);
    } }, [savedKey,release.revision]);
    const selected = model?.nodes.find(n => n.id === view.selected), systems = model?.nodes.filter(n => n.kind === 'system') || [], scope = model?.nodes.find(n => n.id === view.scope), results = useMemo(() => model && query.trim() ? model.nodes.filter(n => n.assetId && (matches(n, query)||catalogModelMatches(n,query,model.catalog))).sort((a,b)=>Number(!!b.oem)-Number(!!a.oem)).slice(0, 30) : [], [model, query]), scopeMembers = model ? members(model,view.scope) : new Set<string>(), subassemblies = model ? model.nodes.filter(n => n.parentId === view.scope && n.kind !== 'system' && scopeMembers.has(n.id)) : [];
    const fit = (id?: string) => setFitAction(a => ({ seq: a.seq + 1, id }));
    function openReferencePart(id:string) {
        setView(v=>({...v,scope:'vehicle',cabin:null,shell:'ghost',internals:true,hidden:[],highlights:referenceScene?.parts.map(part=>part.id)}));
        pick(id);
        fit(id);
    }
    function focusSelected() {
        if(!selected)return;
        // A close camera inside the assembled car can be blocked by neighboring
        // meshes. Embedded inspection isolates the selected modeled assembly.
        if(embedded)openScope(selected.id);
        fit(selected.id);
    }
    function wholeCar() {
        setView(v=>({...v,scope:'vehicle',hidden:[],explosion:0,cabin:null,internals:true,shell:'ghost'}));
        setCameraAction(a=>({seq:a.seq+1,preset:model&&isCenterSupportServicePart(initialPart||'')?'underbody':'overview'}));
    }
    function openScope(id: string) {
        track('assembly_view','node:'+id);
        const part = model?.nodes.find(node=>node.id===id);
        const wiring = isWiringScope(id);
        setView(v => {
            const wasWiring = isWiringScope(v.scope);
            return {
                ...(wiring && !wasWiring ? defaultView() : v),
                scope:id, selected:part?.assetId ? id : null, hidden:[], explosion:wiring&&wasWiring ? v.explosion : 0, cabin:null,
                shell:wiring ? wasWiring ? v.shell : 'hidden' : wasWiring ? 'solid' : v.shell,
                internals:!wiring&&(isGearboxInspection(id)||isEngineInspection(id)||(id!==bodyTrimScope&&v.scope!==bodyTrimScope&&!isGearboxInspection(v.scope)&&!isEngineInspection(v.scope)&&v.internals)),
            };
        });
        if (wiring || !part?.assetId) setDetails(!!part?.assetId);
    }
    function showInspectionMode(internals: boolean) {
        setView(v=>({...v,internals,explosion:0,hidden:[],selected:null}));
        setDetails(false);
        setCameraAction(action=>({seq:action.seq+1,preset:'overview'}));
    }
    function viewpoint(value: Viewpoint) { if (value === 'driver' || value === 'rear-seat') {
        setView(v=>({ ...defaultView(), openPanels:v.openPanels, cabin: value === 'driver' ? 'driver' : 'rear' }));
        setDetails(false);
    }
    else {
        setView(v => ({ ...v, cabin: null, ...(value === 'underbody' ? { shell: 'hidden' as const } : {}) }));
        setCameraAction(a => ({ seq: a.seq + 1, preset: value }));
    } }
    function storeViews(rows: Saved[]) { try {
        const existing=JSON.parse(localStorage.getItem(savedKey)||"[]");
        localStorage.setItem(savedKey, JSON.stringify(mergeReferenceViews(existing,rows,release.revision)));
        setSaved(rows);
    }
    catch {
        toast('This browser could not save the view. You can still share a part link.');
    } }
    function loadSaved(value: Saved) { if (!model)
        return; const s = savedView(value, model); if (!s) {
        toast('This saved view does not match the current model.');
        return;
    } setView(s.view); setDetails(!!s.view.selected); if (s.camera)
        requestAnimationFrame(() => renderer.current?.restoreCamera(s.camera!)); }
    useEffect(()=>{procedureFocus.current=repairXray;renderer.current?.setProcedureFocus(!!repairMode&&repairXray);},[repairXray,repairMode]);
    const locationHint=model?supplementalPartLocation(model,initialPart):null;
    const initialMissing = model && !locationHint && !!(initialPart || initialNode) && !findNode(model, initialPart) && !findNode(model, initialNode) && !findCatalogNode(model,initialPart,initialCatalogPosition);
    const automaticInternals = release.revision >= 14 && view.explosion > 0;
    const gearboxScope = isGearboxInspection(view.scope);
    const engineInspection = isEngineInspection(view.scope);
    const trimInspection = view.scope === bodyTrimScope;
    const wireView = isWiringScope(view.scope);
    const wireReference = model && wiringFor(model);
    const selectedWire = model && selected && wiringBranch(model, selected.id);
    const isolatedWire = model && scope && wiringBranch(model, scope.id);
    const wireParts = model?.nodes.filter(node=>node.parentId===wiringScope) ?? [];
    const inspectionControls = gearboxScope||engineInspection||trimInspection||wireView;
    const axle = view.scope === frontSuspensionScope ? 'front' : view.scope === rearSuspensionScope ? 'rear' : null;
    const exteriorOnly = model?.exteriorOnly || ('exteriorOnly' in release && release.exteriorOnly);
    const hasBay = model?.nodes.some(node=>node.id===engineBayScope);
    const hoodId = model?.nodes.some(node=>node.id==='e30body:hood') ? 'e30body:hood' : 'e34body:hood';
    const hoodHidden = view.hidden.includes(hoodId);
    const openingPanels=!embedded&&!repairMode&&canOpenPanels(view)?model?.openingPanels??[]:[];
    const selectedOpening = openingPanels.find(panel => panel.id === selected?.id);
    function revealDetails() {
        if (!selected) return;
        setDetails(true);
        if (window.matchMedia('(max-width:700px)').matches) {
            requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
        }
    }
    function openPanelFromControl(panel: OpeningPanel) {
        if (!model) return;
        const opening = !view.openPanels?.includes(panel.id);
        const showCabin = opening && panel.label === 'Glove box' && !model.exteriorOnly;
        selectOpeningPanel(model, panel.id);
        setView(v => ({
            ...v,
            cabin: showCabin ? 'driver' : opening && panel.label !== 'Glove box' ? null : v.cabin,
            hidden: v.hidden.filter(id => id !== panel.id && id !== panel.requires),
        }));
        const camera = panel.camera;
        if (opening && camera) requestAnimationFrame(() => renderer.current?.restoreCamera({ ...camera, fov: 48 }));
        else if (view.cabin && opening && panel.label !== 'Glove box') {
            setCameraAction(action => ({ seq: action.seq + 1, preset: 'overview' }));
        }
    }
    function toggleHood() {
        setView(v=>({...v,hidden:hoodHidden?v.hidden.filter(id=>id!==hoodId):[...v.hidden,hoodId]}));
    }
    const axleWheels = axle ? [`wheel:${axle}-left`, `wheel:${axle}-right`] : [];
    const wheelsHidden = axleWheels.every(id => view.hidden.includes(id));
    function toggleAxleWheels() {
        setView(v=>({...v,hidden:wheelsHidden?v.hidden.filter(id=>!axleWheels.includes(id)):
            [...new Set([...v.hidden,...axleWheels])]}));
    }
    const manualGearbox = model?.nodes.some(node => node.id === manualGearboxScope);
    const gearboxSystem = manualGearbox ? manualGearboxScope : automaticGearboxScope;
    const hasGearbox = model?.nodes.some(node => node.id === gearboxSystem);
    const transmissionDiagrams = manualGearbox && model?.catalog
        ? '/e30/workshop?tab=diagrams&reference='+model.id+'&context='+model.catalog.context.id+'&transmission=manual&category=Manual%20Transmission'
        : '/workshop?tab=diagrams&reference=e34-525i-sedan-automatic&context=e34-context-b69b1a9062bd8352b127fef1&transmission=automatic&category=Automatic%20Transmission';
    const transmissionScope = view.scope === 'system:transmission' || selected?.systemIds.includes('system:transmission');
    const detailedEngine=systems.find(n=>n.id===engineInspectionScopes[0]);
    const selectableSystems=systems.flatMap(n=>{
        if(isEngineInspection(n.id))return [];
        if(n.id!=='system:engine'||!detailedEngine)return [n];
        return view.scope===n.id?[n,detailedEngine]:[detailedEngine];
    });
    const trimParts=trimInspection&&model?visibleNodes(model,view).filter(n=>n.trimCover||n.id.startsWith('e34trim:')):[];
    const gearboxParts = gearboxScope && model ? visibleNodes(model,view).filter(node=>node.gearbox) : [];
    return <div className="page reference-workshop">{!embedded&&<PageIntro eyebrow={"BMW "+series.toUpperCase()+" / WORKSHOP"} title={"Explore the "+series.toUpperCase()+"."} description="Select a system or part to explore its catalog records and service information."/>}<div className="reference-context"><span>{repairMode?'1995 525i Sedan · M50TU':('label' in release?release.label+' · '+release.engine:'1995 525i Sedan · M50TU')}</span>{previewFeatures.interactiveRepairs && release.id===currentRelease.id && <DocumentLink href="/workshop/repair">M50 coolant-pump repair</DocumentLink>}<DocumentLink href="#reference-about">About this reference <ArrowUpRight size={13}/></DocumentLink></div>{release.id===currentRelease.id&&release.revision!==currentRelease.revision&&<p className="reference-notice">Viewing an earlier reference for your saved views. <DocumentLink href="/workshop">Open the current workshop <ArrowUpRight size={13}/></DocumentLink></p>}{locationHint&&<p className="reference-notice">{locationHint.note}</p>}{initialMissing && <p className="reference-notice">That catalog part does not have a linked model yet. <DocumentLink href={'/parts/catalog?part=' + encodeURIComponent(initialPart || '')}>Open its catalog record <ArrowUpRight size={13}/></DocumentLink></p>}
 {referenceScene&&<section className="qr-model-parts" aria-label="Highlighted parts">
    {referenceScene.parts.length>0&&<ul>{referenceScene.parts.map(part=><li key={part.id}>
        <button type="button" className="text-link" onClick={()=>openReferencePart(part.id)}>{part.name}</button>
    </li>)}</ul>}
    {referenceScene.note&&<p role="status">{referenceScene.note}</p>}
 </section>}
 {repairMode&&<WorkshopVehicle model={model} onHidden={setConfigurationHidden} showSelector={false}/>}
 <div className={repairMode?"repair-workspace":undefined}>
 {embedded&&selected&&<div className="embedded-location-heading"><strong>Selected location: {selected.name}</strong><div><button className="button outline" onClick={focusSelected}>Inspect part</button><button className="button outline" onClick={wholeCar}>Whole car</button></div></div>}
 <div ref={frame} tabIndex={-1} className={'reference-frame' + (fullscreen.expanded ? ' reference-expanded' : '')}>
 <div className="reference-toolbar"><label className="reference-system"><span className="sr-only">Vehicle system</span><select aria-label="Vehicle system" value={view.scope} onChange={e => openScope(e.target.value)}><option value="vehicle">Complete car</option>{view.scope!=='vehicle'&&!selectableSystems.some(n=>n.id===view.scope)&&<option value={view.scope}>{scope?.name}</option>}{selectableSystems.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label><div className="reference-search"><Search size={16}/><input type="search" aria-label="Search model parts" placeholder="Find a part or BMW number" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && results[0])
        pick(results[0].id, view.scope!=='vehicle'||view.explosion===0); if (e.key === 'Escape')
        setQuery(''); }}/>{query.trim() && <div className="reference-results"><div className="reference-results-heading">{results.length ? 'Matching components' : 'No modeled component found'}<button aria-label="Close part search" onClick={() => setQuery('')}><X size={15}/></button></div>{results.map(n => <button key={n.id} onClick={() => pick(n.id, view.scope!=='vehicle'||view.explosion===0)}>{n.thumbnail && <img src={n.thumbnail} alt="" width={44} height={44}/>}<span>{bindingFor(n.id,model?.catalog)?.title||n.name}{n.oem && <small>{n.oem}</small>}</span></button>)}{(series==='e34'||model?.catalog) ? <CatalogSearchMatches query={query} catalog={model?.catalog}/> : <DocumentLink href={'/parts/catalog?q='+encodeURIComponent(query)}>Search all E30 catalogs <ArrowUpRight size={14}/></DocumentLink>}</div>}</div><select aria-label="Model viewpoint" value="" onChange={e => e.target.value && viewpoint(e.target.value as Viewpoint)}><option value="">Viewpoint</option>{[['overview', 'Overview'], ['front', 'Front'], ['rear', 'Rear'], ['left', 'Left side'], ['right', 'Right side'], ['top', 'Above'], ['underbody', 'Underneath'], ['driver', 'Driver’s seat'], ['rear-seat', 'Rear seats']].filter(([value])=>(!exteriorOnly||!['underbody','driver','rear-seat'].includes(value))&&(!wireView||!['driver','rear-seat'].includes(value))).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select><button className="icon-button" aria-label={fullscreen.expanded ? 'Exit expanded model' : 'Expand model'} onClick={() => fullscreen.toggle(frame.current)}>{fullscreen.expanded ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button></div>
 {referenceControls}
 {wireView&&wireReference&&<div className="reference-gearbox-controls" aria-label="Wiring harness controls">
  <div className="reference-gearbox-modes" aria-label="Harness visibility">
    <button type="button" aria-pressed={view.shell==='hidden'} onClick={()=>setView(v=>({...v,shell:'hidden'}))}>Wiring only</button>
    <button type="button" aria-pressed={view.shell==='ghost'} onClick={()=>setView(v=>({...v,shell:'ghost'}))}>Show in car</button>
  </div>
  <select aria-label="Harness branch" value={isolatedWire ? wiringNodeId(isolatedWire.id) : ''}
    onChange={e=>openScope(e.target.value || wiringScope)}>
    <option value="">All harness branches</option>
    {wireParts.map(node=><option key={node.id} value={node.id}>{node.name}</option>)}
  </select>
  <button type="button" aria-pressed={view.explosion>0} onClick={()=>{
    setView(v=>({...v,explosion:v.explosion>0?0:4,hidden:[]}));
    fit();
  }}>{view.explosion>0?'Reassemble harnesses':'Explode harnesses'}</button>
  <DocumentLink href="/electrical">Wiring diagrams <ArrowUpRight size={13}/></DocumentLink>
 </div>}
 {wireView&&wireReference&&<p className="reference-comparison-note">{wireReference.coverage}</p>}
 {buildAppearance&&appearanceStatus&&<p className="build-asset-status" role="status">{appearanceStatus}</p>}
 {engineInspection&&<div className="reference-gearbox-controls" aria-label="Engine inspection controls">
  <div className="reference-gearbox-modes" aria-label="Engine view">
    <button type="button" aria-pressed={!view.internals&&!view.explosion} onClick={()=>showInspectionMode(false)}>Assembled</button>
    <button type="button" aria-pressed={view.internals&&!view.explosion} onClick={()=>showInspectionMode(true)}>Cutaway</button>
  </div>
  <select aria-label="Engine assembly" value={view.scope} onChange={e=>openScope(e.target.value)}>
    {systems.filter(n=>isEngineInspection(n.id)).map(n=><option key={n.id} value={n.id}>{n.name}</option>)}
  </select>
 </div>}
 {trimInspection&&<div className="reference-gearbox-controls" aria-label="Trim inspection controls">
  <div className="reference-gearbox-modes" aria-label="Trim view">
    <button type="button" aria-pressed={!view.internals&&!view.explosion} onClick={()=>showInspectionMode(false)}>Trim fitted</button>
    <button type="button" aria-pressed={view.internals&&!view.explosion} onClick={()=>showInspectionMode(true)}>Clips exposed</button>
  </div>
  <select aria-label="Trim part" value={trimParts.some(n=>n.id===view.selected)?view.selected||'':''} onChange={e=>e.target.value&&pick(e.target.value)}>
    <option value="">Choose a trim part</option>
    {trimParts.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}
  </select>
 </div>}
 {hasGearbox&&(gearboxScope||transmissionScope)&&<div className="reference-gearbox-controls" aria-label={manualGearbox ? "Manual gearbox controls" : "Automatic gearbox controls"}>
  {gearboxScope?<><div className="reference-gearbox-modes" aria-label="Gearbox view">
    <button type="button" aria-pressed={!view.internals&&!view.explosion} onClick={()=>showInspectionMode(false)}>Assembled</button>
    <button type="button" aria-pressed={view.internals&&!view.explosion} onClick={()=>showInspectionMode(true)}>Cutaway</button>
  </div><select aria-label="Gearbox component" value={gearboxParts.some(node=>node.id===view.selected)?view.selected||'':''} onChange={event=>{if(event.target.value)pick(event.target.value);}}>
    <option value="">Choose a gearbox part</option>
    {gearboxParts.map(node=><option key={node.id} value={node.id}>{node.name}</option>)}
  </select></>:<button type="button" onClick={()=>openScope(gearboxSystem)}>Inspect gearbox</button>}
  <DocumentLink href={transmissionDiagrams}>Transmission diagrams <ArrowUpRight size={13}/></DocumentLink>
 </div>}
 {!hasGearbox&&!buildAppearance&&model?.id==='e34-525i-sedan-automatic'&&transmissionScope&&<p className="reference-comparison-note" role="status">{model.nodes.some(n=>n.id==='e34auto:case')?'External transmission parts are illustrated; gearbox internals are not modeled.':'Automatic gearbox internals are not modeled.'} Use this reference’s transmission diagrams. <DocumentLink href="/workshop?tab=diagrams&reference=e34-525i-sedan-automatic&context=e34-context-b69b1a9062bd8352b127fef1&transmission=automatic&category=Automatic%20Transmission">Open its automatic-transmission diagrams ↗</DocumentLink></p>}
 {!buildAppearance&&model?.vehicleReference&&vehicle.model&&(!engineMatches(model.vehicleReference.engine,vehicle.engine)||model.vehicleReference.model!==vehicle.model||!!vehicle.year&&String(model.vehicleReference.year)!==vehicle.year||!!vehicle.body&&model.vehicleReference.body!==vehicle.body||!!vehicle.transmission&&model.vehicleReference.transmission.toLowerCase()!==vehicle.transmission.toLowerCase()||vehicle.steering==='RHD')&&<p className="reference-comparison-note">This is the {model.vehicleReference.year} {model.vehicleReference.model} {model.vehicleReference.body} · {model.vehicleReference.transmission} reference. Some details differ from your selected vehicle; use its exact catalog conditions before ordering.</p>}
 <div className={'reference-stage' + (selected && details ? ' has-details' : '')}><div className="reference-viewport"><div ref={host} className="reference-canvas"/>{status && <div className={'reference-loading' + (failed ? ' failed' : '')} role="status"><span>{status}</span>{failed && <button className="button outline" onClick={() => setRetry(n => n + 1)}>Reload model</button>}{failed&&!referenceRelease(initialModelRevision,initialReference)&&<DocumentLink className="button outline" href="/workshop">Open current workshop</DocumentLink>}</div>}<div className="reference-view-caption"><strong>{view.cabin ? view.cabin === 'driver' ? 'Driver’s seat' : 'Rear seats' : scope?.name || 'Complete car'}</strong>{view.scope !== 'vehicle' && <button onClick={() => openScope('vehicle')}><ChevronLeft size={13}/>Complete car</button>}{view.cabin && <button onClick={() => openScope('vehicle')}><ChevronLeft size={13}/>Outside view</button>}</div>{!exteriorOnly && !view.cabin && !inspectionControls && view.scope!==engineBayScope && !axle && <div className="reference-body" aria-label="Exterior visibility">{(['solid', 'ghost', 'hidden'] as const).map(mode => <button key={mode} aria-pressed={view.shell === mode} onClick={() => setView(v => ({ ...v, shell: mode }))}>{mode === 'solid' ? 'Body on' : mode === 'ghost' ? 'See through' : 'Body off'}</button>)}</div>}<p className="reference-instructions">{openingPanels.length ? 'Drag to rotate · tap a part for details or a panel to open it' : view.cabin ? 'Drag to look around · scroll to zoom' : 'Drag to rotate · scroll or pinch to zoom · click a part for details'}</p></div>
 {selected && details && <aside ref={detailRef} className="reference-part" aria-label="Selected part details"><div className="reference-part-heading"><span className="eyebrow">{selectedWire ? "HARNESS REFERENCE" : "PART REFERENCE"}</span><button className="icon-button" aria-label="Close part details" onClick={() => setDetails(false)}><X size={17}/></button></div>{selectedOpening && <button className="button outline" type="button"
    onClick={() => openPanelFromControl(selectedOpening)}>{view.openPanels?.includes(selectedOpening.id) ? 'Close' : 'Open'} {selectedOpening.label.toLowerCase()}</button>}{selectedWire ? <WiringDetails route={selectedWire} name={selected.name} node={selected.id} series={series}/> : <ComponentPartReference key={selected.id} node={selected} initialPosition={initialCatalogPosition} referenceRevision={release.revision} catalog={model?.catalog} referenceId={model?.id} navigation={{vehicle:journey.activeId,scan:journey.scanId}} assetSha256={model?.assets.find(asset=>asset.id===selected.assetId)?.sha256} visible={!!model&&visibleNodes(model,view).some(node=>node.id===selected.id)}/>}</aside>}
 </div>
 <div className="reference-selection" aria-label="Part controls"><button disabled={!selected?.assetId} onClick={focusSelected}><Focus size={15}/>Focus</button><button disabled={!selected?.assetId} aria-pressed={!!selected && view.scope === selected.id} onClick={() => {if(selected){track('isolate','node:'+selected.id);openScope(selected.id);}}}><Layers size={15}/>Isolate</button><button onClick={() => { setView(v => ({ ...v, selected:wireView?null:v.selected, hidden: [], openPanels:[], scope: 'vehicle', cabin: null, shell: 'solid', explosion: 0, internals:inspectionControls?false:v.internals })); fit(); }}>Show all</button><button disabled={!selected?.assetId} onClick={() => selected && setView(v => ({ ...v, hidden: v.hidden.includes(selected.id) ? v.hidden.filter(id => id !== selected.id) : [...v.hidden, selected.id] }))}><EyeOff size={15}/>{selected && view.hidden.includes(selected.id) ? 'Show part' : 'Hide part'}</button>{(!exteriorOnly&&(hasBay||hoodId==='e30body:hood'))&&view.scope==='vehicle'&&view.shell==='solid'&&!view.cabin&&!model?.openingPanels?.length&&<button aria-pressed={hoodHidden} onClick={toggleHood}>{hoodHidden?'Show hood':'Hide hood'}</button>}{axle&&<button aria-pressed={wheelsHidden} onClick={toggleAxleWheels}>{wheelsHidden?'Show wheels':'Hide wheels'}</button>}<button disabled={!selected} onClick={revealDetails}>Part details</button>{!inspectionControls&&<button className="reference-options" aria-expanded={options} onClick={() => setOptions(o => !o)}><SlidersHorizontal size={15}/>View options</button>}</div>
 {openingPanels.length>0&&<details className="reference-opening-controls">
  <summary>Open panels</summary>
  <div>{openingPanels.map(panel=><button key={panel.id} type="button" aria-pressed={!!view.openPanels?.includes(panel.id)}
    onClick={()=>openPanelFromControl(panel)}>{panel.label}</button>)}
    {!!view.openPanels?.length&&<button type="button" onClick={()=>setView(v=>({...v,openPanels:[]}))}>Close all</button>}
  </div>
 </details>}
 <p className="reference-explosion-help">{wireView?'Separate sleeves first, then spread the harness branches.':view.scope==='vehicle'?'Separate the modeled components around the body shell. Select any part for its reference, or isolate a system for a closer view.':'The slider separates modeled components. Select a part to inspect, focus or isolate it.'}</p><div className="reference-explosion"><label htmlFor="e34-explosion">Exploded view</label><input id="e34-explosion" aria-label="Exploded view separation" type="range" min={0} max={4} step={.01} value={view.explosion} onChange={e => setView(v => ({ ...v, explosion: Number(e.target.value), openPanels:[], cabin: null }))} onPointerUp={() => {track('explode','/workshop',{value:view.explosion});fit();}} onKeyUp={e => {if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key)){track('explode','/workshop',{value:view.explosion});fit();}}}/><output>{Math.round(view.explosion * 25)}%</output><button onClick={() => { setView(v => ({ ...v, explosion: 0, hidden: [], openPanels:[], cabin: null })); fit(); }}><RotateCcw size={15}/>Reassemble</button></div>
 {options && !inspectionControls && <div className="reference-options-panel"><label><input type="checkbox" checked={view.internals || automaticInternals} disabled={automaticInternals} onChange={e => setView(v => ({ ...v, internals: e.target.checked }))}/>Show internal parts</label>{automaticInternals&&<p>Internal parts are shown in the exploded view.</p>}</div>}
 {!inspectionControls && view.scope !== 'vehicle' && subassemblies.length > 0 && <div className="reference-assemblies" aria-label="Explore this assembly">{subassemblies.slice(0, 24).map(n => <button key={n.id} onClick={() => n.assetId ? pick(n.id, true) : openScope(n.id)}>{n.name}<ArrowUpRight size={12}/></button>)}</div>}
 </div>
 {previewFeatures.interactiveRepairs&&repairTask==='center-support-bearing'&&<BearingInspection initialScan={initialScan} onLocate={()=>{setView(v=>({...v,scope:'system:driveshaft',selected:null,hidden:[],internals:true,shell:'hidden',explosion:0}));setFitAction(a=>({seq:a.seq+1,id:'system:driveshaft'}));frame.current?.scrollIntoView({behavior:'smooth',block:'start'});}}/>}
 {repairMode&&<RepairPanel key={(user?.id || "reference") + ":" + owned.activeId} selection={repairSelection} xray={repairXray} onXray={setRepairXray} initialVehicle={initialVehicle} initialScan={initialScan} onScene={scene=>{pendingRepairScene.current=scene;setView(v=>({...v,scope:'vehicle',selected:scene.selected,hidden:scene.hidden.filter(id=>id!==scene.selected),shell:'ghost',internals:true,explosion:0,cabin:null}));setFitAction(a=>({seq:a.seq+1,id:scene.selected}));}}/>}
 </div>
 {!embedded&&model?.catalog&&!wireView&&<WorkshopCatalogBrowser model={model} scope={view.scope}/>}<div className="reference-after">{!embedded&&<details className="reference-saved"><summary>Saved views</summary><p>Save a view on this device. Your account’s earlier workshop inspections are kept separately.</p><label>View name<input value={name} maxLength={80} onChange={e => setName(e.target.value)}/></label><button className="button outline" disabled={!model || !name.trim() || saved.length >= 20} onClick={() => { storeViews([...saved, { name: name.trim(), view, camera: renderer.current?.cameraPose() || null, revision: release.revision }]); toast('View saved on this device.'); }}><Save size={14}/>Save this view</button>{saved.map((s, i) => <div className="reference-saved-row" key={i}><button onClick={() => loadSaved(s)}>{s.name}</button><button aria-label={'Delete saved view ' + s.name} onClick={() => storeViews(saved.filter((_, j) => j !== i))}><Trash2 size={14}/></button></div>)}{earlier.map(s=><DocumentLink className="reference-earlier-views" key={s.revision} href={"/workshop?model_revision="+s.revision}>Open {s.count} saved {s.count===1?"view":"views"} from an earlier reference <ArrowUpRight size={14}/></DocumentLink>)}{user && !user.is_anonymous && <DocumentLink href="/workshop/inspections">Open earlier private inspections <ArrowUpRight size={14}/></DocumentLink>}</details>}<details id="reference-about"><summary>About this reference</summary><p>{model?.limits || 'Visual vehicle reference. Check the catalog for your configuration.'} {series === 'e34' && 'The seated cabin and mechanical systems use separate representations.'}</p><p>Model credit <DocumentLink href={model?.credit.url || 'https://sketchfab.com/3d-models/bmw-525i-e34-project-zomboid-c65aa3b7687d4f5dbbabdfad0b7816bb'}>{model?.credit.author || 'UVZZZ / Silbergrau'}</DocumentLink> · <DocumentLink href={model?.credit.licenseUrl || 'https://creativecommons.org/licenses/by/4.0/'}>{model?.credit.license || 'CC BY 4.0'}</DocumentLink>. {(model?.credits||[]).filter(c=>c.url!==model?.credit.url).map(c=><span key={c.url}> Additional body source <DocumentLink href={c.url}>{c.author}</DocumentLink> · <DocumentLink href={c.licenseUrl}>{c.license}</DocumentLink>. </span>)}</p><DocumentLink href="/resources#evidence">Sources and coverage <ArrowUpRight size={13}/></DocumentLink></details></div></div>;
}
