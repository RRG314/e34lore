'use client';

import { ArrowUpRight } from 'lucide-react';
import { DocumentLink } from '../components/DocumentLink';
import { formatPartNumber } from '../domain/fitment';
import { journeyHref, type Journey } from '../domain/repair-journey';
import { previewFeatures } from '../release/features';
import { seriesDefinitions } from '../series/registry';
import { componentHref, componentGuideHref, componentRepairHref, componentWorkshopHref, type ComponentContext } from './context';
import { repairModelNode, type RepairSource, type RepairSpecs } from './repair-specs';

export function RepairSpecCard({job, compact=false, entry, component={}, navigation={}}: {
  job: RepairSpecs;
  compact?: boolean;
  entry: 'workshop'|'catalog'|'guide'|'topic';
  component?: Partial<ComponentContext>;
  navigation?: Journey;
}) {
  const href = (path:string) => path.startsWith('/') ? journeyHref(path,navigation) : path;
  const linkTo = (source:RepairSource) => <DocumentLink series={job.series} href={href(source.href)}>{source.label}</DocumentLink>;
  const nodeId = repairModelNode(job,component);
  const selectedComponent = nodeId === component.nodeId ? component : {
    ...component, nodeId, referenceId:nodeId ? seriesDefinitions[job.series].reference : undefined, modelRevision:undefined,
  };
  const guide = job.guide && entry !== 'guide' && componentGuideHref(job.guide,selectedComponent,navigation);
  const interactive = previewFeatures.interactiveRepairs && entry !== 'guide' && job.id === 'm50-water-pump-job-planning';
  const topic = job.topic && entry !== 'topic' && componentRepairHref(job.topic,selectedComponent,navigation);
  const workshop = entry !== 'workshop' && selectedComponent.nodeId && componentWorkshopHref(selectedComponent,navigation);
  const hasDetail = Boolean(job.tools?.length || job.specs?.length || job.parts?.length || job.catalog || job.compare?.length);
  const detail = <>
    {job.tools?.length ? <><h4>Tools</h4><ul>{job.tools.map(tool=><li key={tool}>{tool}</li>)}</ul></> : null}
    {job.specs?.length ? <><h4>Tightening &amp; service specifications</h4>
      <dl>{job.specs.map(spec => <div key={spec.item}><dt>{spec.item}</dt><dd><strong>{spec.value}</strong>
        {spec.condition && <span>{spec.condition}</span>}
        {spec.source && <small>{linkTo(spec.source)}</small>}
      </dd></div>)}</dl></> : null}
    {job.parts?.length ? <><h4>BMW catalog parts</h4><ul>{job.parts.map(part=>
      <li key={part.number}><DocumentLink series={job.series} href={componentHref({
        partId:'bmw-'+part.number,catalogContextId:component.catalogContextId,
        referenceId:component.referenceId,modelRevision:component.modelRevision,
        ...(component.partId==='bmw-'+part.number ? component :
          (component.nodeId && job.nodes?.test(component.nodeId) && repairModelNode(job,{partId:'bmw-'+part.number})===component.nodeId ? {nodeId:component.nodeId} : {})),
      },navigation)}>{part.name} · {formatPartNumber(part.number)}</DocumentLink>
        {part.condition && <small>{part.condition}</small>}</li>,
    )}</ul></> : null}
    {job.catalog && <p>{linkTo(job.catalog)}</p>}
    {job.compare?.length ? <ul>{job.compare.map(source => <li key={source.label}>{linkTo(source)}</li>)}</ul> : null}
  </>;
  return <article className="repair-spec-card" aria-label={job.title+(hasDetail ? ' service specifications' : ' manual reference')}>
    {compact ? <h4>{job.title}</h4> : <h3>{job.title}</h3>}
    <p>{job.scope}</p>
    {job.note && <p className="repair-spec-note">{job.note}</p>}
    <nav className="repair-spec-links" aria-label={job.title+' references'}>
      {guide && <DocumentLink series={job.series} href={guide}>{job.guide==='front-strut-component-identification' ? 'Identify the strut assembly' : 'Open guide'} <ArrowUpRight size={14}/></DocumentLink>}
      {topic && <DocumentLink series={job.series} href={topic}>Open repair job <ArrowUpRight size={14}/></DocumentLink>}
      <DocumentLink series={job.series} href={href(job.manual.href)}>{job.manual.label} <ArrowUpRight size={14}/></DocumentLink>
      {interactive && <DocumentLink href={href('/workshop/repair')}>Open interactive repair <ArrowUpRight size={14}/></DocumentLink>}
      {workshop && <DocumentLink series={job.series} href={workshop}>View in Workshop <ArrowUpRight size={14}/></DocumentLink>}
    </nav>
    {hasDetail && (compact ? <details><summary>Tools, parts &amp; specifications</summary>{detail}</details> : detail)}
  </article>;
}
