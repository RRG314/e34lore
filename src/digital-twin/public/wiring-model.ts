import { wiringAsset, wiringFor, wiringNodeId, wiringScope } from '../../data/wiring-routes';
import type { ReferenceModel, ReferenceNode, Vec } from './model';

const sleeveSuffix = ':sleeve';

export function wiringBranch(model: ReferenceModel, node: string) {
  const branch = node.endsWith(sleeveSuffix) ? node.slice(0, -sleeveSuffix.length) : node;
  return wiringFor(model)?.routes.find(route => branch === wiringNodeId(route.id));
}

export function wiringGeometry(model: ReferenceModel, node: string) {
  const route = wiringBranch(model, node);
  if (!route) return undefined;
  const sleeve = node.endsWith(sleeveSuffix);
  return { points: route.points, radius: route.radius * (sleeve ? 1 : .56), sleeve };
}

export function withWiring(model: ReferenceModel): ReferenceModel {
  const wiring = wiringFor(model);
  if (!wiring) return model;
  const system:ReferenceNode = {
    id: wiringScope, name: 'Wiring harnesses', parentId: 'vehicle', kind: 'system',
    systemIds: [], assetId: null, meshNames: [],
    matrix: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    bounds: null, internal: false, canonicalId: null, oem: null, guideIds: [], thumbnail: null,
  };
  const parts = wiring.routes.flatMap((route): ReferenceNode[] => {
    const min = ([0,1,2] as const).map(axis => Math.min(...route.points.map(p => p[axis])) - .05) as Vec;
    const max = ([0,1,2] as const).map(axis => Math.max(...route.points.map(p => p[axis])) + .05) as Vec;
    const id = wiringNodeId(route.id);
    const side = (min[2] + max[2]) / 2;
    const longitudinal = (min[0] + max[0]) / 2;
    const bend = Math.abs(side) > .12 ? Math.sign(side) : 0;
    const bundle:ReferenceNode = {
      ...system, id, name:route.name, parentId:wiringScope, kind:'assembly', systemIds:[wiringScope],
      assetId:wiringAsset, bounds:{min,max}, displayDirection:[longitudinal*.18,.12,bend*.30],
    };
    return [
      bundle,
      { ...bundle, id:id+sleeveSuffix, name:route.name+' sleeve', parentId:id, kind:'part', displayDirection:[0,.28,bend*.09] },
    ];
  });
  // Leave the versioned manifest and its GLBs intact. The viewer adds these
  // source-linked illustrations after it verifies the base manifest.
  return { ...model, nodes: [...model.nodes, system, ...parts] };
}
