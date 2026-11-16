/* eslint-disable @next/next/no-img-element -- Small attributed local photo references retain original licensing and do not use a remote image proxy. */
'use client';
import {mediaForNumber,mediaForFamily} from '../servicing/part-media';
import {DocumentLink}from'./DocumentLink';
import {useApprovedPartImage} from './ApprovedPartImage';
import {ComparisonImage} from './PartComparison';
/** Same evidence reader in the catalog, scanner and selected workshop part. */
export function PartMedia({number,showApproved=true}:{number:string;showApproved?:boolean}){
 const approved=useApprovedPartImage(number,showApproved);
 const rows=mediaForNumber(number).filter((row,i,all)=>all.findIndex(r=>r.source===row.source)===i);if(!rows.length&&!approved)return null;
 return <section className="part-media" aria-label="Part photograph sources"><h3>Part photographs</h3><p className="small">Compare the photographed item and application notes with your installed part.</p>{approved&&<figure><ComparisonImage src={approved} alt={'Reviewed catalog photograph for BMW '+number}/><figcaption>Owner-contributed reference · reviewed</figcaption></figure>}{rows.map(row=><DocumentLink key={row.id} target="_blank" rel="noopener noreferrer" href={row.source}>{row.kind!=='photograph'?row.label:'Photograph source'} ↗</DocumentLink>)}</section>;
}
export function FamilyPhoto({family}:{family:string}){
 const rows=mediaForFamily(family).filter(r=>r.kind==='photograph');if(!rows.length)return null;
 const figures=rows.map(row=><figure key={row.id} className="scan-family-photo"><img loading="lazy" src={row.image} alt={family.replaceAll('-',' ')+' family reference, not a verified BMW part'} width={200} height={160}/><figcaption>Component-family example · {row.condition} · {row.view} view · exact BMW identity unverified.<br/><DocumentLink href={row.source} target="_blank" rel="noopener">{row.rights.attribution}</DocumentLink><br/><DocumentLink href={row.rights.licenseUrl} target="_blank" rel="noopener">{row.rights.license}</DocumentLink> · {row.rights.changes}</figcaption></figure>);
 return <>{figures[0]}{figures.length>1&&<details><summary>More family views ({figures.length-1})</summary><p>Several views may show the same physical object. These are category examples; compare your part’s mounting features separately.</p>{figures.slice(1)}</details>}</>;
}
