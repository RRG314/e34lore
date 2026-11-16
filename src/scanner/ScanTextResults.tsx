'use client';
import{type PhotoText,textEvidence,photoTextEvidence}from'./text-evidence';
export function ScanTextResults({result,revision,disabled,onCheck,onCheckEnding}:{result:PhotoText;revision:number;disabled:boolean;onCheck:(number:string)=>void;onCheckEnding:(ending:string)=>void}){
 const rows=result.views.map(view=>({...view,evidence:textEvidence(view.text)}));
 const {numbers,partials}=photoTextEvidence(result.views);
 if(!rows.some(v=>v.text&&(v.confidence>=60||v.evidence.numbers.length||v.evidence.partials.length)))return <section className="scan-text-results" aria-label="Text read from photos"><details><summary>No clear text found · review the reading</summary>{result.revision!==revision&&<p>Photos changed. Read text again to include the current views.</p>}<p>Try a close, well-lit view of any marking. Identification can continue without a number.</p>{rows.map((view,index)=><div key={view.photoId}><strong>Photo {index+1}</strong><pre>{view.text||'No readable text'}</pre></div>)}</details></section>;
 return <section className="scan-text-results" aria-label="Text read from photos">
  <h3>Text found in your photos</h3>
  <p>Check the characters against the part.</p>
  {result.revision!==revision&&<p role="status">Photos changed. Read text again to include the current views.</p>}
  {rows.map((view,index)=><details key={view.photoId} open={!!view.text&&view.confidence>=60}>
   <summary>Photo {index+1} · {view.text?(view.confidence>=60?'Review text':'Unclear text · review'):'No readable text'}</summary>
   <pre>{view.text||'Try a closer, well-lit photo of any marking.'}</pre>
  </details>)}
  {numbers.map(number=><button key={number} className="button outline" disabled={disabled||result.revision!==revision} onClick={()=>onCheck(number)}>Check BMW {number}</button>)}
  {partials.length>0&&<div className="scan-actions">
   {partials.map(ending=><button type="button" className="button outline" key={ending} disabled={disabled||result.revision!==revision} onClick={()=>onCheckEnding(ending)}>Find numbers ending in {ending}</button>)}
  </div>}
  <p className="small muted">Kept with this photo set on this device. Raw text and photos are not sent to recognition services or saved to your garage.</p>
 </section>;
}
