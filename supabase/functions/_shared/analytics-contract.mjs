// Shared browser/collector contract. No arbitrary properties or free-form errors.
export const POLICY_REVISION = 2;
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const WORDS = new Set(
  "appearance wheels stance paint abs air alternator antenna axle battery bearing belt bleed blower body bolt brake brakes bumper bush bushing cable cam camshaft catalytic chain charging chassis clutch coil compression compressor coolant cooling crank crankshaft cylinder dash differential door drain driveshaft electrical engine exhaust fan filter fluid fog fuel fuse gasket gear gearbox grille head headlight heater hose idle ignition injector intake interior joint lamp leak light lock m20 m21 m30 m40 m43 m50 m51 m60 m70 s38 maf manual mirror misfire mount noise oil overheating oxygen pad panel parking piston plug power pressure pump rack radiator rear relay repair reservoir rotor running seal seat sensor serpentine service shift shock spark spring starter steering strut sunroof suspension switch tail thermostat timing torque transmission trim trunk vacuum valve vanos vibration water wheel window wiring wiper workshop 518i 518g 520i 524td 525i 525ix 525td 525tds 530i 535i 540i m5 touring sedan no start cold hot rough idle replace replacement install removal capacity capacities type types location diagram automatic level low high code fault cruise control speedometer cluster obd delete swap conversion alignment camber toe fastener clip nut washer tensioner guide rail throttle throttlebody icv ccv pcv dme ecu ews disa guibo flex disc linkage synchro solenoid torque converter automatic zf getrag gm atf dexron brakefluid antifreeze refrigerant r12 r134a ac hvac windshield washer strainer fuelpump caliper rebuild adjustment test testing diagnose inspection lift jack stand tool socket wrench torque spec specifications interchange replacement supersession fitting fitment oem part number parts other technical search unmatched number".split(
    /\s+/,
  ),
);
export function normalizeSearch(raw) {
  if (
    typeof raw !== "string" ||
    raw.length > 300 ||
    /@|https?:|www\.|\b(?:\d[\s().+-]*){7,}\b|\b[a-hj-npr-z0-9]{17}\b|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/i.test(
      raw,
    )
  )
    return "other technical search";
  const tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => WORDS.has(w));
  return [...new Set(tokens)].slice(0, 8).join(" ") || "other technical search";
}
export const EVENT_NAMES = new Set([
  "build_open",
  "build_create",
  "build_save",
  "build_customize",
  "build_compatibility",
  "build_progress",
  "build_publish_preview",
  "build_publish",
  "build_view",
  "page_view",
  "link_open",
  "search",
  "search_result",
  "component_select",
  "assembly_view",
  "explode",
  "isolate",
  "guide_step",
  "guide_save",
  "diagnostic_step",
  "diagnostic_complete",
  "model_loaded",
  "model_error",
  "render_error",
  "web_vital",
  "js_error",
  "asset_error",
  "api_error",
  "engagement",
  "scanner_open",
  "scanner_permission",
  "scanner_capture",
  "scanner_inference",
  "scanner_result",
  "scanner_confirm",
  "scanner_reject",
  "scanner_error",
  "scanner_followup",
]);
const keys = new Set([
  "v",
  "id",
  "page",
  "name",
  "resource",
  "target",
  "at",
  "seq",
  "search_id",
  "topic",
  "results",
  "value",
  "metric",
  "model",
  "code",
]);
const optionalString = (o, k, n) =>
  o[k] === undefined || (typeof o[k] === "string" && o[k].length <= n);
export function validEvent(e) {
  if (
    !e ||
    typeof e !== "object" ||
    Array.isArray(e) ||
    Object.keys(e).some((k) => !keys.has(k)) ||
    e.v !== 1 ||
    !UUID.test(e.id) ||
    !UUID.test(e.page) ||
    !EVENT_NAMES.has(e.name) ||
    !Number.isSafeInteger(e.seq) ||
    e.seq < 0 ||
    e.seq > 10000 ||
    !Number.isFinite(e.at) ||
    !optionalString(e, "resource", 160) ||
    !optionalString(e, "target", 160)
  )
    return false;
  if(e.name.startsWith('build_')&&( !['/workshop','/builds'].includes(e.resource)||Object.keys(e).some(k=>!['v','id','page','name','resource','at','seq','topic'].includes(k))||(e.topic!==undefined&&(e.name!=='build_customize'||!['appearance','paint','interior','wheels','stance','engine'].includes(e.topic)))))return false;
  if (e.name.startsWith("scanner_") && e.resource !== "/scanner") return false;
  if (e.name === "scanner_result" && e.results === undefined) return false;
  if (
    e.name === "scanner_inference" &&
    (e.value === undefined ||
      !["ocr", "detector", "embedding"].includes(e.code))
  )
    return false;
  if (
    e.name === "scanner_permission" &&
    !["camera-granted", "camera-denied", "camera-unavailable"].includes(e.code)
  )
    return false;
  if (e.search_id !== undefined && !UUID.test(e.search_id)) return false;
  if (
    e.topic !== undefined &&
    (normalizeSearch(e.topic) !== e.topic || e.topic.length > 120)
  )
    return false;
  if (
    e.results !== undefined &&
    (!Number.isInteger(e.results) || e.results < 0 || e.results > 10000)
  )
    return false;
  if (
    e.value !== undefined &&
    (!Number.isFinite(e.value) || e.value < 0 || e.value > 300000)
  )
    return false;
  if (e.metric !== undefined && !["LCP", "INP", "CLS"].includes(e.metric))
    return false;
  if (
    e.model !== undefined &&
    ![
      "518i",
      "518g",
      "520i",
      "524td",
      "525i",
      "525iX",
      "525td",
      "525tds",
      "530i",
      "535i",
      "540i",
      "M5",
    ].includes(e.model)
  )
    return false;
  if (
    e.code !== undefined &&
    ![
      "javascript",
      "asset",
      "network",
      "model",
      "webgl",
      "unsupported",
      "camera-granted",
      "camera-denied",
      "camera-unavailable",
      "ocr",
      "detector",
      "embedding",
      "uncertain",
    ].includes(e.code)
  )
    return false;
  if (
    e.name === "search" &&
    (!e.search_id || !e.topic || e.results === undefined)
  )
    return false;
  if (e.name === "search_result" && !e.search_id) return false;
  if (
    [
      "page_view",
      "component_select",
      "assembly_view",
      "isolate",
      "guide_step",
      "guide_save",
      "diagnostic_step",
      "diagnostic_complete",
    ].includes(e.name) &&
    !e.resource
  )
    return false;
  if (
    [
      "engagement",
      "explode",
      "model_loaded",
      "web_vital",
      "guide_step",
      "diagnostic_step",
    ].includes(e.name) &&
    e.value === undefined
  )
    return false;
  if (e.name === "web_vital" && !e.metric) return false;
  return true;
}
export function categoryFor(name) {
  return [
    "scanner_inference",
    "scanner_error",
    "web_vital",
    "js_error",
    "asset_error",
    "api_error",
    "model_error",
    "render_error",
    "model_loaded",
  ].includes(name)
    ? "performance"
    : name === "search" || name === "search_result"
      ? "search"
      : "traffic";
}
export function validEnvelope(b) {
  return (
    b &&
    typeof b === "object" &&
    !Array.isArray(b) &&
    Object.keys(b).every((k) =>
      [
        "revision",
        "visitor",
        "consent",
        "events",
        "device",
        "browser",
        "referrer",
        "campaign",
      ].includes(k),
    ) &&
    b.revision === POLICY_REVISION &&
    UUID.test(b.visitor) &&
    b.consent &&
    b.consent.traffic === true &&
    Object.keys(b.consent).every((k) =>
      ["traffic", "search", "performance"].includes(k),
    ) &&
    ["traffic", "search", "performance"].every(
      (k) => typeof b.consent[k] === "boolean",
    ) &&
    Array.isArray(b.events) &&
    b.events.length > 0 &&
    b.events.length <= 20 &&
    b.events.every(
      (e) => validEvent(e) && b.consent[categoryFor(e.name)] === true,
    ) &&
    ["mobile", "tablet", "desktop", "other"].includes(b.device) &&
    ["Chrome", "Safari", "Firefox", "Edge", "Other"].includes(b.browser) &&
    optionalString(b, "referrer", 253) &&
    optionalString(b, "campaign", 48)
  );
}
