'use client';

import {ArrowUpRight} from 'lucide-react';
import {DocumentLink} from '../../components/DocumentLink';
import {journeyHref, type Journey} from '../../domain/repair-journey';
import {componentGuideHref, type ComponentContext} from '../../servicing/context';
import {workshopGuide, workshopManualForSystem, workshopPartService, type ServiceLink} from '../../servicing/workshop-service';
import type {Series} from '../../series/registry';
import type {CatalogBinding} from './catalog';
import {RepairSpecCard} from '../../servicing/RepairSpecCard';
import {specsForNode} from '../../servicing/repair-specs';
import type {ReferenceNode} from './model';

export function WorkshopServicePanel({series,node,binding,referenceId,navigation,component}:{
  series:Series;
  node:ReferenceNode;
  binding?:CatalogBinding;
  referenceId?:string;
  navigation:Journey;
  component:Partial<ComponentContext>;
}) {
  const service=workshopPartService(series,node,referenceId);
  const specifications=specsForNode(series,node.id);
  const guideIds=[...new Set([...(binding?.guideIds||[]),...node.guideIds])];
  const guide=guideIds.map(id=>workshopGuide(series,id)).find(Boolean);
  const reference=binding?.manual[0];
  const linkedManual=reference?{label:reference.title+' · '+reference.printed,href:reference.href}:workshopManualForSystem(series,node);
  const jobs=specifications.length
    ? (service?.jobs ?? []).filter(job=>job.title==='Check cold tire pressure')
    : service?.jobs ?? [{title:guide?.title,tools:guide?.tools,guide:guide?.slug,manual:linkedManual}];
  const href=(link:ServiceLink)=>link.href.startsWith('/')?journeyHref(link.href,navigation):link.href;
  return <>
    {!!service?.facts?.length&&<section className="workshop-part-specs" aria-label="Part specifications">
      <dl>{service.facts.map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd>
        {fact.source&&<dd><DocumentLink href={href(fact.source)}>{fact.source.label} <ArrowUpRight size={13}/></DocumentLink></dd>}</div>)}</dl>
    </section>}
    {specifications.map(job=><RepairSpecCard key={job.id} job={job} entry="workshop" compact component={component} navigation={navigation}/>)}
    {!!jobs.length && <section className="workshop-part-service" aria-label="Tools and manual">
      <h3>Tools &amp; manual</h3>
      {jobs.map(job=>{
        const tools=job.tools??(job.guide?workshopGuide(series,job.guide)?.tools:undefined);
        return <div className="workshop-part-job" key={job.title||job.manual.href}>
          {job.title&&<h4>{job.title}</h4>}
          {tools?.length?<ul>{tools.map(tool=><li key={tool}>{tool}</li>)}</ul>:<p>See the manual for tools and specifications.</p>}
          <DocumentLink className="reference-related-guide" href={href(job.manual)}>{job.manual.label}<ArrowUpRight size={14}/></DocumentLink>
          {job.guide&&<DocumentLink className="reference-related-guide" href={componentGuideHref(job.guide,component,navigation)}>Open the walkthrough<ArrowUpRight size={14}/></DocumentLink>}
        </div>;
      })}
    </section>}
    {service?.check&&<p className="workshop-part-check">{service.check}</p>}
  </>;
}
