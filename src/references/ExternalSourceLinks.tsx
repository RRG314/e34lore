"use client";
import {useEffect,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {useApp} from '../components/context';
import {starterReferences,type ReferenceTarget,type ExternalSource} from './context';
import {vehicleReferences} from '../digital-twin/public/load-reference';
import {referenceVehicle} from '../vehicle/reference-context';
/** The deployable reader uses authored link metadata only. The richer source-review
 * API remains in the separate integration worktree until its migration is accepted. */
export function ExternalSourceLinks({target,related=[],referenceId}:{target:ReferenceTarget;related?:ReferenceTarget[];referenceId?:string}){
 const{vehicle}=useApp();
 const illustrated=referenceId?vehicleReferences.find(r=>r.id===referenceId):undefined;
 const key=JSON.stringify([target,related,illustrated?referenceVehicle(illustrated):vehicle]);
 const [result,setResult]=useState<{key:string;rows:ExternalSource[]}|null>(null);
 useEffect(()=>{let active=true;const [t,r,v]=JSON.parse(key) as [ReferenceTarget,ReferenceTarget[],Record<string,unknown>];starterReferences(t,v,r).then(rows=>{if(active)setResult({key,rows});}).catch(()=>{if(active)setResult({key,rows:[]});});return()=>{active=false;};},[key]);
 const rows=result?.key===key?result.rows:[];
 if(!rows.length)return null;
 return <section className="external-source-links"><h3>External repair discussions</h3><p className="small muted">Related owner experience and walkthroughs on other websites. Read the original discussion and compare its vehicle and source information.</p>{rows.map(source=><article key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={14}/></a><p className="small">{source.reason}</p><p className="small muted">{source.platform} · Link checked {source.reviewed_at}{source.scope.engine?' · '+source.scope.engine:''}{source.scope.model?' · '+source.scope.model:''}{source.availability==='unknown'?' · The host may restrict access':''}</p></article>)}<p className="small muted">These links are references, not fitment approval. Original text and photographs remain with their creators.</p></section>;
}
