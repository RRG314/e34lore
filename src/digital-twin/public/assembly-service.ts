import { coolantServices } from './coolant-service';
import { e30CoolingFanService, e34CoolingFanService } from './fan-service';
import { frontAxleServices } from './front-axle-service';
import { e30RearBrakeService, e34RearBrakeService } from './rear-brake-service';
import { e30FrontBrakeService } from './e30-front-brake-service';
import { frontBrakeService } from './front-brake-service';
import { clutchService, getragService } from './getrag-service';
import type { ReferenceModel, Vec } from './model';

const sumpManual = {
  service: { title: 'Bentley 240-14 · ATF service', href: '/manual/240?pdf=250#job-a4s-310r-atf-service' },
  strainer: { title: 'BMW TIS 24 31 155 · Strainer', href: 'https://workshop-manuals.com/bmw/5_series_e34/525tds_m51_sal/2_repair_instructions/24__automatic_transmission_(aut)/31__oil_pump/2_ra__removing_and_installing_oil_strainer_in_shift_unit_(a4s_270__310r)/' },
  torque: { title: 'BMW torque tables · 24 11 and 24 31', href: 'https://www.e34chassis.com/wp-content/uploads/2023/08/bmw_torq.pdf' },
};

export type ManualLink = { title: string; href: string };

export type AssemblyStep = {
  action: string;
  description: string;
  focus: string[];
  move?: [string, Vec][];
  rotateZ?: [string, number][];
  scaleY?: [string, number][];
  frame?: string[];
  access?: readonly string[];
  panels?: [string, boolean][];
  tools?: string;
  manual?: ManualLink;
};

export type AssemblyServiceId = 'e34-sump' | 'e30-clutch' | 'e30-getrag' | 'e34-front-brakes' | 'e30-front-brakes' | 'e34-rear-brakes' | 'e30-rear-brakes'
  | 'e30-front-strut' | 'e34-front-strut' | 'e30-front-arms' | 'e34-front-arms'
  | 'e30-front-tie-rods' | 'e34-front-tie-rods' | 'e34-center-link'
  | 'e30-cooling-fan' | 'e34-cooling-fan'
  | 'e30-water-pump' | 'e34-water-pump' | 'e30-thermostat' | 'e34-thermostat';
export type AssemblyProgress = { id: AssemblyServiceId; completed: number };

export type AssemblyProcedure = {
  id: AssemblyServiceId;
  modelId: string;
  scope: string;
  relatedScopes?: string[];
  prefix: string;
  title: string;
  entryView: Vec;
  clearanceAxis: 'x' | 'y' | 'z';
  clearancePitch?: number;
  parts: string[];
  steps: readonly AssemblyStep[];
  manuals: ManualLink[];
  completed: string;
  before?: string;
  supplies?: readonly string[];
  catalogParts?: readonly string[];
};
const panBolts = Array.from({ length: 16 }, (_, i) => 'pan-bolt-' + (i + 1));
const filterScrews = Array.from({ length: 3 }, (_, i) => 'strainer-bolt-' + (i + 1));
const zero: Vec = [0, 0, 0];
const tray: Vec = [0, -.18, .31];
const onPan = ['pan-main', 'pan-magnet', 'pan-fill-plug', 'pan-fill-seal'];
const drain: Vec = [.12, -.112, -.20];
const filter: Vec = [-.08, -.100, -.22];
const move = (parts: string[], position: Vec): [string, Vec][] => parts.map(id => [id, position]);

export const sumpSteps: readonly AssemblyStep[] = [
  { action: 'Start service', focus: ['pan-main', 'pan-fill-plug'], description: 'Confirm the A4S 310R tag and the fill arrangement. This view shows the later pan with a fill plug. Use a level lift or rated supports on level ground. Let hot fluid cool before opening the transmission.' },
  { action: 'Remove drain plug and washer', focus: ['pan-drain-plug', 'pan-drain-seal'], move: move(['pan-drain-plug', 'pan-drain-seal'], drain), description: 'Catch the fluid from the large rear pan. Keep a drain tray in place for the fluid left in the pan and strainer.' },
  { action: 'Remove the 16 pan bolts', focus: panBolts, move: move(panBolts, [0, -.055, .26]), description: 'Support the large pan as you remove its perimeter bolts. Some fluid remains inside.' },
  { action: 'Lower the main pan', access: ['pan-main'], focus: ['pan-main', 'pan-main-gasket'], move: move(onPan, tray), description: 'Lower the large rear pan clear of the strainer. The small front pan stays in place.' },
  { action: 'Remove the pan gasket', access: ['pan-main-gasket'], focus: ['pan-main-gasket'], move: move(['pan-main-gasket'], [-.09, -.13, .33]), description: 'Peel away the old gasket and clean the sealing surfaces without gouging them.' },
  { action: 'Remove the three strainer screws', focus: filterScrews, move: move(filterScrews, [0, -.07, -.27]), description: 'Support the strainer and undo its three screws. Use the correct inch-thread hardware when reinstalling.', tools: 'BMW socket insert 24 5 180', manual: sumpManual.strainer },
  { action: 'Lower the strainer and seal', focus: ['strainer', 'strainer-seal'], move: move(['strainer', 'strainer-seal'], filter), description: 'Lower the strainer and check that its outlet seal came out. Remove the old seal from the mating surface if it stayed behind.', manual: sumpManual.strainer },
  { action: 'Lift out the magnet', focus: ['pan-magnet'], move: move(['pan-magnet'], [0, -.079, .31]), description: 'Clean the sump and magnet with a lint-free cloth. Inspect the debris before continuing.' },
  { action: 'Fit the strainer and seal', focus: ['strainer', 'strainer-seal'], move: move(['strainer','strainer-seal'], zero), description: 'Seat the replacement strainer with its outlet seal aligned to the valve body.', manual: sumpManual.strainer },
  { action: 'Install the strainer screws', focus: filterScrews, move: move(filterScrews, zero), description: 'Use the correct inch-thread screws. Bentley and the BMW torque table give different strainer values. Verify the specification for the installed hardware before tightening.', tools: 'BMW socket insert 24 5 180 and a suitable torque wrench', manual: sumpManual.torque },
  { action: 'Seat the magnet and new pan gasket', focus: ['pan-magnet', 'pan-main-gasket'], move: [['pan-magnet', tray], ['pan-main-gasket', tray]], description: 'Return the clean magnet to the pan and line up the new gasket with all 16 holes.' },
  { action: 'Raise the pan into place', focus: ['pan-main', 'pan-main-gasket'], move: move([...onPan, 'pan-main-gasket'], zero), description: 'Hold the pan and gasket flat against the case while starting the new bolts.' },
  { action: 'Fit and tighten the new pan bolts', focus: panBolts, move: move(panBolts, zero), description: 'Start the new bolts by hand. Tighten them in succession around the flange to 12 N·m.', tools: 'Socket matched to the pan bolt heads and a low-range torque wrench' },
  { action: 'Fit the drain plug and new washer', focus: ['pan-drain-plug', 'pan-drain-seal'], move: move(['pan-drain-plug','pan-drain-seal'], zero), description: 'Install the drain plug with a new sealing washer. Tighten to 25 N·m.' },
  { action: 'Open the fill port', focus: ['pan-fill-plug', 'pan-fill-seal'], move: move(['pan-fill-plug','pan-fill-seal'], [0, 0, -.105]), description: 'Follow the linked procedure for prefill, fluid temperature, and the level check with the car level. Use the fluid specified for the transmission tag.', tools: 'ATF pump and a tool that can read transmission fluid temperature' },
  { action: 'Refit the fill plug and check for leaks', focus: ['pan-fill-plug', 'pan-fill-seal'], move: move(['pan-fill-plug','pan-fill-seal'], zero), description: 'After setting the level, refit the fill plug and seal. BMW lists 33 N·m for the A4S 310R fill plug. Inspect the pan and both plugs for leaks.', manual: sumpManual.torque },
];

const sump: AssemblyProcedure = {
  id: 'e34-sump', modelId: 'e34-525i-sedan-automatic', scope: 'system:automatic-gearbox',
  prefix: 'e34auto:', title: 'Pan & filter service', entryView: [.45, -1, 1.5], clearanceAxis: 'y',
  steps: sumpSteps, manuals: [sumpManual.service],
  parts: ['case', 'main-valve-body', 'pan-mating-face', 'adapter-case', 'pan-secondary'],
  completed: 'Pan and filter reinstalled. The service ends after setting the fluid level and checking for leaks.',
};

export const assemblyProcedures = { 'e34-sump': sump, 'e30-clutch': clutchService, 'e30-getrag': getragService, 'e34-front-brakes': frontBrakeService, 'e30-front-brakes': e30FrontBrakeService,
  'e30-rear-brakes': e30RearBrakeService, 'e34-rear-brakes': e34RearBrakeService, ...frontAxleServices,
  'e30-cooling-fan':e30CoolingFanService, 'e34-cooling-fan':e34CoolingFanService, ...coolantServices };
function nodeId(procedure: AssemblyProcedure, part: string) {
  return part.includes(':') ? part : procedure.prefix + part;
}

const procedureParts = new Map<AssemblyServiceId, ReadonlySet<string>>(Object.values(assemblyProcedures).map(procedure=>[
  procedure.id,
  new Set([...procedure.parts, ...procedure.steps.flatMap(step=>[
    ...step.focus, ...(step.frame ?? []), ...(step.access ?? []), ...(step.panels ?? []).map(([id])=>id), ...(step.move ?? []).map(([id])=>id), ...(step.rotateZ ?? []).map(([id])=>id), ...(step.scaleY ?? []).map(([id])=>id),
  ])].map(part=>nodeId(procedure,part))),
]));

export function availableAssemblyServices(model: ReferenceModel | null) {
  if (!model) return [];
  const modeled = new Set(model.nodes.filter(node=>node.assetId).map(node=>node.id));
  return Object.values(assemblyProcedures).filter(procedure=>
    procedure.modelId===model.id && [...procedureParts.get(procedure.id)!].every(id=>modeled.has(id))
    && procedure.steps.every(step=>(step.panels??[]).every(([id])=>model.openingPanels?.some(panel=>panel.id===nodeId(procedure,id)))));
}

export function assemblyAccess(procedure: AssemblyProcedure) {
  return procedure.steps.flatMap((step,index) => step.access?.length
    ? [{ index, action: step.action, parts: step.access.map(part => nodeId(procedure,part)) }]
    : []);
}

export function assemblyScene(progress: AssemblyProgress) {
  const procedure = assemblyProcedures[progress.id];
  const offsets = new Map<string, Vec>();
  const rotations = new Map<string, number>();
  const scaleY = new Map<string, number>();
  const panels = new Set<string>();
  for (const step of procedure.steps.slice(0, progress.completed)) {
    for (const [part, offset] of step.move ?? []) offsets.set(nodeId(procedure,part), offset);
    for (const [part, angle] of step.rotateZ ?? []) rotations.set(nodeId(procedure,part), angle);
    for (const [part, scale] of step.scaleY ?? []) scaleY.set(nodeId(procedure,part), scale);
    for (const [part, open] of step.panels ?? []) {
      if (open) panels.add(nodeId(procedure,part));
      else panels.delete(nodeId(procedure,part));
    }
  }
  return { parts: procedureParts.get(progress.id)!, offsets, rotations, scaleY, openPanels:[...panels],
    focus: procedure.steps[progress.completed]?.focus.map(part=>nodeId(procedure,part)) ?? [],
    frame: procedure.steps[progress.completed]?.frame?.map(part=>nodeId(procedure,part)),
  };
}
