import {componentFamilies} from './families';
/** Existing observation contract permits candidate identifiers, never a new exact OEM claim. */
export function familyFromEvidence(evidence:unknown):string|undefined{
 if(!evidence||typeof evidence!=='object')return;
 const nodes=(evidence as {candidate_nodes?:unknown}).candidate_nodes;
 if(!Array.isArray(nodes))return;
 for(const value of nodes)if(typeof value==='string'&&value.startsWith('family:')){
  const id=value.slice(7);if(componentFamilies.some(f=>f.id===id))return id;
 }
}
export function scanObservationEvidence(input:{familyId?:string;number?:string;method:string;recognizer?:string;timings:{ocr?:number;detect?:number;retrieve?:number};views:number;nodeId?:string}){
 if(input.familyId&&!componentFamilies.some(f=>f.id===input.familyId))throw Error('Choose a known component candidate.');
 if(input.number&&!/^\d{11}$/.test(input.number))throw Error('A marking must be a complete BMW number.');
 if(!Number.isInteger(input.views)||input.views<0||input.views>3)throw Error('Invalid photo count.');
 return {markings:input.number?[input.number]:[],method:input.method,
  candidate_nodes:input.familyId?['family:'+input.familyId]:[],
  models:[...(input.timings.ocr?['tesseract.js@7.0.0']:[]),...(input.timings.retrieve?[input.recognizer==='center-support-shape-v1'?'e34-center-support-shape-v1':'Xenova/clip-vit-base-patch32@6b7c523703ae26e39be4b03774966f8571c7f523']:[])],
  timings:{...input.timings,views:input.views},geometry_status:input.nodeId?'illustrative':'not-selected'};
}
