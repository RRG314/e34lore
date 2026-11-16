import { journeyHref, type Journey } from '../domain/repair-journey';
/** A reference to existing identities, not a second component registry. */
export type ComponentContext = { partId:string; positionId?:string; assemblyId?:string; catalogContextId?:string; nodeId?:string; referenceId?:string; modelRevision?:number };
export type ComponentPartIdentity = { id:string; name:string; number_normalized:string; positionId?:string; assemblyId?:string; contextId?:string };

const componentKeys = [
  ['part', 'partId'],
  ['position', 'positionId'],
  ['assembly', 'assemblyId'],
  ['context', 'catalogContextId'],
  ['node', 'nodeId'],
  ['reference', 'referenceId'],
] as const;

export function requestedComponent(query: Record<string, string | undefined>) {
  const component: Partial<ComponentContext> = {};
  for (const [key, field] of componentKeys) {
    const value = query[key];
    if (value && /^[a-z0-9:_.-]{1,240}$/i.test(value)) component[field] = value;
  }
  const revision = query.model_revision;
  if (revision && /^[1-9]\d{0,15}$/.test(revision) && Number.isSafeInteger(Number(revision))) {
    component.modelRevision = Number(revision);
  }
  return component;
}

function componentParams(component: Partial<ComponentContext>) {
  const params = new URLSearchParams();
  for (const [key, field] of componentKeys) {
    const value = component[field];
    if (value) params.set(key, value);
  }
  if (component.modelRevision) params.set('model_revision', String(component.modelRevision));
  return params;
}

export function componentHref(component: ComponentContext, journey: Journey = {}) {
  const params = componentParams(component);
  params.set('workspace', 'part');
  return journeyHref('/parts/catalog?' + params, journey);
}

export function componentWorkshopHref(component: Partial<ComponentContext>, journey: Journey = {}) {
  const params = new URLSearchParams();
  if (component.partId) params.set('part', component.partId);
  if (component.nodeId) params.set('node', component.nodeId);
  if (component.positionId) params.set('catalog_position', component.positionId);
  if (component.referenceId) params.set('reference', component.referenceId);
  if (component.modelRevision) params.set('model_revision', String(component.modelRevision));
  return journeyHref('/workshop?' + params, journey);
}

export function componentGuideHref(
  guideId: string,
  component: Partial<ComponentContext> = {},
  journey: Journey = {},
  { revision, step }: { revision?: string; step?: number } = {},
) {
  const params = componentParams(component);
  if (revision) params.set('revision', revision);
  const path = '/guides/' + encodeURIComponent(guideId);
  return journeyHref(path + (params.size ? '?' + params : '') + (step ? '#guide-step-' + step : ''), journey);
}

export function componentRepairHref(topicId: string, component: Partial<ComponentContext> = {}, journey: Journey = {}) {
  const params = componentParams(component);
  return journeyHref('/repairs/' + encodeURIComponent(topicId) + (params.size ? '?' + params : ''), journey);
}
