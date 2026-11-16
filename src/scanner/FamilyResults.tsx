'use client';
import {PartChoiceImage} from '../components/PartComparison';
import type { Series } from '../series/registry';
import {FamilyPartComparison} from './FamilyPartComparison';
import {componentFamilies} from './families';
import {centerSupportReference} from './center-support-reference';
import type {FamilyComparison} from './family-comparison';
import type {Vehicle} from '../data/catalog';
import {DocumentLink} from '../components/DocumentLink';
import {journeyHref,type Journey} from '../domain/repair-journey';
import {referencesForSeries} from '../digital-twin/public/load-reference';
import {resolveVehicleReference} from '../vehicle/reference-context';

const driveshaftChoices = [
 {id:'center-support-bearing', title:'Compare the center support', detail:'Bearing in a rubber cushion with a mounting bracket', node:'e34sys:center-bearing'},
 {id:'ball-bearing', title:'Compare the loose bearing', detail:'Metal ring without the rubber cushion or bracket', node:'e34sys:center-bearing-insert'},
 {id:'flex-disc', title:'Compare the flex disc', detail:'Rubber coupling with six bolt holes', node:'e34sys:flexible-drive-coupling'},
];

export function FamilyResults({comparison,disabled=false,chosen,onFamilyChange,vehicle,series="e34",navigation,onCatalogNumber,onAddView}:{series?:Series;comparison:FamilyComparison|null;disabled?:boolean;chosen:string;onFamilyChange:(id:string)=>void;vehicle:Vehicle;navigation:Journey;onCatalogNumber:(number:string)=>void;onAddView?:()=>void}){
 const candidates=comparison?.status==='review'?comparison.candidates.slice(0,1):[];
 const family=componentFamilies.find(f=>f.id===chosen);
 const bearing=centerSupportReference(vehicle.model,series);
 const references=referencesForSeries(series);
 const reference=resolveVehicleReference(references,vehicle).selected;
 const centerGuide=series==='e30'?'/guides/e30-driveshaft-center-support':'/workshop/repair?task=center-support-bearing&system=system%3Adriveshaft';
 const workshop=(path:string)=>journeyHref(path+(reference?'&reference='+encodeURIComponent(reference.id):''),navigation);
 const driveshaftChoice=driveshaftChoices.find(choice=>choice.id===chosen);
 const e30DriveshaftNodes: Record<string,string> = {'center-support-bearing':'e30assembly:propeller:center-mount','flex-disc':'e30assembly:propeller:flex-disc'};
 const node=series==='e30'?e30DriveshaftNodes[chosen]:driveshaftChoice?.node;
 const systemLink='/workshop?system='+encodeURIComponent('system:'+family?.system)+(node?'&node='+encodeURIComponent(node):'');
 return <section className="scan-family-results" aria-label="Part comparison">
  {comparison&&<><h2>{candidates.length?'Compare this part':'No clear match'}</h2>
   <p role="status">{comparison.reason}</p></>}
  {!!candidates.length&&<div className="scan-family-list">{candidates.map(candidate=>{
   const f=componentFamilies.find(row=>row.id===candidate.id)!;
   return <button disabled={disabled} type="button" key={f.id} aria-pressed={chosen===f.id} onClick={()=>onFamilyChange(f.id)}><PartChoiceImage family={f.id}/><span className="scan-family-choice-copy"><strong>{f.name}</strong><small>Compare with the catalog</small></span><span className="scan-family-choice-action">Review ↗</span></button>;
  })}</div>}
  {(!chosen||driveshaftChoice)&&<details>
   <summary>Compare driveshaft parts</summary>
   <p className="small">For a center support photo, use a plain light background and keep both mounting slots and the bearing opening in view.</p>
   <div className="scan-family-list">{driveshaftChoices.map((choice,index)=><button type="button" key={choice.id} disabled={disabled} aria-pressed={chosen===choice.id} aria-label={choice.title} aria-describedby={'scan-shape-'+choice.id} onClick={()=>onFamilyChange(choice.id)}>
    {index<2?<PartChoiceImage number={bearing.numbers[index]}/>:<PartChoiceImage family={choice.id}/>}
    <span className="scan-family-choice-copy"><strong>{choice.title}</strong><small id={'scan-shape-'+choice.id}>{choice.detail}</small></span>
   </button>)}</div>
  </details>}
  {family&&<article className="scan-family-review">
   <h3>{family.name}</h3>
   {family.id==='center-support-bearing'?<>
    <p>The <strong>{bearing.label}</strong> catalog lists the complete mount and the bearing insert separately. Check the bracket, rubber cushion and bearing size against the diagram.</p>
    <DocumentLink target="_blank" rel="noopener" href={series==='e30'?journeyHref(centerGuide,navigation):workshop(centerGuide)}>Open guided bearing inspection and service preparation ↗</DocumentLink>
    <DocumentLink target="_blank" rel="noopener" href={bearing.source}>Open the {bearing.label} catalog drawing ↗</DocumentLink>
   </>:family.id==='ball-bearing'?<p>Compare the bore and outside diameter. Bearings of the same size can have different seals and uses.</p>:family.id==='flex-disc'?<p>Compare the bolt-hole spacing, thickness and flange shape with the catalog.</p>:<p>Compare mounting points, connectors and any measurable dimensions with the catalog.</p>}
   <FamilyPartComparison family={family.id} series={series} vehicle={vehicle} disabled={disabled} onCatalogNumber={onCatalogNumber}/>
   <div className="scan-next">
    {family.search&&<DocumentLink target="_blank" rel="noopener" href={journeyHref('/parts/catalog?q='+encodeURIComponent(family.search),navigation)}>Compare OEM records ↗</DocumentLink>}
    {family.system&&<DocumentLink target="_blank" rel="noopener" href={workshop(systemLink)}>{family.id==='center-support-bearing'?'See the center support in the car ↗':driveshaftChoice?'See this part in the car ↗':'Explore this system in the car ↗'}</DocumentLink>}
    {series==='e34'&&family.guide&&<DocumentLink target="_blank" rel="noopener" href={journeyHref('/manual/'+family.guide+'?pdf=267',navigation)}>Driveshaft service manual · 260-7–260-8 ↗</DocumentLink>}
    <DocumentLink target="_blank" rel="noopener" href={journeyHref('/community/new?title='+encodeURIComponent('Help identifying '+family.name.toLowerCase())+(series==='e30'?'&series=e30':''),navigation)}>Ask the community to help identify it ↗</DocumentLink>
   </div>
  </article>}
  {comparison?.nextView&&!chosen&&<details className="scan-next-view"><summary>Add a clearer angle</summary><p>{comparison.nextView}</p><button className="button outline" disabled={disabled} onClick={onAddView}>Review photos</button></details>}
 </section>;
}
