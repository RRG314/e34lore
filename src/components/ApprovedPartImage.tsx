'use client';
import { useEffect, useState } from 'react';
import { db } from './context';
/** Reads only the approved, opted-in projection. Private and pending images are never returned here. */
export function useApprovedPartImage(number: string, enabled: boolean) {
  const [result,setResult]=useState<{number:string;url:string}|null>(null);
  useEffect(()=>{if(!enabled)return;let active=true,url='';
    async function load(){try{const r=await db.rpc('approved_part_photos',{part_number:number,page_size:1}).abortSignal(AbortSignal.timeout(12000));const row=r.data?.[0];if(r.error||!row)return;const image=await db.storage.from('e34-car-photos').download(row.object_path);if(image.error||!image.data||!active)return;url=URL.createObjectURL(image.data);setResult({number,url});}catch{/* Missing shared images leave the existing reference and availability message intact. */}}
    void load();return()=>{active=false;if(url)URL.revokeObjectURL(url);};
  },[number,enabled]);
  return enabled&&result?.number===number?result.url:undefined;
}
