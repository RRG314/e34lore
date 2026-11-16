import { guideRevision } from "../domain/walkthrough";
import { completedGuideSteps } from "../domain/repair-journey";
export type RepairOperation = {
  id: string;
  title: string;
  step: number;
  requires: string[];
  nodes: string[];
  action: "inspect" | "remove" | "install" | "verify";
  instruction: string;
  source: string;
  tools: string[];
  torque?: { nm: number; scope: string };
};
export const repairGuide = "m50-water-pump-job-planning";
export const repairPlan = {
  id: "m50-coolant-pump-r1",
  guide: repairGuide,
  revision: guideRevision(repairGuide)!.revision,
  geometry: "illustrative" as const,
  operations: [
    {
      id: "identify",
      title: "Confirm the installed hardware",
      step: 0,
      requires: [],
      nodes: ["m50:water-pump"],
      action: "inspect",
      instruction:
        "Confirm the installed M50/M50TU engine, four-stud pump, tensioner and cooling hardware. Review the matching fill/bleed instructions before starting.",
      source: "170-8–170-9; 170-12; 020-13",
      tools: ["Matching source procedure"],
    },
    {
      id: "cold-drain",
      title: "Make the cooling system safe",
      step: 1,
      requires: ["identify"],
      nodes: ["m50:water-pump"],
      action: "verify",
      instruction:
        "Engine cold, ignition off. Isolate the battery and drain into suitable containment using the matched procedure. Never open a hot cooling system.",
      source: "170-8; 170-12",
      tools: ["Coolant containment", "Battery isolation tools"],
    },
    {
      id: "fan-shroud",
      title: "Remove fan and shroud",
      step: 1,
      requires: ["cold-drain"],
      nodes: ["e34sys:engine-cooling-fan", "e34sys:fan-shroud"],
      action: "remove",
      instruction:
        "Use the source-specific holding method and fan/shroud procedure. The fan-clutch attachment has a left-hand thread. Do not treat this visual separation as a clearance-verified removal path.",
      source: "170-8; fan access reference",
      tools: ["Fan wrench", "Pulley holder"],
    },
    {
      id: "hoses",
      title: "Move the documented hoses for access",
      step: 1,
      requires: ["fan-shroud"],
      nodes: ["m50:water-pump"],
      action: "inspect",
      instruction:
        "Move only the thermostat housing hoses specified by the matched pump procedure. Record the hose route and retain the correct sealing hardware.",
      source: "170-8",
      tools: ["Appropriate hose tools"],
    },
    {
      id: "loosen-pulley",
      title: "Loosen pump-pulley fasteners",
      step: 1,
      requires: ["hoses"],
      nodes: ["m50:pulley:water-pump"],
      action: "inspect",
      instruction:
        "Loosen the pump pulley hardware before releasing the belt, using the matched holding and tensioner procedure.",
      source: "170-8; 020-13",
      tools: ["Matching sockets", "Pulley holder"],
    },
    {
      id: "belt",
      title: "Remove the accessory belt",
      step: 1,
      requires: ["loosen-pulley"],
      nodes: ["m50:accessory-belt"],
      action: "remove",
      instruction:
        "Use the procedure for the installed tensioner. Record belt routing before removing the belt.",
      source: "020-13; 170-8",
      tools: ["Matched tensioner tool"],
    },
    {
      id: "pulley",
      title: "Remove the pump pulley",
      step: 1,
      requires: ["belt"],
      nodes: ["m50:pulley:water-pump"],
      action: "remove",
      instruction:
        "Remove the loosened pulley hardware and pump pulley. Keep the hardware identified.",
      source: "170-8",
      tools: ["Matching sockets"],
    },
    {
      id: "nuts",
      title: "Remove the four retaining nuts",
      step: 2,
      requires: ["pulley"],
      nodes: [
        "m50:pump-nut:-1:-1",
        "m50:pump-nut:-1:1",
        "m50:pump-nut:1:-1",
        "m50:pump-nut:1:1",
      ],
      action: "remove",
      instruction:
        "Check the replacement against the actual pump and housing, then remove the four pump retaining nuts.",
      source: "170-8, Fig. 13",
      tools: ["Matching socket"],
    },
    {
      id: "pump",
      title: "Extract the pump squarely",
      step: 2,
      requires: ["nuts"],
      nodes: ["m50:water-pump", "m50:water-pump-impeller"],
      action: "remove",
      instruction:
        "Thread matching M6 extraction bolts into the opposed ears in Fig. 13 and advance evenly. Stop for damaged threads or uneven release; protect the sealing bore.",
      source: "170-8, Fig. 13",
      tools: ["Two matching M6 extraction bolts"],
    },
    {
      id: "inspect",
      title: "Inspect the bore and sealing surfaces",
      step: 3,
      requires: ["pump"],
      nodes: ["m50:water-pump"],
      action: "inspect",
      instruction:
        "Inspect studs, bore and sealing surfaces for damage. Clean the mating bore without damaging it. Renew the seal; verify the installed pump instructions.",
      source: "170-8–170-9",
      tools: ["Inspection light", "Suitable cleaning materials"],
    },
    {
      id: "new-pump",
      title: "Fit the seal and seat the pump",
      step: 3,
      requires: ["inspect"],
      nodes: ["m50:water-pump", "m50:water-pump-impeller"],
      action: "install",
      instruction:
        "Fit a new seal with only the specified seal-compatible assembly lubricant. Locate the pump squarely over the studs; do not pinch the seal.",
      source: "170-8–170-9",
      tools: ["Correct new pump and seal"],
    },
    {
      id: "tighten-nuts",
      title: "Tighten retaining nuts evenly",
      step: 3,
      requires: ["new-pump"],
      nodes: [
        "m50:pump-nut:-1:-1",
        "m50:pump-nut:-1:1",
        "m50:pump-nut:1:-1",
        "m50:pump-nut:1:1",
      ],
      action: "install",
      instruction:
        "Tighten alternately and evenly. Confirm the factory specification against the actual replacement hardware before applying it.",
      source: "170-9, pump tightening specifications",
      tools: ["Low-range torque wrench"],
      torque: {
        nm: 10,
        scope: "Factory pump-to-cover retaining nuts; verify actual hardware",
      },
    },
    {
      id: "restore-pulley",
      title: "Refit the pump pulley",
      step: 4,
      requires: ["tighten-nuts"],
      nodes: ["m50:pulley:water-pump"],
      action: "install",
      instruction:
        "Restore the pulley and its fasteners using the matched holding method. Confirm the specification for the actual hardware.",
      source: "170-9, pulley tightening specifications",
      tools: ["Low-range torque wrench", "Pulley holder"],
      torque: {
        nm: 10,
        scope: "Factory pump pulley fasteners; verify actual hardware",
      },
    },
    {
      id: "restore-belt",
      title: "Restore belt routing and tension",
      step: 4,
      requires: ["restore-pulley"],
      nodes: ["m50:accessory-belt"],
      action: "install",
      instruction:
        "Restore the documented belt route and tensioner configuration. Inspect seating and clearance before running.",
      source: "020-13; 170-9",
      tools: ["Matched tensioner tool"],
    },
    {
      id: "restore-access",
      title: "Restore hoses, fan and shroud",
      step: 4,
      requires: ["restore-belt"],
      nodes: ["e34sys:engine-cooling-fan", "e34sys:fan-shroud"],
      action: "install",
      instruction:
        "Restore the documented hoses, fan and shroud. Check connections, routing and clearance.",
      source: "170-9",
      tools: ["Matched fan holding tools", "Hose tools"],
    },
    {
      id: "fill-bleed",
      title: "Fill and bleed the matched cooling system",
      step: 4,
      requires: ["restore-access"],
      nodes: ["m50:water-pump"],
      action: "verify",
      instruction:
        "Use the verified fill and bleed procedure for the installed cooling system before running. Stop if the cap, reservoir or bleed sequence is unknown.",
      source: "170-12",
      tools: ["Correct coolant", "Matched fill/bleed procedure"],
    },
    {
      id: "final-check",
      title: "Verify the completed repair",
      step: 4,
      requires: ["fill-bleed"],
      nodes: ["m50:water-pump"],
      action: "verify",
      instruction:
        "Perform the controlled leak and temperature checks in the matched procedure, then a final cold-level recheck. Stop for leaks or abnormal temperature.",
      source: "170-9; 170-12",
      tools: ["Inspection light", "Recorded observations"],
    },
  ] satisfies RepairOperation[],
};
export function validatePlan(plan = repairPlan) {
  const ids = new Set(plan.operations.map((o) => o.id));
  if (ids.size !== plan.operations.length) throw Error("Duplicate operation");
  const visited = new Set<string>(),
    visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw Error("Repair dependency cycle");
    if (visited.has(id)) return;
    const o = plan.operations.find((o) => o.id === id);
    if (!o) throw Error("Missing prerequisite");
    visiting.add(id);
    o.requires.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  };
  ids.forEach(visit);
  return true;
}
export function transitionOperations(
  done: string[],
  id: string,
  undo = false,
  plan = repairPlan,
) {
  validatePlan(plan);
  const operation = plan.operations.find((o) => o.id === id);
  if (!operation) throw Error("Unknown operation");
  const current = new Set(done);
  if (undo) {
    if (
      plan.operations.some((o) => current.has(o.id) && o.requires.includes(id))
    )
      throw Error("Undo dependent steps first.");
    current.delete(id);
  } else {
    if (operation.requires.some((p) => !current.has(p)))
      throw Error("Complete the preceding steps first.");
    current.add(id);
  }
  return plan.operations.filter((o) => current.has(o.id)).map((o) => o.id);
}
export function repairScene(
  done: string[],
  selected: string,
  preferredNode?: string,
) {
  const hidden = new Set<string>();
  for (const op of repairPlan.operations.filter((o) => done.includes(o.id))) {
    if (op.action === "remove") op.nodes.forEach((n) => hidden.add(n));
    if (op.action === "install") op.nodes.forEach((n) => hidden.delete(n));
  }
  return {
    hidden: [...hidden],
    selected:
      (repairPlan.operations
        .find((o) => o.id === selected)
        ?.nodes.includes(preferredNode || "")
        ? preferredNode
        : repairPlan.operations.find((o) => o.id === selected)?.nodes[0]) ||
      "m50:water-pump",
  };
}
export function localRepairProgress(raw: unknown) {
  if (!Array.isArray(raw) || raw.some(id => typeof id !== 'string')) throw Error('Invalid local repair progress');
  let done: string[] = [];
  for (const id of raw) done = transitionOperations(done, id);
  return { done, checks: completedGuideSteps(repairPlan.operations, done) };
}
