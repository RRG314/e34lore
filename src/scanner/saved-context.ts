import {referenceRelease} from '../digital-twin/public/load-reference';
import type {ComponentContext} from '../servicing/context';
export type StoredScanContext={catalog_position_id?:string|null;reference_id?:string|null;model_revision?:number|null;model_manifest_sha256?:string|null};
export class ScanContextError extends Error {}
/** Pin the existing immutable reader receipt; a source occurrence is separately
 * checked against the chosen part by the database's composite foreign key. */
export function scanReferenceFields(positionId?:string,referenceId?:string,revision?:number|null){
 if(positionId&&!/^[a-zA-Z0-9:_-]{1,240}$/.test(positionId))throw new ScanContextError('Choose this part’s catalog record again before saving.');
 const release=referenceId?referenceRelease(revision??undefined,referenceId):null;
 if(referenceId&&!release||revision&&!referenceId)throw new ScanContextError('This model version is unavailable. Choose its reference again before saving.');
 return {catalog_position_id:positionId||null,reference_id:release?.id||null,model_revision:release?.revision||null,model_manifest_sha256:release?.sha256||null};
}
export function savedComponentContext(partId:string,row:StoredScanContext):ComponentContext{
 return {partId,positionId:row.catalog_position_id||undefined,referenceId:row.reference_id||undefined,modelRevision:row.model_revision||undefined};
}
