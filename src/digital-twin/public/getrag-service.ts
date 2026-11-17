import type { AssemblyProcedure, ManualLink } from './assembly-service';
import type { Vec } from './model';

function factoryPage(number: number): ManualLink {
  return { title: 'BMW Getrag 260 · 23-' + number,
    href: 'https://e30mpower.com/23%20-%20Manual%20Transmission/23-' + number + '.jpg' };
}
const vehicleManual = { title: 'BMW 23-1/23-2 · Gearbox removal', href: '/e30/manual/23?pdf=366' };
const clutchManual = { title: 'BMW 21-2/21-3 · Clutch disc', href: '/e30/manual/21?pdf=359' };
const releaseManual = { title: 'BMW 21-4 · Clutch release', href: '/e30/manual/21?pdf=361' };
const torqueManual = { title: 'BMW factory tightening tables', href: 'https://charm.li/BMW/1989/325is%20%28E30%29%20L6-2494cc%202.5L%20SOHC%20%28M20%29/Repair%20and%20Diagnosis/Transmission%20and%20Drivetrain/Manual%20Transmission%2FTransaxle/Specifications/Tightening%20Specifications/' };

const ids = (stem: string, count: number) => Array.from({length: count}, (_, i) => stem + (i + 1));
const clutchBolts = ids('clutch-bolt-', 6), guideBolts = ids('guide-bolt-', 6);
const seam = [...ids('case-dowel-', 2), ...ids('case-bolt-', 9)];
const interlock = ['interlock-cap', 'interlock-spring', 'interlock-pin'];
const inputRetainers = ['input-snap-ring', 'input-stop-washer'];
const countershaftGears = ['drive','third','second','first','fifth'].map(gear => 'countershaft-gear-' + gear);
const outputGears = ['third','second','first','reverse','fifth'].map(gear => 'mainshaft-gear-' + gear);
const shafts = ['input-shaft','mainshaft','countershaft','reverse-countershaft', ...countershaftGears,
  ...outputGears, ...ids('synchronizer-',3), ...ids('selector-sleeve-',3),
  ...ids('selector-fork-',3), 'rear-main-bearing','countershaft-bearing'];
const mainCase = ['main-case','filler-plug','breather'];
const guide = ['guide-sleeve','guide-spacer',...guideBolts];
const release = ['fork-spring','release-fork','release-bearing'];
const flange = ['output-flange','output-nut','output-lockplate'];
const benchParts = [...mainCase, 'tail-case', 'drain-plug','reverse-light-switch',
  ...guide, ...release, 'fork-pivot','front-main-bearing', ...inputRetainers, ...interlock,
  ...seam, 'reverse-retainer','reverse-idler',...flange,...shafts];
const installedGearbox = [...benchParts,'shift-carrier','selector-rod'];
const getrag = {
  modelId: 'e30-325i-coupe-manual', scope: 'system:manual-gearbox',
  prefix: 'e30assembly:gearbox:', entryView: [-.65, .46, 1.35] as Vec, clearanceAxis: 'x' as const, clearancePitch: .128,
};
const seat: Vec = [0,0,0];
const move = (parts:string[], at:Vec): [string,Vec][] => parts.map(part=>[part,at]);
const parkedBox: Vec = [-.57,-.077,-.36];
const sealRemoved: Vec = [.22,.02,.26];
const guideRemoved: Vec = [.26,.035,-.30];
const frontOff: Vec = [.52,.067,-.46];
const shaftTray: Vec = [.33,.048,.35];
const referenceDisc = 'Check for old clutch dust before working. Avoid blowing dust with compressed air.';

export const clutchService: AssemblyProcedure = {
  ...getrag, id: 'e30-clutch', title: 'Clutch & release service',
  manuals: [clutchManual, vehicleManual],
  before:'BMW 23 00 022 covers removal of the exhaust, heat shield and transmission crossmember. The model shows the coupling, shift linkage and slave cylinder that also need to come clear.',
  parts: [...installedGearbox, 'flywheel', 'pilot-bearing', 'pressure-plate','clutch-disc', ...clutchBolts, 'slave-cylinder',
    'e30assembly:propeller:flex-disc', 'e30assembly:propeller:front-section'],
  completed: 'Clutch and gearbox reinstalled. Check clutch operation, fluid level, and leaks before driving.',
  steps: [
    { action:'Prepare for gearbox removal', focus:['main-case','flywheel'],
      description:'This is the rear-wheel-drive 325i with the 228 mm clutch and Getrag 260. Support the car and gearbox on rated equipment, disconnect battery negative, and follow BMW 23 00 022 for access. ' + referenceDisc, tools:'Transmission jack, rated lift or stands, and wheel chocks' },
    { action:'Separate the driveshaft coupling', access:['e30assembly:propeller:flex-disc','e30assembly:propeller:front-section'], focus:['e30assembly:propeller:flex-disc','e30assembly:propeller:front-section'],
      move:move(['e30assembly:propeller:flex-disc','e30assembly:propeller:front-section'],[-.09,-.095,0]),
      description:'Remove the exhaust and heat shield for access. Mark the shaft and coupling orientation, release the coupling and centre mount, and support the shaft before drawing it off the centering pin.', tools:'17 or 19 mm for the coupling fasteners, according to the hardware fitted' },
    { action:'Disconnect the linkage and reverse leads', access:['selector-rod','shift-carrier'], focus:['selector-rod','shift-carrier','reverse-light-switch'],
      move:[...move(['selector-rod'],[0,.13,.18]),...move(['shift-carrier'],[0,.18,.11])],
      description:'Free the shift rod and the shift arm at the transmission. Unplug the reverse-light switch leads and move the wiring clear. The switch stays on the case.' },
    { action:'Lift the slave cylinder clear', access:['slave-cylinder'], focus:['slave-cylinder'],
      move:move(['slave-cylinder'],[-.066,-.056,-.23]),
      description:'Unbolt the slave and support it with the hydraulic line connected. Keep the clutch pedal untouched while the cylinder is off.', tools:'13 mm socket for the factory M8 hex mounting nuts' },
    { action:'Withdraw the supported gearbox', access:['main-case'], focus:['main-case','input-shaft'],
      move:move(installedGearbox.filter(id=>!['shift-carrier','selector-rod'].includes(id)),parkedBox),
      description:'Support the engine and transmission, remove the crossmember and release the engine-to-case fasteners. Slide the gearbox rearward until the input shaft clears the clutch. Keep the weight on the jack.', tools:'Transmission jack and sockets matching the installed hex or external Torx fasteners' },
    { action:'Release the fork spring', focus:['fork-spring'],
      move:move(['fork-spring'],[-.48,.08,-.45]), description:'Unhook the retaining spring at the fork pivot.', manual:releaseManual },
    { action:'Lift off the fork and bearing', focus:['release-fork','release-bearing'],
      move:move(['release-fork','release-bearing'],[-.34,.012,-.62]),
      description:'Withdraw the fork and release bearing together from the guide sleeve. Check the fork contact pads, pivot and bearing sleeve before reuse.', manual:releaseManual },
    { action:'Remove the pressure plate screws', focus:clutchBolts, move:move(clutchBolts,[-.055,.16,.22]),
      description:'Hold the flywheel and support the pressure plate. Loosen all six screws progressively and evenly to release the diaphragm load before taking them out.', tools:'BMW flywheel holder 11 2 170 and a bit matched to the fitted screw heads' },
    { action:'Lift off the pressure plate', focus:['pressure-plate'], move:move(['pressure-plate'],[-.16,-.075,.22]),
      description:'Keep hold of the driven disc as the cover comes clear of the flywheel dowels.' },
    { action:'Remove and inspect the clutch disc', focus:['clutch-disc','pilot-bearing','flywheel'],
      move:move(['clutch-disc'],[-.05,.25,.14]),
      description:'Inspect the disc facing and hub, the flywheel face for scoring or heat damage, and the crankshaft pilot bearing for roughness. Follow the factory limits for parts reuse.' },
    { action:'Center the new clutch disc', focus:['clutch-disc','pilot-bearing'], move:move(['clutch-disc'],seat),
      description:'Face the marked transmission side toward the gearbox. Hold the disc centered in the pilot bearing so the input shaft can enter freely.', tools:'BMW centering mandrel 21 2 100 or a matching equivalent' },
    { action:'Seat the pressure plate on the dowels', focus:['pressure-plate'], move:move(['pressure-plate'],seat),
      description:'Keep the mandrel in place and guide the cover squarely onto its locating dowels.' },
    { action:'Tighten the pressure plate screws', focus:clutchBolts, move:move(clutchBolts,seat),
      description:'Start the screws by hand and tighten progressively and evenly. The cataloged M8 class 8.8 screws take 24 N·m in BMW table 21 21 1AZ. Verify the markings on the installed hardware.' },
    { action:'Refit the fork and release bearing', focus:['release-bearing','release-fork','fork-spring'],
      move:move(['release-bearing','release-fork','fork-spring'],parkedBox),
      description:'Align the bearing flats with the fork and refit its spring. Follow the lubrication instructions for the metal or plastic sliding sleeve fitted.', manual:releaseManual },
    { action:'Slide the gearbox home', focus:['input-shaft','main-case'],
      move:move(installedGearbox.filter(id=>!['shift-carrier','selector-rod'].includes(id)),seat),
      description:'Remove the centering mandrel. Verify both bellhousing dowels and guide the input shaft through the disc by hand on the jack. Keep the case supported as it seats. Match the torque to the bolt type and size in BMW 23 00 1AZ.' },
    { action:'Restore the slave, linkage and shaft', focus:['slave-cylinder','selector-rod','e30assembly:propeller:flex-disc'],
      move:move(['slave-cylinder','shift-carrier','selector-rod','e30assembly:propeller:flex-disc','e30assembly:propeller:front-section'],seat),
      description:'Refit the supported crossmember and slave, with the bleeder down. Restore linkage, reverse wiring, and the indexed shaft. Follow BMW’s center-mount preload and coupling hardware instructions before closing the heat shield and exhaust.' },
  ],
};

export const getragService: AssemblyProcedure = {
  ...getrag, id:'e30-getrag', title:'Getrag 260 bench service', entryView:[.84,.66,1.45],
  manuals:[factoryPage(169),factoryPage(174),vehicleManual],
  before:'This job starts with the gearbox out of the car. Open BMW 23-1/23-2 for its removal, or use Clutch & release service to see the fitted gearbox and the parts around it.',
  parts:benchParts,
  completed:'Gearbox reassembled. Verify shaft play, selector operation and approved oil before returning it to service.',
  steps:[
    { action:'Set up the gearbox on the bench', focus:['main-case','tail-case'],
      description:'Start with the 260 five-speed overdrive gearbox removed and supported. Confirm the case type against the factory section drawing. Keep retainers, shims and springs in removal order.', tools:'BMW holder 23 0 090 with stand 00 1 490', manual:factoryPage(165) },
    { action:'Drain the gear oil', focus:['drain-plug'], move:move(['drain-plug'],[0,-.092,.15]),
      description:'Catch and inspect the oil before opening the case. Use fluid matched to the gearbox label when refilling.' },
    { action:'Remove the release fork and bearing', focus:release,
      move:[...move(['fork-spring'],[.14,.08,.16]),...move(['release-fork','release-bearing'],[.23,.04,-.27])],
      description:'Unclip the spring, then withdraw the fork and bearing together from the guide sleeve.', manual:factoryPage(170) },
    { action:'Remove the guide sleeve screws', focus:guideBolts, move:move(guideBolts,[.17,.14,-.38]),
      description:'Remove all six screws from the guide sleeve flange.', tools:'10 mm socket on the cataloged M6 hex screws', manual:factoryPage(171) },
    { action:'Remove the guide sleeve and shim', focus:['guide-sleeve','guide-spacer'],
      move:move(['guide-sleeve','guide-spacer'],guideRemoved),
      description:'Draw the guide sleeve off the input shaft and retain the shim for measurement.', manual:factoryPage(171) },
    { action:'Remove the reverse switch and interlock', focus:['reverse-light-switch',...interlock],
      move:[...move(['reverse-light-switch'],[0,.15,.24]),...move(interlock,[0,.17,.27])],
      description:'Unscrew the reverse-light switch and draw the cap, spring and interlock pin out in the order shown by BMW. Record the pin orientation.' },
    { action:'Remove the input ring and stop washer', focus:inputRetainers,
      move:move(inputRetainers,[.16,.035,.30]), description:'Remove the input-bearing retaining ring and the washer behind it. BMW calls for a new ring on assembly.', tools:'Snap-ring pliers' },
    { action:'Release the reverse retainer and case seam', focus:['reverse-retainer',...seam],
      move:[...move(['reverse-retainer'],[-.02,-.055,-.16]),...move(seam,[-.11,.07,.26])],
      description:'Remove the reverse-shaft retaining screw, drive the locating pins out and free the case bolts. Record the position of the longer 8 × 60 mm bolt.' },
    { action:'Pull the front case section', access:mainCase.slice(0,1), focus:mainCase, move:move([...mainCase,'fork-pivot'],frontOff),
      description:'Use the puller against the input shaft as shown by BMW. Support the castings and protect the sealing faces. The rear section still carries the geartrain.', tools:'BMW 23 1 460 and 33 1 301', manual:factoryPage(169) },
    { action:'Release the front input bearing', focus:['front-main-bearing'],
      move:move(['front-main-bearing'],[.21,.07,.14]), description:'Keep track of the bearing’s extended inner race. Its protrusion faces the gears on installation.', manual:factoryPage(170) },
    { action:'Remove the output lockplate and nut', focus:['output-lockplate','output-nut'],
      move:move(['output-lockplate','output-nut'],[-.16,.11,.06]),
      description:'Free the lockplate, then counterhold the flange and undo the collar nut.', tools:'BMW 23 1 200, 23 0 020 or 23 1 320 as applicable, and 23 1 210', manual:factoryPage(174) },
    { action:'Pull the output flange', focus:['output-flange'], move:move(['output-flange'],[-.19,.035,.03]),
      description:'Pull the flange straight off the output shaft with the proper tool.', tools:'BMW puller 33 1 150', manual:factoryPage(174) },
    { action:'Withdraw the reverse idler assembly', focus:['reverse-idler'],
      move:move(['reverse-idler'],[.12,.065,-.29]), description:'Release the reverse shaft holder and retaining bolt. Withdraw the shaft, idler and needle bearing as shown in the factory procedure.', manual:factoryPage(174) },
    { action:'Free the selector and detents', focus:ids('selector-fork-',3),
      description:'Follow BMW 23-174 and 23-175 for the selector shaft and rollers, end plate, three springs, and 3rd/4th rail. Engage the specified gears before pressing the pack out. Keep the detents and interlock parts indexed.', manual:factoryPage(175) },
    { action:'Press out the shaft pack', focus:['input-shaft','mainshaft','countershaft'], move:move(shafts,shaftTray),
      description:'The input, output and countershaft pack comes out together. Use the specified fixture and protect the case surface. Keep force off the selector rods and countershaft.', tools:'BMW 23 1 050', manual:factoryPage(175) },
    { action:'Draw the shafts into the rear case', focus:['input-shaft','mainshaft','countershaft'], move:move(shafts,seat),
      description:'Check the bearings, thrust washer and installed gear positions. Follow BMW’s heating, selector alignment and pull-in sequence with the rear case supported.', tools:'BMW 23 1 300 and 23 2 150', manual:factoryPage(176) },
    { action:'Restore the selector and reverse idler', focus:['reverse-idler',...ids('selector-fork-',3)],
      move:move(['reverse-idler'],seat), description:'Reinstall the rails, pins, balls and springs in the specified order and orientation. Replace the required pins and radial seal. Seat the reverse idler and secure its holder.', manual:factoryPage(177) },
    { action:'Seat the output flange', focus:['output-flange'], move:move(['output-flange'],seat),
      description:'Seat the flange on the output shaft. Check the correct seal and flange version against the manual.', manual:factoryPage(178) },
    { action:'Secure the output collar', focus:['output-nut','output-lockplate'], move:move(['output-nut','output-lockplate'],seat),
      description:'Fit the collar nut, counterhold and tighten to the applicable specification. Fit and lock the retaining plate.', manual:factoryPage(178) },
    { action:'Seal and mate the front case', focus:mainCase, move:move([...mainCase,'fork-pivot'],seat),
      description:'Clean the mating faces and apply the specified sealant. Align the countershaft bearing during assembly as shown in BMW 23-170. Seat both castings squarely before installing the case hardware.', manual:factoryPage(170) },
    { action:'Install the case hardware and interlock', focus:[...seam,...interlock],
      move:move([...seam,...interlock,'reverse-retainer','reverse-light-switch'],seat),
      description:'Return the dowels, correct-length bolts, reverse retainer, interlock and switch to their positions. Tighten the case seam bolts to 22 N·m per BMW 23 11 1AZ and use the dedicated values for the other fasteners.', manual:torqueManual },
    { action:'Seat the front bearing and set play', focus:['front-main-bearing',...inputRetainers],
      move:move(['front-main-bearing',...inputRetainers],seat),
      description:'Fit the extended inner race toward the gears with the prescribed heating and press tools. Fit the washer and new circlip. Check 0–0.09 mm play between the bearing inner race and the circlip.', tools:'BMW 23 1 007, 23 1 000 and 23 1 006', manual:factoryPage(170) },
    { action:'Refit the guide sleeve and shim', focus:['guide-sleeve','guide-spacer',...guideBolts],
      move:move(guide,seat),
      description:'Align the guide sleeve oil groove and set its shim per the manual. BMW lists 10 N·m for the M6 screws in 23 11 2AZ.', manual:factoryPage(171) },
    { action:'Refit the release assembly and drain plug', focus:[...release,'drain-plug'],
      move:move([...release,'drain-plug'],seat),
      description:'Refit the fork and bearing, secure the spring, and close the drain. Verify free rotation and gear selection before filling.', manual:factoryPage(170) },
  ],
};
