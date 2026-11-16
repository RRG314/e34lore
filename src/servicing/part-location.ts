import type {ReferenceModel,ReferenceNode} from '../digital-twin/public/model';
const centerSupportByModel = {
 '525i': ['26121226723','26121225071'],
 '540i': ['26121226657','26121225002'],
};
const normalized = (partId?:string) => /^(?:bmw-)?(\d{11})$/.exec(partId||'')?.[1]||'';
/** The fallback shows the installed assembly on archives without a linked bearing. */
export function supplementalPartLocation(model:ReferenceModel,partId?:string):{node:ReferenceNode;source:string;note:string}|null{
 const number=normalized(partId), name=model.vehicleReference?.model;
 if ((name!=='525i'&&name!=='540i')||!centerSupportByModel[name].includes(number))return null;
 if (model.nodes.some(n=>n.oem===number&&n.assetId))return null;
 const node=model.nodes.find(n=>n.id.endsWith(':center-bearing')&&n.systemIds.includes('system:driveshaft')&&!!n.assetId);
 return node?{node,source:'Bentley 260-1 Fig.1; 260-7 Fig.10; '+name+' catalog',note:'The highlighted assembly shows the center-support location. Exact geometry for this OEM number has not been verified.'}:null;
}
export function isCenterSupportServicePart(partId:string){return Object.values(centerSupportByModel).some(numbers=>numbers.includes(normalized(partId)))}
