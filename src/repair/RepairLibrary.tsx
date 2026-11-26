"use client";
import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, Box, Camera, Search } from 'lucide-react';
import { DocumentLink } from '../components/DocumentLink';
import { useApp } from '../components/context';
import { PageIntro, Tag, Notice, Empty } from '../components/common';
import { GuideSupport } from '../components/GuideSupport';
import { systems } from '../data/catalog';
import { manualChapters, manualSource } from '../data/manual';
import { searchRepairReferences } from '../domain/repair-search';
import { browseRepairTopics, manualTopicHref, repairTopic, repairTopicsFor, topicGuide, type RepairTopic } from './library';
import { repairSources, illustratedRepairSources } from './sources';
import { seriesDefinitions } from '../series/registry';
import { e30FactoryManualArchive } from '../series/e30-manual';
import { e30ManualGroupForPage,e30ManualGroups } from '../series/e30-factory-index';
import { RepairCommunity } from './RepairCommunity';
import { useRepairJourney } from './use-journey';
import { componentGuideHref, componentHref, componentWorkshopHref, type ComponentContext } from '../servicing/context';
import { specsForGuide, specsForTopic, specsForSelection } from '../servicing/repair-specs';
import { RepairSpecCard } from '../servicing/RepairSpecCard';
import { guidedRepairHref, guidedRepairsForTopic } from '../digital-twin/public/assembly-links';

function Coverage({ topic }: { topic: RepairTopic }) {
  const sources = repairSources(topic);
  const illustrated = sources.filter(source => source.format === 'Photo walkthrough');
  const discussions = sources.length - illustrated.length;
  const guide = topicGuide(topic);
  return <div className="inline-tags repair-coverage">
    {illustrated.length > 0 && <Tag><Camera size={12}/>{illustrated.length} linked {illustrated.length === 1 ? 'photo guide' : 'photo guides'}</Tag>}
    {discussions > 0 && <Tag>{discussions} linked {discussions === 1 ? 'discussion' : 'discussions'}</Tag>}
    {guidedRepairsForTopic(topic.id,topic.series??'e34').length>0 && <Tag><Box size={12}/>3D walkthrough</Tag>}
    {guide && <Tag>{guide.kind === 'replacement' ? 'Written steps' : guide.kind === 'inspection' ? 'Inspection notes' : 'Preparation notes'}</Tag>}
    {topic.factory && <span><BookOpen size={12}/>BMW manual {topic.factory.section}</span>}
    {topic.manual && <span><BookOpen size={12}/>Manual {topic.manual.chapter}-{topic.manual.page}</span>}
  </div>;
}
export function RepairLibrary({ initialQuery = '', initialSystem = '', track }: { initialQuery?: string; initialSystem?: string; track?: string }) {
  const { vehicle, series } = useApp();
  const [query, setQuery] = useState(initialQuery);
  const [system, setSystem] = useState(initialSystem);
  const [engine, setEngine] = useState('');
  const [coverage, setCoverage] = useState('');
  const [view, setView] = useState(track === 'swap' || track === 'mod' ? 'planning' : 'repairs');
  const [planTrack, setPlanTrack] = useState(track === 'swap' || track === 'mod' ? track : '');
  const [page, setPage] = useState(1);
  const matches = browseRepairTopics({ query, system, engine, planning: view === 'planning', track: planTrack, series }).filter(topic =>
    !coverage || (coverage === '3d' ? guidedRepairsForTopic(topic.id,series).length > 0 :
      coverage === 'photos' ? illustratedRepairSources(topic).length > 0 : topicGuide(topic)?.kind === 'replacement'),
  ).sort((a, b) => query.trim() ? 0 : Number(illustratedRepairSources(b).length > 0) - Number(illustratedRepairSources(a).length > 0));
  const shown = matches.slice(0, page * 24);
  const diagnostic = series === 'e34' && query.trim() ? searchRepairReferences(query, engine, system).find(r => r.kind === 'Diagnostic') : null;
  const sourced = repairTopicsFor(series).filter(t => illustratedRepairSources(t).length > 0).length;
  return <div className="page repair-library">
    <PageIntro eyebrow={"KEEP YOUR " + series.toUpperCase() + " ON THE ROAD"} title="Repair walkthroughs."
      description="Find the job you need. Compare illustrated DIY guides, the service manual and fixes shared by other owners.">
      <DocumentLink className="button primary" href="/workshop?mode=repair">Guided 3D repairs <ArrowUpRight size={17}/></DocumentLink>
      <DocumentLink className="button outline" href="/repairs#repair-jobs">Find a repair guide <Search size={17}/></DocumentLink>
      <DocumentLink className="button outline" href="/diagnostics">Diagnose a symptom <ArrowUpRight size={17}/></DocumentLink>
    </PageIntro>
    <p className="repair-library-summary">{browseRepairTopics({series}).length} repair & service topics · {sourced} topics with linked photo guides · {(series==='e30'?e30ManualGroups:manualChapters).length} manual chapters</p>
    <div className="repair-library-note"><BookOpen size={23}/><p>Every job has a place for owner walkthroughs, comments and questions. A <strong>manual reference</strong> locates a procedure in your copy; <strong>linked DIY guides</strong> open the original write-up and pictures. Tools and time appear where the source provides them.</p></div>
    <nav className="qr-nav" aria-label="Repair library sections">
      <button className={view === 'repairs' ? 'selected' : ''} aria-pressed={view === 'repairs'} onClick={() => { setView('repairs'); setPage(1); }}>Repairs & maintenance</button>
      <button className={view === 'planning' ? 'selected' : ''} aria-pressed={view === 'planning'} onClick={() => { setView('planning'); setPlanTrack(''); setPage(1); }}>Conversions & preparation</button>
      <DocumentLink href="/manual">Full manual index ↗</DocumentLink>
    </nav>
    <section id="repair-jobs" aria-label="Find a repair">
      <form className="filter-bar repair-job-filters" onSubmit={event => { event.preventDefault(); setPage(1); }}>
        <div className="input-icon"><Search size={17}/><input aria-label="Search repair jobs" placeholder="Water pump, brake pads, window regulator…" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/></div>
        <select aria-label="Filter repairs by system" value={system} onChange={event => { setSystem(event.target.value); setPage(1); }}><option value="">All systems</option>{systems.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select>
        <select aria-label="Filter repairs by engine" value={engine} onChange={event => { setEngine(event.target.value); setPage(1); }}><option value="">All engines</option>{[...new Set(seriesDefinitions[series].models.flatMap(model => [...model.engines]))].sort().map(code => <option key={code}>{code}</option>)}</select>
        <select aria-label="Filter repairs by available material" value={coverage} onChange={event => { setCoverage(event.target.value); setPage(1); }}><option value="">All available material</option><option value="photos">Linked DIY guides & photos</option><option value="steps">Written replacement steps</option><option value="3d">3D walkthroughs</option></select>
        {view === 'planning' && <select aria-label="Filter preparation topics" value={planTrack} onChange={event => { setPlanTrack(event.target.value); setPage(1); }}><option value="">All preparation topics</option><option value="swap">Engine & gearbox swaps</option><option value="mod">Modifications</option></select>}
      </form>
      <div className="section-heading"><h2>{view === 'planning' ? 'Conversions & preparation' : system ? systems.find(s => s.id === system)?.name + ' jobs' : 'Browse repair jobs'}</h2><span role="status">{matches.length} topics</span></div>
      {vehicle.model && <p className="small muted">Selected car: {[vehicle.model, vehicle.engine, vehicle.transmission].filter(Boolean).join(' / ')}. Job pages show source coverage; match the installed equipment before using a procedure.</p>}
      {engine && <p className="small muted">Includes {engine} and jobs without an engine-specific title. A shared title alone does not confirm applicability.</p>}
      {view === 'planning' && <p className="muted">Conversion plans and identification notes are kept here. Each identifies the full instructions and specifications still needed.</p>}
      {diagnostic && <Notice><DocumentLink href={diagnostic.href}>Start with diagnosis: {diagnostic.title} ↗</DocumentLink></Notice>}
      <div className="repair-job-grid">{shown.map(topic => <article className="repair-job-card" key={topic.id}>
        <div className="small muted">{topic.systems.length === systems.length ? 'General service' : topic.systems.map(id => systems.find(s => s.id === id)?.name).filter(Boolean).join(' / ')}</div>
        <h3><DocumentLink href={'/repairs/' + topic.id}>{topic.title}<ArrowUpRight size={17}/></DocumentLink></h3>
        <Coverage topic={topic}/>
        <p>{topic.engines.length ? topic.engines.join(' / ') : 'Check model, equipment and source coverage'}</p>
        <DocumentLink className="text-link" href={'/repairs/' + topic.id}>Open job, sources & owner fixes <ArrowUpRight size={14}/></DocumentLink>
      </article>)}</div>
      {!matches.length && <Empty title="No matching repair jobs">Try a part name or clear the filters. <button className="text-link" onClick={() => { setQuery(''); setSystem(''); setEngine(''); setCoverage(''); setPage(1); }}>Clear filters</button><DocumentLink className="button outline" href="/community/new?template=repair">Share a repair that is missing ↗</DocumentLink></Empty>}
      {shown.length < matches.length && <div className="form-actions"><span className="small muted">Showing {shown.length} of {matches.length}</span><button className="button outline" onClick={() => setPage(n => n + 1)}>Show more repair jobs</button></div>}
    </section>
  </div>;
}

export function RepairJobPage({ id, component={}, initialScan }: { id: string; component?:Partial<ComponentContext>; initialScan?:string }) {
  const { vehicle, series } = useApp();
  const journey=useRepairJourney(initialScan);
  const navigation={vehicle:journey.activeId,scan:journey.scanId};
  const topic = repairTopic(id, series);
  if (!topic) return <div className="page"><Empty title="Repair job not found"><DocumentLink href="/repairs">Browse repair jobs ↗</DocumentLink></Empty></div>;
  const guide = topicGuide(topic), sources = repairSources(topic, vehicle);
  const guided = guidedRepairsForTopic(topic.id,series);
  const relatedSpecs = [...new Map([...specsForTopic(series,id),...(guide ? specsForGuide(series,guide.slug) : [])].map(job=>[job.id,job])).values()];
  const specs = specsForSelection(relatedSpecs,series,component);
  const chapter = manualChapters.find(c => c.id === topic.manual?.chapter);
  const factoryGroup=topic.factory&&e30ManualGroupForPage(topic.factory.pages[0]);
  const related = repairTopicsFor(series).filter(t => t.id !== topic.id && (factoryGroup
    ? t.factory&&e30ManualGroupForPage(t.factory.pages[0])?.id===factoryGroup.id
    : topic.manual&&t.manual?.chapter===topic.manual.chapter)).slice(0, 8);
  return <div className="page repair-job-page">
    <DocumentLink className="back-link" href="/repairs"><ArrowLeft size={16}/>All repair jobs</DocumentLink>
    <PageIntro eyebrow={series.toUpperCase() + " REPAIR LIBRARY"} title={topic.title}>
      {!journey.scanLoading && guided.map(({job,revision})=><DocumentLink key={job.id} className="button primary"
        href={guidedRepairHref(job,revision,navigation,component)}><Box size={16}/>{guided.length===1?'Open 3D walkthrough':job.title+' in 3D'}</DocumentLink>)}
      <DocumentLink className={'button '+(guided.length?'outline':'primary')} href="#job-procedures">Procedures & sources <ArrowUpRight size={16}/></DocumentLink>
      <DocumentLink className="button outline" href="#owner-experience">Repair discussion</DocumentLink>
    </PageIntro>
    {journey.scanLoading && <p role="status">Loading your saved identification…</p>}
    {!journey.scanLoading && (component.nodeId || component.partId) && <nav className="inline-tags" aria-label="Selected component">
      {component.nodeId && <DocumentLink className="button outline" href={componentWorkshopHref(component,navigation)}>Back to part in Workshop</DocumentLink>}
      {component.partId && <DocumentLink className="button outline" href={componentHref({...component,partId:component.partId},navigation)}>{component.positionId ? 'Back to catalog position' : 'Back to part in catalog'}</DocumentLink>}
    </nav>}
    <Coverage topic={topic}/>
    <section id="job-procedures" className="repair-procedures" aria-label="Procedures and sources">
      <h2>Procedures & illustrated guides</h2>
      {specs.map(job=><RepairSpecCard key={job.id} job={job} entry="topic" component={component} navigation={navigation}/>)}
      {topic.manual && <article className="repair-manual-card"><BookOpen size={25}/><div><span className="eyebrow">SERVICE MANUAL REFERENCE</span><h3>{manualSource.publisher} · {chapter?.title}</h3><p>Printed <strong>{topic.manual.chapter}-{topic.manual.page}</strong> · PDF <strong>{topic.manual.pdfPage}</strong> · section start for {topic.title.toLowerCase()}.</p><p className="small muted">Use the complete procedure, figures, tools and specifications in your copy. {manualSource.coverage.map(c => c.model).join(', ')} U.S. source coverage; confirm production date, engine and equipment. The private scan is not displayed here.</p><DocumentLink className="button outline" href={manualTopicHref(topic)}>Open this manual reference <ArrowUpRight size={15}/></DocumentLink></div></article>}
      {topic.factory ? <article className="repair-manual-card">
        <BookOpen size={25}/><div><h3>BMW E30 factory repair manual</h3>
          <p>{topic.factory.section} · {topic.factory.pages.length === 1 ? "PDF page " + topic.factory.pages[0] : "PDF pages " + topic.factory.pages[0] + "–" + topic.factory.pages.at(-1)}</p>
          <p className="small">Open BMW-E30-Repair-Manual.pdf in the workshop archive to see the factory illustrations, tools and full procedure.</p>
          <div className="form-actions">
            {factoryGroup&&<DocumentLink className="button outline" href={'/manual/'+factoryGroup.id+'?pdf='+topic.factory.pages[0]}>Open manual group <ArrowUpRight size={15}/></DocumentLink>}
            <DocumentLink className="button outline" href={e30FactoryManualArchive.download}>Open workshop archive source <ArrowUpRight size={15}/></DocumentLink>
          </div>
        </div>
      </article> : series === "e30" && !specs.length && <DocumentLink className="button outline" href="/manual">Open E30 service manual sources <ArrowUpRight size={15}/></DocumentLink>}
      {guide && <article className="repair-written-card"><div><Tag>{guide.kind === 'replacement' ? 'Written repair steps' : guide.kind === 'inspection' ? 'Inspection before repair' : 'Preparation for this job'}</Tag><h3>{guide.title}</h3><p>{guide.summary}</p><DocumentLink className="button primary" href={componentGuideHref(guide.slug,component,navigation)}>{guide.kind === 'replacement' ? 'Read the written walkthrough' : 'Read the notes'} <ArrowUpRight size={16}/></DocumentLink></div></article>}
      {sources.length > 0 ? <div className="repair-source-grid">{sources.map(source => <article className="repair-source-card" key={source.url}>
        <span className="eyebrow">{source.format || 'Owner discussion'} · {source.platform}</span>
        <h3><DocumentLink href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={17}/></DocumentLink></h3>
        {source.credit && <p className="small muted">{source.credit}</p>}
        <p>{source.reason}</p>
        {source.applicability && <p className="repair-source-scope"><strong>Source coverage:</strong> {source.applicability}</p>}
        {source.applicabilityMatch === 'different' && <p className="repair-coverage-note">Different engine or model from your selected car. Use the source for comparison only.</p>}
        {source.tools?.length ? <p className="small"><strong>Source tool list:</strong> {source.tools.join(' · ')}. Check the full list in the guide.</p> : <p className="small muted">Tools: consult the original guide and manual.</p>}
        <p className="small muted">Time: {source.time || 'No reliable estimate indexed; check the original guide.'}</p>
        <DocumentLink className="button outline" href={source.url} target="_blank" rel="noopener noreferrer">{source.format === 'Photo walkthrough' ? 'Open original guide & pictures' : 'Open original discussion'} <ArrowUpRight size={15}/></DocumentLink>
        <p className="small muted">{source.verification || 'Link recorded'} · {source.reviewed_at}{source.availability === 'unknown' ? ' · Host access or older images may be unavailable.' : ''}</p>
      </article>)}</div> : !guided.length && <p className="repair-material-gap">An illustrated DIY guide hasn’t been linked to this job yet. Use the manual reference{guide ? ' and the written notes' : ''}, or share an original walkthrough below.</p>}
      {sources.length > 0 && <p className="small muted">Original text and photographs stay with their creators. Older guides can contain model-specific details or shortcuts; use the applicable manual for safety, tightening specifications and final checks.</p>}
      {!guide && !specs.length && !guided.length && <p className="small muted">Tools, job time and process pictures are supplied by the full sources above where available. They have not been independently indexed for this manual topic.</p>}
    </section>
    {guide && <GuideSupport guide={guide} series={series} specsShown={!!specs.length}/>}
    <RepairCommunity topic={topic}/>
    {related.length > 0 && <section className="repair-related"><h2>Related jobs in this chapter</h2><div className="related-links">{related.map(t => <DocumentLink key={t.id} href={'/repairs/' + t.id}>{t.title}<ArrowUpRight size={15}/></DocumentLink>)}</div></section>}
  </div>;
}
