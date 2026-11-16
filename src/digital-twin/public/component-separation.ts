import { Matrix4, Vector3 } from 'three';
import {bodyTrimScope,isEngineInspection,type ReferenceModel,type ReferenceNode,type Vec} from './model';
import type { Separation } from './explosion';
import {referenceVariantOffsets} from './variant-layout';

const add = (a: Vec, b: Vec): Vec => a.map((x, i) => x + b[i]) as Vec;
const scale = (a: Vec, factor: number): Vec => a.map(x => x * factor) as Vec;
const up = (distance: number): Vec => [0, distance * Math.cos(Math.PI / 6), distance * .5];
function center(n: ReferenceNode): Vec {
  const point = n.bounds ? new Vector3(...n.bounds.min).add(new Vector3(...n.bounds.max)).multiplyScalar(.5) : new Vector3();
  return point.applyMatrix4(new Matrix4().fromArray(n.matrix)).toArray() as Vec;
}

/** One spatial layout, scaled by the same slider fraction for every part.
 * These are illustrated assembly relationships, not physical removal paths. */
function engine(n: ReferenceNode): Vec {
  const id = n.id, x = (center(n)[0] - 1.2) * .6;
  const stack = (height: number, lateral = 0): Vec => add(up(height), [x, 0, lateral]);
  if (id === 'm50:block') return [0, 0, 0];
  if (id.startsWith('m50:piston-ring:')) return stack(.96 - Number(id.split(':').at(-1)) * .07);
  if (id.startsWith('m50:piston-pin:')) return stack(.55, -.2);
  if (id.startsWith('m50:piston:')) return stack(.55);
  if (id.startsWith('m50:rod-bolt:')) return stack(-.22);
  if (id.startsWith('m50:rod-cap:')) return stack(-.04);
  if (id.startsWith('m50:rod:')) return stack(.24);
  if (id === 'm50:crankshaft') return up(-.4);
  if (id.startsWith('m50:main-cap:')) return stack(-.65);
  if (id.startsWith('m50:main-shell:')) return stack(id.endsWith('lower')?-.56:-.12);
  if (id.startsWith('m50:rod-shell:')) return stack(id.endsWith('lower')?-.12:.17);
  if (id.startsWith('m50:main-bolt:')) return stack(-.9);
  if (id === 'm50:flywheel') return [-.9, 0, 0];
  if (id === 'm50:oil-pan') return up(-1.5);
  if (id === 'm50:oil-drain-plug') return add(up(-1.5), [.2, -.2, 0]);
  if (id === 'm50:oil-pump') return up(-1.1);
  if (id.startsWith('m50:oil-pump-')) return [.28,-.96,id.includes('outer')?-.24:.24];
  if (id === 'm50:oil-pickup') return add(up(-1.25), [-.1, 0, 0]);
  if (id === 'm50:oil-pump-chain') return [.4, -.7, 0];
  if (id === 'm50:oil-filter-housing') return [0, .15, -.6];
  if (id === 'm50:oil-filter-element') return [0, .55, -.6];
  if (id === 'm50:head-gasket') return up(.38);
  if (id === 'm50:cylinder-head') return up(.95);
  const bank = id.includes(':intake') ? -.2 : id.includes(':exhaust') ? .2 : 0;
  if (id.startsWith('m50:valve-spring:')) return stack(1.48, bank);
  if (id.startsWith('m50:valve:')) return stack(1.25, bank);
  if (id.startsWith('m50:lifter:')) return stack(1.75, bank);
  if (id.startsWith('m50:cam-carrier:')) return stack(1.98, bank);
  if (id.startsWith('m50:camshaft:')) return stack(2.22, bank);
  if (id.startsWith('m50:cam-cap:')) return stack(2.48, bank);
  if (id.startsWith('m50:head-bolt:')) return stack(2.7);
  if (id.startsWith('m50:spark-plug:')) return stack(2.9);
  if (id.startsWith('m50:ignition-coil:')) return stack(3.18);
  if (id === 'm50:valve-cover') return up(3.4);
  if (id === 'm50:coil-cover') return up(3.75);
  if (id === 'm50:oil-filler-cap') return up(3.8);
  if (id.startsWith('m50:cover-bolt:')) return stack(3.9);
  if (id === 'm50:lower-timing-cover') return [.5, 0, 0];
  if (id.startsWith('m50:front-cover-bolt:')) return [.78, 0, 0];
  if (id.startsWith('m50:chain-guide:')) return [.63, 0, 0];
  if (id.startsWith('m50:timing-chain:')) return [.82, 0, 0];
  if (/^m50:(crank|cam)-sprocket/.test(id)) return [1.05, 0, 0];
  if (id === 'm50:vanos') return [.6, .1, 0];
  if (id === 'm50:vanos-piston') return [.95, .1, 0];
  if (id === 'm50:vanos-solenoid') return [.6, .1, -.35];
  if (id.startsWith('m50:intake-runner:')) return [x, 0, -.55];
  if (id === 'm50:intake-plenum') return [0, 0, -1.15];
  if (id.startsWith('m50:injector:')) return [x, .32, -.75];
  if (id === 'm50:fuel-rail') return [0, .62, -.75];
  if (id === 'm50:throttle-body') return [-.25, 0, -1.5];
  if (id === 'm50:intake-boot') return [-.5, 0, -1.8];
  if (id === 'm50:idle-control-valve') return [0, -.25, -.9];
  if (id.startsWith('m50:exhaust-manifold:')) return [x, 0, .9];
  if (id === 'm50:water-pump') return [.85, 0, 0];
  if (id === 'm50:water-pump-impeller') return [.55, 0, 0];
  if (id.startsWith('m50:pump-nut:')) return [1.13, 0, 0];
  if (id === 'm50:thermostat-housing') return [.95, .2, 0];
  if (id === 'm50:thermostat') return [.65, .2, 0];
  if (id.startsWith('m50:pulley:')) return [1.45, 0, 0];
  if (id === 'm50:accessory-belt') return [1.7, 0, 0];
  if (id === 'm50:belt-tensioner') return [.6, -.25, -.4];
  if (id === 'm50:alternator') return [.25, -.15, -.8];
  if (id === 'm50:power-steering-pump') return [.25, -.3, -.7];
  if (id === 'm50:ac-compressor') return [.25, -.3, .75];
  if (id === 'm50:starter') return [-.35, 0, .6];
  // Future modeled accessories retain their installed direction and scale.
  const p = center(n); return [x, .35 + (p[1] - .6) * .4, p[2] * .8];
}

function doorCarry(id: string): Vec | null {
  const door = id.match(/^e34body:(front|rear)-door-(left|right)$/);
  return door ? [door[1] === 'front' ? .45 : -.45, .3, door[2] === 'left' ? -1.3 : 1.3] : null;
}
function body(n: ReferenceNode): Vec {
  const id = n.id, p = center(n), side = p[2] < 0 ? -1 : 1;
  const ownDoor = doorCarry(id); if (ownDoor) return ownDoor;
  const glass = id.match(/^e34body:(front|rear)-door-glass-(left|right)$/);
  if (glass) return add(doorCarry('e34body:' + glass[1] + '-door-' + glass[2])!, [0, .65, 0]);
  if (id.startsWith('e34body:mirror-')) return add(doorCarry('e34body:front-door-' + (side < 0 ? 'left' : 'right'))!, [0, .05, side * .35]);
  const moulding = id.match(/^e34body:side-moulding-e34-body-(15|16)-(left|right)$/);
  if (moulding) return add(doorCarry('e34body:' + (moulding[1] === '16' ? 'front' : 'rear') + '-door-' + moulding[2])!, [0, 0, side * .22]);
  if (id === 'e34body:hood') return [.05, 2.6, 0];
  if (id === 'e34body:roundel-front') return [.05, 2.85, 0];
  if (id === 'e34body:trunk') return [-.4, 1.7, 0];
  if (id === 'e34body:roundel-rear') return [-.62, 1.7, 0];
  if (id.startsWith('e34body:trunk-lamp-')) return [-.72, 1.7, side * .12];
  if (id === 'e34body:windshield') return [.2, 1.55, 0];
  if (id.startsWith('e34body:wiper-blade-')) return [.51, 1.94, side*.32];
  if (id.startsWith('e34body:wiper-arm-')) return [.31, 1.72, side*.24];
  if (id === 'e34body:rear-window') return [-.2, 1.4, 0];
  if (id.startsWith('e34body:headlamp-')) return [.95, 0, side * (id.endsWith('outer') ? .2 : .08)];
  if (id.startsWith('e34body:tail-light-')) return [-.85, 0, side * .15];
  if (id === 'e34body:front-bumper') return [.95, -.15, 0];
  if (id === 'e34body:rear-bumper') return [-.9, -.15, 0];
  if (id === 'e34body:front-valance') return [.7, -.4, 0];
  if (id === 'e34body:front-license-plate') return [1.3, -.15, 0];
  if (id === 'e34body:rear-license-plate') return [-1.2, 1.7, 0];
  if (id.includes('side-moulding-')) return [0, 0, side * .35];
  // The roof/quarters/fenders are regions of one artist mesh, not independently
  // reconstructed service panels. Never tear those triangle regions apart.
  return [0, 0, 0];
}
function chassis(n: ReferenceNode): Vec {
  const id = n.id, p = center(n), side = p[2] < 0 ? -1 : 1;
  if (id.startsWith('wheel:')) return [0, -.15, side * 2.2];
  if (/^e34sys:(floor-pan|firewall|transmission-tunnel|sill-|chassis-rail-|luggage-floor)$/.test(id) || /^e34sys:(sill|chassis-rail)-/.test(id)) return [0, 0, 0];
  const card = id.match(/^e34sys:door-card-(front|rear)-(-?1)$/);
  if (card) return add(doorCarry('e34body:' + card[1] + '-door-' + (card[2] === '1' ? 'left' : 'right'))!, [0, 0, -side * .35]);
  if (id.includes('headliner')) return [0, 2.4, 0];
  if (id.includes('cabin-carpet')) return [0, 1.1, 0];
  if (id.includes('front-seat')) return [.15, 1.25, side * .2];
  if (id.includes('rear-seat-cushion')) return [-.2, 1.15, 0];
  if (/seat-?belt|rear-belt|lap-belt/.test(id)) return [0, 1.5, side * .3];
  if (id.includes('dashboard')) return [.05, 1.5, 0];
  if (id.includes('instrument-cluster')) return [-.2, 1.85, -.2];
  if (id.includes('dash-vent')) return [-.15, 1.9, p[2] * .3];
  if (id.includes('gear-lever')) return [0, .7, 0];
  if (id.includes('handbrake-lever')) return [0, 1, .15];
  if (id.includes('pedal-box')) return [.2, .85, -.2];
  if (id.includes('steering-wheel')) return [-.3, 1.1, -.3];
  if (id.includes('steering-column')) return [-.15, .75, -.15];
  const corner = (out: number, height = -.45): Vec => [p[0] > 0 ? .2 : -.2, height, side * out];
  if (/^e34sys:hub-/.test(id)) return corner(.75);
  if (id.includes('brake-shield')) return corner(.5);
  if (id.includes('parking-brake-shoes')) return corner(.95);
  if (id.includes('brake-disc')) return corner(1.15);
  if (id.includes('brake-pad')) return corner(1.4);
  if (id.includes('brake-caliper')) return corner(1.7);
  if (id.includes('brake-hose')) return corner(.7, -.1);
  if (id.includes('brake-booster')) return [.1, .65, -.7];
  if (id.includes('abs-hydraulic')) return [.2, .95, -.7];
  if (id.includes('front-strut')) return corner(.6);
  if (id.includes('front-damper')) return corner(.6, .2);
  if (id.includes('rear-damper')) return corner(.65, -.35);
  if (id.includes('front-spring-seat')) return corner(.6, 1.05);
  if (id.includes('front-spring')) return corner(.6, .65);
  if (id.includes('rear-coil-spring')) return corner(.65, .35);
  if (/control-arm|thrust-arm|trailing-arm/.test(id)) return corner(.45, -.8);
  if (id.includes('subframe')) return [p[0] > 0 ? .25 : -.3, -.65, 0];
  if (id.includes('antiroll')) return [0, -.95, 0];
  if (id.includes('drop-link')) return corner(.55, -.75);
  if (/steering-gearbox|pitman-arm|idler-arm|center-drag-link|tie-rod/.test(id)) return [p[0] * .18, -.65, side * .45];
  if (id.includes('gearbox-crossmember')) return [-.75, -.95, 0];
  if (id.includes('clutch-slave')) return [-.45, -.55, -.35];
  if (id.includes('manual-gearbox')) return [-.75, -.55, 0];
  if (id.includes('bellhousing')) return [-.45, -.55, 0];
  if (id.includes('clutch-assembly')) return [-.1, -.55, 0];
  if (id.includes('propeller-shaft')) return [0, -.8, 0];
  if (id.includes('center-bearing')) return [0, -1.05, 0];
  if (id.includes('flexible-drive-coupling')) return [.35, -.8, 0];
  if (id.includes('differential-input')) return [-.1, -.5, 0];
  if (id.includes('differential-case')) return [-.5, -.5, 0];
  if (id.includes('halfshaft')) return [-.5, -.5, side * .45];
  if (id === 'e34sys:radiator') return [3, 1.5, 0];
  if (id.includes('fan-shroud')) return [2.55, 1.5, 0];
  if (id.includes('engine-cooling-fan')) return [2.2, 1.5, 0];
  if (id.includes('expansion-tank')) return [.5, 1, 1.1];
  if (/radiator-hose|heater-hoses/.test(id)) return [p[0] > 1.3 ? 1.7 : -.3, 1.3, side * .35];
  if (id.includes('airbox')) return [-.2, .55, -1.4];
  if (id.includes('intake-boot-maf')) return [-.2, .6, -.9];
  if (id.includes('fresh-air-snorkel')) return [1.6, .6, -.6];
  if (id.includes('blower-motor')) return [.35, 1.9, 0];
  if (id.includes('hvac-ducts')) return [-.15, 1.9, 0];
  if (id.includes('hvac-heater-box')) return [.15, 1.45, 0];
  if (id.includes('fuel-pump-sender')) return [-.3, -.25, .2];
  if (id.includes('fuel-tank')) return [-.3, -.7, 0];
  if (id.includes('fuel-filler-neck')) return [-.45, .1, .65];
  if (id.includes('fuel-filter')) return [0, -.6, .35];
  if (id.includes('fuel-supply-return')) return [0, -.45, .35];
  if (id.includes('exhaust-downpipes')) return [.25, -1.05, .25];
  if (id.includes('catalyst')) return [0, -1.3, 0];
  if (id.includes('rear-exhaust-pipes')) return [-.25, -1.3, 0];
  if (id.includes('rear-muffler')) return [-.5, -1.55, -.15];
  if (id.includes('rear-seat-battery')) return [-.2, 1.1, .6];
  if (id.includes('front-fuse')) return [.2, .8, -.5];
  if (id.includes('electronics-box')) return [.1, .85, .55];
  if (id.includes('body-wiring')) return [0, .65, 0];
  return [p[0] * .15, .7 + p[1] * .3, p[2] * .35];
}

const cache = new WeakMap<ReferenceModel, Map<string, Map<string, Separation>>>();
export function componentPlan(m: ReferenceModel, scope: string, node: ReferenceNode): Separation {
  if(scope==='system:automatic-gearbox'&&node.gearbox)return {group:node.id,path:[node.gearbox.spread],start:0,end:1};
  if(isEngineInspection(scope))return{group:node.id,path:[scale(engine(node),.58)],start:0,end:1};
  if(scope===bodyTrimScope){
    const amount=node.trimCover ? .34 : node.id.startsWith('e34trim:') ? .19 : 0;
    const c=center(node);
    const shift:Vec=/bumper/.test(node.id)?[amount,0,0]:/cowl/.test(node.id)?[0,amount,0]:[0,0,Math.sign(c[2])*amount];
    return {group:node.id,path:[shift],start:0,end:1};
  }
  if(m.vehicleReference)return{group:node.id,path:[referenceVariantOffsets(m,scope).get(node.id)||[0,0,0]],start:0,end:1};
  let scopes = cache.get(m); if (!scopes) { scopes = new Map(); cache.set(m, scopes); }
  let plans = scopes.get(scope); if (!plans) { plans = new Map(); scopes.set(scope, plans); }
  const prior = plans.get(node.id); if (prior) return prior;
  const whole = scope === 'vehicle';
  const delta = (n: ReferenceNode): Vec => n.id.startsWith('m50:') ? whole ? add([1.4, .35, 0], scale(engine(n), .65)) : engine(n) : n.id.startsWith('e34body:') ? body(n) : chassis(n);
  const anchor = m.nodes.find(n => n.id === scope && n.assetId) || (scope === 'm50:top-end' ? m.nodes.find(n => n.id === 'm50:cylinder-head') : undefined);
  const target = node.id === scope ? [0, 0, 0] as Vec : anchor ? add(delta(node), scale(delta(anchor), -1)) : delta(node);
  const plan = {group: node.id, path: [target], start: 0, end: 1}; plans.set(node.id, plan); return plan;
}
