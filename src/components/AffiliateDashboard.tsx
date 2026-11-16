"use client";
import {
  CommercialActivityReport,
  UnmatchedCatalogQueue,
  activitySchema,
} from "./AffiliateReports";
import { DocumentLink } from "./DocumentLink";
import { AffiliateReadinessCheck } from "./AffiliateReadiness";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { ArrowUpRight, Plus, RefreshCw, Download, Copy } from "lucide-react";
import { db, useApp } from "./context";
import { downloadText } from "../lib/download";
import { Modal, Notice, PageIntro, Empty, Tag } from "./common";
import { CatalogPartField, type PartIdentity } from "./CatalogPartField";
import { AdvertisingSlot, type Advertisement } from "./Commercial";
import {
  commercialEntities,
  commercialSections,
  type CommercialSection,
  type Field,
} from "../domain/commercial-forms";
import { csvCell, generateAffiliateUrl, money } from "../domain/affiliates";
import leads from "../data/affiliate-research.json";
import application from "../data/affiliate-application.json";

const rowSchema = z
  .object({ id: z.string(), updated_at: z.string() })
  .passthrough();
type Row = z.infer<typeof rowSchema>;
const workspaceSchema = activitySchema
  .extend({
    advertising_enabled: z.boolean(),
    counts: z.record(z.string(), z.number().int().nonnegative()),
    monthly_revenue: z.array(
      z.object({
        month: z.string(),
        currency: z.string(),
        channel: z.enum(["affiliate", "advertising", "sponsorship"]),
        estimated_cents: z.string().regex(/^\d+$/),
        confirmed_net_cents: z.string().regex(/^-?\d+$/),
        received_cents: z.string().regex(/^\d+$/),
      }),
    ),
    programs: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.string(),
        tracking_hosts: z.array(z.string()),
        query_parameters: z.array(z.string()),
        link_template: z.string().nullable(),
        public_parameters: z.record(z.string(), z.string()),
      }),
    ),
    merchants: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        program_id: z.string(),
        allowed_hosts: z.array(z.string()),
      }),
    ),
  })
  .passthrough();
type Workspace = z.infer<typeof workspaceSchema>;
function rows(data: Workspace | null, entity: string): Row[] {
  const result = z.array(rowSchema).safeParse(data?.[entity]);
  return result.success ? result.data : [];
}
function rowName(row: Row) {
  return String(
    row.name ||
      row.title ||
      row.retailer_sku ||
      row.program_id ||
      row.external_reference ||
      row.part_id ||
      row.id,
  );
}
function saveFile(
  filename: string,
  content: string,
  type = "text/csv;charset=utf-8",
) {
  downloadText(content, filename, type);
}
function localDateTime(value: unknown) {
  if (!value) return "";
  const d = new Date(String(value));
  return Number.isFinite(d.getTime())
    ? new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
}
function PartChoice({
  name,
  initial,
  required,
}: {
  name: string;
  initial: string;
  required?: boolean;
}) {
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<PartIdentity | null>(null);
  const [id, setId] = useState(initial);
  return (
    <div className="commercial-part-choice">
      <CatalogPartField
        value={value}
        selected={selected}
        onChange={(v) => {
          setValue(v);
          setSelected(null);
          setId("");
        }}
        onSelect={(p) => {
          setSelected(p);
          setId(p.id);
          setValue(p.number_normalized || p.name);
        }}
      />
      <input type="hidden" name={name} value={id} />
      <p className="small">
        {id
          ? "Selected: " + id
          : required
            ? "Choose a catalog result before saving."
            : "No catalog identity selected."}
      </p>
    </div>
  );
}
function RecordField({
  field,
  row,
  data,
}: {
  field: Field;
  row: Row | null;
  data: Workspace;
}) {
  const initial = row?.[field.key] ?? field.default ?? "";
  const common = { name: field.key, required: field.required };
  let references: { id: string; name: string }[] = [];
  if (field.key === "program_id" || field.key === "network_id")
    references =
      field.key === "program_id"
        ? data.programs
        : rows(data, "affiliate_networks").map((r) => ({
            id: r.id,
            name: rowName(r),
          }));
  if (field.key === "merchant_id") references = data.merchants;
  const relation: { [key: string]: string } = {
    product_id: "merchant_products",
    match_id: "affiliate_match_reviews",
    link_id: "affiliate_links",
    sponsorship_id: "sponsorships",
  };
  if (relation[field.key])
    references = rows(data, relation[field.key]).map((r) => ({
      id: r.id,
      name: rowName(r),
    }));
  if (field.type === "part")
    return (
      <div>
        <h3>{field.label}</h3>
        <PartChoice
          name={field.key}
          initial={String(initial)}
          required={field.required}
        />
        {field.help && <p className="small muted">{field.help}</p>}
      </div>
    );
  return (
    <label>
      {field.label}
      {field.type === "checkbox" ? (
        <input {...common} type="checkbox" defaultChecked={Boolean(initial)} />
      ) : field.options ? (
        <select {...common} defaultValue={String(initial)}>
          {field.options.map((v) => (
            <option value={v} key={v}>
              {v.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      ) : references.length ? (
        <select {...common} defaultValue={String(initial)}>
          <option value="">Choose…</option>
          {initial && !references.some((r) => r.id === initial) && (
            <option value={String(initial)}>{String(initial)}</option>
          )}
          {references.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.id}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" || field.type === "json" ? (
        <textarea
          {...common}
          rows={field.type === "json" ? 4 : 5}
          maxLength={6000}
          defaultValue={
            field.type === "json"
              ? JSON.stringify(initial || {}, null, 2)
              : String(initial)
          }
        />
      ) : (
        <input
          {...common}
          type={
            field.type === "datetime"
              ? "datetime-local"
              : field.type === "number"
                ? "number"
                : field.type === "date"
                  ? "date"
                  : field.type === "url"
                    ? "url"
                    : "text"
          }
          defaultValue={
            field.type === "array"
              ? Array.isArray(initial)
                ? initial.join(", ")
                : String(initial)
              : field.type === "datetime"
                ? localDateTime(initial)
                : String(initial)
          }
          min={field.type === "number" ? 0 : undefined}
          step={field.type === "number" ? 1 : undefined}
          maxLength={field.type === "url" ? 4096 : 1000}
        />
      )}
      {field.help && <small className="muted">{field.help}</small>}
    </label>
  );
}
function RecordEditor({
  entity,
  row,
  data,
  onDone,
  onClose,
}: {
  entity: string;
  row: Row | null;
  data: Workspace;
  onDone: () => void;
  onClose: () => void;
}) {
  const def = commercialEntities[entity];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      if (row) payload.id = row.id;
      for (const f of def.fields) {
        if (row && f.key === "id") continue;
        const raw = values.get(f.key);
        let value: unknown =
          f.type === "checkbox" ? raw === "on" : String(raw ?? "").trim();
        if (f.required && (value === "" || value === null))
          throw new Error(f.label + " is required.");
        if (f.type === "json") value = JSON.parse(String(value || "{}"));
        else if (f.type === "array")
          value = String(value)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        else if (f.type === "number")
          value = value === "" ? null : Number(value);
        else if (f.type === "datetime")
          value = value ? new Date(String(value)).toISOString() : null;
        else if (value === "")
          value =
            f.type === "url" || f.type === "date" || f.key.endsWith("_id")
              ? null
              : "";
        // Omit new optional text fields so database defaults remain authoritative.
        if (
          value === null &&
          !row &&
          !f.required &&
          ["text", "textarea", undefined].includes(f.type)
        )
          continue;
        payload[f.key] = value;
      }
      const result = await db.rpc("save_affiliate_record", {
        entity,
        payload,
        reason: String(values.get("reason") || ""),
        expected_updated_at: row?.updated_at || null,
      });
      if (result.error) throw new Error(result.error.message);
      onDone();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Record could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={(row ? "Edit " : "Add ") + def.label.toLowerCase()}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} className="commercial-record-form">
        <p className="small muted">
          Approval fields record your confirmation of actual provider evidence.
          They do not apply to a program or obtain approval from a retailer.
        </p>
        <div className="form-grid">
          {def.fields
            .filter((f) => !row || f.key !== "id")
            .map((field) => (
              <RecordField
                key={entity + field.key}
                field={field}
                row={row}
                data={data}
              />
            ))}
        </div>
        <label>
          Reason for this change
          <textarea
            name="reason"
            minLength={10}
            maxLength={2000}
            required
            rows={3}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="form-actions">
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save record"}
          </button>
          <button
            type="button"
            className="button outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
function FeedImport({
  onDone,
  onClose,
}: {
  onDone: () => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Import an authorized product feed"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        Use the CSV, JSON or XML adapter to prepare a reviewed product batch.
        This import creates retailer products and unverified identifier
        candidates. It does not approve matches or publish offers.
      </p>
      <p className="small">
        <code>python3 tools/affiliate_feeds.py --help</code>
      </p>
      <label>
        Normalized JSON batch
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            setError("");
            setFile(null);
            try {
              const selected = e.target.files?.[0];
              if (!selected) return;
              if (selected.size > 4000000)
                throw new Error("Split files larger than 4 MB.");
              const parsed = JSON.parse(await selected.text());
              if (
                !parsed ||
                !Array.isArray(parsed.products) ||
                !parsed.products.length ||
                parsed.products.length > 5000
              )
                throw new Error(
                  "Choose a nonempty normalized batch with at most 5000 products.",
                );
              setFile(parsed);
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : "The batch could not be read.",
              );
            }
          }}
        />
      </label>
      {file && (
        <>
          <p>
            {(file.products as unknown[]).length} candidate products ·{" "}
            {String(file.merchant_key)}
          </p>
          <details>
            <summary>Import preview</summary>
            <pre>{JSON.stringify(file.preview || {}, null, 2)}</pre>
          </details>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const values = new FormData(e.currentTarget);
                const result = await db.rpc("import_affiliate_products", {
                  merchant_key: file.merchant_key,
                  feed_source_url: file.feed_source_url,
                  feed_sha256: file.feed_sha256,
                  format_name: file.format_name,
                  products: file.products,
                  authorization_evidence_url: file.authorization_evidence_url,
                  reason: String(values.get("reason")),
                });
                if (result.error) throw new Error(result.error.message);
                onDone();
              } catch (failure) {
                setError(
                  failure instanceof Error ? failure.message : "Import failed.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              <input type="checkbox" required />I have permission to import and
              use this feed under its current terms.
            </label>
            <label>
              Import reason
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={2000}
              />
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? "Importing…" : "Import candidate products"}
            </button>
          </form>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </Modal>
  );
}
function LinkGenerator({ data }: { data: Workspace }) {
  const [merchant, setMerchant] = useState("");
  const [destination, setDestination] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  return (
    <details className="commercial-tool">
      <summary>Generate a link from approved program rules</summary>
      <p>
        No tracking identifier is invented. Save the program’s documented
        template, public identifiers and authorized hosts first.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setResult("");
          try {
            const m = data.merchants.find((r) => r.id === merchant);
            const p = data.programs.find((r) => r.id === m?.program_id);
            if (!m || !p) throw new Error("Choose an approved retailer.");
            setResult(
              generateAffiliateUrl({
                approved: p.status === "approved",
                template: p.link_template || "",
                destination,
                merchantHosts: m.allowed_hosts,
                trackingHosts: p.tracking_hosts,
                parameters: p.public_parameters,
                allowedQuery: p.query_parameters,
              }),
            );
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "The link could not be generated.",
            );
          }
        }}
      >
        <label>
          Retailer
          <select
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            required
          >
            <option value="">Choose…</option>
            {data.merchants.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Product destination
          <input
            type="url"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </label>
        <button className="button outline">Generate approved URL</button>
        {result && (
          <label>
            Generated URL
            <textarea readOnly value={result} />
          </label>
        )}
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}
export function AffiliateDashboard() {
  const { user, authReady, authRevision, toast } = useApp();
  const userId = user?.id;
  const [section, setSection] = useState<CommercialSection>("overview"),
    [entity, setEntity] = useState("affiliate_applications"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [revision, setRevision] = useState(0);
  const [response, setResponse] = useState<{
    key: string;
    scope: string;
    data: Workspace | null;
    error: string;
  } | null>(null);
  const [editor, setEditor] = useState<{
      entity: string;
      row: Row | null;
    } | null>(null),
    [importing, setImporting] = useState(false),
    [checking, setChecking] = useState(""),
    [preview, setPreview] = useState<Advertisement[]>([]);
  const scope = JSON.stringify([userId, authRevision, section]),
    key = JSON.stringify([scope, search, revision]);
  const data = response?.scope === scope ? response.data : null;
  const error = response?.key === key ? response.error : "";
  const updating = !!data && response?.key !== key;
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 15000);
    Promise.resolve(
      db
        .rpc("affiliate_workspace", {
          section_name: section,
          search_text: search,
        })
        .abortSignal(controller.signal),
    )
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        const parsed = workspaceSchema.safeParse(data);
        if (!parsed.success)
          throw new Error(
            "The partnership workspace returned incomplete data.",
          );
        for (const table of commercialSections[section]) {
          if (!z.array(rowSchema).safeParse(parsed.data[table]).success)
            throw new Error("A partnership record list could not be read.");
        }
        if (active) setResponse({ key, scope, data: parsed.data, error: "" });
      })
      .catch((failure: unknown) => {
        if (active)
          setResponse({
            key,
            scope,
            data: null,
            error: controller.signal.aborted
              ? "The partnership workspace took too long. Please retry."
              : failure instanceof Error
                ? failure.message
                : "The workspace is unavailable.",
          });
      })
      .finally(() => clearTimeout(deadline));
    return () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [userId, section, search, key, scope]);
  function changeSection(next: CommercialSection) {
    setSection(next);
    setEntity(commercialSections[next][0] || "affiliate_applications");
    setQuery("");
    setSearch("");
    setPreview([]);
  }
  const records = rows(data, entity);
  const def = commercialEntities[entity];
  const done = () => {
    setEditor(null);
    setImporting(false);
    setRevision((r) => r + 1);
    toast("Partnership record saved.");
  };
  async function checkLink(id: string) {
    setChecking(id);
    try {
      const { data: session } = await db.auth.getSession();
      if (!session.session) throw new Error("Sign in again.");
      const result = await fetch("/api/affiliate/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.session.access_token,
        },
        body: JSON.stringify({ linkId: id }),
      });
      const outcome = z
        .object({ status: z.string().optional(), error: z.string().optional() })
        .parse(await result.json());
      if (!result.ok) throw new Error(outcome.error || "Link check failed.");
      toast("Link check: " + outcome.status);
      setRevision((r) => r + 1);
    } catch (failure) {
      toast(failure instanceof Error ? failure.message : "Link check failed.");
    } finally {
      setChecking("");
    }
  }
  return (
    <div className="page affiliate-dashboard">
      <PageIntro
        eyebrow="E34 LORE / OWNER OPERATIONS"
        title="Affiliates & advertising."
        description="Applications, reviewed retailer offers and advertising records. Commercial terms never determine technical compatibility."
      >
        <DocumentLink className="button outline" href="/manage">
          Owner dashboard <ArrowUpRight size={14} />
        </DocumentLink>
        <button
          className="button outline"
          onClick={() => setRevision((r) => r + 1)}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </PageIntro>
      {!authReady ? (
        <p>Checking your account…</p>
      ) : !user ? (
        <Empty title="Sign in with your administrator account">
          <DocumentLink href="/account?next=/manage/partners#account-security">
            Sign in
          </DocumentLink>
        </Empty>
      ) : error ? (
        <Notice tone="warning">
          <p role="alert">{error}</p>
          <DocumentLink href="/account?next=/manage/partners#account-security">
            Verify account security
          </DocumentLink>
          <button
            className="text-link"
            onClick={() => setRevision((r) => r + 1)}
          >
            Retry
          </button>
        </Notice>
      ) : !data ? (
        <p role="status">Loading partnership records…</p>
      ) : (
        <>
          <nav
            className="dashboard-tabs"
            aria-label="Partnership workspace sections"
          >
            {(Object.keys(commercialSections) as CommercialSection[]).map(
              (name) => (
                <button
                  key={name}
                  aria-pressed={section === name}
                  onClick={() => changeSection(name)}
                >
                  {name === "matching"
                    ? "Product matching"
                    : name.charAt(0).toUpperCase() + name.slice(1)}
                </button>
              ),
            )}
          </nav>
          {section === "overview" ? (
            <>
              <div className="owner-stat-grid">
                {Object.entries(data.counts).map(([label, value]) => (
                  <div key={label}>
                    <strong>{value}</strong>
                    <span>{label.replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
              <Notice>
                <p>
                  {data.counts.approved_programs === 0
                    ? "No program has been approved yet. "
                    : "Approved programs still require reviewed products and checked links. "}
                  {data.advertising_enabled
                    ? "Display advertising is enabled for eligible approved campaigns."
                    : "Display advertising is disabled."}
                </p>
                <ul>
                  {data.programs
                    .filter((p) => p.status !== "researching")
                    .map((p) => (
                      <li key={p.id}>
                        {p.name}: {p.status.replaceAll("_", " ")}
                      </li>
                    ))}
                </ul>
              </Notice>
              <AffiliateReadinessCheck scope={JSON.stringify([userId, authRevision, revision])} onSection={changeSection} />
              <h2>Monthly recorded revenue</h2>
              <button
                className="button outline"
                disabled={!data.monthly_revenue.length}
                onClick={() =>
                  downloadText(
                    [
                      [
                        "month",
                        "currency",
                        "channel",
                        "estimated_cents",
                        "confirmed_net_cents",
                        "received_cents",
                      ]
                        .map(csvCell)
                        .join(","),
                      ...data.monthly_revenue.map((r) =>
                        [
                          r.month,
                          r.currency,
                          r.channel,
                          BigInt(r.estimated_cents),
                          BigInt(r.confirmed_net_cents),
                          BigInt(r.received_cents),
                        ]
                          .map(csvCell)
                          .join(","),
                      ),
                    ].join("\r\n"),
                    "e34lore-monthly-revenue.csv",
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <Download size={14} />
                Export monthly summary
              </button>
              <p>
                Estimates, confirmed net earnings and received money are
                separate. Clicks never establish a sale. Currencies are not
                combined.
              </p>
              {!data.monthly_revenue.length ? (
                <p>No documented revenue has been recorded.</p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Currency</th>
                        <th>Income source</th>
                        <th>Estimated</th>
                        <th>Confirmed, after reversals</th>
                        <th>Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly_revenue.map((r) => (
                        <tr key={r.month + r.currency + r.channel}>
                          <td>{r.month.slice(0, 7)}</td>
                          <td>{r.currency}</td>
                          <td>{r.channel}</td>
                          <td>{money(r.estimated_cents, r.currency)}</td>
                          <td>{money(r.confirmed_net_cents, r.currency)}</td>
                          <td>{money(r.received_cents, r.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <CommercialActivityReport data={data} />
              <details>
                <summary>Accurate application materials</summary>
                <h3>Website description</h3>
                <p>{application.description}</p>
                <h3>Audience and traffic</h3>
                <p>{application.audience}</p>
                <p>{application.traffic_statement}</p>
                <h3>Proposed placements</h3>
                <p>{application.placements}</p>
              </details>
            </>
          ) : (
            <>
              <div className="commercial-toolbar">
                <label>
                  Manage records
                  <select
                    value={entity}
                    onChange={(e) => setEntity(e.target.value)}
                  >
                    {commercialSections[section].map((name) => (
                      <option value={name} key={name}>
                        {commercialEntities[name].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Search these records
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={120}
                    placeholder="Retailer, SKU, part ID or record text"
                  />
                </label>
                {!def.singleton && def.fields.length > 0 && (
                  <button
                    className="button primary"
                    disabled={updating}
                    onClick={() => setEditor({ entity, row: null })}
                  >
                    <Plus size={14} />
                    Add record
                  </button>
                )}
                <button
                  className="button outline"
                  disabled={updating || !records.length}
                  onClick={() => {
                    const keys = [
                      ...new Set(records.flatMap((r) => Object.keys(r))),
                    ];
                    saveFile(
                      "e34lore-" + entity + ".csv",
                      [
                        keys.map(csvCell).join(","),
                        ...records.map((r) =>
                          keys
                            .map((k) =>
                              csvCell(
                                typeof r[k] === "object"
                                  ? JSON.stringify(r[k])
                                  : r[k],
                              ),
                            )
                            .join(","),
                        ),
                      ].join("\r\n"),
                    );
                  }}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
              <p role="status" className="small muted">
                {updating
                  ? "Updating records…"
                  : "Up to 100 recent matches. Search to narrow the list."}
              </p>
              {section === "applications" &&
                rows(data, "affiliate_applications").some(
                  (row) => row.follow_up_on,
                ) && (
                  <section className="commercial-reminders">
                    <h2>Follow-up dates</h2>
                    <ul>
                      {rows(data, "affiliate_applications")
                        .filter((row) => typeof row.follow_up_on === "string")
                        .sort((a, b) =>
                          String(a.follow_up_on).localeCompare(
                            String(b.follow_up_on),
                          ),
                        )
                        .map((row) => (
                          <li key={row.id}>
                            {String(row.follow_up_on)} · {rowName(row)}
                          </li>
                        ))}
                    </ul>
                    <p className="small muted">
                      These are owner reminders, not automatic messages to a
                      retailer.
                    </p>
                  </section>
                )}
              {section === "matching" && (
                <div className="form-actions">
                  <button
                    className="button outline"
                    onClick={() => setImporting(true)}
                  >
                    Import authorized feed
                  </button>
                </div>
              )}
              {section === "matching" && (
                <>
                  <UnmatchedCatalogQueue />
                  <LinkGenerator data={data} />
                </>
              )}
              {section === "advertising" && (
                <>
                  <Notice>
                    All display advertising is initially off. Two placements are
                    available only on eligible public pages. AdSense ownership
                    and application status do not install ad code. Program
                    approval and the required consent setup remain
                    prerequisites.
                  </Notice>
                  <button
                    className="button outline"
                    onClick={async () => {
                      const result = await db.rpc("public_advertisements", {
                        page_section: "parts",
                        preview: true,
                      });
                      if (result.error) toast(result.error.message);
                      else {
                        setPreview(
                          Array.isArray(result.data) ? result.data : [],
                        );
                        if (!result.data?.length)
                          toast(
                            "No approved sponsor creative is available to preview.",
                          );
                      }
                    }}
                  >
                    Preview saved creative
                  </button>
                  <AdvertisingSlot
                    ads={preview}
                    placement="public_top"
                    path="/parts/catalog"
                    preview
                  />
                  <AdvertisingSlot
                    ads={preview}
                    placement="public_bottom"
                    path="/parts/catalog"
                    preview
                  />
                </>
              )}
              {section === "revenue" && (
                <Notice>
                  Keep network reports, payment receipts and the revenue ledger
                  distinct. The overview’s monthly totals use the ledger only.
                  Record each documented earning, reversal and receipt once; a
                  click counter is never revenue.
                </Notice>
              )}
              <fieldset
                className="dashboard-results commercial-records"
                disabled={updating || !!checking}
                aria-busy={updating}
              >
                {records.length ? (
                  records.map((row) => (
                    <article key={row.id} className="commercial-record">
                      <div>
                        <p className="eyebrow">{def.label}</p>
                        <h3>{rowName(row)}</h3>
                        <div className="inline-tags">
                          {typeof row.status === "string" && (
                            <Tag>{String(row.status)}</Tag>
                          )}
                          {typeof row.kind === "string" && (
                            <Tag>{String(row.kind)}</Tag>
                          )}
                          {typeof row.review_status === "string" && (
                            <Tag>{String(row.review_status)}</Tag>
                          )}
                          {row.active === false && <Tag>Inactive</Tag>}
                          {row.published === false && <Tag>Unpublished</Tag>}
                        </div>
                        {typeof row.description === "string" && (
                          <p>{row.description}</p>
                        )}
                        {typeof row.owner_notes === "string" && (
                          <p>{row.owner_notes}</p>
                        )}
                        {typeof row.compatibility_notes === "string" && (
                          <p>{row.compatibility_notes}</p>
                        )}
                        {typeof row.rules === "string" && (
                          <p className="post-body small">{row.rules}</p>
                        )}
                        <p className="small muted">
                          ID: <code>{row.id}</code>
                        </p>
                        <details>
                          <summary>Record details and provenance</summary>
                          <dl className="commercial-details">
                            {Object.entries(row).map(([key, value]) => (
                              <div key={key}>
                                <dt>{key.replaceAll("_", " ")}</dt>
                                <dd>
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value ?? "—")}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      </div>
                      <div className="form-actions">
                        {!def.immutable && (
                          <button
                            className="button outline"
                            onClick={() => setEditor({ entity, row })}
                          >
                            Edit record
                          </button>
                        )}
                        <button
                          className="text-link"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(row.id);
                              toast("Record ID copied.");
                            } catch {
                              toast(
                                "Copy is unavailable; select the record ID above.",
                              );
                            }
                          }}
                        >
                          <Copy size={13} />
                          Copy ID
                        </button>
                        {entity === "affiliate_links" && (
                          <button
                            className="button outline"
                            onClick={() => checkLink(row.id)}
                          >
                            {checking === row.id
                              ? "Checking…"
                              : "Check permitted link"}
                          </button>
                        )}
                        {typeof row.application_url === "string" && (
                          <a
                            href={row.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Official application <ArrowUpRight size={14} />
                          </a>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <Empty title="No records found">
                    No matching business records are available. Unapproved
                    applications and empty offer lists do not create public
                    advertisements.
                  </Empty>
                )}
              </fieldset>
            </>
          )}
          {section === "applications" && (
            <section className="commercial-research">
              <h2>Retailer research</h2>
              <p>
                Checked 7 November 2026. A research lead does not establish a
                partnership, feed license or approved commission.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Retailer</th>
                      <th>Official information</th>
                      <th>Eligibility / next step</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td>{lead.name}</td>
                        <td>
                          <a
                            href={lead.source}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Official source <ArrowUpRight size={13} />
                          </a>
                          <p>{lead.availability}</p>
                        </td>
                        <td>{lead.eligibility}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
      {editor && data && (
        <RecordEditor
          entity={editor.entity}
          row={editor.row}
          data={data}
          onDone={done}
          onClose={() => setEditor(null)}
        />
      )}{" "}
      {importing && (
        <FeedImport onDone={done} onClose={() => setImporting(false)} />
      )}
    </div>
  );
}
