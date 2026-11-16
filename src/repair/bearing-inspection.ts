/** Original inspection prompts derived from the owner's Bentley manual, 260-1, 260-4–260-8. No removal animation or measured geometry claim. */
export const bearingInspection = [
 {id:'identify',title:'Distinguish the assembly from the bearing',source:'260-1; 260-7, Fig. 10',pdf:267,checks:['Identify the central bearing, surrounding rubber cushion and metal support bracket.','Record whether you have the complete mount, the bare bearing, or damaged fragments.','Compare the front and back mounting faces; do not use packaging or labels for this photo test.']},
 {id:'location',title:'Locate it in the driveline',source:'260-1, Fig. 1; 260-4–260-5',pdf:261,checks:['The center support holds the two-piece driveshaft beneath the body, between gearbox and final drive.','If still installed, use a safe viewing position. Do not crawl under a car supported only by a jack.','Photograph the surrounding shaft and support position without disturbing the assembly.']},
 {id:'condition',title:'Record what is actually damaged',source:'260-2–260-3; 260-7–260-8',pdf:262,checks:['Record torn or separated rubber and visible bracket damage.','With a loose part, note roughness or play that you actually observe; a photograph cannot measure bearing condition.','Check related driveline symptoms before blaming this part. Noise and vibration can originate elsewhere.']},
 {id:'match',title:'Check the ordering identity',source:'Vehicle-specific OEM catalog; 260-7, Fig. 10',pdf:267,checks:['Compare the complete mount and separate bearing as different items in the OEM catalog.','Check bore, bracket layout, hardware and the actual vehicle production date and gearbox. Do not estimate dimensions from a single photo.','Confirm whether a replacement includes the bearing and mounting hardware; do not infer interchange from similar appearance.']},
 {id:'prepare',title:'Prepare the matched repair',source:'260-4–260-8, Figs. 7–12',pdf:264,checks:['Read the driveshaft removal and installation sequence before starting. Bearing replacement requires the shaft to be removed.','Plan to preserve alignment marks between the shaft halves and support the shaft while detached.','The manual specifies puller force at the bearing inner hub; pulling on the mount can tear the rubber. Use the matching puller and press procedure.','Review the installed retaining arrangement, dust guards and source-specific preload and fastening instructions in the full manual before reassembly.']},
] as const;
export type BearingInspectionDraft = {checks:string[];notes:string};
export function inspectionCheckIds(){return bearingInspection.flatMap(step=>step.checks.map((_,index)=>step.id+':'+index));}
export function parseBearingInspection(value:unknown):BearingInspectionDraft {
 if(!value||typeof value!=='object')throw Error('Invalid inspection');
 const v=value as Record<string,unknown>;
 if(!Array.isArray(v.checks)||v.checks.some(c=>typeof c!=='string'||!inspectionCheckIds().includes(c))||typeof v.notes!=='string'||v.notes.length>3000)throw Error('Invalid inspection');
 return {checks:[...new Set(v.checks as string[])],notes:v.notes};
}

export const bearingPreparationTools=["A bearing puller that contacts the inner hub","A suitable press and supported tooling","Material for matching the driveshaft sections before separation","Rated vehicle supports and a separate driveshaft support","A torque wrench and sockets matched to the actual fasteners"] as const;
