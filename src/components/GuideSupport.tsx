'use client';
import type {ManualGuide} from '../data/manual';
import {guideKindLabels,guideSourcePages,guideVisualType} from '../domain/guide-support';
import {DocumentLink} from './DocumentLink';
import {RepairSpecCard} from '../servicing/RepairSpecCard';
import {specsForGuide,specsForSelection} from '../servicing/repair-specs';
import type {ComponentContext} from '../servicing/context';
import type {Journey} from '../domain/repair-journey';
import type {Series} from '../series/registry';
export function GuideSupport({guide,series,archived=false,component,navigation,specsShown=false}:{
 guide:ManualGuide; series:Series; archived?:boolean; component?:Partial<ComponentContext>; navigation?:Journey; specsShown?:boolean;
}){
 const pages=guideSourcePages(guide),visual=guideVisualType(guide.slug);
 const jobs=archived||specsShown ? [] : specsForSelection(specsForGuide(series,guide.slug),series,component);
 return <>{jobs.map(job=><RepairSpecCard key={job.id} job={job} entry="guide" component={component} navigation={navigation}/>)}
 <section className="guide-job-brief" aria-label="Job scope and references">
  <div><span className="eyebrow">{guideKindLabels[guide.kind]}</span><h2>Before you start</h2>
   <p>{guide.applicability}</p>
   <dl><dt>{guide.kind==='planning'?'Planning time':'Estimated time'}</dt><dd>{guide.duration}<small>{guide.durationBasis}</small></dd><dt>Review</dt><dd>{guide.sourceChecked?'Source-based draft · technical review pending':'Source checking incomplete'}</dd></dl>
   {guide.kind==='planning'&&<p className="guide-coverage-note">This is a planning checklist. Complete installation instructions and verified specifications for your exact setup are still required.</p>}
   {guide.kind==='inspection'&&<p className="guide-coverage-note">This inspection helps decide the next action. It does not include the resulting repair.</p>}
  </div>
  <div><h3>Listed tools & supplies</h3>{guide.tools.length?<ul>{guide.tools.map(tool=><li key={tool}>{tool}</li>)}</ul>:<p>Tools are not indexed. Check the cited procedure before starting.</p>}
   <p className="small muted">Check sizes and special fixtures for the installed hardware.</p>
   {guide.jobSupport&&<><h3>Required parts</h3><ul>{guide.jobSupport.requiredParts.map(part=><li key={part}>{part}</li>)}</ul><details><summary>Parts to inspect or match separately</summary><ul>{guide.jobSupport.conditionalParts.map(part=><li key={part}>{part}</li>)}</ul></details><h3>Stop the job if</h3><ul>{guide.jobSupport.stopConditions.map(condition=><li key={condition}>{condition}</li>)}</ul></>}
   <h3>Manual references</h3><p>{guide.source.section}</p><div className="guide-page-links">{pages.map(page=>page.href?<DocumentLink key={page.pdf} href={page.href}>{page.printed}<small>PDF {page.pdf}</small></DocumentLink>:<span key={page.pdf}>PDF {page.pdf} · locator unavailable</span>)}</div>
   {!!pages.length&&<p className="small muted">Use these page numbers in your copy of the manual.</p>}
   {guide.jobSupport?.additionalSources?.map(source=><p key={source.url}><DocumentLink href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</DocumentLink></p>)}
   <p className="guide-coverage-note">{visual==='none'?'Process pictures are not indexed for this guide. Use the cited manual’s figures alongside the steps.':visual==='reference-photos'?'Engine-family photos are provided for orientation. A photographed step sequence is not available.':visual==='source-linked-diagram'?'The original assembly diagram is linked below. A copy and a photographed step sequence are not displayed here.':'A bulb-orientation diagram is provided. A photographed step sequence is not available.'}</p>
  </div>
 </section></>;
}
