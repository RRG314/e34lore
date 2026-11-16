import { e30Guides, e30RepairJobs } from '../series/e30-repairs';
import { e30FactoryJobs, type FactoryJob } from '../series/e30-factory-jobs';
import type { Series } from '../series/registry';
import { manualChapters, manualGuides } from '../data/manual';
import { manualJobs } from '../data/manual-jobs';
import { chapterSystems } from '../data/manual-navigation';
import { searchRepairReferences } from '../domain/repair-search';

export type RepairTopic = {
  id: string;
  title: string;
  systems: string[];
  engines: string[];
  guide?: string;
  series?: Series;
  factory?: FactoryJob;
  manual?: { chapter: string; page: number; pdfPage: number; anchor: string };
};

function namedEngines(title: string): string[] {
  return [...new Set(title.match(/\b(?:M20|M30|M50TU|M50|M60)\b/g) || [])];
}
const manualTopics: RepairTopic[] = manualChapters.flatMap(chapter => manualJobs(chapter.id).map(job => ({
  id: chapter.id + '-' + job.anchor,
  title: job.title,
  systems: chapterSystems(chapter.id),
  engines: namedEngines(job.title),
  guide: job.guide,
  manual: { chapter: chapter.id, page: job.page, pdfPage: chapter.pdfStart + job.page - 1, anchor: job.anchor },
})));
const nativeTopics: RepairTopic[] = manualGuides.map(g => ({
  id: g.slug, title: g.title, systems: [g.system], engines: g.engines, guide: g.slug,
}));
/** All contents locators remain addressable; a source locator is never counted as a complete authored procedure. */
export const repairTopics = [...manualTopics, ...nativeTopics.filter(g => !manualTopics.some(t => t.guide === g.guide))];
const e30Jobs = new Map(e30RepairJobs.map(job => [job.id, {
  ...job, systems: [...job.systems] as string[], engines: [...job.engines] as string[],
}] as [string, {id:string;title:string;systems:string[];engines:string[]}]));
for (const job of e30FactoryJobs) if (!e30Jobs.has(job.id)) e30Jobs.set(job.id, job);
for (const guide of e30Guides) {
  if (guide.slug === 'e30-cold-cooling-inspection' || e30Jobs.has(guide.slug)) continue;
  e30Jobs.set(guide.slug, {id:guide.slug,title:guide.title,systems:[guide.system],engines:guide.engines});
}
const e30Topics: RepairTopic[] = [...e30Jobs.values()].map(job => ({
  ...job, series: 'e30', factory: e30FactoryJobs.find(source => source.id === job.id),
  guide: job.id === 'e30-cooling-system' ? 'e30-cold-cooling-inspection' : e30Guides.find(guide => guide.slug === job.id)?.slug,
}));
export const repairTopicsFor = (series: Series) => series === 'e30' ? e30Topics : repairTopics;
export function repairTopic(id: string | null | undefined, series?: Series) {
  const match = [...repairTopics, ...nativeTopics, ...e30Topics].find(t => t.id === id);
  return !series || (match?.series ?? 'e34') === series ? match : undefined;
}
export function topicForGuide(id: string) {
  return manualTopics.find(t => t.guide === id) || nativeTopics.find(t => t.guide === id) || e30Topics.find(t => t.guide === id);
}
export function topicGuide(topic: RepairTopic) { return (topic.series === 'e30' ? e30Guides : manualGuides).find(g => g.slug === topic.guide); }
export function manualTopicHref(topic: RepairTopic) {
  return topic.manual ? `/manual/${topic.manual.chapter}?pdf=${topic.manual.pdfPage}#${topic.manual.anchor}` : '';
}
export function browseRepairTopics({ query = '', system = '', engine = '', planning = false, track = '', series = 'e34' as Series } = {}) {
  const term = query.trim().toLowerCase();
  const matches = term && series === 'e34' ? searchRepairReferences(query, engine, system) : null;
  return repairTopicsFor(series).filter(topic => {
    if (series === 'e30' && term && ![topic.title, ...topic.engines, ...topic.systems].join(' ').toLowerCase().includes(term)) return false;
    const guide = topicGuide(topic);
    // Keep standalone swap/modification plans out of the repair-job list.
    if (planning !== (!topic.manual && !topic.factory && !!guide && ['planning', 'reference'].includes(guide.kind))) return false;
    if (planning && track && guide?.track !== track) return false;
    if (system && !topic.systems.includes(system)) return false;
    if (engine && topic.engines.length && !topic.engines.includes(engine)) return false;
    return !matches || matches.some(m => (m.kind === 'Manual job' && m.id === topic.id) || (m.kind === 'Guide' && m.id === topic.guide) || (m.kind === 'Source' && m.id === query.trim() && topic.manual?.chapter === m.id));
  }).sort((a, b) => {
    if (matches) {
      const rank = (t: RepairTopic) => matches.findIndex(m => m.id === t.id || m.id === t.guide);
      return rank(a) - rank(b);
    }
    return a.title.localeCompare(b.title, 'en', { numeric: true });
  });
}
