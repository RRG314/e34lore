'use client';

import {useState} from 'react';
import {ArrowLeft,ArrowUpRight,BookOpen,Search} from 'lucide-react';
import {e30ManualGroupForPage,e30ManualGroups} from '../series/e30-factory-index';
import {e30FactoryJobs} from '../series/e30-factory-jobs';
import {e30FactoryManualArchive,e30ManualSources} from '../series/e30-manual';
import {systems} from '../data/catalog';
import {DocumentLink} from './DocumentLink';
import {matchServiceSources,ServiceSourceCards} from './ServiceSourceIndex';
import {Empty,PageIntro} from './common';

export function E30ManualLibrary({chapterId,initialQuery='',pdfPage}:{
  chapterId?:string;initialQuery?:string;pdfPage?:string;
}) {
  const [query,setQuery]=useState(initialQuery.slice(0,160));
  const [system,setSystem]=useState('');
  const group=e30ManualGroups.find(group=>group.id===chapterId);
  const term=query.trim().toLowerCase();
  const groupMatches=e30ManualGroups.filter(group=>
    (!system||group.systems.includes(system))&&(!term||(group.id+' '+group.title).toLowerCase().includes(term)));
  const jobMatches=term ? e30FactoryJobs.filter(job=>
    (!system||job.systems.includes(system))&&[job.title,job.section,...job.engines].join(' ').toLowerCase().includes(term)) : [];
  const otherSources=e30ManualSources.filter(source=>source.id!=='factory-workshop'&&
    (!system||source.systems.includes(system))&&
    (chapterId!=='EWD'||source.id.includes('electrical')));
  const sources=matchServiceSources(otherSources,term);
  if(group) {
    const selected=pdfPage&&/^\d{1,4}$/.test(pdfPage)?Number(pdfPage):null;
    const located=selected!==null&&e30ManualGroupForPage(selected)?.id===group.id;
    const jobs=e30FactoryJobs.filter(job=>e30ManualGroupForPage(job.pages[0])?.id===group.id)
      .sort((a,b)=>a.pages[0]-b.pages[0]);
    return <div className="page manual-chapter-page">
      <DocumentLink className="back-link" href="/manual"><ArrowLeft size={16}/>Manual chapters</DocumentLink>
      <PageIntro eyebrow={'BMW FACTORY REPAIR MANUAL / '+group.id} title={group.title}
        description={'Group '+group.id+' · PDF pages '+group.pdfStart+'–'+group.pdfEnd}>
        <DocumentLink className="button outline" href={e30FactoryManualArchive.download}>Open workshop archive <ArrowUpRight size={16}/></DocumentLink>
      </PageIntro>
      {pdfPage&&<div className="manual-page-locator" role="status">{located
        ? <>Open <strong>PDF page {selected}</strong> in BMW-E30-Repair-Manual.pdf.</>
        : 'Choose a PDF page in this group.'}</div>}
      <section aria-label="Factory procedures" className="chapter-list">
        {jobs.map(job=><DocumentLink href={'/repairs/'+job.id} key={job.id}>
          <span className="chapter-code"><BookOpen size={19}/></span>
          <div><h3>{job.title}</h3><p>{job.section} · PDF page {job.pages[0]}</p></div>
          <ArrowUpRight size={16}/>
        </DocumentLink>)}
      </section>
      <div className="form-actions">
        <DocumentLink className="button outline" href={'/repairs?system='+group.systems[0]}>Related repair jobs <ArrowUpRight size={16}/></DocumentLink>
        <DocumentLink className="button outline" href={'/community/new?series=e30&title='+encodeURIComponent('Question about '+group.title)}>Ask about this group <ArrowUpRight size={16}/></DocumentLink>
      </div>
    </div>;
  }
  const wiring=chapterId==='EWD';
  return <div className="page manual-index-page">
    {wiring&&<DocumentLink className="back-link" href="/manual"><ArrowLeft size={16}/>Manual chapters</DocumentLink>}
    <PageIntro eyebrow="SERVICE LITERATURE" title={wiring?'E30 wiring manuals':'E30 service manual'}
      description={wiring?'BMW electrical troubleshooting manuals and fuse diagrams.':'BMW factory repair groups, owner’s handbook and model-specific wiring manuals.'}>
      {wiring&&<DocumentLink className="button outline" href="/electrical">Browse circuit diagrams <ArrowUpRight size={16}/></DocumentLink>}
      <DocumentLink className="button outline" href={wiring?'/quick-reference/fuses':'/repairs'}>{wiring?'Fuse diagrams':'Repair walkthroughs'} <ArrowUpRight size={16}/></DocumentLink>
    </PageIntro>
    <div className="filter-bar">
      <label className="input-icon"><Search size={17}/><input type="search" aria-label="Search service literature"
        placeholder="Manual, system or section" maxLength={160} value={query} onChange={event=>setQuery(event.target.value)}/></label>
      {!wiring&&<select aria-label="Filter manual by system" value={system} onChange={event=>setSystem(event.target.value)}>
        <option value="">All systems</option>
        {systems.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}
      </select>}
    </div>
    {!wiring&&!!groupMatches.length&&<section className="chapter-list" aria-label="Factory repair groups">
      {groupMatches.map(group=><DocumentLink href={'/manual/'+group.id} key={group.id}>
        <span className="chapter-code">{group.id}</span>
        <div><h3>{group.title}</h3><p>PDF {group.pdfStart}–{group.pdfEnd}</p></div>
        <ArrowUpRight size={16}/>
      </DocumentLink>)}
    </section>}
    {!wiring&&!!jobMatches.length&&<section className="chapter-list" aria-label="Manual procedures">
      {jobMatches.slice(0,24).map(job=><DocumentLink href={'/repairs/'+job.id} key={job.id}>
        <span className="chapter-code"><BookOpen size={19}/></span>
        <div><h3>{job.title}</h3><p>{job.section} · PDF page {job.pages[0]}</p></div>
        <ArrowUpRight size={16}/>
      </DocumentLink>)}
    </section>}
    <ServiceSourceCards sources={sources}/>
    {!(sources.length||(!wiring&&(groupMatches.length||jobMatches.length)))&&<Empty title="No matching sources">Try a part name, manual group or system.</Empty>}
  </div>;
}
