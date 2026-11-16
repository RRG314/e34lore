'use client';

import {useState} from 'react';
import {ArrowUpRight,BookOpen,Search,Zap} from 'lucide-react';
import {wiringArchive,wiringCircuits,wiringEditions} from '../data/wiring';
import {wiringReferences,wiringWorkshopHref} from '../data/wiring-routes';
import {DocumentLink} from './DocumentLink';
import {useApp} from './context';
import {Empty,PageIntro} from './common';

export function ElectricalReference({initialQuery=''}:{initialQuery?:string}) {
  const {series}=useApp();
  const [tab,setTab]=useState<'circuits'|'manuals'>('circuits');
  const [query,setQuery]=useState(initialQuery.slice(0,140));
  const [year,setYear]=useState('');
  const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches=(value:string)=>words.every(word=>value.toLowerCase().includes(word));
  const diagrams=wiringCircuits[series].filter(row=>matches([row.title,row.keywords,row.edition,row.section].join(' ')));
  const groups=[...new Set(diagrams.map(row=>row.group))];
  const editions=wiringEditions[series].filter(row=>(!year||String(row.year)===year)&&matches(row.label+' '+row.scope));
  const fuse=query.match(/^\s*(?:fuse|f)\s*(\d{1,2})\s*$/i)?.[1];
  return <div className="page wiring-page">
    <PageIntro eyebrow={'BMW '+series.toUpperCase()} title="Wiring & Electrical" share={false}
      description="Factory circuit diagrams, connector views and electrical manuals by model year."/>
    <nav className="qr-switches" aria-label="Electrical reference sections">
      <button type="button" aria-pressed={tab==='circuits'} onClick={()=>{if(tab!=='circuits'){setTab('circuits');setQuery('');}}}>Circuit diagrams</button>
      <button type="button" aria-pressed={tab==='manuals'} onClick={()=>{if(tab!=='manuals'){setTab('manuals');setQuery('');}}}>Wiring manuals by year</button>
    </nav>
    <div className="filter-bar">
      <label className="input-icon"><Search size={17}/><input type="search" aria-label={tab==='circuits'?'Search wiring diagrams':'Search wiring manuals'}
        value={query} maxLength={140} onChange={event=>setQuery(event.target.value)}
        placeholder={tab==='circuits'?'Wipers, starter, ABS, connector…':'Model, body or year'}/></label>
      {tab==='manuals'&&<select aria-label="Wiring manual model year" value={year} onChange={event=>setYear(event.target.value)}>
        <option value="">All model years</option>
        {[...new Set(wiringEditions[series].map(row=>row.year))].sort().map(year=><option key={year} value={year}>{year}</option>)}
      </select>}
    </div>
    <div className="wiring-links">
      <DocumentLink className="text-link" href={wiringWorkshopHref(series)}>3D harnesses · {wiringReferences[series].name} <ArrowUpRight size={15}/></DocumentLink>
      <DocumentLink className="text-link" href={'/quick-reference/fuses'+(fuse?'?fuse='+fuse:'')}><Zap size={16}/>Fuse box layouts</DocumentLink>
      <DocumentLink className="text-link" href="/diagnostics?symptom=no-start">Starting and charging troubleshooting <ArrowUpRight size={15}/></DocumentLink>
    </div>
    {tab==='circuits' ? <>
      <p className="small muted">Check the source model and production date against your car. For other versions, choose the wiring manual by year.</p>
      {groups.map(group=><section className="wiring-group" aria-label={group} key={group}>
        <h2>{group}</h2>
        <div className="chapter-list">
          {diagrams.filter(row=>row.group===group).map(row=><DocumentLink href={row.href} target={row.href.startsWith('https:')?'_blank':undefined} rel="noopener noreferrer" key={row.href}>
            <span className="chapter-code"><BookOpen size={18}/></span>
            <div><h3>{row.title}</h3><p>{row.edition} · {row.section} · PDF {row.page}</p></div>
            <ArrowUpRight size={16}/>
          </DocumentLink>)}
        </div>
      </section>)}
      {!groups.length&&<Empty title="No indexed circuit matches">Try a component name or open the complete manual for your model year.</Empty>}
    </> : <>
      <div className="chapter-list">
        {editions.map(row=><a href={row.href} key={row.href} target="_blank" rel="noopener noreferrer">
          <span className="chapter-code">{row.year}</span>
          <div><h3>BMW {row.label}</h3><p>{row.scope}</p></div>
          <ArrowUpRight size={16}/>
        </a>)}
      </div>
      {!editions.length&&<Empty title="No matching manual">Choose another year or clear the search.</Empty>}
      <a className="text-link" href={wiringArchive(series)} target="_blank" rel="noopener noreferrer">Open the wiring manual archive <ArrowUpRight size={16}/></a>
    </>}
  </div>;
}
