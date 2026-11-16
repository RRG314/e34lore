/* eslint-disable @next/next/no-img-element -- Local Blob captures and attributed fixed-size reference thumbnails use native images. */
"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {ScanContextError,scanReferenceFields} from "./saved-context";
import {referenceRelease,referencesForSeries} from "../digital-twin/public/load-reference";
import {resolveVehicleReference} from "../vehicle/reference-context";
import {currentPhotoComparison,partConfirmationCurrent} from "./photo-session";
import {SavedScanPhotos,ScanPhotoLabels,uploadScanPhotos} from "./ScanPhotos";
import {photoTextEvidence} from './text-evidence';
import{ScanTextResults}from'./ScanTextResults';
import {keepScanForSignIn} from "./photo-storage";
import {familyFromEvidence,scanObservationEvidence} from "./observation-evidence";
import { usePhotoSession } from "./use-photo-session";
import { componentFamilies } from "./families";
import {useVehicleCatalog} from "../lib/use-vehicle-catalog";
import {preferredCatalogContext} from "../domain/catalog";
import { CatalogPartField } from "../components/CatalogPartField";
import { PartChoiceImage } from "../components/PartComparison";
import { ScanPartReview } from "./ScanPartReview";
import { previewFeatures } from "../release/features";
import { comparisonImages, distinctPhotoBlobs, type FamilyComparison } from "./family-comparison";
import { FamilyResults } from "./FamilyResults";
import { track } from "../analytics/client";
import { ArrowUpRight, ScanLine, Search, Check } from "lucide-react";
import { db, useApp } from "../components/context";
import { DocumentLink } from "../components/DocumentLink";
import { PageIntro } from "../components/common";
import { ImageCapture, type CapturedImage, type ImageCaptureHandle } from "./ImageCapture";
import {
  partMarkings,
  visualDecision,
  normalizeDetection,
  referenceIndexSchema,
  type Detection,
  type VisualCandidate,
  type ScanMode,
} from "./contracts";
import { readPhotoText, LocalInference } from "./inference";
import { prepareImage } from "./camera";
import { seriesForModel } from "../series/registry";
import { useOwnedCars } from "../vehicle/use-owned-cars";
import { sanitizeVehicle } from "../data/catalog";
import { ScanHistory } from "./History";
import { journeyHref } from "../domain/repair-journey";
import { useRepairJourney } from "../repair/use-journey";
export type ScanMatch = { id: string; name: string; number_normalized: string; positionId?:string; assemblyId?:string; contextId?:string };
type Match = ScanMatch;
export function Scanner() {
  const { user, vehicle, setVehicle, toast, series } = useApp(),
    owned = useOwnedCars();
  const catalog = useVehicleCatalog();
  const car = owned.activeId, setCar = owned.selectCar, journey = useRepairJourney();
  const eligibleCars = owned.cars.filter(row => seriesForModel(row.model_id) === series);
  const [capturePending,setCapturePending]=useState(false),[savePhotos,setSavePhotos]=useState(true),[photoConsent,setPhotoConsent]=useState<{key:string;enabled:boolean}|null>(null),[photoError,setPhotoError]=useState("");
  const [mode, setMode] = useState<ScanMode>("loose"),

    [numbers, setNumbers] = useState<string[]>([]),
    [matches, setMatches] = useState<Match[]>([]),
    [matchesMethod,setMatchesMethod]=useState<'marking'|'catalog-comparison'>('catalog-comparison'),
    [visual, setVisual] = useState<VisualCandidate[]>([]),
    [detections, setDetections] = useState<Detection[]>([]),
    [partQuery,setPartQuery]=useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),

    [refresh, setRefresh] = useState(0),
    [lastScan, setLastScan] = useState(""),
    [timing, setTiming] = useState<{
      ocr?: number;
      detect?: number;
      retrieve?: number;
    }>({});
  const visualAllowed = previewFeatures.scanner;
  const capture = useRef<ImageCaptureHandle>(null);
  const nativePicker=useRef(false), backgrounded=useRef(false), savingObservation=useRef(false);
  const openedReferenceAt=useRef(-Infinity);
  const requestedScan=useRef<{draftId:string;revision:number}|null>(null);
  const inference = useRef(new LocalInference()),
    generation = useRef(0),
    abort = useRef<AbortController | null>(null);
  const selectedCar = owned.cars.find((c) => c.id === car),
    effectiveVehicle = selectedCar
      ? sanitizeVehicle(selectedCar.configuration)
      : vehicle;

  const sourceContextId = preferredCatalogContext(catalog.rows,effectiveVehicle)?.id;

  const scopeSuffix = series === "e34" ? "" : "/" + series;
  const guestScope = "device" + scopeSuffix;
  const ownerScope=(user?.id||"device")+scopeSuffix;
  const scope=journey.requestedScan?ownerScope+'/record/'+journey.requestedScan:ownerScope;
  const photos=usePhotoSession(scope,owned.ready,guestScope);
  const image=photos.active, angles=photos.photos;
  const selected=photos.draft?.selectedPart||null,catalogAnchor=photos.draft?.anchorPart||null;
  const confirmed=partConfirmationCurrent(photos.draft);
  const identityMethod=photos.draft?.identityMethod||"catalog-comparison";
  const setSelected=(part:Match|null)=>photos.patch({selectedPart:part}),setCatalogAnchor=(part:Match|null)=>photos.patch({anchorPart:part});
  const text=photos.draft?.text||"",notes=photos.draft?.notes||"",comparison=currentPhotoComparison(photos.draft);
  const setText=(value:string)=>photos.patch({text:value}),setNotes=(value:string)=>photos.patch({notes:value});
  const recordComparison=(value:FamilyComparison,ms:number,revision:number)=>photos.comparison(value,ms,revision);
  const reviewedFamily=photos.draft?.reviewedFamily||"";
  const persistedSave=photos.draft?.savedScan;
  const savedForCurrent=!!persistedSave&&persistedSave.vehicleId===car&&persistedSave.revision===photos.draft?.revision&&persistedSave.notes===notes&&persistedSave.selection===(selected?.id||reviewedFamily);
  const savedId=savedForCurrent?persistedSave!.id:lastScan;
  const consentKey=[user?.id||'device',photos.draft?.id,photos.draft?.revision,selected?.id,car,mode,notes].join(':');
  const sharePhotos=savedForCurrent?!!persistedSave?.photosShared:photoConsent?.key===consentKey&&photoConsent.enabled;

  const reviewHost=useRef<HTMLDivElement>(null),resultsHost=useRef<HTMLDivElement>(null),saveHost=useRef<HTMLElement>(null),photosHost=useRef<HTMLDivElement>(null);
  const userId = user?.id,
    guest = user?.is_anonymous;
  useEffect(() => {
    const localInference = inference.current,
      lifecycle = generation;
    return () => {
      lifecycle.current++;
      abort.current?.abort();
      localInference.stop();

    };
  }, [userId, guest]);
  const visibilityChanged=useEffectEvent(()=>{
    if(document.visibilityState==="hidden"){
      const installed=matchMedia("(display-mode: standalone)").matches||
        (navigator as Navigator&{standalone?:boolean}).standalone===true;
      backgrounded.current=installed&&performance.now()-openedReferenceAt.current>1500&&!nativePicker.current&&!capturePending&&!savingObservation.current&&!journey.requestedScan;
      if(!busy||nativePicker.current||savingObservation.current)return;
      generation.current++;abort.current?.abort();inference.current.stop();setBusy(false);
      setStatus("Scan paused. Use Scan this part to try again.");
    }else if(backgrounded.current){
      backgrounded.current=false;
      photos.shelve();setStatus("");setError("");setPhotoError("");
    }
  });
  const restoredPage=useEffectEvent((event:PageTransitionEvent)=>{
    if(event.persisted&&!journey.requestedScan&&!capturePending&&!savingObservation.current){
      photos.shelve();setStatus("");setError("");setPhotoError("");
    }
  });
  useEffect(()=>{
    const visibility=()=>visibilityChanged();
    const pageshow=(event:PageTransitionEvent)=>restoredPage(event);
    document.addEventListener("visibilitychange",visibility);
    window.addEventListener("pageshow",pageshow);
    return()=>{document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pageshow",pageshow);};
  },[]);
  useEffect(() => {
    generation.current++; abort.current?.abort(); inference.current.stop();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear account-scoped catalog evidence; photo storage has an independent account boundary.
    setBusy(false); setLastScan(''); setSelected(null); setCatalogAnchor(null);setMatches([]);setNumbers([]);setVisual([]);setDetections([]);setError('');setStatus('');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Account transitions invalidate lookups; restoring a device draft must not clear its persisted selection.
  }, [userId]);
  useEffect(()=>{generation.current++;abort.current?.abort();inference.current.stop();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A chosen car changes only the save destination and fitment context, never the captured photo set.
    setBusy(false);setLastScan('');
    if(photos.draft?.referenceId||photos.draft?.modelRevision||photos.draft?.sourcePositionId)
      photos.patch({referenceId:"",modelRevision:null,sourcePositionId:""});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- A different garage car invalidates the previous illustrated source.
  },[car]);
  useEffect(()=>{
    generation.current++;abort.current?.abort();inference.current.stop();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Catalog suggestions belong to one photo revision; retained OCR text remains visibly stale until reread.
    setBusy(false);setMatches([]);setNumbers([]);setVisual([]);setDetections([]);setTiming({});setLastScan('');setPartQuery('');setPhotoConsent(null);
  },[photos.draft?.id,photos.draft?.revision]);
  useEffect(()=>{if(photos.active)capture.current?.showImage(photos.active,false);else if(photos.ready)capture.current?.clearImage()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only changing the selected photo source should reset the capture editor, not notes or storage status.
  },[photos.active?.id,photos.active?.blob,photos.draft?.id,photos.ready]);
  const restored = useRef('');
  useEffect(() => {
    const saved = journey.scan;
    if (photos.previous?.savedScan?.id===saved?.id&&photos.previous?.savedScan?.photoSave==="pending") return;
    if (!saved || !photos.ready || restored.current === userId+":"+saved.id) return;
    restored.current = userId+":"+saved.id;
    if (photos.draft?.savedScan?.id===saved.id) return;
    if (saved.parts) {
      const part={...saved.parts,...(saved.catalog_position_id?{positionId:saved.catalog_position_id}:{})};
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore an explicitly requested, owner-validated saved identification into the editable scanner.
      setSelected(part); setCatalogAnchor(part); setMatches([part]);
      photos.patch({sourcePositionId:saved.catalog_position_id||"",referenceId:saved.reference_id||"",modelRevision:saved.model_revision||null});
      setText(saved.parts.number_normalized); setNumbers([saved.parts.number_normalized]);
    }
    const restoredFamily=familyFromEvidence(saved.evidence);if(restoredFamily)photos.patch({reviewedFamily:restoredFamily});
    setNotes(saved.notes); setLastScan(saved.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Restore a validated linked scan once after device hydration; its draft callbacks intentionally change as local edits occur.
  }, [journey.scan,photos.ready,photos.previous,userId]);
  function changeReferenceContext(patch:{referenceId?:string;sourcePositionId?:string;modelRevision?:number|null}){
    const fields={...(patch.referenceId!==undefined?{referenceId:patch.referenceId}:{}),...(patch.sourcePositionId!==undefined?{sourcePositionId:patch.sourcePositionId}:{}),...(patch.modelRevision!==undefined?{modelRevision:patch.modelRevision}:{})};
    const changed=Object.entries(fields).some(([key,value])=>photos.draft?.[key as keyof typeof fields]!==value);
    photos.patch({...fields,...(changed?{savedScan:null}:{})});if(changed)setLastScan('');
  }
  function changed(next: CapturedImage,reason:"add"|"edit",scan=false) {
    generation.current++;abort.current?.abort();inference.current.stop();setBusy(false);setError('');setPhotoError('');setVisual([]);setDetections([]);setLastScan('');
    const draft=reason==='edit'?photos.edit(next):photos.add(next);
    requestedScan.current=scan&&draft?{draftId:draft.id,revision:draft.revision}:null;
    setStatus(scan?'Preparing to scan this part…':'Photo ready. Scan this part, or add another angle.');
  }
  const scanAcceptedPhoto=useEffectEvent(()=>void runScan());
  useEffect(()=>{
    const request=requestedScan.current;
    if(!request||!photos.ready||photos.saving||capturePending||busy)return;
    requestedScan.current=null;
    if(request.draftId===photos.draft?.id&&request.revision===photos.draft.revision)scanAcceptedPhoto();
  },[photos.ready,photos.saving,photos.draft?.id,photos.draft?.revision,capturePending,busy]);
  function chooseCatalogPart(part:Match,method:'marking'|'catalog-comparison'='catalog-comparison'){setPhotoError('');photos.choosePart(part,method);setLastScan('');requestAnimationFrame(()=>reviewHost.current?.scrollIntoView({block:'start',behavior:'smooth'}));}
  async function checkCatalog(input:string,method:'marking'|'catalog-comparison'='marking',selectSingle=false){
    const g=++generation.current;abort.current?.abort();inference.current.stop();
    setBusy(true);setError('');setLastScan('');
    try{
      const rows=await lookup(input,g,method==='marking',method);
      if(g===generation.current&&selectSingle&&rows?.length===1)chooseCatalogPart(rows[0],method);
    }catch(e){if(g===generation.current)setError(e instanceof Error?e.message:'Catalog lookup failed.');}
    finally{if(g===generation.current)setBusy(false);}
  }
  async function lookup(
    input: string,
    expectedGeneration = generation.current,
    preserveSelection = false,
    method:'marking'|'catalog-comparison'='marking',
  ) {
    const marked = partMarkings(input);
    setNumbers(marked);
    setMatchesMethod(method);
    if(!preserveSelection)setSelected(null);
    setMatches([]);
    if (!marked.length) return [] as Match[];
    return lookupCatalog(expectedGeneration,{numbers:marked});
  }
  async function lookupCatalog(expectedGeneration:number,search:{numbers:string[]}|{ending:string}){
    if(expectedGeneration!==generation.current)return;
    abort.current?.abort();
    const controller=new AbortController(); abort.current=controller;
    const timeout=setTimeout(()=>controller.abort(),12000);
    let r;
    const query=db.from("parts").select("id,name,number_normalized");
    try {
      const filtered='ending' in search?query.like("number_normalized","%"+search.ending):query.in("number_normalized",search.numbers);
      r=await filtered.order("number_normalized").limit(24).abortSignal(controller.signal);
    }
    finally {clearTimeout(timeout);}

    if (expectedGeneration !== generation.current) return;
    if (r.error)
      throw Error(
        "Catalog lookup failed. Retry when connected; markings have not been lost.",
      );
    setMatches(r.data || []);
    track("scanner_result", "/scanner", { results: r.data?.length || 0 });
    return (r.data||[]) as Match[];
  }
  async function checkCatalogEnding(ending:string){
    const draft=photos.draft;
    if(busy||capturePending||!draft?.photoText||draft.photoText.revision!==draft.revision||
      !/^\d{7}$/.test(ending)||!photoTextEvidence(draft.photoText.views).partials.includes(ending))return;
    const g=++generation.current;
    inference.current.stop();
    setBusy(true);setError("");setNumbers([]);setMatches([]);setStatus("Checking catalog numbers ending in "+ending+"…");
    setMatchesMethod("catalog-comparison");
    try {
      const rows=await lookupCatalog(g,{ending});
      if(g===generation.current){
        setStatus(rows?.length
          ?"Compare the records ending in "+ending+" with your part."
          :"No catalog number ends in "+ending+". Try the component name or a complete number.");
      }
    }catch(e){
      if(g===generation.current){setStatus("");setError(e instanceof Error?e.message:"Catalog lookup failed.");}
    }finally{
      if(g===generation.current)setBusy(false);
    }
  }
  async function read() {
    if (!image || busy || !photos.ready) return;
    const g = ++generation.current;
    abort.current?.abort();
    abort.current = new AbortController();
    inference.current.stop();
    setBusy(true);
    setError("");
    setMatches([]);setNumbers([]);
    try {
      await readAllText(g,photos.draft!.revision,abort.current.signal);
    } catch (e) {
      if (g === generation.current) setStatus("");
      if (g === generation.current)
        setError(
          e instanceof Error ? e.message : "Markings could not be read.",
        );
    } finally {
      if (g === generation.current) setBusy(false);
    }
  }
  async function readAllText(g:number,revision:number,signal:AbortSignal){
    const result=await readPhotoText(photos.photos.map(p=>({photoId:p.id,blob:p.blob})),s=>{if(g===generation.current)setStatus(s)},signal);
    if(g!==generation.current)return;
    photos.textResult(result,revision);
    setTiming(t=>({...t,ocr:result.ms}));
    track("scanner_inference","/scanner",{code:"ocr",value:Math.min(300000,result.ms)});
    const {numbers:found,partials}=photoTextEvidence(result.views);
    if(found.length)await lookup(found.join(' '),g,true);
    else {setNumbers([]);setMatches([]);}
    if(g!==generation.current)return;
    setStatus(found.length?'Text read. Check the number against the photo.':partials.length?'Short marking found. You can compare it with catalog numbers below.':'No complete BMW number found. Try a closer photo of the marking, or enter the number yourself.');
  }
  async function analyze() {
    if (!image || !visualAllowed) return;
    const g = ++generation.current;
    setBusy(true);
    setError("");
    setVisual([]);
    try {
      setStatus(
        "Loading local detection. First use downloads approximately 245 MB of model files.",
      );
      const d = await inference.current.run("detect", image.blob, (s) => {
        if (g === generation.current) setStatus(s);
      });
      if (g !== generation.current) return;
      setDetections(
        (d.detections || [])
          .map(normalizeDetection)
          .filter((d): d is Detection => d !== null),
      );
      setTiming((t) => ({ ...t, detect: d.ms }));
      track("scanner_inference", "/scanner", {
        code: "detector",
        value: Math.min(300000, d.ms),
      });
      const r = await fetch("/scanner/reference-index.json");
      if (!r.ok) throw Error("Reference images are not available.");
      const refs = referenceIndexSchema.parse(await r.json());
      const v = await inference.current.run(
        "retrieve",
        image.blob,
        (s) => {
          if (g === generation.current) setStatus(s);
        },
        refs.records.filter(
          (r) =>
            !effectiveVehicle.engine ||
            ["M50", "M50TU"].includes(effectiveVehicle.engine) ||
            !r.nodeId.startsWith("m50:"),
        ),
      );
      if (g !== generation.current) return;
      setVisual(v.candidates || []);
      track("scanner_inference", "/scanner", {
        code: "embedding",
        value: Math.min(300000, v.ms),
      });
      track("scanner_reject", "/scanner", { code: "uncertain" });
      setTiming((t) => ({ ...t, retrieve: v.ms }));
      setStatus(
        "Experimental comparison finished. No exact OEM identity or fitment has been established.",
      );
    } catch (e) {
      if (g === generation.current) setStatus("");
      if (g === generation.current)
        setError(
          e instanceof Error ? e.message : "Recognition could not finish.",
        );
    } finally {
      if (g === generation.current) setBusy(false);
    }
  }
  function runScan(){return mode==='markings'?read():compareShape();}
  async function compareShape() {
    if (!image || !visualAllowed || capturePending || busy || !photos.ready) return;
    const g=++generation.current;
    abort.current?.abort(); inference.current.stop();
    setBusy(true); setError(""); setLastScan("");
    setMatches([]);setNumbers([]);
    const photoRevision=photos.draft!.revision;
    setStatus("Checking this part…");
    try {
      const views=await distinctPhotoBlobs(comparisonImages(image,angles).map(v=>v.blob));
      if(g!==generation.current)return;
      const result=await inference.current.run("compare",views[0],s=>{if(g===generation.current)setStatus(s)},[],views.slice(1));
      if(g!==generation.current)return;
      if(!result.comparison)throw Error("The scan returned no comparisons. Your photos are kept; try again.");
      const recorded=recordComparison(result.comparison,result.ms,photoRevision);
      if(!recorded)throw Error("The result could not be kept. Your photos are still here; scan again.");
      track("scanner_result", "/scanner", {results: result.comparison.candidates.length});
      requestAnimationFrame(()=>resultsHost.current?.scrollIntoView({block:"start",behavior:"smooth"}));
      setTiming(t=>({...t,retrieve:result.ms}));
      setStatus(result.comparison.candidates.length?"Scan finished. Compare the suggested parts below.":"No clear match. Check the result below, add another angle, or search the catalog.");

    } catch(e) {if(g===generation.current){setError(e instanceof Error?e.message:"Comparison could not finish.");setStatus("");}}
    finally {if(g===generation.current)setBusy(false);}
  }
  async function save(nodeId?: string,familyId?:string) {
    if(busy)return;
    if(selected&&!partConfirmationCurrent(photos.draft)){setError("Confirm the part number before saving.");return;}
    if(capturePending){setError("Use or cancel the photo before continuing.");return;}
    if (!user || user.is_anonymous) {
      toast("Sign in to save private scan notes.");
      return;
    }
    if (!selected && !nodeId && !componentFamilies.some(f=>f.id===familyId)) {
      setError("Choose a catalog record or component first.");
      return;
    }
    savingObservation.current=true;
    setBusy(true);
    setError("");
    const g=++generation.current;
    abort.current?.abort();
    const controller=new AbortController();abort.current=controller;
    const signal=()=>AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]);
    try {
    const config = car
      ? await db
          .from("vehicle_configuration_revisions")
          .select("id")
          .eq("vehicle_id", car)
          .order("revision", { ascending: false })
          .limit(1)
          .abortSignal(signal())
          .maybeSingle()
      : { data: null, error: null };
    if(g!==generation.current)return;
    if (config.error) {
      setError(
        "Vehicle configuration could not be pinned. Retry before saving.",
      );
      setBusy(false);
      return;
    }
    const positionId=selected&&!nodeId&&!familyId?(photos.draft?.sourcePositionId||selected.positionId||''):'';
    if(positionId){
      const source=await db.from('part_assembly_positions').select('id').eq('id',positionId).eq('part_id',selected!.id).abortSignal(signal()).maybeSingle();
      if(g!==generation.current)return;
      if(source.error||!source.data){setError('That source record no longer matches this part. Select its catalog record again before saving.');return;}
    }
    const vehicleReferences=referencesForSeries(series);
    const receipt = photos.draft?.referenceId ? referenceRelease(photos.draft.modelRevision??undefined,photos.draft.referenceId) : null;
    const reference=selected||nodeId?(receipt&&seriesForModel(receipt.id)===series?receipt:resolveVehicleReference(vehicleReferences,effectiveVehicle).selected):undefined;
    const pinned=scanReferenceFields(positionId,reference?.id,photos.draft?.modelRevision);
    const r = await db
      .from("component_observations")
      .insert({
        user_id: user!.id,
        ...(series === "e34" ? {} : { series }),
        vehicle_id: car || null,
        configuration_revision: config.data?.id || null,
        mode: mode === "vin" ? "markings" : mode,
        part_id: nodeId || familyId ? null : selected?.id || null,
        node_id: nodeId || null,
        ...pinned,
        status: familyId ? "candidate" : "owner_confirmed",
        evidence:scanObservationEvidence({familyId,number:selected&&!nodeId&&identityMethod==='marking'?selected.number_normalized:undefined,recognizer:comparison?.recognizer,method:familyId?'owner-selected-visual-candidate':selected&&!nodeId?(identityMethod==='marking'?'owner-confirmed-marking':'owner-confirmed-catalog-comparison'):'owner-confirmed-component-category',timings:{...timing,...(!timing.retrieve&&photos.draft?.comparison?{retrieve:photos.draft.comparison.ms}:{})},views:comparison?.views||photos.photos.length,nodeId}),
        notes,
      })
      .select("id")
      .abortSignal(signal())
      .single();
    if(g!==generation.current)return;
    if (r.error)
      setError(
        "The scan could not be saved. Check your connection and try again.",
      );
    else {
      track("scanner_confirm", "/scanner", {
        ...(selected && !nodeId ? { target: "part:" + selected.id } : {}),
      });
      setLastScan(r.data.id);
      const uploadRequested=!!selected&&savePhotos&&photos.photos.length>0;
      const savedScan={id:r.data.id as string,vehicleId:car||'',revision:photos.draft!.revision,notes,selection:familyId||selected?.id||nodeId||'',photosShared:savePhotos&&sharePhotos,photoSave:uploadRequested?'pending' as const:'skipped' as const};
      photos.patch({referenceId:pinned.reference_id||"",modelRevision:pinned.model_revision,sourcePositionId:pinned.catalog_position_id||"",savedScan});
      if(uploadRequested){try{await uploadScanPhotos(r.data.id,photos.photos,sharePhotos,{signal:controller.signal,userId:user.id});if(g===generation.current){setPhotoError("");photos.patch({savedScan:{...savedScan,photoSave:'complete'}});}}catch(e){if(g===generation.current)setPhotoError(e instanceof Error?e.message:"The result was saved, but its photos need another attempt.");}}
      if(g!==generation.current)return;
      setRefresh((n) => n + 1);
      toast(
        "Saved to My garage.",
      );
    }
    } catch(reason) {if(g===generation.current)setError(reason instanceof ScanContextError?reason.message:"The garage save could not be confirmed. Your photos and notes are still kept on this device.");}
    finally {savingObservation.current=false;if(g===generation.current)setBusy(false);}
  }
  async function retrySavedPhotos(){
    if(!savedForCurrent||!persistedSave||!user)return;
    const retryGeneration=++generation.current;savingObservation.current=true;setBusy(true);
    const uploadController=new AbortController();abort.current?.abort();abort.current=uploadController;
    try{
      await uploadScanPhotos(persistedSave.id,photos.photos,persistedSave.photosShared,{signal:uploadController.signal,userId:user.id});
      if(retryGeneration===generation.current){setPhotoError("");photos.patch({savedScan:{...persistedSave,photoSave:'complete'}});setRefresh(n=>n+1);}
    }catch(e){if(retryGeneration===generation.current)setPhotoError(e instanceof Error?e.message:'Photos could not save. Try again.');}
    finally{savingObservation.current=false;if(retryGeneration===generation.current)setBusy(false);}
  }
  function startNewScan(){
    if(photos.photos.length&&!savedForCurrent&&!confirm('Start a new scan? Unsaved photos will be removed from this device.'))return;
    const url=new URL(location.href);url.searchParams.delete('scan');history.replaceState(history.state,'',url.pathname+url.search+url.hash);restored.current='';
    photos.reset();setSelected(null);setCatalogAnchor(null);setLastScan('');setMatches([]);setNumbers([]);setStatus('');setError('');setPhotoError('');
    requestAnimationFrame(()=>photosHost.current?.scrollIntoView({block:'start',behavior:'smooth'}));
  }
  return (
    <div className="page scanner-page" onClickCapture={event=>{
      if(event.target instanceof Element&&event.target.closest('a[target="_blank"]'))openedReferenceAt.current=performance.now();
    }}>
      <PageIntro
        eyebrow={"IDENTIFY / BMW " + series.toUpperCase()}
        title="Part Scanner."
        description="Take a clear photo, compare possible parts, then check the number and its location in your car."
      />
      <div className="scan-context">
        <label>
          Working on
          <select
            value={car}
            disabled={busy || owned.loading}
            onChange={(e) => {
              const id = e.target.value;
              setCar(id);
              const c = owned.cars.find((c) => c.id === id);
              if (c) setVehicle(sanitizeVehicle(c.configuration));
              setLastScan("");
            }}
          >
            <option value="">
              Selected reference vehicle · {vehicle.model || "Choose your vehicle"}
            </option>
            {owned.cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nickname}
              </option>
            ))}
          </select>
        </label>
        {car && previewFeatures.vehicleConfiguration && (
          <DocumentLink href={"/garage/configuration?vehicle=" + car}>
            Review installed configuration <ArrowUpRight size={14} />
          </DocumentLink>
        )}
        <label>
          Photographing
          <select
            value={mode}
            disabled={busy}
            onChange={(e) => { setMode(e.target.value as ScanMode); setLastScan('');photos.patch({savedScan:null}); }}
          >
            <option value="installed">An installed component</option>
            <option value="loose">A loose part</option>
            <option value="markings">Part markings</option>
          </select>
        </label>
      </div>
      {owned.error && (
        <p role="status">
          {owned.error}
          <button onClick={owned.retry}>Retry</button>
        </p>
      )}
      <div className="scanner-layout">
        <div>
          <nav className="scan-steps" aria-label="Identify a part steps"><button aria-current={!comparison?'step':undefined} onClick={()=>photosHost.current?.scrollIntoView({block:'start',behavior:'smooth'})}>1 · Photo</button><button disabled={!comparison} aria-current={comparison&&!selected?'step':undefined} onClick={()=>resultsHost.current?.scrollIntoView({block:'start',behavior:'smooth'})}>2 · Compare</button><button disabled={!selected} aria-current={selected?'step':undefined} onClick={()=>reviewHost.current?.scrollIntoView({block:'start',behavior:'smooth'})}>3 · Part & location</button><button disabled={!selected&&!reviewedFamily} onClick={()=>saveHost.current?.scrollIntoView({block:"start",behavior:"smooth"})}>4 · Save</button></nav>
          <div ref={photosHost}>
          <p className="scan-guidance"><strong>One part per scan.</strong> Start with one clear photo. Extra angles of the same part are optional.</p>
          {photos.previous&&!image&&<div className="scan-actions"><button type="button" className="button outline" onClick={photos.resume}>{photos.previous.savedScan?.photoSave==='pending'?'Resume saving photos':'Resume previous scan'}</button></div>}
          <ImageCapture onPickerChange={open=>{nativePicker.current=open;}} onPendingChange={setCapturePending} ref={capture} key={(userId||"device")+":"+(photos.draft?.id||"loading")} canAdd={photos.photos.length<3} disabled={busy||photos.saving||!photos.ready||savedForCurrent} onImage={changed} onClear={()=>{if(image)photos.remove(image.id)}} scanAction={image&&<div className={'scan-runbar'+(comparison||selected?' is-complete':'')}><div><strong>{busy?'Scanning this part…':savedForCurrent?'Saved in My garage':comparison?'Scan complete':'Ready to scan this part'}</strong><small role="status">{photos.saving?'Saving photo on this device…':photos.error||(savedForCurrent?(persistedSave?.photoSave==='complete'?'Your result and photos are saved.':persistedSave?.photoSave==='pending'?'Your result is saved. Photos still need saving.':'Your result is saved.'):comparison?'Compare the results below.':'Photos stay on this device until you save them to your garage.')}</small></div><button className="button primary" disabled={capturePending||busy||photos.saving||!photos.ready} onClick={()=>savedForCurrent?startNewScan():void runScan()}><ScanLine size={18}/>{busy?'Scanning…':savedForCurrent?'Scan another part':mode==='markings'?'Read part number':'Scan this part'}</button>{comparison&&!busy&&<button className="text-link" onClick={()=>resultsHost.current?.scrollIntoView({block:'start',behavior:'smooth'})}>View results</button>}</div>}/>
          </div>
          {photos.photos.length>1&&<div className="scan-photo-set" aria-label="Views of this part">{photos.photos.map((photo,index)=><article key={photo.id}><button disabled={busy||capturePending||photos.saving} aria-pressed={image?.id===photo.id} onClick={()=>photos.select(photo.id)} aria-label={'View photo '+(index+1)}><img src={photo.url} alt={'Part view '+(index+1)}/><span>View {index+1}</span></button><button disabled={busy||capturePending||photos.saving} onClick={()=>photos.remove(photo.id)} aria-label={'Remove photo '+(index+1)}>Remove</button></article>)}</div>}
          {busy&&!savingObservation.current&&<button className="button outline" onClick={()=>{generation.current++;abort.current?.abort();inference.current.stop();setBusy(false);setStatus('Scan stopped. All photos are still kept.')}}>Stop scan</button>}
          <div className="scan-actions"><button className="text-link" disabled={busy||photos.saving||!photos.ready} onClick={startNewScan}>Start new scan</button><button className="text-link" disabled={!image||capturePending||busy||!photos.ready} onClick={()=>void read()}>Read markings</button></div>
          {status&&<p className="scan-status" role="status" aria-live="polite">{status}</p>}{error&&<p className="scan-error" role="alert">{error}</p>}
          {photos.draft?.photoText&&<ScanTextResults result={photos.draft.photoText} revision={photos.draft.revision} disabled={busy||capturePending} onCheck={number=>{setText(number);void checkCatalog(number)}} onCheckEnding={ending=>void checkCatalogEnding(ending)}/>}
          {matches.length>0&&<section className="scan-catalog-results"><h3>Choose the OEM record to review</h3>{matches.map(m=><button className="scan-match" key={m.id} disabled={busy} onClick={()=>chooseCatalogPart(m,matchesMethod)}><PartChoiceImage number={m.number_normalized}/><span className="scan-match-copy"><strong>{m.number_normalized}</strong><span>{m.name}</span></span></button>)}</section>}
          <div ref={resultsHost} className="scan-results-anchor">

          {(comparison||reviewedFamily||(image&&!busy)) && <FamilyResults disabled={busy||capturePending} onAddView={()=>photosHost.current?.scrollIntoView({block:'start',behavior:'smooth'})} key={photos.draft?.comparison?.ms} chosen={reviewedFamily} onFamilyChange={id=>{photos.patch({reviewedFamily:id});setPartQuery(componentFamilies.find(f=>f.id===id)?.search||'');setSelected(null);setCatalogAnchor(null);setLastScan('');}} comparison={comparison} series={series} vehicle={effectiveVehicle} navigation={{vehicle:car,scan:savedId}} onCatalogNumber={number=>{
            setText(number);void checkCatalog(number,'catalog-comparison',true);
          }}/>}

          {(image||comparison)&&<section className="scan-record-picker"><h3>Choose the catalog part</h3><p>Review a proposed number above, or search by component name. The record you choose opens its complete reference below.</p><CatalogPartField contextId={sourceContextId} value={partQuery} selected={selected} onChange={value=>{setPartQuery(value);setSelected(null);setCatalogAnchor(null)}} onSelect={part=>{if(part.number_normalized)chooseCatalogPart({...part,number_normalized:part.number_normalized})}}/></section>}
          </div>
          {previewFeatures.scannerExperiments && (
            <details className="scan-experimental">
              <summary>Additional comparison tools</summary>
              <p>
                The current model and reference set failed exact-part
                validation. Recognition files total about 245 MB and may use several
                hundred MB of memory. It runs on this device. Use one component
                per crop. Scores are similarities, not identification
                probabilities.
              </p>
              <button
                className="button outline"
                disabled={!image || busy}
                onClick={analyze}
              >
                Run experimental image analysis
              </button>
              <div className="scan-detections">
                {detections.map((d, i) => (
                  <button
                    key={i}
                    onClick={async () => {
                      if (!image) return;
                      const p = await prepareImage(image.blob, 0, d.box);
                      capture.current?.showImage(p);
                    }}
                  >
                    {d.label} · crop this region
                  </button>
                ))}
              </div>
              {detections.length > 0 && image && (
                <div
                  className="scan-boxes"
                  style={{ aspectRatio: image.width + "/" + image.height }}
                >
                  <img src={image.url} alt="Detected candidate regions" />
                  {detections.map((d, i) => (
                    <button
                      aria-label={"Select detected " + d.label}
                      key={i}
                      style={{
                        left: d.box.xmin * 100 + "%",
                        top: d.box.ymin * 100 + "%",
                        width: (d.box.xmax - d.box.xmin) * 100 + "%",
                        height: (d.box.ymax - d.box.ymin) * 100 + "%",
                      }}
                      onClick={async () => {
                        const p = await prepareImage(image.blob, 0, d.box);
                        capture.current?.showImage(p);
                      }}
                    />
                  ))}
                </div>
              )}
              {visual.length > 0 && (
                <>
                  <p>{visualDecision(visual).message}</p>
                  {visual.map((v, i) => (
                    <article className="scan-visual" key={i}>
                      <img src={v.thumbnail} alt={v.name + " reference"} />
                      <div>
                        <h3>{v.name}</h3>
                        <p>
                          {v.source === "synthetic-reference"
                            ? "Illustrative 3D reference"
                            : "Licensed reference photograph"}{" "}
                          · similarity {v.score.toFixed(3)}
                        </p>
                        <DocumentLink
                          href={
                            "/workshop?node=" + encodeURIComponent(v.nodeId)
                          }
                        >
                          Inspect reference
                        </DocumentLink>
                        <button
                          className="button outline"
                          disabled={busy}
                          onClick={() => save(v.nodeId)}
                        >
                          I confirm this component category
                        </button>
                      </div>
                    </article>
                  ))}
                  <DocumentLink href="/scanner/credits">
                    Reference image credits
                  </DocumentLink>
                </>
              )}
            </details>
          )}
          {Object.keys(timing).length > 0 && (
            <p className="small muted">
              Measured here:{" "}
              {Object.entries(timing)
                .map(([k, v]) => k + " " + Math.round(v) + " ms")
                .join(" · ")}
              . Includes work on this device; initial model setup may be
              included.
            </p>
          )}
        </div>
        <aside className="scanner-results"><details><summary>Optional BMW number lookup</summary>
          <h2>Catalog checks</h2>
          <p>
            {mode === "installed"
              ? "Take a wider location photo, then a close view of the component and its casting or label. Keep the engine off and cold; stay clear of fans and belts."
              : "Shape comparisons appear below the photo. If you can read a complete BMW number, you can also look it up here."}
          </p>
          <label>
            BMW number (optional)
            <input
              value={text}
              maxLength={300}
              disabled={busy}
              onChange={(e) => { setText(e.target.value); setMatches([]); setNumbers([]); }}
              placeholder="Optional · 11 51 1 315 559"
            />
          </label>
          <button
            className="button outline"
            disabled={busy}
            onClick={() => void checkCatalog(text)}
          >
            <Search size={16} />
            {busy ? "Looking up…" : "Look up marking"}
          </button>
          {!busy && !error && numbers.length > 0 && matches.length === 0 && (
            <p>
              No canonical record matched {numbers.join(", ")}. Check the
              marking; casting numbers and partial numbers may not be ordering
              numbers.
            </p>
          )}
          {matches.map((m) => (
            <button
              className={
                "scan-match" + (selected?.id === m.id ? " selected" : "")
              }
              key={m.id}
              disabled={busy}
              onClick={() => {
                chooseCatalogPart(m,matchesMethod);
              }}
            >
              <strong>{m.number_normalized}</strong>
              <span>{m.name}</span>
              {selected?.id === m.id && <Check size={18} />}
            </button>
          ))}
          <div className="scan-next">
            <DocumentLink
              href={
                "/parts/catalog?q=" + encodeURIComponent(text.slice(0, 120))
              }
            >
              Search the complete catalog
            </DocumentLink>
            <DocumentLink href="/diagnostics">Diagnose a symptom</DocumentLink>
            <DocumentLink
              href={
                "/community/new?title=" +
                encodeURIComponent("Help identifying a BMW " + series.toUpperCase() + " component") + "&series=" + series
              }
            >
              Ask the community
            </DocumentLink>
          </div>
        </details></aside>
      </div>
      <div ref={reviewHost}>{catalogAnchor&&selected&&<ScanPartReview anchor={catalogAnchor} selected={selected} vehicle={effectiveVehicle} navigation={{vehicle:car,scan:savedId}} onSelect={part=>{photos.patch({selectedPart:part,identityMethod:"catalog-comparison",confirmedSelection:null,savedScan:null});setLastScan('')}} context={{referenceId:photos.draft?.referenceId||'',sourcePositionId:photos.draft?.sourcePositionId||'',modelRevision:photos.draft?.modelRevision}} onContextChange={changeReferenceContext}/>}</div>
          {(comparison||selected||reviewedFamily)&&<section ref={saveHost} className="scan-garage-save"><h3>Save this part</h3><p>{selected?selected.name:reviewedFamily?componentFamilies.find(f=>f.id===reviewedFamily)?.name:'Choose a possible component above, or select its OEM record.'}</p>{(!user||user.is_anonymous)?<DocumentLink href={"/account?next="+encodeURIComponent(series === "e34" ? "/scanner" : "/"+series+"/scanner")} onClick={()=>{if(photos.draft)try{keepScanForSignIn(photos.draft,guestScope)}catch{}}}>Sign in and keep this scan ↗</DocumentLink>:<><label>Save for<select value={car} disabled={busy||owned.loading} onChange={e=>setCar(e.target.value)}><option value="">General part reference</option>{eligibleCars.map(c=><option key={c.id} value={c.id}>{c.nickname}</option>)}</select></label>{!owned.loading&&!eligibleCars.length&&<DocumentLink href="/garage">Add your car to My garage ↗</DocumentLink>}{selected&&<><label className="scan-confirm-part"><input type="checkbox" checked={confirmed} disabled={busy||capturePending} onChange={e=>photos.patch({confirmedSelection:e.target.checked?{draftId:photos.draft!.id,revision:photos.draft!.revision,partId:selected.id}:null})}/>I checked the number and this is my part.</label>{photos.photos.length>0&&<><label className="scan-photo-choice"><input type="checkbox" checked={savePhotos} disabled={busy||!!savedId} onChange={e=>setSavePhotos(e.target.checked)}/>Save my photos with this result.</label>{savePhotos&&<><label className="scan-photo-choice"><input type="checkbox" checked={sharePhotos} disabled={busy||!!savedId} onChange={e=>setPhotoConsent({key:consentKey,enabled:e.target.checked})}/>I took these photos and agree E34 Lore can use them in the parts catalog and to improve scanning.</label><p className="small muted">Optional. Shared photos are reviewed first. Keep faces, plates, VINs and addresses out.</p></>}</>}</>}
          {selected&&savePhotos&&photos.photos.length>0&&!savedId&&<ScanPhotoLabels photos={photos.photos} disabled={busy||capturePending} onLabel={photos.label}/>}
          <label>Private notes<textarea value={notes} disabled={busy} maxLength={3000} onChange={e=>{setNotes(e.target.value);setLastScan('')}}/></label><button className="button" disabled={busy||capturePending||(!!selected&&!confirmed)||(!selected&&!reviewedFamily)||!!savedId} onClick={()=>save(undefined,selected?undefined:reviewedFamily)}>{savedId?'Saved':selected&&savePhotos?'Save result & photos':'Save result'}</button><p className="small muted">Your result and notes are private. A possible component is saved as a candidate until you identify the exact part.</p>{(photoError||(savedForCurrent&&persistedSave?.photoSave==='pending'&&photos.photos.length>0))&&<p role="status">{photoError||'Your result is saved. Finish saving its photos.'} {savedForCurrent&&<button type="button" className="text-link" disabled={busy} onClick={retrySavedPhotos}>{photoError?'Retry saving photos':'Save photos'}</button>}</p>}{savedId&&<><SavedScanPhotos observation={savedId} refresh={refresh}/><button className="button outline" type="button" disabled={busy} onClick={startNewScan}>Scan another part</button></>}{savedId&&<DocumentLink href={journeyHref('/garage?tab=scans',{vehicle:car,scan:savedId})}>Open this saved part in My garage ↗</DocumentLink>}</>}</section>}
      <ScanHistory key={userId} refreshKey={refresh} onDeleted={id => { if (id === lastScan) { setLastScan(''); history.replaceState(null, '', journeyHref(location.pathname + location.search, { vehicle: car })); } }}/>

    </div>
  );
}
