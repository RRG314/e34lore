import type { Vec } from '../digital-twin/public/model';
import type { Series } from '../series/registry';
import { e30ElectricalManual, e30ElectricalSupplement } from '../series/e30-manual';
import { e34ElectricalManual } from './fuse-panel-layouts';
import { wiringCircuits } from './wiring';

export const wiringScope = 'system:wiring-harness';
export const wiringAsset = 'workshop:wiring-routes';
export const wiringNodeId = (id: string) => 'wiring:' + id;
export const isWiringNode = (id: string) => id.startsWith('wiring:');
export const isWiringScope = (id: string) => id === wiringScope || isWiringNode(id);

type Source = { label: string; href: string };
export type WiringRoute = {
  id: string;
  name: string;
  location: string;
  points: Vec[];
  radius: number;
  connections?: string;
  sources: Source[];
};
type RoutingReference = {
  id: string;
  revisions: readonly [number, ...number[]];
  name: string;
  coverage: string;
  routes: WiringRoute[];
};

function sheet(series: Series, href: string): Source {
  const row = wiringCircuits[series].find(circuit => circuit.href === href);
  if (!row) throw new Error('Missing wiring reference for ' + href);
  return { label: [row.title, row.edition, row.section].join(' · '), href };
}
const e30Sheet = (page: number) => sheet('e30', e30ElectricalManual.url + '#page=' + page);
const e34Sheet = (page: number) => sheet('e34', e34ElectricalManual + '#page=' + page);
const e30Layout = sheet('e30', '/manual/61?pdf=1132');
const e30Replacement = sheet('e30', '/manual/61?pdf=1133');
const e30Lamps = sheet('e30', e30ElectricalSupplement + '#page=12');
const e30Splices = sheet('e30', e30ElectricalSupplement + '#page=14');
const e34Power = e34Sheet(31);
const e34Junctions = e34Sheet(468);
const e34Alternator = { label: 'Bentley · alternator terminals and service · 121-4', href: '/manual/121?pdf=166' };
const e30InjectorBulletin = {
  label: 'BMW service bulletin · C191 and injection harness',
  href: 'https://charm.li/BMW/1990/325i%20Convertible%20%28E30%29%20L6-2494cc%202.5L%20SOHC%20%28M20%29/Repair%20and%20Diagnosis/Powertrain%20Management/Technical%20Service%20Bulletins/All%20Technical%20Service%20Bulletins/Electrical%20-%20Check%20Engine%2C%20Temp%20Gauge%2C%20Long%20Crank%2C%20Idle/',
};
function catalog(series: Series, title: string, assembly: string): Source {
  const car = series === 'e30' ? '1991-bmw-325i-coupe_e30' : '1995-bmw-525i-sedan_e34';
  return { label: title + ' · BMW parts catalog', href: 'https://www.bmwpartsdeal.com/parts-list/' + car + '/' + assembly + '.html' };
}
const e30Battery = catalog('e30', 'Battery cables', 'engine_electrical_system/battery_cable');
const e34Battery = catalog('e34', 'Battery cables', 'engine_electrical_system/battery_cable');
const e34BodyLoom = catalog('e34', 'Main harness sections', 'vehicle_electrical_system/main_wiring_harness');
const e34DoorLoom = catalog('e34', 'Door harnesses', 'vehicle_electrical_system/door_cable_harness');
const e30FrontFootwell: Vec = [.719,.457,-.648];
const e34LeftFootwell: Vec = [.615,.397,-.645];
const e34RearDistribution: Vec = [-.882,.388,-.435];
const e34BatteryPositive: Vec = [-.708,.468,.518];
const e34JumpPoint: Vec = [1.006,.755,-.622];

const e30Doors = ([-1,1] as const).map((side): WiringRoute => {
  const left = side === -1;
  return {
    id: left ? 'door-left' : 'door-right', name: (left ? 'Left' : 'Right') + ' door loom', radius: .012,
    location: 'Through the A-pillar boot and inside the door to the window motor and lock. Door shown closed.',
    points: [[.706,.485,side*.663],[.767,.52,side*.710],[.717,.502,side*.741],[.47,.458,side*.726],[.151,.451,side*.725],[-.16,.495,side*.732],[-.36,.584,side*.738]],
    sources: [e30Splices, e30Sheet(48), e30Sheet(58)],
  };
});

const e34Doors = ([-1,1] as const).flatMap(side => ([false,true] as const).map((rear): WiringRoute => {
  const sideName = side === -1 ? 'left' : 'right';
  const position = rear ? 'rear' : 'front';
  const pillar = rear ? -.433 : .612;
  return {
    id: 'door-' + position + '-' + sideName, name: (rear ? 'Rear ' : 'Front ') + sideName + ' door loom', radius: .013,
    location: (rear ? 'Through the B-pillar boot' : 'Through the A-pillar boot') + ' and along the inner door to the window motor and latch. Door shown closed.',
    points: [[pillar,.44,side*.668],[pillar+.03,.521,side*.719],[pillar-.045,.518,side*.752],[pillar-.21,.466,side*.747],[pillar-.43,.481,side*.750],[pillar-.63,.615,side*.747]],
    sources: [e34Sheet(216), e34Sheet(206), e34Sheet(207), e34DoorLoom],
  };
}));

export const wiringReferences: Record<Series, RoutingReference> = {
  e30: {
    id: 'e30-325i-coupe-manual',
    revisions: [1197, 1188, 1196, 1195, 1194, 1193, 1192, 1191, 1185, 1182, 1181, 1180, 1179],
    name: '1991 325i coupe',
    coverage: 'Main loom follows BMW’s routing drawing. Branch bends, clips and sleeve sizes are approximate.',
    routes: [
      {
        id: 'front-left', name: 'Left engine-bay loom', radius: .016,
        location: 'From the front fuse box along the left inner wing to the front lighting loom.',
        points: [[.956,.687,-.639],[1.03,.636,-.683],[1.41,.657,-.684],[1.73,.622,-.695],[1.928,.568,-.591]],
        connections: 'Front ground G104 is on the inner wing behind the left headlights.',
        sources: [e30Splices, e30Layout, e30Sheet(74), e30Lamps, e30Sheet(26), e30Sheet(113)],
      },
      {
        id: 'front-panel', name: 'Front lighting cross-car loom', radius: .012,
        location: 'Across the front panel behind the lamps and grille. The park and marker circuits have separate left and right feeds.',
        points: [[1.928,.568,-.591],[1.949,.552,-.45],[1.96,.534,0],[1.949,.552,.45],[1.928,.568,.591]],
        sources: [e30Splices, e30Layout, e30Lamps],
      },
      {
        id: 'dash', name: 'Dash cross-car loom', radius: .017,
        location: 'From the left footwell up behind the instrument cluster and across behind the dash.',
        connections: 'BMW shows the cluster and steering-column branches separately at the driver-side splice group.',
        points: [e30FrontFootwell,[.693,.598,-.614],[.653,.72,-.576],[.626,.793,-.424],[.608,.789,-.199],[.599,.774,.16],[.623,.759,.451],[.681,.647,.588],[.706,.485,.663]],
        sources: [e30Splices, e30Layout, e30Sheet(65)],
      },
      {
        id: 'sill', name: 'Left sill loom', radius: .021,
        location: 'From the left front footwell, under the sill trim and carpet, then alongside the left rear wheelhouse.',
        points: [[.956,.687,-.639],[.849,.616,-.634],e30FrontFootwell,[.586,.329,-.661],[.05,.323,-.666],[-.474,.325,-.660],[-.812,.361,-.628],[-1.046,.509,-.580],[-1.293,.642,-.583]],
        sources: [e30Splices, e30Layout, e30Replacement],
      },
      {
        id: 'left-rear', name: 'Left rear lamp loom', radius: .013,
        location: 'From the left rear wheelhouse to the back of the left rear lamp carrier.',
        points: [[-1.293,.642,-.583],[-1.48,.657,-.641],[-1.84,.637,-.643],[-2.036,.63,-.55]],
        connections: 'G300 is below the left side of the rear backrest.',
        sources: [e30Splices, e30Layout, e30Replacement, e30Lamps],
      },
      {
        id: 'rear-panel', name: 'Rear lighting cross-car loom', radius: .013,
        location: 'Along the inside of the rear panel from the left carrier area to the right rear lamp.',
        points: [[-2.036,.63,-.55],[-2.005,.569,-.487],[-2.005,.56,0],[-2.005,.569,.487],[-2.036,.63,.55]],
        sources: [e30Splices, e30Layout, e30Replacement, e30Lamps],
      },
      {
        id: 'defogger', name: 'Rear window defogger leads', radius: .009,
        location: 'From the rear body harness under the parcel shelf to the two rear-glass terminals.',
        points: [[-1.293,.642,-.583],[-1.477,.742,-.525],[-1.555,.898,-.494],[-1.601,.926,-.301],[-1.608,.923,.29],[-1.555,.898,.494]],
        sources: [e30Replacement, e30Sheet(62)],
      },
      ...e30Doors,
      {
        id: 'injectors', name: 'M20 injector harness', radius: .014,
        location: 'The late injector rail harness runs along the intake side of the head with a lead down to C191 under the intake.',
        connections: 'At C191, pin 5 supplies all six injectors. Pins 6 and 7 return cylinders 1–3–5 and 2–4–6 to the control unit, respectively.',
        points: [[.978,.578,-.235],[1.025,.664,-.232],[1.072,.703,-.204],[1.178,.715,-.199],[1.364,.72,-.199],[1.482,.712,-.195]],
        sources: [e30Sheet(39), e30Sheet(112), e30InjectorBulletin],
      },
      {
        id: 'battery', name: 'Trunk battery positive cable', radius: .011,
        location: 'From the right trunk battery toward the front positive terminal. The floor and bulkhead bends are approximate.',
        points: [[-1.784,.609,.64],[-1.698,.495,.654],[-1.425,.49,.674],[-1.143,.416,.589],[-.802,.335,.636],[-.288,.322,.655],[.22,.324,.660],[.591,.344,.661],[.726,.447,.645],[.856,.585,.636],[.949,.694,.641]],
        sources: [e30Sheet(29), e30Sheet(38), e30Battery],
      },
      {
        id: 'alternator', name: 'M20 alternator leads', radius: .009,
        location: 'At the rear of the alternator on the left side of the engine. Follow the charge circuit to the starter terminal and instrument cluster.',
        points: [[1.353,.541,-.261],[1.435,.529,-.27],[1.473,.495,-.258]],
        sources: [e30Sheet(29), catalog('e30', 'M20 alternator', 'engine_electrical_system/alternator')],
      },
      {
        id: 'starter', name: 'M20 starter leads', radius: .011,
        location: 'At the left rear of the M20, beneath the intake beside C191.',
        points: [[.927,.594,-.327],[.906,.562,-.281],[.881,.518,-.241],[.86,.479,-.205]],
        sources: [e30Sheet(31), e30Sheet(29), e30Sheet(112)],
      },
    ],
  },
  e34: {
    id: 'e34-525i-sedan-automatic',
    revisions: [1052, 1046, 1051, 1050, 1049, 1048, 1047, 1045, 1044],
    name: '1995 525i sedan · M50TU',
    coverage: 'BMW diagrams identify the connections and access points. Loom bends, clip positions and sleeve sizes are approximate.',
    routes: [
      {
        id: 'engine-feed', name: 'Engine electronics box to injector loom', radius: .016,
        location: 'From the right rear of the engine bay to the rear of the M50 injection loom.',
        points: [[1.012,.724,.532],[.908,.726,.435],[.864,.743,.305],[.898,.760,.242],[.877,.740,.116],[.887,.757,.025],[.927,.772,-.004]],
        connections: 'A6000 DME in the rear right electronics box, with connector X6000.',
        sources: [e34Sheet(121), e34Sheet(467)],
      },
      {
        id: 'injectors', name: 'Injector rail loom', radius: .013,
        location: 'Along the top of the intake side of the engine to the six injector connectors.',
        connections: 'X6101–X6106 pin 1 shares the red/white supply from X6820. Each pin 2 returns to a separate DME output.',
        points: [[.927,.772,-.004],[1.04,.772,-.004],[1.24,.773,-.004],[1.468,.769,-.004]],
        sources: [e34Sheet(127), e34Sheet(121)],
      },
      {
        id: 'alternator', name: 'Alternator terminal leads', radius: .011,
        location: 'Short section at the back of the alternator. The charging schematic shows the B+ supply and D+ signal circuits.',
        points: [[1.20,.593,-.235],[1.34,.576,-.233],[1.432,.548,-.204],[1.463,.539,-.162]],
        sources: [e34Sheet(131), e34Alternator, e34Battery],
      },
      {
        id: 'battery', name: 'Under-seat battery positive cable', radius: .014,
        location: 'From the right side of the rear seat toward the front power junction. The cable path beneath the floor trim is approximate.',
        connections: 'G1 battery positive at X819 feeds G6430 through F97. BMW shows 70 mm² and 6 mm² red conductors on this feed.',
        points: [e34BatteryPositive,[-.742,.425,.404],[-.774,.372,.173],[-.767,.366,-.255],[-.652,.332,-.585],[-.237,.31,-.641],[.235,.315,-.653],e34LeftFootwell,[.69,.493,-.639],[.834,.641,-.61],e34JumpPoint],
        sources: [e34Power, e34Junctions, e34Sheet(135), e34Battery],
      },
      {
        id: 'starter', name: 'Starter supply and solenoid leads', radius: .012,
        location: 'At the starter under the intake on the left side of the engine. The short path follows the modeled terminal position.',
        connections: 'X6512 is terminal 30, X6511 is 30h and X6510 is terminal 50. Check the early or late start-control sheet against the production date.',
        points: [[.845,.631,-.289],[.862,.569,-.220],[.88,.501,-.192],[.885,.47,-.155]],
        sources: [e34Sheet(135), e34Sheet(133), e34Sheet(134), e34Power],
      },
      {
        id: 'sill', name: 'Left cabin sill and rear fuse box loom', radius: .02,
        location: 'From the left footwell below the sill trim to the rear distribution box beneath the rear seat.',
        connections: 'P90 is the front distribution box. P91 is the rear distribution box.',
        points: [e34LeftFootwell,[.496,.303,-.676],[.12,.29,-.689],[-.316,.29,-.689],[-.64,.315,-.667],[-.825,.355,-.585],e34RearDistribution],
        sources: [e34Sheet(21), e34Sheet(22), e34Sheet(425), e34BodyLoom],
      },
      {
        id: 'rear-seat', name: 'Rear-seat power distribution feed', radius: .01,
        location: 'Across the rear-seat pan between the battery and the rear fuse and relay area.',
        connections: 'Follow the 10 mm² red feed through F0 (80 A) from X18068 to X18067.',
        points: [e34BatteryPositive,[-.845,.413,.405],[-.916,.385,.2],[-.926,.384,-.137],e34RearDistribution],
        sources: [e34Power, e34Sheet(22), e34Battery],
      },
      {
        id: 'trunk', name: 'Sedan trunk and rear lamp loom', radius: .015,
        location: 'From the rear-seat area past the left wheelhouse to the lamp carriers along the rear panel.',
        points: [e34RearDistribution,[-1.1,.465,-.569],[-1.341,.587,-.65],[-1.649,.605,-.666],[-1.974,.615,-.692],[-2.233,.722,-.682],[-2.264,.68,-.455],[-2.274,.667,0],[-2.264,.68,.455],[-2.233,.722,.682]],
        sources: [e34Sheet(348), e34Sheet(356), e34BodyLoom],
      },
      {
        id: 'defogger', name: 'Sedan rear window defogger leads', radius: .009,
        location: 'From the rear-seat relay area to the rear glass. The branch behind the parcel shelf is shown approximately.',
        connections: 'K13 switches the defogger through X379. The ground return is at X380.',
        points: [e34RearDistribution,[-1.021,.426,-.546],[-1.241,.631,-.592],[-1.474,.852,-.539],[-1.599,.94,-.469]],
        sources: [e34Sheet(368), e34Sheet(22)],
      },
      {
        id: 'front-lighting', name: 'Front lighting loom', radius: .015,
        location: 'From the front fuse box along the left inner wing and behind the headlamp carriers. The branch across the front panel is shown approximately.',
        points: [[.943,.708,-.695],[1.182,.644,-.703],[1.506,.633,-.710],[1.785,.61,-.685],[1.961,.566,-.554],[1.978,.559,-.341],[1.983,.556,0],[1.978,.559,.341],[1.961,.566,.554]],
        sources: [e34Sheet(340), e34Sheet(348), e34Sheet(21), e34BodyLoom],
      },
      ...e34Doors,
    ],
  },
};

export function wiringFor(model: { id: string; revision: number }) {
  return Object.values(wiringReferences).find(ref => ref.id === model.id && ref.revisions.includes(model.revision));
}

export function wiringWorkshopHref(series: Series) {
  const ref = wiringReferences[series];
  return '/workshop?' + new URLSearchParams({ reference: ref.id, model_revision: String(ref.revisions[0]), system: wiringScope });
}
