import e30Sources from '../series/e30-repair-sources.json';
import sources from '../references/starter-sources.json';
import type { RepairTopic } from './library';
import { referenceScope } from '../../supabase/functions/_shared/external-reference.mjs';

export function repairSources(topic: RepairTopic, vehicle: Record<string, unknown> = {}) {
  return (topic.series === 'e30' ? e30Sources : sources).filter(source => source.targets.some(target =>
    (target.kind === 'repair' && target.id === topic.id) || (target.kind === 'guide' && target.id === topic.guide),
  )).map(source => ({ ...source, applicabilityMatch: referenceScope(source.scope, { ...vehicle, generation: topic.series ?? 'e34' }) }));
}
export function illustratedRepairSources(topic: RepairTopic) {
  return repairSources(topic).filter(source => source.format === 'Photo walkthrough');
}
