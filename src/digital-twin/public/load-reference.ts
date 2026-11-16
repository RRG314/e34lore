import { boundedModelBytes } from "../../graphics/bounded-model-bytes";
import {sha256Hex} from "../../graphics/sha256";
import current from '../../../data/digital-twin/public-reference.json';
import archives from '../../../data/digital-twin/reference-archives.json';
import variants from '../../../data/digital-twin/vehicle-references.json';
import releasedService from '../../../data/digital-twin/525i-service-release.json';
import workshopPanelArchives from '../../../data/digital-twin/workshop-panel-archives.json';
import automatic525i from '../../../data/digital-twin/525i-automatic-reference.json';
import localCandidate,{localReferenceArchives} from './local-reference-candidate';
import localE30,{localE30Archives} from './local-e30-reference';
import e30Exterior from '../../../data/digital-twin/e30-exterior-reference.json';
import type {VehicleReference} from '../../vehicle/reference-context';
import type {Series} from '../../series/registry';
import { parseReference } from './model';
export const defaultVehicleReferenceId=automatic525i.id;
export const vehicleReferences=[localCandidate||releasedService,{...current,label:'525i Sedan · Manual',year:1995,model:'525i',body:'Sedan',engine:'M50TU',transmission:'Manual'},...variants].sort((a,b)=>a.model.localeCompare(b.model,undefined,{numeric:true})||(a.body==='Sedan'?0:1)-(b.body==='Sedan'?0:1)||(a.transmission==='Automatic'?0:1)-(b.transmission==='Automatic'?0:1));
const e30References = localE30 ? [localE30] : [];
export function referencesForSeries(series: Series): (VehicleReference & {label:string;revision:number;sha256:string})[] {
  return series === 'e30' ? e30References : vehicleReferences;
}
export function referenceRelease(revision?:string|number,reference?:string){
 const chosen=reference?[...vehicleReferences,...e30References,...(import.meta.env.DEV&&localE30?[e30Exterior]:[]),...localE30Archives].find(r=>r.id===reference):undefined;
 if(revision===undefined||revision==='')return chosen||(!reference?current:null);
 const key=String(revision);if(!/^[1-9]\d*$/.test(key))return null;
 if(chosen&&String(chosen.revision)===key)return chosen;
 const publishedArchive=workshopPanelArchives.find(r=>(import.meta.env.DEV||!('previewOnly' in r&&r.previewOnly))&&(!reference||r.id===reference)&&String(r.revision)===key);
 if(publishedArchive)return publishedArchive;
 if(reference&&!chosen)return null;
 if(!reference||chosen?.id===automatic525i.id){
  const published=[releasedService,automatic525i].find(release=>String(release.revision)===key);
  if(published)return published;
 }
 const e30Archive=localE30Archives.find(r=>(!reference||r.id===reference)&&String(r.revision)===key);if(e30Archive)return e30Archive;
 const localArchive=localReferenceArchives.find(r=>(!reference||r.id===reference)&&String(r.revision)===key);if(localArchive)return localArchive;
 if(chosen&&chosen.id!==current.id)return null;
 if(key===String(current.revision))return current;
 if(!reference){const variant=vehicleReferences.find(r=>String(r.revision)===key);if(variant)return variant;}
 return Object.hasOwn(archives,key)?(archives as Record<string,typeof current>)[key]:null;
}
/** The demo and full reader share pinned, immutable references. Earlier receipts
 * remain available so a geometry update never silently rebinds saved views. */
export async function loadReference(signal: AbortSignal, revision?: string | number,reference?:string) {
    const release = referenceRelease(revision,reference);
    if (!release)
        throw Error('That saved reference is not available.');
    const response = await fetch(release.manifestUrl, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
    if (!response.ok)
        throw Error('The vehicle reference could not load.');
    const bytes = await boundedModelBytes(response, 4 * 1024 * 1024);
    const digest = await sha256Hex(bytes);
    if (digest !== release.sha256)
        throw Error('The vehicle reference version did not match.');
    const m = parseReference(JSON.parse(new TextDecoder().decode(bytes)));
    if (m.id !== release.id || m.revision !== release.revision)
        throw Error('The vehicle reference version did not match.');
    return m;
}
