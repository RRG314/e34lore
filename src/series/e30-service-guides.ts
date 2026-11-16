import type { ManualGuide } from '../data/manual';
import { repairSpecs } from '../servicing/repair-specs';
import { e30FactorySourceHash } from './e30-factory-guides';
import { e30ManualGroupForPage } from './e30-factory-index';

type Procedure = {
  id: string;
  system: string;
  level: ManualGuide['level'];
  duration: string;
  pages: readonly number[];
  requiredParts?: string[];
  section: string;
  cautions: string[];
  steps: readonly (readonly [title: string, instruction: string, check: string, page?: number])[];
};

const raisedCar = 'Chock the wheels and support the car on rated stands or a lift before removing a wheel. A jack alone is insufficient.';
const brakes = 'Keep grease off the disc and lining. Support the caliper independently of its hose.';
const pedal = 'Pump the pedal until firm before moving the car. Stop if the pedal sinks, a leak appears or the brakes drag.';
const coldEngine = 'Let the engine cool before working around the plugs, fan or exhaust.';
const steps: Procedure[] = [
  {
    id:'e30-wheel-removal',system:'suspension',level:'Beginner',duration:'15–25 min',
    pages:[724],section:'36-6 · 36 10 300',
    cautions:[raisedCar,'Use 110 Nm for the stock wheel and bolts covered by the U.S. handbook. Check the wheel maker’s spec for aftermarket hardware.'],
    steps:[
      ['Chock the car and loosen the bolts','Park on level ground. Loosen each bolt slightly with the wheel on the ground. Raise and support the car at the specified points.', 'The wheel is off the ground and the car is stable.',724],
      ['Inspect the seats and mating faces','Support the wheel while removing the bolts. Clean the flat hub and wheel mating faces. Check that the replacement bolt seat and length match the wheel.', 'The wheel sits flat against the hub and all bolts start by hand.',724],
      ['Tighten in a cross pattern','Snug the bolts evenly in a cross pattern, then use the specified torque with the wheel held against turning.', 'Every bolt reached the applicable torque.',724],
    ],
  },
  {
    id:'e30-front-brake-pads-discs',system:'brakes',level:'Intermediate',duration:'1–2 hr per axle',
    requiredParts:['Matched front pad set and new guide-pin bolts.', 'Two matching discs if the discs are being replaced.'],
    pages:[643,644],section:'34-4 to 34-5 · front pads and discs',
    cautions:[raisedCar,brakes,pedal,'Check the caliper design first. This sequence covers the bolt-to-guide-pin design with the 35 Nm fastener.'],
    steps:[
      ['Check the caliper and disc','Remove the front wheels. Compare the caliper and guide fasteners to BMW’s illustration. Check the disc with a micrometer and confirm the minimum thickness for that disc.', 'The guide-pin bolt design, pad set and disc match the installed hardware.',643],
      ['Remove the pads','Disconnect the wear sensor if fitted. Counterhold the guide pin while removing the retaining bolt. Hang the caliper and remove the pads.', 'No tension or twist is on the hose.',643],
      ['Remove or check the disc','For replacement, remove the carrier and disc screw. Clean the hub mating face and check that the new disc sits flat. Tighten the retaining screw to 16 Nm and the carrier bolts to 123 Nm on this RWD application with the factory thread preparation.', 'The disc sits flat and turns without interference.',644],
      ['Install pads and check pedal','Press the piston back with a spreader while watching reservoir level. Fit the pads and sensor, renew the illustrated guide-pin bolts and tighten them to 35 Nm. Refit the wheels, pump the pedal and check braking at low speed.', 'The pedal is firm and both front brakes operate normally.',643],
    ],
  },
  {
    id:'e30-rear-brake-pads-discs',system:'brakes',level:'Intermediate',duration:'1–2 hr per axle',
    requiredParts:['Matched rear pad set.', 'Two matching discs if the discs are being replaced.'],
    pages:[647,649],section:'34-8 to 34-9 · rear pads and discs',
    cautions:[raisedCar,brakes,pedal,'Chock the car independently of the parking brake. Release that brake before removing the rear discs.'],
    steps:[
      ['Remove the pads','Remove the caps and use a 7 mm hex bit on the original guide bolts. Hang the caliper. Note the positions of the pads and retaining spring.', 'The rear caliper is supported and the pads match the replacements.',647],
      ['Fit the rear discs','Remove the carrier and retaining screw. Back off the parking brake shoe adjuster if the disc will not release. Clean the hub face and inspect the shoe linings before seating the new disc.', 'The disc seats flat and the parking brake shoes stay in place.',649],
      ['Refit and check','Tighten the disc screw to 16 Nm, the carrier to 67 Nm and the original 7 mm guide bolts to 30 Nm with −5 Nm tolerance. Restore the parking brake adjustment and pump the service pedal before driving.', 'Both discs turn freely with the brake released and hold when applied.',649],
    ],
  },
  {
    id:'e30-brake-fluid-flush',system:'brakes',level:'Intermediate',duration:'45–90 min',
    pages:[641],section:'34-2 · 34 00 046 / 047',
    requiredParts:['Fresh approved brake fluid in a sealed container.'],
    cautions:[raisedCar,pedal,'Brake fluid damages paint. Do not let the reservoir run dry or exceed the pressure limit.'],
    steps:[
      ['Identify ABS and prepare the bleeder','Use the fresh fluid specified for the installed brake system. Connect a reservoir pressure bleeder with a sound cap gasket. BMW gives a 2 bar maximum for the pressure equipment on this page.', 'The bleeder holds pressure without leaks and the reservoir stays supplied.',641],
      ['Bleed in the correct sequence','For ABS, follow 34 00 047. Start at the right rear, then left rear, right front and left front. At each wheel, hold the pedal down and open the bleeder. Release the pedal and stroke it fully 12 times. Hold it down, close the bleeder, then release the pedal. For conventional brakes, use 34 00 046 and close each bleeder when the fluid is clear of air.', 'Fresh, bubble-free fluid emerges from each bleed hose.',641],
      ['Close the bleeders and check','Tighten a 7 mm wrench-size bleeder to 5 Nm or a 9 mm one to 6 Nm. Release bleeder pressure before removing the cap, set the reservoir level and check at all four wheels.', 'No fluid leaks and a held pedal stays firm.',641],
    ],
  },
  {
    id:'e30-front-control-arm',system:'suspension',level:'Advanced',duration:'1–2 hr per side',
    requiredParts:['Wishbone for the correct side and its locking hardware.'],
    pages:[507],section:'31-6 · front wishbone replacement',
    cautions:[raisedCar,'Keep both ball-joint tapers and their seats clean and dry. Fit locking hardware that matches each joint.'],
    steps:[
      ['Match the replacement arm','Check the side, steel arm and bushing position against the original. Support the hub so the brake hose cannot be pulled.', 'The replacement arm, bracket and fasteners match the RWD application.',507],
      ['Release the joints and bracket','Remove the inner and outer joint nuts and separate the tapered joint with the factory separator specified for the strut. Unbolt the rear bushing bracket and withdraw the arm.', 'The dust boots, hub and hose are clear of the tool path.',507],
      ['Fit the arm and verify steering','Seat the joints and install the specified locking nuts. Tighten the inner joint to 85 Nm, outer joint to 65 Nm and bracket to 42 Nm. Check for full steering travel and arrange an alignment.', 'The joints are seated, boots intact and alignment checked before normal use.',507],
    ],
  },
  {
    id:'e30-tie-rod',system:'suspension',level:'Advanced',duration:'1–2 hr per side',
    requiredParts:['Tie rod for the installed rack, new securing plate and outer locking hardware.'],
    pages:[583],section:'32-8 · 32 21 251',
    cautions:[raisedCar,'Preserve the rack boot seal. A measured starting length still requires alignment.'],
    steps:[
      ['Record the existing adjustment','Center the steering and measure the fitted tie rod between repeatable points. Record the length before loosening the adjuster.', 'A starting length is recorded for the same side of the car.',583],
      ['Release the outer and inner joints','Use the extractor for the tapered stud. Release the boot and securing plate, then remove the inner joint using the BMW tool that matches the fitted rack.', 'The rack threads and boot sealing surfaces are undamaged.',583],
      ['Refit, secure and align','Use a new securing plate and tighten the inner joint to 75 Nm. Fit the correct outer locking hardware and tighten the stud to 36.5 ± 3.5 Nm. Set the recorded length, then have toe set and the adjuster clamp tightened to 14 Nm under normal load.', 'The rack boot is sealed, the steering moves freely and toe is set.',583],
    ],
  },
  {
    id:'e30-front-wheel-bearing',system:'suspension',level:'Advanced',duration:'1–2 hr per side',
    requiredParts:['Hub with integral bearing, collar nut and grease cap.'],
    pages:[514,515],section:'31-10 to 31-10.1 · 31 21 180',
    cautions:[raisedCar,brakes,'Use a new collar nut and grease cap. Check the separate 325iX procedure if the hub is driven.'],
    steps:[
      ['Expose the RWD hub','Remove the disc and hang the caliper. Lift the grease cap, then release the staking on the M24 collar nut before using a 36 mm thin-wall socket.', 'The stub axle threads and ABS sensor are undamaged.',514],
      ['Pull off the hub and fit the new unit','Use BMW’s puller and installer arrangement. If a bearing race stays on the stub axle, use the specified race puller. Clean and inspect the journal before seating the new hub.', 'The hub seats fully without hammering through the bearing.',515],
      ['Torque, stake and check','Tighten the new collar nut to 290 Nm, stake it and install the cap. Refit the brakes and wheel, check free rotation and verify that there is no bearing play.', 'The staking is secure and the brake pedal is firm.',515],
    ],
  },
  {
    id:'e30-front-strut',system:'suspension',level:'Advanced',duration:'2–4 hr per side',
    requiredParts:['Matched strut inserts or mount components as required and new upper-mount locking nuts.'],
    pages:[516,519,520,521],section:'31-11 to 31-14 · 31 31 000 / 31 32 001',
    cautions:[raisedCar,'Never release the shaft nut while the spring bears on the mount. Use a compressor with the correct hooks for the spring.'],
    steps:[
      ['Remove the strut assembly','Support the hub and brake caliper. Disconnect the links shown on page 31-11 and clear the hose and sensor leads before releasing the top mount.', 'The assembly comes out without pulling on brake or sensor lines.',516],
      ['Unload the upper mount','Check the parts order on 31-12. Fit BMW 31 3 111 or a correctly sized equivalent and compress the spring until it is free of the mount. Counterhold the shaft with the tool specified for its head.', 'The compressor is seated securely and the spring is unloaded at its ends.',520],
      ['Replace the insert or upper mount','Use the established collar tool for the cartridge. Assemble the isolators, spring and mount in BMW’s order. Select the shaft-nut torque using the actual internal or external hex design from the specification card.', 'The spring ends are in their seats before the compressor is removed.',521],
      ['Install and check alignment','Install the complete strut with new locking nuts at the upper body mount and tighten them to 22 Nm. Use the linked front axle specifications for the joints disturbed during removal. Restore hose support and have alignment checked.', 'Steering moves freely with no contact or tension on the leads.',516],
    ],
  },
  {
    id:'e30-m20-spark-plugs',system:'engine',level:'Beginner',duration:'30–60 min',
    requiredParts:['Six identical spark plugs approved for the installed M20.'],
    pages:[],section:'12 12 · M20 ignition wires and spark plugs',
    cautions:[coldEngine,'Work on one lead at a time. Start the new plug by hand to protect the head threads.'],
    steps:[
      ['Identify the plug and socket','Match the factory application before opening the plug boxes. Use a 21 mm deep spark plug socket for the listed Bosch W-series plugs or 20.8 mm (13/16 in) for NGK ZGR5A. Check the gap only where the plug maker permits adjustment.', 'All six plugs are the same approved type.'],
      ['Remove and inspect','Pull each connector by its boot with the specified plug-lead pliers. Clear grit from around the plug before removing it. Record the condition by cylinder if the old plugs show unusual deposits.', 'The plug holes are clean and the leads remain in firing order.'],
      ['Install and check','Install the plugs by hand, then tighten the clean, dry factory-type M14 plugs to 30 ± 3 Nm, subject to the replacement plug’s installation instructions. Refit the connector fully and check for a smooth idle after all six are installed.', 'Every boot is seated and the engine runs evenly.'],
    ],
  },
  {
    id:'e30-m20-alternator-terminals',system:'electrical',level:'Intermediate',duration:'25–45 min',
    pages:[],section:'12 31 · M20 alternator terminals',
    cautions:[coldEngine,'Disconnect the battery negative cable before touching B+. Do not bridge a live output terminal to the case.'],
    steps:[
      ['Identify the terminals','Use the matching electrical diagram and alternator markings to distinguish B+ from D+. Photograph the cable positions before disconnecting anything.', 'The alternator label and both terminal markings are readable.'],
      ['Refit and tighten','Clean the mating faces and reinstall the leads without letting the studs turn. Use 13 Nm on factory M20 B+ and 5 Nm on D+ after confirming the alternator type.', 'Both leads sit flat and the terminal insulation is intact.'],
      ['Restore insulation and test','Refit the B+ cover before reconnecting the battery. Verify that the charge warning lamp comes on with ignition and goes out after starting.', 'The wiring is covered and the warning lamp behaves normally.'],
    ],
  },
  {
    id:'e30-manual-gearbox-fluid',system:'drivetrain',level:'Intermediate',duration:'45–75 min',
    pages:[],section:'00 11 229 · Manual transmission oil change',
    requiredParts:['Approved fluid identified from the Getrag case label.'],
    cautions:[raisedCar,'Identify the original Getrag 260 and its fluid label before draining. Similar cases may use different fluids.'],
    steps:[
      ['Confirm the fluid and access','Check the case label and identify both plugs. Support the car level and confirm the fill plug can be removed.', 'You have the correct fluid and can refill the gearbox.'],
      ['Drain the gearbox','Remove the lower plug and collect the old fluid. Clean the magnet, inspect for large debris and refit the original-style drain plug at 50 Nm.', 'The plug and mating face are clean and the threads are sound.'],
      ['Refill at the lower edge of the fill opening','With the vehicle level, pump in the approved fluid until it reaches the lower edge of the opening. Seal the original fill plug at 50 Nm and clean the case so a leak is visible.', 'The fill level is correct and both plugs stay dry.'],
    ],
  },
  {
    id:'e30-4hp22-sump',system:'drivetrain',level:'Intermediate',duration:'1–2 hr',
    pages:[388],section:'24-110 · 24 11 002',
    requiredParts:['Approved ATF for the identified transmission, profile gasket and drain plug seal.'],
    cautions:[raisedCar,'Let hot fluid cool before draining. Stop if the fluid is burnt or contains substantial debris. Diagnosis comes before a refill.'],
    steps:[
      ['Identify the pan and drain','Read the transmission tag. Confirm the fitted pan, dipstick, plug and replacement gasket. Drain the ATF with the car supported level.', 'The drain plug matches the M10 specification and the drained fluid has been inspected.',388],
      ['Clean and refit the pan','Disconnect the dipstick tube fitting and remove the pan. Clean the pan and both magnets. Refit them and a new profile gasket with the pan bracket orientation shown in the manual. Use the E30 archive’s 7 Nm for its original M6 pan screws and 16 Nm for the original M10 drain plug.', 'Both magnets are in place, the gasket has stayed seated and the tube is sealed.',388],
      ['Refill and check at temperature','Use the BMW filling funnel and approved fresh ATF. Follow the manual’s dipstick marks for the initial fill. Recheck at about 80 °C on level ground with the selector in P and engine idling.', 'The level is within the marked range at the specified temperature and the pan and tube are dry.',388],
    ],
  },
  {
    id:'e30-m20-starter-terminals',system:'electrical',level:'Intermediate',duration:'25–45 min',
    pages:[],section:'12 41 · Starter wiring connections',
    cautions:[coldEngine,'Disconnect the battery negative cable before uncovering the starter supply terminal.'],
    steps:[
      ['Identify the starter and its connections','Confirm the starter label and note the wiring position at each marked terminal. Compare the layout to the electrical manual for the installed transmission.', 'Each cable is identified by the terminal marking on the starter.'],
      ['Inspect and reconnect','Check the terminals for damaged threads and heat discoloration. Clean the cable eyelets and tighten the applicable factory nuts to 12 Nm on 30, 6 Nm on 50 and 5 Nm on 30h when fitted.', 'The eyelets sit flat and no terminal has twisted.'],
      ['Refit insulation and check starting','Cover the live terminal before reconnecting the battery. Verify that the starter engages and stops as expected when the key is released.', 'Covers are secure and the starter works normally.'],
    ],
  },
  {
    id:'e30-front-control-arm-bush',system:'suspension',level:'Advanced',duration:'1–2 hr per side',
    pages:[510],section:'31-8 · 31 12 130',
    requiredParts:['Matched left and right rubber mounts for the installed wishbones.'],
    cautions:[raisedCar,'The bush is a press fit. Stop if the bracket or press fixture cannot be supported squarely.'],
    steps:[
      ['Mark the brackets and check the bushes','Identify each side and record the orientation marks. Confirm the replacement pair is for the six-cylinder RWD arm.', 'The mounting style and marks match the factory illustration.',510],
      ['Press in the new bushes','Support each bracket in BMW 31 2 130 or the matching fixture. Align its mark with the new bush and press the bush in flush from the beveled end as shown.', 'Each bush is flush and its marks align with its bracket.',510],
      ['Refit and verify under normal load','Refit the brackets and tighten them to 42 Nm. With the car at normal load, measure clearance A where the workshop drawing shows it.', 'Clearance A measures 0.7–1.7 mm on both sides.',510],
    ],
  },
  {
    id:'e30-front-stabilizer',system:'suspension',level:'Intermediate',duration:'1–2 hr',
    pages:[530],section:'31-17 · 31 35 000',
    requiredParts:['Matched links or mount bushes for the measured bar diameter if replacing them.'],
    cautions:[raisedCar,'Support the front evenly before disconnecting the bar. Confirm it is free of load at the links.'],
    steps:[
      ['Identify the layout and measure the bar','Compare the arm-mounted link and clamp positions with the BMW diagram. Measure the bare bar at the bushing seat before ordering rubber mounts.', 'The link type and bush bore match the car.',530],
      ['Release the bar','Counterhold the links while disconnecting both ends. Release the left wishbone bracket as shown for access and remove both bar mounts.', 'The bar comes out without contacting the steering or brake lines.',530],
      ['Install and check clearance','Refit the mounts and links, aligning the bar laterally. Tighten the link-to-bar nuts to 47 Nm and the factory M8 clamp fasteners to 22 Nm. Restore any link pivot bracket disturbed during the work to its 42 Nm specification.', 'Both links articulate and the bar clears nearby components.',530],
    ],
  },
];

export const e30ServiceGuides: ManualGuide[] = steps.map(job => {
  const spec = repairSpecs.find(item => item.series === 'e30' && item.guide === job.id);
  if (!spec?.tools?.length || !spec.specs?.length) throw Error('Missing service specifications for ' + job.id);
  const pageLink = (pdf: number) => {
    const group = e30ManualGroupForPage(pdf);
    if (!group) throw Error('Unknown E30 factory manual page ' + pdf);
    return '/manual/' + group.id + '?pdf=' + pdf;
  };
  const evidence = [spec.manual, ...(spec.compare ?? []), ...(spec.catalog ? [spec.catalog] : [])];
  return {
    slug:job.id,title:spec.title,system:job.system,engines:['M20'],level:job.level,
    kind:'replacement',duration:job.duration,durationBasis:'Planning estimate for stock hardware in serviceable condition.',
    summary:spec.scope,
    reviewStatus:'draft',sourceChecked:true,applicability:spec.scope,
    source:{id:'e30-factory-repair-upload',title:'BMW E30 Repair Manual',section:job.section,pdfPages:[...job.pages]},
    evidence:[...new Map(evidence.map(source => [source.href,source])).values()],
    tools:[...spec.tools],cautions:job.cautions,
    jobSupport:{
      reviewedOn:'2026-11-16',sourceSha256:e30FactorySourceHash,
      requiredParts:job.requiredParts ?? [],conditionalParts:[],stopConditions:[],
      steps:job.steps.map(([, , , pdf],index)=>({
        number:index+1,tools:[],
        source:pdf === undefined
          ? {printed:spec.manual.label,href:spec.manual.href}
          : {printed:job.section,pdf,href:pageLink(pdf)},
      })),
    },
    steps:job.steps.map(([title,body,check])=>({title,body,check})),
  };
});
