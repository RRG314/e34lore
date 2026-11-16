import type { Procedure } from './e30-service-guides';

const cold = 'Wait for the engine and coolant to cool completely before opening the system. Catch the coolant and keep it away from children and animals.';
const supported = 'Chock the wheels and use a rated lift or stands. Keep the removed assembly supported separately.';
const electrical = 'Switch off the ignition and disconnect the battery ground before disconnecting the wiring.';
const hotGlass = 'Let the lamp cool. Handle a halogen bulb by its base and protect the glass from scratches and fingerprints.';

export const e30MaintenanceProcedures: Procedure[] = [
  {
    id:'e30-coolant-bleeding',system:'cooling',level:'Intermediate',duration:'30–60 min plus cool-down',
    pages:[332,337],section:'17-6 · 17 00 039 and late tank on 17-8/1',
    cautions:[cold,'Stop the engine if the temperature rises abnormally, coolant escapes, or cabin heat drops out when the engine is warm.'],
    requiredParts:['Fresh coolant approved for the installed engine, mixed to the required concentration.'],
    steps:[
      ['Open the cold system','With the engine off, set the heater to hot. Open the separate expansion tank and loosen the 8 mm thermostat-housing bleed screw.', 'The open bleeder is at the M20 thermostat housing.',332],
      ['Fill slowly and close the bleeder','Pour into the expansion tank until a steady, bubble-free stream reaches the bleed point. Close the original bleeder at 8 Nm. Set the cold level to the molded mark and install the cap.','The bleeder and cap are seated and the tank is at its cold mark.',332],
      ['Warm, cool and check again','Run in a well-ventilated area and monitor the gauge and cabin heat. Shut down and let everything cool fully. Recheck the level at about 20 °C and inspect the joints and bleed screw for leaks.','The cold level is stable and there is no leak or overheating.',337],
    ],
  },
  {
    id:'e30-radiator',system:'cooling',level:'Intermediate',duration:'1–2 hr plus cool-down',
    relatedGuides:['e30-coolant-bleeding', 'e30-expansion-tank'],
    pages:[333,334],section:'17-7 to 17-7/1 · 17 11 000',
    cautions:[cold,'This procedure covers the manual-transmission radiator. An automatic has separate cooler lines and requires an ATF level check.'],
    requiredParts:['Radiator for the late manual 325i, approved coolant and any failed mounts or hose clamps.'],
    steps:[
      ['Drain and free the shroud','Disconnect the battery ground. Catch the coolant at the lower drain. Release the shroud retainers and lift or park the shroud as the manual shows. Disconnect the hoses and any temperature-switch plug.','The radiator can move without pulling hoses or wiring.',333],
      ['Lift the radiator and transfer hardware','Remove the upper mounting hardware. Lift the radiator out of its rubber supports. Check the supports, shroud, drain plug and any used temperature-switch seal before transferring hardware.','The replacement core and lower locating pegs match the original.',334],
      ['Fit, refill and leak-check','Seat the radiator on its supports. Tighten the original M6 mount to 10 Nm and the catalog-style drain plug to 2.5 Nm. Reconnect the switch, hoses and shroud. Follow the M20 fill and bleed guide before checking for leaks and fan clearance.','The housing is supported and the fan turns without shroud contact.',334],
    ],
  },
  {
    id:'e30-expansion-tank',system:'cooling',level:'Intermediate',duration:'30–60 min plus cool-down',
    relatedGuides:['e30-coolant-bleeding'],
    pages:[337],section:'17-8/1 · 17 11 100',
    cautions:[cold,'Match the late separate tank and all three hose connections before removing the old tank.'],
    requiredParts:['Late expansion tank, correct level-switch seal, coolant and replacement clamps for the opened connections.'],
    steps:[
      ['Drain to below the tank','Open the cold cap and catch the coolant. Unplug the level switch and label the lower hoses and small vent line before disconnecting them.','Each hose is identified and isolated clear of the mount.',337],
      ['Transfer the switch and fit the tank','Unclip the tank from its bracket. With a new seal, tighten the original 30 mm wrench-size level switch to 3 Nm. Engage the replacement tank in all bracket clips and reconnect the original hose routing.','The tank is secure and each hose is fully seated without a kink.',337],
      ['Refill and verify','Bleed at the M20 thermostat housing, then recheck the level at about 20 °C. Inspect the tank seams, hose joints and switch seal and check for a low-level warning.','The joint surfaces are dry and the level is stable.',337],
    ],
  },
  {
    id:'e30-m20-timing-belt',system:'engine',level:'Advanced',duration:'3–5 hr',
    relatedGuides:['e30-radiator', 'e30-coolant-bleeding'],
    pages:[110,111],section:'11-66a to 11-66b · 11 31 110',
    cautions:[cold,'Keep the crank and cam timed together. Stop if the marks disagree, a sprocket profile is uncertain, or the engine binds by hand.'],
    requiredParts:['Matching 127-tooth semicircular belt and tensioner for the late M20B25. Inspect the spring and plunger.'],
    steps:[
      ['Clear the front of the engine','Use the referenced coolant and belt access procedures to remove the radiator, viscous fan, accessory belts, pump pulley, distributor components and timing covers. Retain the crank sensor and damper orientation. If hub removal is needed, use the BMW hub holder and separate tightening procedure.','The cam and crank timing marks are visible.',110],
      ['Set number one to compression TDC','Turn the crankshaft in the normal direction by hand. Verify both marks. Retract the tensioner against its spring and lock it in that position with the bolt indicated in the BMW drawing. Remove the old belt without moving either shaft.','Both marks remain aligned and the late sprockets match the new belt.',111],
      ['Fit and tension the new belt','Route the belt from crank to intermediate shaft to cam, then around the tensioner. Keep slack at the tensioner. Release the roller and rotate the crank slowly through two turns. Verify both marks and tighten the two tensioner bolts to the belt maker’s 16 lb-ft (about 22 Nm), in the specified order.','The marks return to alignment with no binding.',111],
      ['Refit and check','Refit the covers, sensor, distributor and front drive in their original positions. Restore the cooling system and verify that wiring and hoses clear all moving parts before starting.','Coolant is bled, the engine runs smoothly, and the covers and lines are secure.',110],
    ],
  },
  {
    id:'e30-clutch-bleeding',system:'drivetrain',level:'Intermediate',duration:'30–60 min',
    pages:[358],section:'21-1 · 21 00 006',
    cautions:[supported,'Brake fluid damages paint. Keep the shared reservoir supplied. Never press the pedal while the slave cylinder is detached.'],
    requiredParts:['Fresh brake fluid approved for the clutch hydraulics.'],
    steps:[
      ['Prepare the reservoir','Inspect the slave and feed for leaks. Fit the pressure-bleeder adapter and support the car with safe access to the transmission.','The reservoir is supplied and the adapter seals.',358],
      ['Purge the slave cylinder','Attach the clear hose and open the fitted bleed screw. Work the pedal as shown while fluid runs into the bottle. Close the bleeder when the stream is free of bubbles.','The bleeder is closed and no air is visible in the hose.',358],
      ['Verify release travel','Depressurize the bleeder, restore the reservoir cap and check the pedal. If air remains after repeating the procedure, follow BMW’s detached-slave step with the piston controlled. Do not use the pedal during that step.','The clutch disengages consistently and all hydraulic connections stay dry.',358],
    ],
  },
  {
    id:'e30-driveshaft-flex-disc',system:'drivetrain',level:'Advanced',duration:'2–4 hr',
    relatedGuides:['e30-driveshaft-center-support'],
    pages:[459,460],section:'26-6 · 26 11 051',
    cautions:[supported,'Let the exhaust cool. Support the shaft, keep its halves indexed and keep its weight off the fuel crossover line. This guide covers the Getrag 260 layout.'],
    requiredParts:['Flex disc for the fitted flange, matching bolts and new self-locking nuts.'],
    steps:[
      ['Expose and support the shaft','Remove the required exhaust sections and heat shields. Mark the flange and shaft orientation. Use BMW 26 1 040 to loosen the sliding joint ring.','The shaft and exhaust are supported with the oxygen sensor lead and fuel lines clear.',459],
      ['Replace the coupling','Release the transmission flange and support bracket. Move the shaft far enough to clear the centering pin without separating its halves. Install the new disc with the molded arrows toward the flange arms.','Every arrow points to the corresponding flange and the bolts retain their specified orientation.',460],
      ['Set preload and torque','Check the centering pilot. Use the torque row for the marked M10 bolt grade. Preload the support 4–6 mm toward the front and tighten its fasteners to 21 Nm. Tighten the fitted RWD sliding ring to 10 Nm after the shaft is installed.','The support is preloaded, the coupling is seated, and the shaft turns freely.',460],
    ],
  },
  {
    id:'e30-rear-shock-absorbers',system:'suspension',level:'Intermediate',duration:'1–2 hr per axle',
    pages:[636],section:'33-16 · 33 52 000',
    cautions:[supported,'The shock limits trailing-arm droop. Support the arm before undoing the lower bolt and confirm its grade before tightening.'],
    requiredParts:['Matched rear shocks or upper mounts as needed, new upper gaskets and applicable self-locking nuts.'],
    steps:[
      ['Expose the mount and support the arm','Move aside trunk trim. Support the semi-trailing arm before releasing the lower shock bolt. Protect nearby brake hoses and body trim.','The trailing arm remains supported as the shock is unloaded.',636],
      ['Change the shock or upper mount','Remove the upper mount fasteners and withdraw the shock. Replace the gasket. If reusing the mount, inspect its rubber and tighten the original shaft nut to 15 Nm with the correct counterhold. Prime dampers only as their manufacturer specifies.','The gasket sits flat and the mount has no torn rubber or looseness.',636],
      ['Tighten at installed height','Tighten the upper M8 fasteners to 22 Nm. Bring the arm to normal ride position and use the confirmed lower-bolt specification for its grade and source.','The hardware is secure, the arm moves freely, and the trim is refitted.',636],
    ],
  },
  {
    id:'e30-handbrake-adjustment',system:'brakes',level:'Intermediate',duration:'30–60 min',
    pages:[642],section:'34-3 · 34 10 014',
    cautions:[supported,'This is the disc-brake layout with small shoes inside the rear rotor hats. Repair a seized cable or contaminated shoe before adjusting.'],
    steps:[
      ['Back off the cables','Release the parking brake fully. Check that both cables move freely. Lift the lever boot and loosen the cable adjusting nuts so the shoes can settle.','Both rear wheels turn with the brake released.',642],
      ['Adjust each shoe set at the rotor','Remove one wheel bolt per side. Rotate the access hole about 30° rearward of vertical. Use a flat screwdriver to expand the shoes until the rotor locks, then back off three or four adjuster teeth.','Each rotor turns easily with the lever released.',642],
      ['Balance the cables','Raise the lever five clicks. Adjust both cable nuts until both wheels just turn with even resistance. Release the lever and check free rotation and warning switch operation. Refit the original wheel bolts and torque to 110 Nm.','Both sides hold and release evenly.',642],
    ],
  },
  {
    id:'e30-parking-brake-shoes',system:'brakes',level:'Advanced',duration:'1–2 hr per axle',
    relatedGuides:['e30-rear-brake-pads-discs', 'e30-handbrake-adjustment'],
    pages:[649,660,642],section:'34-17 · 34 41 200',
    cautions:[supported,'Avoid inhaling brake dust. Keep friction surfaces clean and verify the brake works before road use.'],
    requiredParts:['Matched parking brake shoes for both rear rotors. Replace damaged retainers, springs or adjusters.'],
    steps:[
      ['Expose the shoe hardware','Release the cables and remove both rear brake discs using the rear brake guide. Support the calipers independently of the hoses. Compare the drum surfaces and shoe layout before removing anything.','The rotor hats are serviceable and both sets of hardware can be compared.',649],
      ['Replace and orient the shoes','Unhook the return springs. Use BMW 34 4 000 to turn and release the spring retainers. Refit the shoes, expansion lock, adjuster and springs in their illustrated positions.','All retainers are locked and each shoe moves without binding.',660],
      ['Refit and adjust','Reinstall the rear discs and tighten their retaining screws to 16 Nm. Refit the calipers with the applicable torques in the rear brake guide. Set shoe clearance and balance the cables using 34 10 014.','The parking brake holds evenly, releases fully, and the foot pedal is firm.',642],
    ],
  },
  {
    id:'e30-sunroof-alignment',system:'body',level:'Intermediate',duration:'45–90 min',
    pages:[1057],section:'54-1 · 54 12 004',
    cautions:['Keep fingers clear of the opening. Stop if the guides are damaged or a seized cable prevents both sides from reaching the closed position together.'],
    requiredParts:['New self-locking panel screws for the six fasteners removed or loosened for adjustment.'],
    steps:[
      ['Free the liner and close the panel','Open the roof about 50 mm and release the front liner frame. Close the lid and slide the liner back. Lock the left and right guides at the closed position with 4 mm keys as shown.','Both guides are at position zero and the liner is out of the way.',1057],
      ['Set height and gap','Use BMW 00 2 102/103 to loosen the three adjusters per side. With a straightedge, set the front edge 1 mm below the roof and the rear edge 1 mm above. Compare the front and rear gaps with a plastic gauge.','Panel height and spacing match the factory drawing and the seal is even.',1057],
      ['Secure and cycle','Set new self-locking screws to 3.5 Nm. Remove both locking keys. Reclip the liner as BMW shows and check that the roof slides, tilts and closes without contacting paint or trim.','The panel is seated and the closed position repeats.',1057],
    ],
  },
  {
    id:'e30-heater-blower',system:'climate',level:'Intermediate',duration:'45–90 min',
    pages:[1205],section:'64-9 · 64 11 210',
    cautions:[electrical,'Keep the wheels and motor as a balanced assembly. Protect the air flap and keep hands out of the fan when power is restored.'],
    requiredParts:['Balanced motor and fan-wheel assembly matched to the installed housing.'],
    steps:[
      ['Open the cowl access','Lift the cowl seal. Release the loom fastener without cutting wires, then move the access cover aside. Release both heater-cover retaining straps.','The blower is accessible and the loom is supported.',1205],
      ['Remove and match the assembly','Photograph and unplug the two motor leads. Release the center clamp, then lift the motor and both fans clear of the air flap. Match the original housing and motor code.','Both wheels are intact and the replacement drops into the same supports.',1205],
      ['Check spin and refit','Clamp the motor in place and check that the wheels turn freely by hand. Restore the connectors, access covers, seal and loom tie. Reconnect the battery and check every fan speed.','The blower runs without scraping or excessive vibration.',1205],
    ],
  },
  {
    id:'e30-blower-resistor',system:'climate',level:'Intermediate',duration:'30–60 min',
    pages:[1206],section:'64-11 · 64 11 220',
    cautions:[electrical,'A resistor runs hot. Check for a stiff blower, restricted air path or melted connector before replacing the resistor alone.'],
    requiredParts:['Resistor plate matched to the installed blower housing and connector.'],
    steps:[
      ['Access the resistor plate','Pull back the cowl seal, free the harness tie and move the access panel. Release the retaining straps and find the resistor plate in its illustrated air passage.','The plate and connector can move without pulling on the loom.',1206],
      ['Inspect and replace','Pull the plate out of its socket. Inspect for heat damage, debris and a binding blower wheel. Fit the matching plate fully in its cooling-air position.','The connector is firm and the resistor is flush in the duct.',1206],
      ['Restore covers and test','Secure the cowl cover and seal, reconnect the battery, then test every speed. Stop if the connector heats, smells burnt or the fan slows unexpectedly.','Each fan setting works and air reaches the vents.',1206],
    ],
  },
  {
    id:'e30-heater-valve',system:'climate',level:'Intermediate',duration:'1–2 hr plus cool-down',
    relatedGuides:['e30-coolant-bleeding'],
    pages:[1207,332],section:'64-12 · 64 11 271',
    cautions:[cold,electrical],
    requiredParts:['Heater water valve and new pipe seals for the installed heater box.'],
    steps:[
      ['Expose the valve and catch coolant','Remove the left lower dash trim and tray as shown. Drain coolant, protect the carpet and trace the heater hoses and valve connector before disconnecting them.','The valve is accessible and any runoff is captured.',1207],
      ['Unfasten and replace the valve','Unplug the valve, release its clamp and unfasten the pipe joints without flexing the pipes. Renew the valve seal and seat each pipe squarely before securing it.','The pipe joints line up and the wiring is clear of moving pedals.',1207],
      ['Bleed and check operation','Reconnect the hoses and electrical plug. Refill and bleed the cooling system. Check for leaks behind the trim and confirm the controls can change cabin air temperature.','The valve and pipe joints are dry before the trim goes back.',332],
    ],
  },
  {
    id:'e30-heater-core',system:'climate',level:'Advanced',duration:'2–4 hr plus cool-down',
    relatedGuides:['e30-coolant-bleeding', 'e30-heater-valve'],
    pages:[1210,332],section:'64-14 · 64 11 531',
    cautions:[cold,electrical,'Cover the carpet and electrical connectors before opening any heater line.'],
    requiredParts:['Heater core and new pipe sealing rings for the installed heater box.'],
    steps:[
      ['Clear the driver-side access','Remove the tray and lower dash panel. Drain and collect coolant. Free the heater duct connector and molded access piece in the order shown.','The end of the core and both pipe connections are visible.',1210],
      ['Withdraw the core','Support the coolant pipes while undoing their unions. Remove the core retaining bolts and slide the core straight out. Compare the flanges, orientation and seal seats against the replacement.','The pipes and housing are undamaged and the seals match.',1210],
      ['Refill and leak-check before closing','Slide the new core into the case and seat the new seals without forcing the pipes sideways. Refill and bleed the M20 system. Inspect the dry footwell and test the heater before installing the ducts and trim.','Cabin heat is stable and the pipe joints and carpet remain dry.',332],
    ],
  },
  {
    id:'e30-mirror-switch',system:'electrical',level:'Beginner',duration:'15–30 min',
    pages:[1146],section:'61-7 · 61 31 255',
    cautions:[electrical,'Protect the door trim and hold the connector while unplugging the switch.'],
    requiredParts:['Mirror switch with the same connector and adjustment functions.'],
    steps:[
      ['Remove the control knob','Protect the surrounding door trim and lift the adjustment knob as illustrated.','The knob and switch bezel are intact.',1146],
      ['Lift out the switch','Use BMW 61 1 300 or a matching non-marring trim tool. Support the plug and disconnect it by the housing. Compare the connector layout before attaching the replacement.','The connector is fully seated and the harness remains inside the door opening.',1146],
      ['Refit and test both sides','Snap the switch into the trim, refit the knob and restore the battery. Test the selector and movement of both mirrors.','Each mirror moves in all four directions when selected.',1146],
    ],
  },
  {
    id:'e30-sealed-beam-headlight',system:'electrical',level:'Beginner',duration:'25–45 min',
    pages:[],handbook:true,section:'BMW 325i handbook · p. 60',
    cautions:[electrical,'Stop if the connector shows heat damage or the lamp seat is broken. Have aim checked after refitting.'],
    requiredParts:['Matching sealed-beam insert identified as outer low beam or inner high beam.'],
    steps:[
      ['Identify the lamp','Use the two outer inserts for low beam and the two inner inserts for high beam. Match the lens marking and connector on the failed unit.','The replacement is the correct beam position and connector type.'],
      ['Release the clamping ring','Remove the grille section and support the insert while loosening its three ring screws. Unplug the insert without disturbing the beam adjustment screws.','The reflector carrier and adjusters have stayed in place.'],
      ['Seat and verify the lamp','Engage the insert’s locating features and secure the ring and grille. Restore power and check both beam settings. Have the aiming pattern checked with the correct equipment.','The lamp is seated firmly and lights in the correct switch position.'],
    ],
  },
  {
    id:'e30-fog-light-bulb',system:'electrical',level:'Beginner',duration:'20–40 min',
    pages:[1191],section:'63 99 201 · front fog lamp',
    cautions:[electrical,hotGlass],
    requiredParts:['H3 12 V 55 W bulb for the late catalog housing. Replace damaged seals as needed.'],
    steps:[
      ['Free the lamp housing','Remove the retaining screws and withdraw the lamp from the holding frame shown in the manual. Support the housing by hand.','The lamp is supported and the wiring has slack.',1191],
      ['Replace the bulb','Disconnect the plug, open the rear cover and release the spring clip. Seat the H3 replacement with the same tab orientation before locking the clip.','The bulb is flat in its seat and the lead is attached.',1191],
      ['Seal the lamp and test','Check the seal, close the cover and reinstall the housing. Restore power and check the fog lights and their mounting angle.','Both lamps work and the repaired housing is secure.',1191],
    ],
  },
  {
    id:'e30-wiper-blades',system:'body',level:'Beginner',duration:'10–20 min',
    pages:[],handbook:true,section:'BMW 325i handbook · p. 59',
    cautions:['Support the bare arm and protect the glass. Free frozen blades before operating the wipers.'],
    requiredParts:['Two blades matched to the fitted arm latch. The standard pair is nominally 500 mm each.'],
    steps:[
      ['Match the replacement and protect the glass','Check the two blade lengths and latch styles. Switch the wipers off at rest, then protect the windshield with a folded towel.','Both replacements match their arm and the glass is covered.'],
      ['Release and fit one blade at a time','Lift the arm away from the glass. Press the retaining spring, slide the old blade off and engage the replacement latch before lowering the arm.','The new blade stays on when lightly pulled against the latch.'],
      ['Check sweep and park','Wet the glass and run the wipers. Check the full sweep and parked position for interference with the trim and between the blades.','Both blades park correctly and stay attached.'],
    ],
  },
  {
    id:'e30-power-steering-bleed',system:'suspension',level:'Intermediate',duration:'20–40 min',
    pages:[572],section:'32-6b · 32 13 006',
    cautions:['Confirm the fluid on the reservoir label. Keep clear of belts, preserve the pump supply and avoid holding the steering at full lock.'],
    requiredParts:['Hydraulic fluid specified for the fitted reservoir and system.'],
    steps:[
      ['Check the system before filling','Identify the fluid and inspect the suction hose, return hose and rack connections for leaks. With the engine stopped, fill to the MAX mark on the dipstick.','The fluid is correct and the pump feed stays covered.',572],
      ['Cycle the steering','Start the engine in a ventilated area. Sweep the steering toward each side twice without holding it at the stop. Shut off the engine and inspect the reservoir.','Foaming and noise settle and the reservoir remains supplied.',572],
      ['Recheck level and leaks','With the engine off, correct the level to the reference mark. Check the disturbed joints and confirm normal assist without noise. If the fluid continues to foam, inspect the suction side for air entry.','Fluid level stays stable and steering assist is even.',572],
    ],
  },
];
