"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Download, RefreshCw, Shield } from "lucide-react";
import { db, useApp } from "../components/context";
import { PageIntro, Notice } from "../components/common";
import { DocumentLink } from "../components/DocumentLink";
import { publicActivityLabels } from "./activity";
import {
  reportSchema,
  compareMetricCells,
  rangeFor,
  comparison,
  opportunities,
  summaryText,
  type Report,
} from "./report";
import "./analytics.css";
type Row = Record<string, string | number | null>;
function Table({
  rows,
  columns,
  empty = "No recorded observations in this range.",
}: {
  rows: Row[];
  columns: [string, string][];
  empty?: string;
}) {
  const [sort, setSort] = useState({ key: columns[0][0], desc: false }),
    [filter, setFilter] = useState("");
  const sorted = useMemo(
    () =>
      rows
        .filter((r) =>
          Object.values(r)
            .join(" ")
            .toLowerCase()
            .includes(filter.toLowerCase()),
        )
        .slice()
        .sort((a, b) => {
          const x = a[sort.key] ?? "",
            y = b[sort.key] ?? "";
          return compareMetricCells(x, y) * (sort.desc ? -1 : 1);
        }),
    [rows, sort, filter],
  );
  if (!rows.length) return <p className="analytics-empty">{empty}</p>;
  return (
    <>
      <label className="analytics-table-filter">
        Filter rows{" "}
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          type="search"
        />
      </label>
      <div className="analytics-table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map(([key, label]) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    sort.key === key
                      ? sort.desc
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                >
                  <button
                    onClick={() =>
                      setSort({
                        key,
                        desc: sort.key === key ? !sort.desc : false,
                      })
                    }
                  >
                    {label} {sort.key === key ? (sort.desc ? "↓" : "↑") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 100).map((r, i) => (
              <tr key={i}>
                {columns.map(([key]) => (
                  <td key={key}>
                    {r[key] === null || r[key] === undefined
                      ? "Unavailable"
                      : String(r[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="analytics-caption">
        {sorted.length} matching rows · up to 100 per report table
      </p>
    </>
  );
}
const tabs = [
  "Activity",
  "Opt-in visits",
  "Search",
  "Content & workshop",
  "Journeys",
  "Community",
  "Performance",
  "Commercial",
  "Search visibility",
  "Opportunities",
  "Collection & privacy",
];
export function AnalyticsDashboard() {
  const { user, authReady, authRevision } = useApp();
  const [preset, setPreset] = useState("Last 30 days"),
    [range, setRange] = useState(() => rangeFor("Last 30 days")),
    [kind, setKind] = useState(""),
    [tab, setTab] = useState(tabs[0]),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [response, setResponse] = useState<{ key: string; data: Report } | null>(
      null,
    ),
    [approved, setApproved] = useState(false);
  const key = JSON.stringify([user?.id, authRevision, range, kind, revision]);
  const report = response?.key === key ? response.data : null;
  const activityTotals = new Map<string, number>();
  for (const row of report?.legacy ?? []) {
    if (row.area.includes(":")) activityTotals.set(row.area, (activityTotals.get(row.area) ?? 0) + row.opens);
  }
  useEffect(() => {
    if (!authReady || !user) return;
    let live = true;
    const abort = new AbortController(),
      timer = setTimeout(() => abort.abort(), 15000);
    Promise.resolve(
      db
        .rpc("analytics_report", {
          first_day: range.first,
          last_day: range.last,
          resource_kind: kind || null,
        })
        .abortSignal(abort.signal),
    )
      .then(({ data, error }) => {
        if (!live) return;
        if (error) {
          setError(error.message);
          return;
        }
        const parsed = reportSchema.safeParse(data);
        if (!parsed.success) {
          setError("The analytics report was incomplete. Please refresh.");
          return;
        }
        setError("");
        setResponse({ key, data: parsed.data });
      })
      .catch(() => {
        if (live)
          setError(
            "The report could not load. Check your connection and try again.",
          );
      })
      .finally(() => clearTimeout(timer));
    return () => {
      live = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [authReady, user, key, range.first, range.last, kind]);
  const download = (format: "json" | "text") => {
    if (!report) return;
    const blob = new Blob(
        [
          format === "json"
            ? JSON.stringify(report, null, 2)
            : summaryText(report),
        ],
        { type: format === "json" ? "application/json" : "text/plain" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `e34-lore-${range.first}-${range.last}.${format === "json" ? "json" : "txt"}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const changeCollection = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await db.rpc("analytics_configure", {
        collect: !report?.enabled,
        policy_revision: 2,
      });
      if (r.error) throw r.error;
      setRevision((n) => n + 1);
      setApproved(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Collection settings could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (authReady && !user)
    return (
      <div className="page">
        <PageIntro
          eyebrow="OWNER MANAGEMENT"
          title="Website analytics"
          description="Administrator access and a verified authenticator session are required."
        />
        <DocumentLink href="/account" className="button primary">
          Sign in
        </DocumentLink>
      </div>
    );
  const c = report?.current,
    p = report?.previous;
  const chart = report
    ? (() => {
        const rows = [];
        const day = new Date(report.start),
          end = new Date(report.end);
        while (day < end) {
          const stamp = day.toISOString().slice(0, 10),
            v = report.current.daily.find((x) => x.day === stamp);
          rows.push({
            day: stamp,
            views: v?.views ?? null,
            sessions: v?.sessions ?? null,
            browsers: v?.browsers ?? null,
            opens:
              report.legacy
                .filter((x) => x.day === stamp && !x.area.includes(":"))
                .reduce((s, x) => s + x.opens, 0) || null,
          });
          day.setUTCDate(day.getUTCDate() + 1);
        }
        return rows;
      })()
    : [];
  return (
    <div className="page analytics-page">
      <PageIntro
        eyebrow="OWNER MANAGEMENT"
        title="Website analytics"
        description="Visitor traffic, public reference use, community activity and site health."
      />
      <div className="analytics-actions">
        <DocumentLink href="/manage" className="button outline">
          Management
        </DocumentLink>
        <button
          className="button outline"
          onClick={() => setRevision((n) => n + 1)}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
        <button
          className="button outline"
          disabled={!report}
          onClick={() => download("text")}
        >
          <Download size={15} />
          Download summary
        </button>
        <button
          className="button outline"
          disabled={!report}
          onClick={() => download("json")}
        >
          Report JSON
        </button>
      </div>
      <div className="analytics-controls">
        <label>
          Date range
          <select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              if (e.target.value !== "Custom")
                setRange(rangeFor(e.target.value));
            }}
          >
            {[
              "Today",
              "Yesterday",
              "Last 7 days",
              "Last 30 days",
              "Last 90 days",
              "Custom",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          From (UTC)
          <input
            type="date"
            value={range.first}
            max={range.last}
            onChange={(e) => {
              setPreset("Custom");
              setRange({ ...range, first: e.target.value });
            }}
          />
        </label>
        <label>
          Through (UTC)
          <input
            type="date"
            value={range.last}
            max={new Date().toISOString().slice(0, 10)}
            min={range.first}
            onChange={(e) => {
              setPreset("Custom");
              setRange({ ...range, last: e.target.value });
            }}
          />
        </label>
        <label>
          Public content
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All content</option>
            {["page", "guide", "manual", "model", "article", "quick"].map(
              (k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      {error && (
        <Notice>
          <span role="alert">{error}</span>{" "}
          <DocumentLink href="/account">
            Check your sign-in and authenticator
          </DocumentLink>
        </Notice>
      )}
      {!report && !error && <p role="status">Loading the private report…</p>}
      {report && c && p && (
        <>
          <div className="analytics-actions">
            <a className="button outline" href="https://dash.cloudflare.com/?to=/:account/web-analytics" target="_blank" rel="noreferrer">
              Public visits in Cloudflare
            </a>
            <a className="button outline" href="https://supabase.com/dashboard/projects" target="_blank" rel="noreferrer">
              Backend reports in Supabase
            </a>
          </div>
          {tab !== "Activity" && <div
            className={"analytics-status " + (report.enabled ? "active" : "")}
          >
            <Shield size={17} />
            <span>
              {report.enabled
                ? "The activity reports below count visits and actions from browsers that opt in."
                : "Expanded collection paused. Historical section counts remain available."}{" "}
              {c.available &&
                !c.complete &&
                " Coverage is partial for this date range; growth comparisons are unavailable."}{" "}
              {report.limited > 0 &&
                `${report.limited} events were rejected by collection limits; this range is incomplete.`}
            </span>
          </div>}
          <p className="analytics-caption">
            Generated {new Date(report.generated_at).toLocaleString()} · UTC
            range {report.start.slice(0, 10)} through {report.end.slice(0, 10)}{" "}
            · Comparison {report.previous_start.slice(0, 10)} through{" "}
            {report.previous_end.slice(0, 10)}, with the same elapsed duration.
            Content filters apply to visitor reports; community and commercial
            totals remain site-wide.
          </p>
          <nav className="analytics-tabs" aria-label="Analytics reports">
            {tabs.map((t) => (
              <button
                key={t}
                aria-current={tab === t ? "page" : undefined}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>
          {tab === "Activity" && (
            <>
              <h2>Public activity</h2>
              <p>These counts run automatically. Each action counts once per page load. Use Cloudflare for visits, page views and traffic sources.</p>
              <Table
                rows={Object.entries(publicActivityLabels).map(([kind, label]) => ({
                  label,
                  e34: activityTotals.get("e34:" + kind) ?? 0,
                  e30: activityTotals.get("e30:" + kind) ?? 0,
                }))}
                columns={[["label", "Action"], ["e34", "E34"], ["e30", "E30"]]}
              />
            </>
          )}
          {tab === "Opt-in visits" && (
            <>
              <div className="analytics-cards">
                {(
                  [
                    [
                      "Page views",
                      c.views,
                      p.views,
                      "First eligible public-page views and resumed views after a session timeout. Reloads count; prefetches do not.",
                    ],
                    [
                      "Sessions",
                      c.sessions,
                      p.sessions,
                      "Measured browser activity across tabs. A session ends after 30 minutes idle or four hours.",
                    ],
                    [
                      "Distinct browsers",
                      c.browsers,
                      p.browsers,
                      "Random first-party identifiers; not people. IDs expire after 30 days. Browser resets can count again.",
                    ],
                    [
                      "Returning browsers",
                      c.returning_browsers,
                      p.returning_browsers,
                      "IDs first observed before this range, within retained history. No account linkage.",
                    ],
                  ] as const
                ).map(([label, value, previous, definition]) => (
                  <article key={label}>
                    <h2>{label}</h2>
                    <strong>
                      {c.available ? value.toLocaleString() : "Unavailable"}
                    </strong>
                    <p>
                      {c.available
                        ? comparison(
                            value,
                            previous,
                            c.complete && p.complete && !report.limited,
                          )
                        : "No collection coverage in this range."}
                    </p>
                    <small>{definition}</small>
                  </article>
                ))}
              </div>
              <h2>Recorded activity</h2>
              <p>
                Section opens are shown separately from visitor measurements.
                Gaps mean no recorded observations; daily unique browsers must
                not be added to produce a period total.
              </p>
              <div
                className="analytics-chart"
                role="img"
                aria-label="Daily measured page views, sessions and legacy section opens"
              >
                <ResponsiveContainer width="100%" height={290}>
                  <LineChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(v) => String(v).slice(5)}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      dataKey="views"
                      stroke="#254c3f"
                      dot={false}
                      name="Page views"
                    />
                    <Line
                      dataKey="sessions"
                      stroke="#496d92"
                      dot={false}
                      name="Sessions"
                    />
                    <Line
                      dataKey="opens"
                      stroke="#a47839"
                      dot
                      name="Legacy section opens"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <Table
                rows={report.legacy.filter((row) => !row.area.includes(":"))}
                columns={[
                  ["day", "UTC day"],
                  ["area", "Legacy section"],
                  ["opens", "Opens"],
                ]}
              />
              <h2>Visit depth and time</h2>
              <p>
                {c.available && c.sessions
                  ? `${(c.views / c.sessions).toFixed(2)} views per measured session · ${Math.round(c.engaged_ms / 1000)} seconds total visible, focused time (maximum five minutes per page).`
                  : "Unavailable until there are accepted public-page observations."}{" "}
                Foreground time is not proof of reading. New browser IDs in this
                range: {c.available ? c.new_browsers : "Unavailable"}. A new ID
                was first seen during the range; returning IDs were first seen
                before it.
              </p>
              <h2>Acquisition and devices</h2>
              <Table
                rows={c.acquisition}
                columns={[
                  ["dimension", "Dimension"],
                  ["label", "Category"],
                  ["sessions", "Measured sessions"],
                ]}
              />
              <p>
                Referrers retain only the registrable domain. Missing referrers
                include direct visits and privacy restrictions. Campaign codes
                must be owner-registered. Geography is not collected.
              </p>
              <h3>First and last measured pages in the range</h3>
              <p>
                Range boundaries can cut sessions; the last observed page is not
                a confirmed browser exit.
              </p>
              <Table
                rows={c.entries}
                columns={[
                  ["resource", "First page"],
                  ["sessions", "Sessions"],
                ]}
              />
              <Table
                rows={c.exits}
                columns={[
                  ["resource", "Last observed page"],
                  ["sessions", "Sessions"],
                ]}
              />
            </>
          )}
          {tab === "Search" && (
            <>
              <h2>Search opportunities</h2>
              <p>
                {c.search_pages
                  ? `${c.searches} searches; ${c.zero_results} zero-result searches; ${c.search_clicks} followed by a result click; ${c.search_repeated} followed by another search; ${c.search_abandoned} with no later interaction in a closed session.`
                  : "Search measurements unavailable: no opted-in search page observations in this range."}
              </p>
              <p>
                Topics contain recognized technical words only. These are not
                the original queries. Search errors are excluded from
                zero-result counts. Repeated and clicked searches can overlap;
                an open session is not counted as abandoned.
              </p>
              <Table
                rows={c.topics}
                columns={[
                  ["topic", "Technical topic"],
                  ["model", "Selected model"],
                  ["searches", "Searches"],
                  ["sessions", "Sessions"],
                  ["zero_results", "Zero results"],
                  ["clicked", "Clicked"],
                  ["repeated", "Searched again"],
                  ["abandoned", "No later search/click"],
                ]}
              />
            </>
          )}
          {tab === "Content & workshop" && (
            <>
              <h2>Technical content</h2>
              <Table
                rows={c.pages}
                columns={[
                  ["title", "Reference"],
                  ["kind", "Type"],
                  ["views", "Views"],
                  ["sessions", "Sessions"],
                  ["engaged_ms", "Average foreground ms"],
                ]}
              />
              <h2>Requested OEM parts</h2>
              <p>
                Actual catalog result clicks and component selections, validated
                against canonical records. Raw numeric queries are not stored.
              </p>
              <Table
                rows={c.requested_parts}
                columns={[
                  ["title", "Part"],
                  ["number_normalized", "OEM number"],
                  ["id", "Catalog identity"],
                  ["actions", "Actions"],
                  ["sessions", "Sessions"],
                ]}
              />
              <h2>Actual interactions</h2>
              <p>
                Component selections, isolate actions and slider releases are
                separate from workshop opens. Repeated guide steps measure
                actions, not certified repair completion.
              </p>
              <Table
                rows={c.interactions}
                columns={[
                  ["name", "Event"],
                  ["title", "Public reference"],
                  ["events", "Actions"],
                  ["sessions", "Sessions"],
                ]}
              />
              <h2>Component scanner</h2>
              <p>
                Opt-in scanner counts appear above. Inference timing requires
                performance consent. Analytics excludes photos, OCR text, VINs
                and private scan IDs.
              </p>
            </>
          )}
          {tab === "Journeys" && (
            <>
              <h2>Measured session journeys</h2>
              <p>
                Only ordered events within the same actual session count.
                Navigation observations do not establish causality. These
                funnels require all relevant consent categories and complete
                event delivery; range/content filters can truncate a journey.
              </p>
              {c.available ? (
                c.funnels.map((f) => (
                  <article className="analytics-funnel" key={f.name}>
                    <h3>{f.name}</h3>
                    <ol>
                      {f.steps.map((n, i) => (
                        <li key={i}>
                          <span>
                            {
                              (f.name.startsWith("Search")
                                ? [
                                    "Measured session",
                                    "Site search",
                                    "Catalog result click",
                                    "Walkthrough opened",
                                  ]
                                : [
                                    "Workshop opened",
                                    "Component selected",
                                    "Walkthrough opened",
                                  ])[i]
                            }
                          </span>
                          <strong>{n}</strong>
                          <small>
                            {i && f.steps[i - 1]
                              ? `${((n / f.steps[i - 1]) * 100).toFixed(1)}% of previous step · ${f.steps[i - 1] - n} drop-off`
                              : "No rate baseline"}
                          </small>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))
              ) : (
                <p>Unavailable until measured sessions exist.</p>
              )}
              <p>
                Registration → garage and scanner funnels are unavailable.
                Private account activity is not joined to browsing; no unrelated
                totals are presented as journeys.
              </p>
            </>
          )}
          {tab === "Community" && (
            <>
              <h2>Community and garages</h2>
              <p>
                Site-wide retained records created during this range, read as
                aggregate counts only. Deleted/hidden records change these
                totals. These are operational records, not visitor events or
                historical conversion rates.
              </p>
              <Table
                rows={Object.entries(report.community).map(
                  ([metric, count]) => ({
                    metric: metric.replaceAll("_", " "),
                    count,
                  }),
                )}
                columns={[
                  ["metric", "Activity"],
                  ["count", "Retained records"],
                ]}
              />
              <p>
                Private notes, VINs, maintenance details, journal bodies, photos
                and individual member activity are never returned.
                Returning-member analytics are unavailable.
              </p>
            </>
          )}
          {tab === "Performance" && (
            <>
              <h2>Real-user performance</h2>
              <p>
                {c.performance_pages
                  ? `${c.performance_pages} public pages permitted performance reporting.`
                  : "Unavailable: no performance-consented page observations in this range."}{" "}
                LCP and INP use milliseconds; CLS is unitless. A missing INP can
                mean no qualifying interaction. Small samples are exploratory.
              </p>
              <Table
                rows={c.performance}
                columns={[
                  ["metric", "Core Web Vital"],
                  ["device", "Device"],
                  ["samples", "Samples"],
                  ["p75", "75th percentile"],
                ]}
              />
              <h3>3D model loading</h3>
              <Table
                rows={c.model_load}
                columns={[
                  ["device", "Device"],
                  ["samples", "Loads"],
                  ["p75_ms", "75th percentile ms"],
                ]}
              />
              <h3>Failures</h3>
              <Table
                rows={c.errors}
                columns={[
                  ["name", "Category"],
                  ["resource", "Public reference"],
                  ["device", "Device"],
                  ["events", "Errors"],
                  ["sessions", "Sessions"],
                ]}
              />
              <p>
                Failure reports omit raw messages, stacks, URLs and credentials.
                Client API failures do not measure database execution time. Slow
                database operations, indexing and synthetic broken-link tests
                are not collected by this visitor report.
              </p>
            </>
          )}
          {tab === "Commercial" && (
            <>
              <h2>Retailer interest</h2>
              <p>
                Existing independently consented commercial counts. Clicks are
                not purchases, people or commission.
              </p>
              <Table
                rows={report.commercial.retailers}
                columns={[
                  ["name", "Retailer"],
                  ["clicks", "Authorized clicks"],
                ]}
              />
              <h3>Advertising</h3>
              <Table
                rows={report.commercial.campaigns}
                columns={[
                  ["title", "Campaign"],
                  ["impressions", "Impressions"],
                  ["clicks", "Clicks"],
                ]}
              />
              <h3>Financial ledger</h3>
              <Table
                rows={report.commercial.revenue}
                columns={[
                  ["month", "Month"],
                  ["channel", "Channel"],
                  ["currency", "Currency"],
                  ["estimated_cents", "Estimated cents"],
                  ["confirmed_net_cents", "Confirmed net cents"],
                  ["received_cents", "Received cents"],
                ]}
                empty="No financial ledger entries in this range. No revenue estimate has been added."
              />
              <p>
                Amounts use the existing canonical ledger, with reversals
                subtracted from confirmed earnings. Receipts are separate
                cash-flow records and must not be added to earnings. Currencies
                stay separate. RPM is unavailable: all-traffic revenue and
                optional page views are different cohorts.
              </p>
              <DocumentLink href="/manage/partners" className="button outline">
                Commercial records and approvals
              </DocumentLink>
            </>
          )}
          {tab === "Search visibility" && (
            <>
              <h2>Google Search Console</h2>
              <p>
                Actual organic web-search impressions and clicks, separate from
                website views. Google uses Pacific dates. Search terms are
                reduced to technical topics; page URLs are limited to registered
                public references. Query/page tables contain only returned top
                rows and omit anonymized queries, so their sums need not equal
                the daily totals.
              </p>
              {report.search_console.status ? (
                <p>
                  Property: {report.search_console.status.property} · Last
                  successful sync: {report.search_console.status.last_synced} ·
                  Requested dates: {report.search_console.status.first_day} to{" "}
                  {report.search_console.status.last_day}.{" "}
                  {report.search_console.status.capped
                    ? "The import hit its row cap."
                    : ""}
                </p>
              ) : (
                <Notice>
                  Not connected. A dedicated Google authorization with the
                  read-only Search Console scope is needed. Website Google
                  sign-in does not grant this access.
                </Notice>
              )}
              <button
                className="button outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const r = await db.functions.invoke(
                      "analytics/search-console",
                      { body: { start: range.first, end: range.last } },
                    );
                    if (r.error) {
                      const context = r.error.context;
                      if (context instanceof Response) {
                        const detail = (await context.json()) as {
                          error?: string;
                        };
                        throw Error(
                          detail.error || "Search Console could not sync.",
                        );
                      }
                      throw r.error;
                    }
                    setRevision((n) => n + 1);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Search Console could not sync.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Checking…" : "Sync authorized Search Console data"}
              </button>
              <Table
                rows={report.search_console.rows}
                columns={[
                  ["day", "Google Pacific day"],
                  ["dimension", "Dimension"],
                  ["key", "Public page / technical topic"],
                  ["clicks", "Organic clicks"],
                  ["impressions", "Search impressions"],
                  ["position", "Average position"],
                ]}
                empty="No Search Console data has been imported for this range. Missing provider data is unavailable, not zero."
              />
              <p>
                No GA4 tracker is installed. Search Console indexing and
                search-appearance reports are not yet integrated.
              </p>
            </>
          )}
          {tab === "Opportunities" && (
            <>
              <h2>Observed needs and suggested investigations</h2>
              <p>
                Range: {report.start} to {report.end}. Recommendations below are
                inferences, not proven causes or statistically significant
                changes.
              </p>
              {opportunities(report).length ? (
                opportunities(report).map((o, i) => (
                  <article className="analytics-opportunity" key={i}>
                    <h3>{o.title}</h3>
                    <p>
                      <b>Observed:</b> {o.observed}
                    </p>
                    <p>
                      <b>Suggested investigation:</b> {o.recommendation}
                    </p>
                    <small>
                      N={o.sample} · {o.limitation} {o.baseline}
                    </small>
                  </article>
                ))
              ) : (
                <p>
                  No findings meet the reporting thresholds in this range. More
                  real observations are needed.
                </p>
              )}
            </>
          )}
          {tab === "Collection & privacy" && (
            <>
              <h2>Collection controls</h2>
              <p>
                Privacy revision 2 adds a separately optional random browser
                identifier, public-page measurements, technical search topics
                and performance categories. Existing section-count and
                commercial preferences do not grant this new permission.
              </p>
              <p>
                Data is retained for 90 days. Browser IDs expire after 30 days.
                A hashed deletion marker is kept for 31 days to block late
                retries. No account identifiers, IPs, private-page details, raw
                searches, scanner images, precise location or camera data are
                stored. Visitors can stop collection and request deletion of
                their current browser’s history on{" "}
                <DocumentLink href="/resources#privacy">
                  Privacy & preferences
                </DocumentLink>
                .
              </p>
              <p>
                Known automation and signed-in staff are excluded. Collection is
                capped at 240 events per browser/hour, 5,000 events per day and
                100,000 retained events, with a database-size stop at 450 MiB.
                This is a consent-based sample, not an exhaustive traffic count.
                Failed delivery and blocked scripts can reduce observations.
              </p>
              {!report.enabled && (
                <label className="analytics-approval">
                  <input
                    type="checkbox"
                    checked={approved}
                    onChange={(e) => setApproved(e.target.checked)}
                  />
                  I approve privacy revision 2 and its public notice, and
                  authorize offering these optional measurements to visitors.
                </label>
              )}
              <button
                className="button primary"
                disabled={busy || (!report.enabled && !approved)}
                onClick={changeCollection}
              >
                {busy
                  ? "Saving…"
                  : report.enabled
                    ? "Pause expanded collection"
                    : "Approve revision 2 and enable collection"}
              </button>
              <h2>Registered campaigns</h2>
              <p>
                Only these approved codes are retained from utm_campaign. Use
                public names without personal details. Source and medium
                parameters are not collected.
              </p>
              <form
                className="analytics-controls"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    data = new FormData(form);
                  setBusy(true);
                  try {
                    const r = await db.rpc("analytics_campaign_save", {
                      campaign_code: String(data.get("code")),
                      campaign_label: String(data.get("label")),
                      is_active: true,
                    });
                    if (r.error) throw r.error;
                    form.reset();
                    setRevision((n) => n + 1);
                  } catch (f) {
                    setError(
                      f instanceof Error
                        ? f.message
                        : "The campaign could not be saved.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Public code
                  <input
                    name="code"
                    pattern="[a-z][a-z0-9-]{2,31}"
                    minLength={3}
                    maxLength={32}
                    required
                    placeholder="club-newsletter"
                  />
                </label>
                <label>
                  Public label
                  <input
                    name="label"
                    required
                    maxLength={100}
                    placeholder="Club newsletter"
                  />
                </label>
                <button className="button outline" disabled={busy}>
                  Register campaign
                </button>
              </form>
              {report.campaign_registry.map((c) => (
                <p key={c.code}>
                  <code>{c.code}</code> · {c.label} ·{" "}
                  {c.active ? "Active" : "Paused"}{" "}
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const r = await db.rpc("analytics_campaign_save", {
                          campaign_code: c.code,
                          campaign_label: c.label,
                          is_active: !c.active,
                        });
                        if (r.error) throw r.error;
                        setRevision((n) => n + 1);
                      } catch (f) {
                        setError(
                          f instanceof Error
                            ? f.message
                            : "The campaign could not be updated.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {c.active ? "Pause" : "Resume"}
                  </button>
                </p>
              ))}
              <h2>External integrations</h2>
              <Table
                rows={Object.entries(report.integrations).map(
                  ([integration, status]) => ({
                    integration: integration.replaceAll("_", " "),
                    status: status.replaceAll("_", " "),
                  }),
                )}
                columns={[
                  ["integration", "Integration"],
                  ["status", "Actual status"],
                ]}
              />
              <p>
                Search Console needs a dedicated read-only authorization for E34
                Lore. Google account sign-in is not Search Console access. GA4
                is not installed, avoiding overlapping trackers. Email reports
                remain disabled while support-email configuration is deferred.
              </p>
              <h2>Weekly and monthly summaries</h2>
              <p>
                Choose the last 7 or 30 days above and download the actual
                report as a readable summary or JSON. No scheduled mail is sent,
                and no arbitrary recipient can be entered.
              </p>
              <h2>Definitions and coverage</h2>
              <p>
                Collection enabled for {Math.round(c.coverage_seconds / 3600)}{" "}
                hours within the selected range. Paused dates, periods before
                activation and expired records are unavailable. Zeros are not
                fabricated for uncovered dates. Distinct-browser totals are
                calculated over the whole range, never by adding daily uniques.
                Metric comparisons use an equal preceding elapsed period; no
                percentage is shown for an unavailable or zero baseline.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
