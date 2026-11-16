export const applicationStatuses = [
  "researching",
  "eligible_to_apply",
  "application_prepared",
  "awaiting_owner_submission",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "suspended",
  "expired",
] as const;
export const matchStatuses = [
  "exact_verified",
  "verified_replacement",
  "conditional",
  "unverified_candidate",
  "known_incompatible",
] as const;
export type MatchStatus = (typeof matchStatuses)[number];
export const affiliateDisclosure =
  "E34 Lore may earn a commission when you purchase through certain retailer links. This does not affect our technical compatibility information.";
export const publisherDescription = applicationProfile.description;

export function publicHttpsUrl(value: string, hosts?: readonly string[]) {
  if (value.length > 4096 || /[\s\\\u0000-\u001f\u007f]/.test(value))
    return false;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port || u.hash)
      return false;
    if (
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(u.hostname) ||
      /\.(?:local|localhost|internal)$/.test(u.hostname)
    )
      return false;
    if (hosts && !hosts.includes(u.hostname)) return false;
    for (const key of u.searchParams.keys())
      if (
        /^(api.?key|access.?token|client.?secret|password|signature|authorization)$/i.test(
          key,
        )
      )
        return false;
    return true;
  } catch {
    return false;
  }
}

export function generateAffiliateUrl(input: {
  approved: boolean;
  template: string;
  destination: string;
  merchantHosts: string[];
  trackingHosts: string[];
  parameters: Record<string, string>;
  allowedQuery: string[];
}) {
  if (!input.approved)
    throw new Error("The program must be approved before generating links.");
  if (!publicHttpsUrl(input.destination, input.merchantHosts))
    throw new Error("Choose an authorized retailer destination.");
  const allowed = new Set([
    "destination",
    "publisher_id",
    "campaign_id",
    "program_id",
  ]);
  const result = input.template.replace(
    /\{([^{}]+)\}/g,
    (_all, key: string) => {
      if (!allowed.has(key))
        throw new Error("Unsupported link-template field.");
      const value =
        key === "destination" ? input.destination : input.parameters[key];
      if (!value || (value.length > 200 && key !== "destination"))
        throw new Error("An approved tracking identifier is missing.");
      return encodeURIComponent(value);
    },
  );
  if (/[{}]/.test(result) || !publicHttpsUrl(result, input.trackingHosts))
    throw new Error(
      "The generated link does not meet the program's destination rules.",
    );
  for (const key of new URL(result).searchParams.keys())
    if (!input.allowedQuery.includes(key))
      throw new Error(
        "A tracking parameter is not authorized by this program.",
      );
  return result;
}

export function advertisingSection(path: string): string | null {
  if (path === "/") return "home";
  if (/^\/parts(?:\/catalog)?\/?$/.test(path)) return "parts";
  if (/^\/articles(?:\/[^/]+)?\/?$/.test(path)) return "articles";
  if (/^\/encyclopedia(?:\/[^/]+)?\/?$/.test(path)) return "encyclopedia";
  if (
    /^\/community\/?$/.test(path) ||
    /^\/community\/topics(?:\/[^/]+)?\/?$/.test(path)
  )
    return "community";
  return null;
}

export type MatchEvidence = {
  kind: MatchStatus;
  approved: boolean;
  sourceUrl: string;
  notes: string;
  partId: string;
  matchedPartId: string;
  oemNumber: string | null;
  partNumber: string | null;
  matchedPartNumber?: string | null;
  basis: "oem_identity" | "direct_supersession" | "documented_equivalent";
  positionId: string | null;
  directEdge?: { previous: string; replacement: string; position: string };
};
export function eligibleMatch(m: MatchEvidence, positionId?: string | null) {
  if (
    !m.approved ||
    !publicHttpsUrl(m.sourceUrl) ||
    m.notes.trim().length < 20 ||
    ["unverified_candidate", "known_incompatible"].includes(m.kind)
  )
    return false;
  if (m.kind === "exact_verified" && m.basis !== "oem_identity") return false;
  if (m.positionId && m.positionId !== positionId) return false;
  if (m.basis === "oem_identity")
    return (
      m.partId === m.matchedPartId &&
      !!m.partNumber &&
      m.oemNumber?.replace(/[^0-9]/g, "") === m.partNumber
    );
  if (m.basis === "direct_supersession")
    return (
      !!m.directEdge &&
      m.directEdge.previous === m.partId &&
      m.directEdge.replacement === m.matchedPartId &&
      m.directEdge.position === positionId &&
      !!m.matchedPartNumber &&
      m.oemNumber?.replace(/[^0-9]/g, "") === m.matchedPartNumber
    );
  return m.basis === "documented_equivalent" && m.notes.trim().length >= 40;
}

export function currentObservation<T>(
  value: T | null,
  observedAt: string | null,
  validUntil: string | null,
  authorized: boolean,
  now = Date.now(),
): T | null {
  if (!authorized || value === null || !observedAt || !validUntil) return null;
  const observed = Date.parse(observedAt),
    until = Date.parse(validUntil);
  return Number.isFinite(observed) &&
    Number.isFinite(until) &&
    observed <= now &&
    until > now &&
    until > observed
    ? value
    : null;
}

export function money(cents: number | string | bigint, currency: string) {
  const amount = BigInt(cents),
    zero = BigInt(0),
    hundred = BigInt(100),
    fraction = (amount < zero ? -amount : amount) % hundred;
  const whole = amount / hundred;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .formatToParts(amount < zero && whole === zero ? -0 : whole)
    .map((part) =>
      part.type === "fraction"
        ? fraction.toString().padStart(2, "0")
        : part.value,
    )
    .join("");
}
export function csvCell(value: unknown) {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  if (
    typeof value !== "number" &&
    typeof value !== "bigint" &&
    /^[\s]*[=+@-]/.test(text)
  )
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
import applicationProfile from "../data/affiliate-application.json";
