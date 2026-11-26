import type { Journey } from '../../domain/repair-journey';
import { componentWorkshopHref, type ComponentContext } from '../../servicing/context';
import type { Series } from '../../series/registry';
import { assemblyProcedures, type AssemblyProcedure } from './assembly-service';
import { referenceRelease } from './load-reference';

export function guidedRepairHref(job: AssemblyProcedure, revision: number, navigation: Journey = {}, component: Partial<ComponentContext> = {}) {
  const nodeId = component.referenceId && component.referenceId !== job.modelId ? undefined : component.nodeId;
  return componentWorkshopHref({ ...component, nodeId, referenceId: job.modelId, modelRevision: revision }, navigation, job.id);
}

export function guidedRepairsForTopic(topic: string, series: Series) {
  return Object.values(assemblyProcedures).flatMap(job => {
    if (job.side==='right' || !job.modelId.startsWith(series+'-') ||
        (job.topic!==topic && !job.relatedTopics?.includes(topic))) return [];
    const pin=referenceRelease(undefined,job.modelId);
    if (!pin || pin.revision < (job.minimumRevision ?? 0)) return [];
    return [{job,revision:pin.revision}];
  });
}
