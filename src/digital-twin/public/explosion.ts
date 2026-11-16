import { Vector3 } from 'three';
import { componentPlan } from './component-separation';
import { isCabinTrimInspection, isHvacServiceScope, type ReferenceModel, type ReferenceNode, type Vec } from './model';
import { referenceVariantOffsets } from './variant-layout';
export type Separation = {
    group: string;
    path: Vec[];
    start: number;
    end: number;
};
const up: Vec = [0, .8660254038, .5];
const multiply = (v: Vec, s: number): Vec => v.map(x => x * s) as Vec;
const separation = (group: string, path: Vec[] | Vec, start = 0, end = 1): Separation => ({ group, path: typeof path[0] === 'number' ? [path as Vec] : path as Vec[], start, end });
const stationary = () => separation('connected-body', [0, 0, 0]);
const nodeIndexes = new WeakMap<ReferenceModel, Map<string, ReferenceNode>>();
function nodeIndex(m: ReferenceModel) {
    let index = nodeIndexes.get(m);
    if (!index) {
        index = new Map(m.nodes.map(n => [n.id, n]));
        nodeIndexes.set(m, index);
    }
    return index;
}
export function companionIds(id: string) {
    const side = id.match(/^e34sys:front-strut-(-?1)$/)?.[1];
    if (side)
        return ['front-strut', 'front-damper', 'front-spring', 'front-spring-seat'].map(p => 'e34sys:' + p + '-' + side);
    const rear = id.match(/^e34sys:rear-damper-(-?1)$/)?.[1];
    if (rear)
        return ['rear-damper', 'rear-coil-spring'].map(p => 'e34sys:' + p + '-' + rear);
    return [];
}
/** Authored display assembly motion. No radius-based repulsion or random offsets.
 * A display separation, not a certified physical removal trajectory. */
function wholeCar(n: ReferenceNode): Separation {
    const id = n.id;
    if (id.startsWith('m50:'))
        return separation('engine', [[0, 2, 0], [1.8, 2, 0]], .28, .83);
    if (id.startsWith('wheel:'))
        return separation('wheel-' + (id.includes('left') ? 'left' : 'right'), [0, 0, id.includes('left') ? -1.65 : 1.65], 0, .3);
    if (id === 'e34body:hood' || id === 'e34body:roundel-front')
        return separation('hood', [0, 3.8, 0], 0, .25);
    if (id === 'e34body:trunk' || id === 'e34body:roundel-rear' || id === 'e34body:rear-license-plate' || id.startsWith('e34body:trunk-lamp-'))
        return separation('trunk', [-.35, 2.4, 0], 0, .3);
    const mirror = id.match(/^e34body:mirror-(left|right)$/);
    if (mirror)
        return separation('front-door-' + mirror[1], [0, 0, mirror[1] === 'left' ? -1.35 : 1.35], 0, .35);
    const door = id.match(/^e34body:(front|rear)-door(?:-glass)?-(left|right)$/);
    if (door)
        return separation(door[1] + '-door-' + door[2], [0, 0, door[2] === 'left' ? -1.35 : 1.35], 0, .35);
    const card = id.match(/^e34sys:door-card-(front|rear)-(-?1)$/);
    if (card)
        return separation(card[1] + '-door-' + (card[2] === '1' ? 'left' : 'right'), [0, 0, card[2] === '1' ? -1.35 : 1.35], 0, .35);
    const moulding = id.match(/^e34body:side-moulding-e34-body-(15|16)-(left|right)$/);
    if (moulding)
        return separation((moulding[1] === '16' ? 'front' : 'rear') + '-door-' + moulding[2], [0, 0, moulding[2] === 'left' ? -1.35 : 1.35], 0, .35);
    // The original artist body is continuous across these educational regions.
    // Keep it rigid until real panel seams have their own verified geometry.
    if (id.startsWith('e34body:'))
        return stationary();
    if (/exhaust|muffler|resonator/.test(id))
        return separation('exhaust', [0, -1.8, 0], 0, .3);
    if (/radiator|fan-shroud|engine-cooling-fan|expansion-tank/.test(id))
        return separation('cooling-pack', [[0, 1.3, 0], [2.7, 1.3, 0]], .65, 1);
    if (/gearbox|bellhousing|clutch-assembly|clutch-slave/.test(id))
        return separation('transmission', [0, -.85, 0], .35, .75);
    if (/propeller-shaft|center-bearing|flexible-drive-coupling/.test(id))
        return separation('propeller-shaft', [0, -1.2, 0], .35, .8);
    if (/differential|halfshaft|rear-subframe|rear-trailing|rear-damper|rear-coil|rear-antiroll|rear-drop|hub-rear|disc-rear|caliper-rear|pad-rear|shield-rear|hose-rear|parking-brake-shoes/.test(id))
        return separation('rear-axle', [[0, -.95, 0], [-1.15, -.95, 0]], .35, .9);
    if (/front-subframe|front-strut|front-damper|front-spring|front-control|front-thrust|front-antiroll|front-drop|hub-front|disc-front|caliper-front|pad-front|shield-front|hose-front|steering-gearbox|pitman-arm|idler-arm|center-drag-link|tie-rod/.test(id))
        return separation('front-axle', [.3, -1.0, 0], .35, .8);
    return stationary();
}
function enginePlan(n: ReferenceNode): Separation {
    const id = n.id;
    if (id === 'm50:flywheel')
        return separation('flywheel', [-.8, 0, 0], 0, .6);
    if (/^m50:(block|crankshaft|rod|piston|main-)/.test(id))
        return stationary();
    if (/^m50:(oil-pan|oil-pump|oil-pickup|oil-drain-plug|oil-pump-chain)/.test(id))
        return separation('sump-and-oil-pump', multiply(up, -.35), 0, .45);
    if (/^m50:(valve|coil-cover|cover-bolt|ignition-coil|oil-filler|cylinder-head|cam-|camshaft|head-|spark-plug|lifter)/.test(id))
        return separation('cylinder-head-and-valvetrain', multiply(up, .55), .15, .75);
    if (/^m50:(intake|injector|fuel-rail|throttle|idle-)/.test(id))
        return separation('intake-and-injection', [0, 0, -.55], 0, .6);
    if (id.startsWith('m50:exhaust'))
        return separation('exhaust-manifolds', [0, 0, .55], 0, .6);
    if (/^m50:(water-pump|pump-nut|thermostat)/.test(id))
        return separation('coolant-pump-and-thermostat', [.85, 0, 0], .3, .75);
    if (/^m50:(lower-timing|front-cover|timing-chain|chain-guide|vanos|crank-sprocket|cam-sprocket)/.test(id))
        return separation('timing-and-vanos', [.4, 0, 0], .5, 1);
    if (/^m50:(pulley|accessory-belt|belt-tensioner)/.test(id))
        return separation('accessory-drive', [1.25, 0, 0], 0, .3);
    if (id === 'm50:starter')
        return separation('starter', [-.3, 0, .55], 0, .6);
    if (/^m50:(alternator|power-steering|ac-compressor)/.test(id))
        return separation(id, [.3, 0, id === 'm50:alternator' ? -.7 : .7], .3, 1);
    return separation('other-engine-accessories', [0, 0, -.55], 0, .6);
}
const e30DisplayGroups: Record<string, Vec> = {
    engine:[.6,.52,0], transmission:[.08,-.53,0], driveshaft:[0,-.93,0],
    differential:[-.33,-.58,0], cooling:[.7,.12,0], 'front-suspension':[.46,-.18,0],
    'rear-suspension':[-.40,-.20,0], underbody:[0,-.76,.28], interior:[-.10,.32,0],
};
function e30Plan(scope: string, node: ReferenceNode) {
    if (scope===node.id) return stationary();
    if (node.id.startsWith('e30body:')) {
        if (!node.displayDirection)
            return scope==='vehicle' ? separation('body-shell',[0,1.33,0],0,.70) : stationary();
        if (node.parentId===scope && scope.startsWith('e30body:door-')) {
            const side=scope.endsWith('-left')?-1:1;
            const parts: Record<string,Vec> = {
                'door-glass':[.08,.63,side*.06],
                mirror:[.25,.42,side*.21],
                'inner-shell':[0,-.02,side*-.36],
                'door-card':[0,-.09,side*-.70],
                'upper-hinge':[.42,.12,side*.29],
                'lower-hinge':[.43,-.11,side*.27],
                latch:[-.30,.03,side*.18],
            };
            const key = node.id.startsWith('e30body:door-glass-') ? 'door-glass' : node.id.startsWith('e30body:mirror-') ? 'mirror' : node.id.split(':').at(-1)!;
            return separation(node.id,parts[key]||node.displayDirection,0,.8);
        }
        return separation(node.id,node.displayDirection,0,.8);
    }
    const offset=node.displayDirection ?? [0,0,0];
    const key=node.systemIds.map(id=>id.replace('system:','')).find(id=>id in e30DisplayGroups);
    const group=key ? e30DisplayGroups[key] : [0,0,0];
    return scope==='vehicle'
        ? separation(node.id, offset.map((value,axis)=>value*.62+group[axis]) as Vec,.16,1)
        : separation(node.id,offset,0,1);
}
export function planFor(m: ReferenceModel, scope: string, n: ReferenceNode): Separation {
    if (isCabinTrimInspection(scope) && (scope!=='system:hvac' || m.nodes.some(node=>isHvacServiceScope(node.id))))
        return separation(n.id, referenceVariantOffsets(m, scope).get(n.id) ?? [0, 0, 0]);
    if (m.mechanicalExplosion) return e30Plan(scope,n);
    if (m.revision >= 14) return componentPlan(m, scope, n);
    if (scope === 'vehicle' || scope === 'e34body:assembly' || ['system:body', 'system:exterior', 'system:interior'].includes(scope))
        return wholeCar(n);
    if (scope === 'system:engine' || scope === 'm50:engine')
        return enginePlan(n);
    if (n.id === scope)
        return stationary();
    if (scope === 'e34body:hood' && n.id === 'e34body:roundel-front') return separation('hood-emblem', [0, .18, 0]);
    if (scope === 'e34body:trunk') {
        if (n.id.startsWith('e34body:trunk-lamp-')) return separation('trunk-lamps', [-.35, .12, 0], .2, .8);
        if (n.id === 'e34body:roundel-rear') return separation('trunk-emblem', [-.15, .05, 0], 0, .4);
    }
    const doorScope = scope.match(/^e34body:(front|rear)-door-(left|right)$/);
    if (doorScope) {
        const side = doorScope[2] === 'left' ? -1 : 1;
        if (n.id.includes('door-glass'))
            return separation('door-glass', [0, .6, 0], .4, 1);
        if (n.id.includes('mirror-'))
            return separation('mirror', [0, 0, side * .45], 0, .4);
        if (n.id.includes('moulding-'))
            return separation('door-moulding', [0, 0, side * .25], 0, .35);
        if (n.id.includes('door-card-'))
            return separation('door-trim', [0, 0, -side * .35], .3, .85);
        return stationary();
    }
    if (scope === 'm50:cylinder-head' || scope === 'm50:top-end') {
        if (/^m50:(valve-cover|coil-cover|cover-bolt|oil-filler-cap)/.test(n.id))
            return separation('head-cover', multiply(up, 3.2), 0, .25);
        if (/^m50:(ignition-coil|spark-plug)/.test(n.id))
            return separation('ignition', multiply(up, 2.9), 0, .3);
        if (/^m50:head-bolt/.test(n.id))
            return separation('head-fasteners', multiply(up, 2.5), 0, .3);
        if (/^m50:cam/.test(n.id))
            return separation('camshaft-bearing-assemblies', multiply(up, 1.6), .3, .65);
        if (/^m50:(valve|lifter)/.test(n.id))
            return separation('valve-stacks', multiply(up, .9), .65, 1);
        return stationary();
    }
    if (scope === 'm50:water-pump')
        return n.id.includes('impeller') ? separation('impeller', [-.35, 0, 0], .35, 1) : separation('pump-fasteners', [.4, 0, 0], 0, .35);
    if (companionIds(scope).length) {
        if (n.id.includes('spring-seat'))
            return separation('upper-mount', [0, 1.1, 0], 0, .4);
        if (n.id.includes('spring') && !n.id.includes('strut'))
            return separation('spring', [0, .65, 0], .35, 1);
        return separation('damper', [0, .9, 0], .2, .8);
    }
    // Functional-system view: direct child assemblies remain rigid. A focused
    // assembly exposes its next level; descendants never get a second offset.
    const byId = nodeIndex(m);
    let root = n;
    while (root.parentId && root.parentId !== scope && !root.parentId.startsWith('system:')) {
        const p = byId.get(root.parentId);
        if (!p || p.id === 'vehicle' || (!p.assetId && p.parentId === 'vehicle'))
            break;
        root = p;
    }
    const center = [root.matrix[12], root.matrix[13], root.matrix[14]] as Vec;
    const system = scope.replace('system:', '');
    if (system === 'lighting')
        return separation(root.id, [Math.sign(center[0]) * .9, 0, Math.sign(center[2]) * .7]);
    if (system === 'braking' || system === 'suspension')
        return separation(root.id, [Math.sign(center[0]) * .25, 0, Math.sign(center[2]) * .95]);
    if (system === 'cooling')
        return separation(root.id, [Math.sign(center[0] - 1.4) * .6, .5, Math.sign(center[2]) * .5]);
    if (system === 'transmission' || system === 'driveshaft' || system === 'differential')
        return separation(root.id, [Math.sign(center[0]) * .6, 0, Math.sign(center[2]) * .6]);
    const axis = new Vector3(center[0], center[1] - .5, center[2]);
    if (axis.lengthSq() < .001)
        axis.set(0, 1, 0);
    axis.normalize().multiplyScalar(.8);
    return separation(root.id, axis.toArray() as Vec);
}
export function separationOffset(plan: Separation, amount: number): Vec {
    const progress = Math.max(0, Math.min(1, amount / 4)), t = Math.max(0, Math.min(1, (progress - plan.start) / (plan.end - plan.start)));
    if (!t)
        return [0, 0, 0];
    const segment = t * plan.path.length, index = Math.min(plan.path.length - 1, Math.floor(segment)), fraction = t === 1 ? 1 : segment - index;
    const from = index === 0 ? [0, 0, 0] as Vec : plan.path[index - 1], to = plan.path[index];
    return from.map((v, i) => v + (to[i] - v) * fraction) as Vec;
}
