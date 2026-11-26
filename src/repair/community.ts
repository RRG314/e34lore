import { repairTopic, type RepairTopic } from './library';
import { templateBody } from '../community/content';
import { seriesHref } from '../series/registry';

const markerQuestion = 'E34 Lore repair topic';
export type RepairIntent = 'repair-comment' | 'repair-writeup';
export function repairMarker(topic: RepairTopic) { return { question: markerQuestion, answer: topic.id }; }
// PostgREST's array overload means a PostgreSQL array. JSONB containment needs JSON text.
export function repairObservationFilter(topic: RepairTopic) { return JSON.stringify([repairMarker(topic)]); }
export function repairFromObservations(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap(row => row && typeof row === 'object' && row.question === markerQuestion && typeof row.answer === 'string' ? [repairTopic(row.answer)] : []).find(Boolean);
}
export function repairComposeContext(params: URLSearchParams) {
  const topic = repairTopic(params.get('repair'));
  const intent = params.get('intent');
  return topic && (intent === 'repair-comment' || intent === 'repair-writeup') ? { topic, intent: intent as RepairIntent } : null;
}
export function repairDraftKey(topic: RepairTopic, intent: RepairIntent) { return `e34.repair.draft.v1.${topic.id}.${intent}`; }
export function repairContributionHref(topic: RepairTopic, intent: RepairIntent) {
  return '/community/new?' + new URLSearchParams({ repair: topic.id, intent, ...(topic.series ? {series: topic.series} : {}) });
}
export function repairOwnerPostsHref(topic: RepairTopic) {
  return seriesHref('/repairs/'+topic.id+'#owner-experience',topic.series??'e34');
}
export function repairComposeDefaults(topic: RepairTopic, intent: RepairIntent) {
  const writeup = intent === 'repair-writeup';
  return {
    title: (writeup ? 'My fix: ' + topic.title : topic.title + ' — question or tip').slice(0, 160),
    body: writeup ? templateBody('repair') : '',
    template: writeup ? 'repair' as const : 'general' as const,
    category: 'Maintenance, Repairs & DIY',
    chapter: topic.manual?.chapter || '', component: topic.systems.length === 1 ? topic.systems[0] : '',
    guide: topic.guide || '', guideRevision: '', guideStep: '',
    observations: [repairMarker(topic)],
  };
}
/** Canonical linkage wins over restored metadata. Text is kept; another job's context cannot leak into this draft. */
export function attachRepairContext<T extends { observations: { question: string; answer: string }[] }>(draft: T, topic: RepairTopic) {
  const observations = [repairMarker(topic), ...draft.observations.filter(row => row.question !== markerQuestion)].slice(0, 20);
  while (new TextEncoder().encode(JSON.stringify(observations)).length > 15000) observations.pop();
  return { ...draft, chapter: topic.manual?.chapter || '', guide: topic.guide || '', guideRevision: '', guideStep: '',
    component: topic.systems.length === 1 ? topic.systems[0] : '',
    part: '', catalogPosition: '', article: '', diagnostic: '', node: '', referenceRevision: '', garage: '', journal: '', starter: '',
    observations,
  };
}
