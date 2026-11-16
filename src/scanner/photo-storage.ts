import {emptyPhotoDraft,resumablePhotoDraft,restorePhotoDraft,type PhotoDraft} from './photo-session';
const database='e34-local-scanner-v1';
/** Device-only Blobs. No Supabase bucket, analytics payload or network upload. */
async function openPhotos():Promise<IDBDatabase>{
 if(typeof indexedDB==='undefined')throw Error('Photo storage is unavailable.');
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(database,1);let finished=false;
  const timer=setTimeout(()=>{finished=true;reject(Error('Photo storage could not open.'))},4000);
  request.onupgradeneeded=()=>{request.result.createObjectStore('drafts')};
  request.onblocked=()=>{clearTimeout(timer);finished=true;reject(Error('Another tab is blocking photo storage.'))};
  request.onerror=()=>{clearTimeout(timer);reject(Error('Photo storage is unavailable.'))};
  request.onsuccess=()=>{clearTimeout(timer);if(finished){request.result.close();return;}resolve(request.result)};
 });
}
async function transact<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await openPhotos();
 return new Promise((resolve,reject)=>{
  const transaction=db.transaction('drafts',mode),request=action(transaction.objectStore('drafts'));let result:T;
  const timer=setTimeout(()=>{transaction.abort()},4000);
  request.onsuccess=()=>{result=request.result};
  transaction.oncomplete=()=>{clearTimeout(timer);db.close();resolve(result)};
  transaction.onabort=transaction.onerror=()=>{clearTimeout(timer);db.close();reject(Error('Photos could not be kept on this device.'))};
 });
}
const pendingKey = (scope: string, id: string) => scope.split('/record/')[0]+'/pending/'+id;

function readDraft(scope:string):Promise<PhotoDraft|null> {
 return transact('readwrite',store=>{
  const request = store.get(scope);
  request.addEventListener('success',()=>{
   try { if(request.result && !restorePhotoDraft(request.result))store.delete(scope); }
   catch { /* Invalid records never reach the scanner. */ }
  });
  return request;
 }).then(raw=>restorePhotoDraft(raw));
}
export async function loadPhotoDraft(scope:string):Promise<PhotoDraft|null> {
 const record = scope.split('/record/')[1];
 if(record){
  const pending = await readDraft(pendingKey(scope,record));
  if(pending?.savedScan?.id===record && pending.savedScan.photoSave==='pending')return pending;
 }
 return readDraft(scope);
}

let writes:Promise<unknown>=Promise.resolve();
export async function savePhotoDraft(scope:string,draft:PhotoDraft):Promise<void>{
 // Serialize writes: a slow earlier save must never replace a newer photo set.
 const snapshot=structuredClone(draft);
 const result=writes.catch(()=>{}).then(()=>transact('readwrite',store=>{
  const request = store.get(scope);
  request.addEventListener('success',()=>{
   // Older installations only recorded unfinished uploads in the main draft.
   // Preserve that draft the first time it is replaced by a different scan.
   let earlier:PhotoDraft|null=null;
   try { earlier=restorePhotoDraft(request.result); } catch { /* Ignore a malformed earlier draft. */ }
   if(earlier?.id!==snapshot.id && earlier?.savedScan?.photoSave==='pending' && earlier.photos.length)
    store.put(earlier,pendingKey(scope,earlier.savedScan.id));
   const saved=snapshot.savedScan;
   if(saved?.photoSave==='pending'&&snapshot.photos.length)store.put(snapshot,pendingKey(scope,saved.id));
   else if(saved){
    store.delete(pendingKey(scope,saved.id));
    const mainScope=scope.split('/record/')[0];
    if(mainScope!==scope){
     const main=store.get(mainScope);
     main.onsuccess=()=>{
      try {
       const existing=restorePhotoDraft(main.result);
       if(existing?.savedScan?.id===saved.id)store.put({...existing,savedScan:saved},mainScope);
      } catch { /* Ignore a malformed earlier draft. */ }
     };
    }
   }
   store.put(snapshot,scope);
  });
  return request;
 })).then(()=>{});
 writes=result;return result;
}

const signInClaimKey='e34.scanner.sign-in-claim.v1';
export function keepScanForSignIn(draft:PhotoDraft,guestScope='device'){sessionStorage.setItem(signInClaimKey,JSON.stringify({id:draft.id,at:Date.now(),guestScope}))}
/** Transfer only a guest scan explicitly carried through this tab's sign-in action. */
export async function claimGuestScan(scope:string,guestScope='device'):Promise<PhotoDraft|null>{
 if(scope===guestScope)return null;
 let claim:{id?:string;at?:number;guestScope?:string};try{claim=JSON.parse(sessionStorage.getItem(signInClaimKey)||'null')}catch{return null}
 if(!claim?.id||!claim.at||Date.now()-claim.at>30*60*1000)return null;
 if((claim.guestScope??'device')!==guestScope)return null;
 const guest=await loadPhotoDraft(guestScope);if(!guest||guest.id!==claim.id)return null;
 const current=await loadPhotoDraft(scope);if(resumablePhotoDraft(current)?.photos.length){sessionStorage.removeItem(signInClaimKey);return null;}
 await savePhotoDraft(scope,guest);await savePhotoDraft(guestScope,emptyPhotoDraft());sessionStorage.removeItem(signInClaimKey);return guest;
}
