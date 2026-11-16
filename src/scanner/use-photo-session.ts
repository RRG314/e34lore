'use client';
import {ZodError} from 'zod';
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {addSessionPhoto,editSessionPhoto,emptyPhotoDraft,newPhotoId,recordPhotoComparison,recordPhotoText,removeSessionPhoto,resumablePhotoDraft,selectSessionPart,type PhotoDraft,type ScanPhoto} from './photo-session';
import type {PhotoText} from './text-evidence';
import {claimGuestScan,loadPhotoDraft,savePhotoDraft} from './photo-storage';
import type {CapturedImage} from './ImageCapture';
import type {FamilyComparison} from './family-comparison';
type View=ScanPhoto&{url:string};
type State={scope:string;draft:PhotoDraft;photos:View[];saving:boolean;error:string};
export function usePhotoSession(scope:string,enabled:boolean,guestScope='device'){
 const [state,setState]=useState<State|null>(null),[error,setError]=useState('');
 const [parked,setParked]=useState<{scope:string;draft:PhotoDraft}|null>(null);
 const current=state?.scope===scope?state:null;
 const currentRef=useRef<State|null>(null);
 const urls=useRef(new Map<string,{blob:Blob;url:string}>());
 const scopeRef=useRef(scope);
 useLayoutEffect(()=>{scopeRef.current=scope;currentRef.current=null},[scope,enabled]);
 const publish=useCallback((draft:PhotoDraft,ownerScope:string,saving=false,message='')=>{
  if(scopeRef.current!==ownerScope)return;
  for(const [id,entry]of urls.current)if(!draft.photos.some(p=>p.id===id&&p.blob===entry.blob)){URL.revokeObjectURL(entry.url);urls.current.delete(id)}
  const photos=draft.photos.map(p=>{let entry=urls.current.get(p.id);if(!entry){entry={blob:p.blob,url:URL.createObjectURL(p.blob)};urls.current.set(p.id,entry)}return {...p,url:entry.url}});
  const next={scope:ownerScope,draft,photos,saving,error:message};currentRef.current=next;setState(next);
 },[]);
 useEffect(()=>{
  if(!enabled)return;let live=true;const ownerScope=scope,urlMap=urls.current;
  const read=scope===guestScope||scope.includes('/record/')?Promise.resolve(null):claimGuestScan(scope,guestScope);
  read.then(async claimed=>{
   if(claimed){if(live){setParked(null);publish(claimed,ownerScope);}return;}
   const saved=resumablePhotoDraft(await loadPhotoDraft(scope));
   if(live){setParked(saved?{scope:ownerScope,draft:saved}:null);publish(emptyPhotoDraft(),ownerScope);}
  }).catch(()=>{if(live)publish(emptyPhotoDraft(),ownerScope,false,'This browser could not restore saved photos. New photos remain available in this tab.')});
  return()=>{live=false;for(const entry of urlMap.values())URL.revokeObjectURL(entry.url);urlMap.clear()};
 },[scope,enabled,publish,guestScope]);
 const commit=useCallback((next:PhotoDraft)=>{
  const ownerScope=scopeRef.current;publish(next,ownerScope,true);
  if(next.photos.length) setParked(earlier=>earlier?.scope===ownerScope?null:earlier);
  void savePhotoDraft(ownerScope,next).then(()=>{
   if(currentRef.current?.draft===next&&scopeRef.current===ownerScope)publish(next,ownerScope,false);
  }).catch(()=>{if(currentRef.current?.draft===next&&scopeRef.current===ownerScope)publish(next,ownerScope,false,'Photos are still in this tab, but this browser could not keep them after a reload.');});
 },[publish]);
 function update(transform:(draft:PhotoDraft)=>PhotoDraft){
  const value=currentRef.current;if(!value||value.scope!==scope||!enabled)return;
  try{setError('');const next=transform(value.draft);commit(next);return next}catch(e){setError(e instanceof ZodError?'This result could not be kept. Your photos are still here; try scanning again.':e instanceof Error?e.message:'The photo set could not change.')}
 }
 const previous=parked?.scope===scope?parked.draft:null;
 function shelve(){
  const active=currentRef.current;
  if(!active||active.scope!==scope||!active.draft.photos.length)return;
  const saved=resumablePhotoDraft(active.draft);
  setParked(saved?{scope,draft:saved}:null);
  publish(emptyPhotoDraft(),scope);
 }
 function resume(){
  if(!previous||!currentRef.current||currentRef.current.scope!==scope)return;
  setParked(null);
  publish(previous,scope);
 }
 return {ready:!!current&&enabled,previous,resume,shelve,draft:current?.draft,photos:current?.photos||[],active:current?.photos.find(p=>p.id===current.draft.activeId)||null,saving:current?.saving||false,error:error||current?.error||'',
  add:(photo:CapturedImage)=>update(d=>addSessionPhoto(d,{...photo,id:newPhotoId()})),
  edit:(photo:CapturedImage)=>update(d=>editSessionPhoto(d,photo)),
  select:(id:string)=>update(d=>d.photos.some(p=>p.id===id)?{...d,activeId:id}:d),
  label:(id:string,view:ScanPhoto['view'])=>update(d=>d.savedScan?d:{...d,photos:d.photos.map(photo=>photo.id===id?{...photo,view}:photo),updatedAt:Date.now()}),
  remove:(id:string)=>update(d=>removeSessionPhoto(d,id)),
  reset:()=>update(()=>emptyPhotoDraft()),
  patch:(patch:Partial<Pick<PhotoDraft,'notes'|'text'|'photoText'|'identityMethod'|'reviewedFamily'|'selectedPart'|'anchorPart'|'savedScan'|'confirmedSelection'|'referenceId'|'modelRevision'|'sourcePositionId'>>)=>update(d=>({...d,...patch,updatedAt:Date.now()})),
  comparison:(value:FamilyComparison,ms:number,revision:number)=>update(d=>recordPhotoComparison(d,value,ms,revision)),
  textResult:(value:Omit<PhotoText,'revision'>,revision:number)=>update(d=>recordPhotoText(d,value,revision)),
  choosePart:(part:PhotoDraft['selectedPart'],method:PhotoDraft['identityMethod'])=>update(d=>selectSessionPart(d,part,method)),
 };
}
