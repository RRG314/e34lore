import { z } from "zod";
const count = z.number().int().nonnegative(),
  row = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));
const slice = z.object({
  available: z.boolean(),
  complete: z.boolean(),
  coverage_seconds: z.number(),
  views: count,
  sessions: count,
  browsers: count,
  new_browsers: count,
  returning_browsers: count,
  engaged_ms: z.number(),
  search_pages: count,
  performance_pages: count,
  searches: count,
  zero_results: count,
  search_clicks: count,
  search_repeated: count,
  search_abandoned: count,
  daily: z.array(
    z.object({
      day: z.string(),
      views: count,
      sessions: count,
      browsers: count,
    }),
  ),
  pages: z.array(row),
  interactions: z.array(row),
  topics: z.array(row),
  acquisition: z.array(row),
  requested_parts: z.array(row),
  entries: z.array(row),
  exits: z.array(row),
  performance: z.array(row),
  errors: z.array(row),
  model_load: z.array(row),
  funnels: z.array(z.object({ name: z.string(), steps: z.array(count) })),
});
export const reportSchema = z.object({
  revision: z.literal(2),
  enabled: z.boolean(),
  approved_at: z.string().nullable(),
  retention_days: z.literal(90),
  generated_at: z.string(),
  start: z.string(),
  end: z.string(),
  previous_start: z.string(),
  previous_end: z.string(),
  current: slice,
  previous: slice,
  limited: count,
  campaign_registry: z.array(
    z.object({ code: z.string(), label: z.string(), active: z.boolean() }),
  ),
  legacy: z.array(
    z.object({ day: z.string(), area: z.string(), opens: count }),
  ),
  community: z.record(z.string(), count),
  commercial: z.object({
    retailers: z.array(row),
    campaigns: z.array(row),
    revenue: z.array(row),
  }),
  search_console: z.object({
    status: z
      .object({
        property: z.string(),
        last_synced: z.string(),
        first_day: z.string(),
        last_day: z.string(),
        capped: z.boolean(),
      })
      .nullable(),
    rows: z.array(row),
  }),
  integrations: z.record(z.string(), z.string()),
});
export type Report = z.infer<typeof reportSchema>;
export function rangeFor(preset: string, now = new Date()) {
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const last = new Date(day);
  if (preset === "Yesterday") last.setUTCDate(last.getUTCDate() - 1);
  const first = new Date(last);
  const days =
    preset === "Last 90 days"
      ? 90
      : preset === "Last 30 days"
        ? 30
        : preset === "Last 7 days"
          ? 7
          : 1;
  first.setUTCDate(first.getUTCDate() - days + 1);
  return {
    first: first.toISOString().slice(0, 10),
    last: last.toISOString().slice(0, 10),
  };
}
export function comparison(
  current: number,
  previous: number,
  available: boolean,
) {
  if (!available) return "Previous period unavailable";
  if (previous === 0)
    return current === 0
      ? "No change from 0"
      : "No percentage baseline (previous: 0)";
  const change = ((current - previous) / previous) * 100;
  return (change > 0 ? "+" : "") + change.toFixed(1) + "% vs previous period";
}
export type Opportunity = {
  title: string;
  observed: string;
  recommendation: string;
  sample: number;
  limitation: string;
  baseline: string;
};
export function opportunities(report: Report): Opportunity[] {
  const found: Opportunity[] = [];
  for (const t of report.current.topics) {
    if (
      Number(t.zero_results) >= 3 &&
      Number(t.sessions) >= 3 &&
      t.topic !== "other technical search"
    )
      found.push({
        title: "Unmet search demand: " + t.topic,
        observed: `${t.zero_results} searches returned zero results across ${t.sessions} measured sessions.`,
        recommendation:
          "Check synonyms and relevant catalog/repair coverage before writing new material.",
        sample: Number(t.searches),
        limitation:
          "Only opted-in technical topics; unknown words and unmatched numbers are discarded. Counts are observations, not independent people.",
        baseline: "No comparable topic baseline established.",
      });
  }
  for (const e of report.current.errors) {
    found.push({
      title: "Investigate " + String(e.name).replaceAll("_", " "),
      observed: `${e.events} errors across ${e.sessions} sessions on ${e.resource || "public pages"} (${e.device}).`,
      recommendation:
        "Reproduce on the affected device category and check assets/API availability.",
      sample: Number(e.sessions),
      limitation:
        "Consent-based reports; error categories contain no stacks or messages. One report can be an isolated failure.",
      baseline: "No error-rate comparison established.",
    });
  }
  for (const p of report.current.performance) {
    const threshold =
      p.metric === "LCP" ? 2500 : p.metric === "INP" ? 200 : 0.1;
    if (Number(p.samples) >= 20 && Number(p.p75) > threshold)
      found.push({
        title: `Review ${p.device} ${p.metric}`,
        observed: `75th percentile ${Number(p.p75).toFixed(p.metric === "CLS" ? 3 : 0)}${p.metric === "CLS" ? "" : " ms"} from ${p.samples} measurements.`,
        recommendation: "Profile representative pages on this device category.",
        sample: Number(p.samples),
        limitation:
          "Opt-in real-user sample; not a population estimate or a significance test.",
        baseline:
          "Web Vitals good threshold: " +
          threshold +
          (p.metric === "CLS" ? "" : " ms"),
      });
  }
  for (const p of report.current.pages) {
    if (Number(p.views) >= 20 && Number(p.engaged_ms) < 10000)
      found.push({
        title: "Review engagement: " + p.title,
        observed: `${p.views} page views; ${Math.round(Number(p.engaged_ms) / 1000)} seconds average measured foreground time.`,
        recommendation:
          "Check whether the page answers a quick question, or whether navigation and content need improvement.",
        sample: Number(p.views),
        limitation:
          "Foreground time is capped at five minutes and is not proof of reading. Quick-reference pages can be useful with short visits.",
        baseline:
          "Investigative threshold: 20 views and under 10 seconds, not a statistical benchmark.",
      });
  }
  if (report.community.unanswered > 0)
    found.push({
      title: "Unanswered technical questions",
      observed: `${report.community.unanswered} retained, visible technical discussions created in this range have no visible reply.`,
      recommendation:
        "Review the community help queue and invite relevant expertise.",
      sample: report.community.unanswered,
      limitation:
        "Current reply state for retained discussions; deleted/hidden records are excluded.",
      baseline: "Current backlog; no historical backlog snapshot.",
    });
  return found;
}
export function summaryText(r: Report) {
  const c = r.current;
  const organicDates =
    r.search_console?.rows.filter((row) => row.dimension === "date") || [];
  const organic =
    r.search_console?.status && organicDates.length
      ? `Search Console: ${organicDates.reduce((n, row) => n + Number(row.clicks), 0)} organic clicks and ${organicDates.reduce((n, row) => n + Number(row.impressions), 0)} search impressions on ${organicDates.length} returned Pacific dates. Missing dates are unavailable; query/page totals are not added to daily totals.`
      : "Search Console: no dated provider observations available in this range.";
  const lines = [
    "E34 Lore website report",
    `${r.start} to ${r.end} (UTC, end exclusive)`,
    `Generated ${r.generated_at}`,
    "",
    c.available
      ? `Measured public-page views: ${c.views}; sessions: ${c.sessions}; distinct browsers: ${c.browsers}.`
      : "Expanded collection unavailable in this period.",
    c.available
      ? comparison(
          c.views,
          r.previous.views,
          c.complete && r.previous.complete && !r.limited,
        )
      : "No fabricated historical visitor counts.",
    `Public activity: ${r.legacy.filter((x) => x.area.includes(":")).reduce((n, x) => n + x.opens, 0)} counted actions. See Activity for the E34 and E30 breakdown.`,
    `Historical section opens: ${r.legacy.filter((x) => !x.area.includes(":")).reduce((n, x) => n + x.opens, 0)}.`,
    `Technical searches: ${c.search_pages ? c.searches : "unavailable"}; zero results: ${c.search_pages ? c.zero_results : "unavailable"}.`,
    `Returning browser IDs: ${c.available ? c.returning_browsers : "unavailable"}; IDs rotate after 30 days.`,
    `Community: ${Object.entries(r.community)
      .map(([k, v]) => k.replaceAll("_", " ") + ": " + v)
      .join("; ")}.`,
    "",
    "Most viewed content",
    ...c.pages.slice(0, 5).map((x) => `${x.title}: ${x.views} views`),
    "",
    "Opportunities and technical issues",
    ...opportunities(r).map(
      (x) =>
        `${x.title}\nObserved: ${x.observed}\nSuggested investigation: ${x.recommendation}\nN=${x.sample}. ${x.limitation} ${x.baseline}`,
    ),
    "",
    "Commercial ledger (cents, currencies separate)",
    ...r.commercial.revenue.map(
      (x) =>
        `${x.month} ${x.channel} ${x.currency}: estimated ${x.estimated_cents}; confirmed net ${x.confirmed_net_cents}; receipts ${x.received_cents}.`,
    ),
    "Clicks do not establish sales; RPM is unavailable because opt-in views and all-traffic revenue are different cohorts.",
    "",
    "Visit and journey figures use the opt-in sample. The public activity counts are automatic. Cloudflare reports public traffic separately.",
    organic,
    "Integration status: " +
      Object.entries(r.integrations || {})
        .map(
          ([name, status]) =>
            name.replaceAll("_", " ") + ": " + status.replaceAll("_", " "),
        )
        .join("; "),
  ];
  return lines.join("\n");
}

/** Keep exact ledger cents as strings; never round through Number for sorting. */
export function compareMetricCells(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  const x = a ?? "",
    y = b ?? "";
  if (typeof x === "number" && typeof y === "number") return x - y;
  if (/^-?\d+$/.test(String(x)) && /^-?\d+$/.test(String(y))) {
    const left = BigInt(x),
      right = BigInt(y);
    return left === right ? 0 : left < right ? -1 : 1;
  }
  return String(x).localeCompare(String(y));
}
