"use client";

import { useState } from "react";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import { DocumentLink } from "./DocumentLink";
import { Empty, PageIntro } from "./common";

export type ServiceSource = {
  id: string;
  title: string;
  url: string;
  scope: string;
  systems: string[];
  references?: { title: string; section: string; href?: string }[];
};

export function matchServiceSources(sources:ServiceSource[],term:string) {
  return sources.flatMap(source => {
    if (!term) return [source];
    const references = source.references?.filter(row => (row.title + " " + row.section).toLowerCase().includes(term));
    if (references?.length) return [{...source,references}];
    return [source.title, source.scope, ...source.systems].join(" ").toLowerCase().includes(term) ? [source] : [];
  });
}
export function ServiceSourceCards({sources}:{sources:ServiceSource[]}) {
  return <div id="evidence" className="article-rows">
    {sources.map(source => <article className="source-box" key={source.id}>
      <BookOpen size={22}/><div>
        <h2>{source.title}</h2><p>{source.scope}</p>
        {source.references && <dl>{source.references.map(row => <div key={row.title}><dt>{row.href ? <DocumentLink href={row.href}>{row.title} <ArrowUpRight size={13}/></DocumentLink> : row.title}</dt><dd>{row.section}</dd></div>)}</dl>}
        <DocumentLink className="button outline" href={source.url} target="_blank" rel="noopener noreferrer">Open original source <ArrowUpRight size={16}/></DocumentLink>
      </div>
    </article>)}
  </div>;
}

export function ServiceSourceIndex({ title, description, sources, initialQuery = "" }: {
  title: string;
  description: string;
  sources: ServiceSource[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const matches = matchServiceSources(sources,query.trim().toLowerCase());
  return <div className="page manual-index-page">
    <PageIntro eyebrow="SERVICE LITERATURE" title={title} description={description}>
      <DocumentLink className="button outline" href="/repairs">Repair walkthroughs <ArrowUpRight size={16}/></DocumentLink>
    </PageIntro>
    <label className="input-icon"><Search size={17}/><input type="search" aria-label="Search service literature" placeholder="Manual, system or section" value={query} onChange={event => setQuery(event.target.value)}/></label>
    <ServiceSourceCards sources={matches}/>
    {!matches.length && <Empty title="No matching sources">Try a system or manual title.</Empty>}
  </div>;
}
