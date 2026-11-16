import { newTask, type BuildComponent, type BuildTask } from "./schema";
const checks: Partial<Record<BuildComponent["system"], [string, string][]>> = {
  engine: [
    ["Mounting and sump/steering clearance", "engine"],
    ["Transmission and clutch/convertor interface", "transmission"],
    ["Driveshaft length, flanges and balance", "driveshaft"],
    ["Differential, shafts and gearing", "differential"],
    ["Cooling capacity, plumbing and fan clearance", "cooling"],
    ["Exhaust routing, heat and emissions", "exhaust"],
    ["Harness, power supply, DME and security", "electrical"],
    ["ECU calibration and control compatibility", "ecu"],
    ["Fuel supply and control requirements", "fuel"],
    ["Brake capacity and clearance", "brakes"],
    ["Suspension loads and alignment", "suspension"],
    ["Packaging, inspections and commissioning", "body"],
  ],
  transmission: [
    ["Bellhousing, input shaft and engine interface", "engine"],
    ["Clutch/convertor, hydraulics and controls", "transmission"],
    ["Mounts, shifter and tunnel clearance", "body"],
    ["Driveshaft and differential interfaces", "driveshaft"],
    ["Electrical, interlocks and speed signals", "electrical"],
  ],
  wheels: [
    ["Bolt pattern, hub, diameter, width and offset", "wheels"],
    ["Brake caliper and barrel clearance", "brakes"],
    ["Tire/body clearance through steering and travel", "suspension"],
    ["Tire load/speed rating and approved sizing", "wheels"],
  ],
  brakes: [
    ["Hub, mounting and wheel clearance", "brakes"],
    ["Hydraulics, balance and ABS configuration", "brakes"],
    ["Bleeding, leak checks and verification", "brakes"],
  ],
  suspension: [
    ["Body, axle load and spring/damper application", "suspension"],
    ["SLS/LAD hardware and hydraulic requirements", "steering"],
    ["Travel, tire clearance and alignment", "wheels"],
  ],
  cooling: [
    ["Engine plumbing, fan and radiator interfaces", "cooling"],
    ["Electrical protection, controls and clearance", "electrical"],
    ["Correct fill/bleed procedure and hot-idle verification", "cooling"],
  ],
  electrical: [
    ["Source wiring diagram and connector/pin evidence", "electrical"],
    ["Circuit load, protection and grounding", "electrical"],
  ],
};
export function dependencyTasks(component: BuildComponent): BuildTask[] {
  return (
    checks[component.system] || [
      ["Installation interfaces and source evidence", component.system],
    ]
  ).map(([title, system]) =>
    newTask(title, system as BuildTask["system"], component.id),
  );
}
export function unresolvedDependencies(tasks: BuildTask[]) {
  return tasks
    .filter((t) => !["verified", "deferred"].includes(t.status))
    .map((t) => ({
      id: t.id,
      title: t.title,
      blockers: t.dependencies.filter(
        (id) => tasks.find((d) => d.id === id)?.status !== "verified",
      ),
    }));
}
export function canVerifyTask(task: BuildTask, tasks: BuildTask[]) {
  return task.dependencies.every(
    (id) => tasks.find((t) => t.id === id)?.status === "verified",
  );
}
