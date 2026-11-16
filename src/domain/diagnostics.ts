export type DiagnosticNode = {
  id: string;
  question: string;
  note: string;
  choices: { label: string; next: string }[];
  outcome?: string;
  assembly?: string;
  source: string;
  sourceHref?: string;
};
export const diagnosticFlows: Record<string, DiagnosticNode[]> = {
  overheating: [
    {
      id: "start",
      question:
        "Is the temperature in the red, is there steam, or is coolant escaping?",
      note: "Stop safely and switch the engine off if it is overheating. Never open the hot cooling system.",
      choices: [
        { label: "Yes, or I’m unsure", next: "stop" },
        {
          label: "No — I’m investigating with the car cold",
          next: "condition",
        },
      ],
      source: "Bentley 170-2 · PDF 206",
    },
    {
      id: "condition",
      question: "When did the temperature rise?",
      note: "Use observations you have already made. Do not deliberately reproduce overheating.",
      choices: [
        { label: "At idle or low speed", next: "airflow" },
        { label: "At road speed or under load", next: "circulation" },
        { label: "Both, or I don’t know", next: "baseline" },
      ],
      source: "Bentley 170-1–170-3",
    },
    {
      id: "airflow",
      question:
        "With the engine cold and off, is the radiator face visibly obstructed?",
      note: "Keep hands away from fans and belts. Electric fans may start unexpectedly.",
      choices: [
        { label: "Yes — debris or damage is visible", next: "obstruction" },
        { label: "No / not sure", next: "fan" },
      ],
      source: "Bentley 170-2–170-3",
    },
    {
      id: "circulation",
      question:
        "Have you recorded a low coolant level, visible leak or damaged drive belt?",
      note: "Observe only with the engine cold and off. A gauge symptom alone does not identify a failed pump.",
      choices: [
        { label: "Yes", next: "leak" },
        { label: "No / not sure", next: "baseline" },
      ],
      source: "Bentley 170-2",
    },
    {
      id: "stop",
      question: "Stop and arrange an assessment",
      note: "Let the engine cool completely. Do not remove the cap, continue driving, or add cold water to an overheated engine.",
      choices: [],
      outcome:
        "Record the gauge position, warning messages, visible steam and location of any leak. Arrange professional recovery if needed.",
      source: "Bentley 170-2",
    },
    {
      id: "obstruction",
      question: "Document the airflow restriction",
      note: "A visible restriction is an observation, not a confirmed cause.",
      choices: [],
      outcome:
        "Photograph the radiator face and document damage or blockage. A technician should inspect cooling performance after the cause is addressed.",
      assembly: "water-pump",
      source: "Bentley 170-2",
    },
    {
      id: "fan",
      question: "Fan and airflow testing is the next dependency",
      note: "Do not test a fan by touching it or placing objects in its path.",
      choices: [],
      outcome:
        "A configuration-specific check of fan control and airflow is needed. Share the conditions, coolant level and inspection findings with the community or a technician.",
      assembly: "water-pump",
      source: "Bentley 170-3–170-4",
    },
    {
      id: "leak",
      question: "Investigate the observed leak or belt condition",
      note: "Do not replace a thermostat or pump solely on this result.",
      choices: [],
      outcome:
        "Record location, fluid appearance, cold coolant level and belt damage. The source describes pressure testing; this requires suitable equipment and a verified procedure.",
      assembly: "water-pump",
      source: "Bentley 170-2",
    },
    {
      id: "baseline",
      question: "Establish a cooling-system baseline",
      note: "Low coolant, poor circulation and airflow problems can overlap.",
      choices: [],
      outcome:
        "Document cold coolant level, leaks, hoses, radiator condition and belt condition. Confirm gauge accuracy and use the applicable manual tests before diagnosing a component.",
      assembly: "water-pump",
      source: "Bentley 170-2–170-3",
    },
  ],
  "no-start": [
    {
      id: "start",
      question: "What happens when you turn the key?",
      note: "Keep the vehicle in Park or neutral with the parking brake applied. Stop if there is smoke, a fuel smell or damaged wiring.",
      choices: [
        { label: "The engine does not turn over", next: "no-crank" },
        { label: "It turns over but does not start", next: "cranks" },
        { label: "Smoke, fuel smell or damaged wiring", next: "stop" },
      ],
      source: "Bentley 121 / 130 · intake questions only",
    },
    {
      id: "no-crank",
      question: "Record a no-crank condition",
      note: "Do not bridge starter terminals or bypass interlocks.",
      choices: [],
      outcome:
        "Record whether lights dim, whether there is a click, and the battery condition. A starting/charging assessment and model-specific electrical tests are needed.",
      source: "Bentley 121 · PDF 163–168",
    },
    {
      id: "cranks",
      question: "Record a crank-but-no-start condition",
      note: "This branch collects evidence; fuel and ignition tests require configuration-specific procedures.",
      choices: [],
      outcome:
        "Record engine code, recent work, whether the issue is hot or cold, and any retrieved fault codes. Do not infer a fuel pump failure from a no-start symptom.",
      source: "Bentley 120 / 130",
    },
    {
      id: "stop",
      question: "Stop attempting to start the engine",
      note: "Avoid ignition sources and arrange an assessment.",
      choices: [],
      outcome:
        "Have fuel leaks or damaged electrical wiring assessed before further starting attempts.",
      source: "Bentley fundamentals / fuel-system cautions",
    },
  ],
  vibration: [
    {
      id: "start",
      question: "When do you notice the vibration?",
      note: "Do not reproduce a dangerous vibration. This is a structured intake, not a validated fault-isolation procedure.",
      choices: [
        { label: "Under braking", next: "braking" },
        { label: "At a particular road speed", next: "speed" },
        { label: "At idle / engine speed", next: "engine" },
      ],
      source: "Investigation intake · technical validation pending",
    },
    {
      id: "braking",
      question: "Record braking-related vibration",
      note: "A brake and suspension inspection is needed; do not assume warped discs.",
      choices: [],
      outcome:
        "Document speed, pedal feedback, steering feedback and any pulling. Avoid driving with reduced braking or directional control.",
      assembly: "front-brake",
      source: "Bentley 300 / 340 · inspection referral",
    },
    {
      id: "speed",
      question: "Record road-speed-related vibration",
      note: "Wheel, tire, suspension and driveline issues can have overlapping symptoms.",
      choices: [],
      outcome:
        "Document speed range, recent wheel work, visible tire damage and whether the symptom changes under load. Arrange inspection if severe.",
      assembly: "front-strut",
      source: "Investigation intake · not diagnostic proof",
    },
    {
      id: "engine",
      question: "Record engine-speed-related vibration",
      note: "The selected engine and recent work matter.",
      choices: [],
      outcome:
        "Record whether the vibration occurs stationary, cold or warm, and any warning lamps. Submit these observations with your engine identification.",
      source: "Investigation intake · not diagnostic proof",
    },
  ],
  braking: [
    {
      id: "start",
      question:
        "Is there reduced braking, a sinking pedal, a visible fluid leak or severe pulling?",
      note: "Do not drive a vehicle with compromised braking.",
      choices: [
        { label: "Yes / unsure", next: "stop" },
        { label: "No — an inspection question", next: "inspect" },
      ],
      source: "Bentley 340 · safety intake",
    },
    {
      id: "stop",
      question: "Arrange professional recovery",
      note: "Do not road-test the vehicle or attempt an unsupported hydraulic repair.",
      choices: [],
      outcome:
        "Record the symptom without moving the car. Have the brake system assessed by a qualified technician.",
      source: "Bentley 340 · safety referral",
    },
    {
      id: "inspect",
      question: "Document the concern before diagnosis",
      note: "Brake work requires the correct equipment, dimensions and procedure.",
      choices: [],
      outcome:
        "Record noise, warning lamps, pedal feel, recent work and visible condition. The component explorer identifies parts but does not replace a verified brake procedure.",
      assembly: "front-brake",
      source: "Bentley 340",
    },
  ],
};
export function validateFlow(nodes: DiagnosticNode[]) {
  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length || !ids.has("start")) return false;
  if (
    nodes.some(
      (n) =>
        n.choices.some((c) => !ids.has(c.next)) ||
        (!n.choices.length && !n.outcome),
    )
  )
    return false;
  const visit = (id: string, path: Set<string>): boolean => {
    if (path.has(id)) return false;
    const n = nodes.find((n) => n.id === id)!;
    return n.choices.every((c) => visit(c.next, new Set([...path, id])));
  };
  const reachable = new Set<string>();
  const walk = (id: string) => {
    if (reachable.has(id)) return;
    reachable.add(id);
    nodes.find((n) => n.id === id)!.choices.forEach((c) => walk(c.next));
  };
  walk("start");
  return reachable.size === nodes.length && visit("start", new Set());
}
