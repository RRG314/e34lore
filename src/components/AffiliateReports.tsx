"use client";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { db } from "./context";
import { DocumentLink } from "./DocumentLink";
import { Notice } from "./common";
const gapSchema = z.object({
  rows: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        number_normalized: z.string(),
        pending_candidates: z.number().int(),
        rejected_candidates: z.number().int(),
      }),
    )
    .max(25),
  has_more: z.boolean(),
  next_number: z.string().nullable(),
  next_id: z.string().nullable(),
});
type GapPage = z.infer<typeof gapSchema>;
type GapRequest = {
  query: string;
  number: string | null;
  id: string | null;
  revision: number;
};
export function UnmatchedCatalogQueue() {
  const [query, setQuery] = useState("");
  const [request, setRequest] = useState<GapRequest | null>(null);
  const [response, setResponse] = useState<{
    key: string;
    data: GapPage | null;
    error: string;
  } | null>(null);
  const key = JSON.stringify(request);
  const current = response?.key === key ? response : null;
  useEffect(() => {
    if (!request) return;
    let active = true;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 15000);
    Promise.resolve(
      db
        .rpc("affiliate_catalog_gaps", {
          search_text: request.query,
          after_number: request.number,
          after_id: request.id,
        })
        .abortSignal(controller.signal),
    )
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        const page = gapSchema.parse(data);
        if (active) setResponse({ key, data: page, error: "" });
      })
      .catch((failure: unknown) => {
        if (active)
          setResponse({
            key,
            data: null,
            error: controller.signal.aborted
              ? "The catalog queue took too long. Please retry."
              : failure instanceof Error
                ? failure.message
                : "The catalog queue is unavailable.",
          });
      })
      .finally(() => clearTimeout(deadline));
    return () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [request, key]);
  function search(event: FormEvent) {
    event.preventDefault();
    setRequest({
      query: query.trim(),
      number: null,
      id: null,
      revision: (request?.revision ?? 0) + 1,
    });
  }
  return (
    <details className="commercial-tool">
      <summary>Catalog parts without an approved retailer match</summary>
      <p>
        This queue contains canonical BMW identities. It does not infer vehicle
        fitment or create purchasing recommendations. Pending and rejected
        candidates remain separate.
      </p>
      <form onSubmit={search} className="commercial-toolbar">
        <label>
          OEM number or component name
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={120}
            placeholder="11511711484 or coolant pump"
          />
        </label>
        <button className="button outline" type="submit">
          Find unmatched parts
        </button>
      </form>
      {request && !current && (
        <p role="status">Loading unmatched catalog parts…</p>
      )}
      {current?.error && (
        <Notice tone="warning">
          <p role="alert">{current.error}</p>
          <button
            className="text-link"
            onClick={() =>
              setRequest((previous) =>
                previous
                  ? { ...previous, revision: previous.revision + 1 }
                  : null,
              )
            }
          >
            Retry
          </button>
        </Notice>
      )}
      {current?.data && (
        <>
          {!current.data.rows.length ? (
            <p>No unmatched identities found for this search.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>BMW number / part</th>
                    <th>Pending</th>
                    <th>Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {current.data.rows.map((part) => (
                    <tr key={part.id}>
                      <td>
                        <DocumentLink
                          href={
                            "/parts/catalog?part=" + encodeURIComponent(part.id)
                          }
                        >
                          {part.number_normalized} · {part.name}
                        </DocumentLink>
                        <p className="small muted">
                          Catalog ID: <code>{part.id}</code>
                        </p>
                      </td>
                      <td>{part.pending_candidates}</td>
                      <td>{part.rejected_candidates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="form-actions">
            {request?.number && (
              <button
                className="button outline"
                onClick={() =>
                  setRequest((previous) =>
                    previous ? { ...previous, number: null, id: null } : null,
                  )
                }
              >
                Start of results
              </button>
            )}
            {current.data.has_more && (
              <button
                className="button outline"
                onClick={() =>
                  setRequest((previous) =>
                    previous
                      ? {
                          ...previous,
                          number: current.data!.next_number,
                          id: current.data!.next_id,
                        }
                      : null,
                  )
                }
              >
                Next 25 parts
              </button>
            )}
          </div>
        </>
      )}
    </details>
  );
}
export const activitySchema = z.object({
  referrals_by_merchant: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      clicks: z.string().regex(/^\d+$/),
    }),
  ),
  popular_linked_parts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      number_normalized: z.string().nullable(),
      clicks: z.string().regex(/^\d+$/),
    }),
  ),
  campaign_activity: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.string(),
      impressions: z.string().regex(/^\d+$/),
      clicks: z.string().regex(/^\d+$/),
    }),
  ),
});
export type CommercialActivity = z.infer<typeof activitySchema>;
const count = (value: string) =>
  new Intl.NumberFormat("en-US").format(BigInt(value));
export function CommercialActivityReport({
  data,
}: {
  data: CommercialActivity;
}) {
  return (
    <section className="commercial-tool">
      <h2>Retailer and campaign activity</h2>
      <p>
        Last 30 days of optional aggregate counts. These are referrals and
        impressions, not unique people, purchases or commissions. A link shared
        by several reviewed parts can appear against each identity.
      </p>
      <h3>Retailer referrals</h3>
      {!data.referrals_by_merchant.length ? (
        <p>No retailer referral counts have been recorded.</p>
      ) : (
        <ul>
          {data.referrals_by_merchant.map((row) => (
            <li key={row.id}>
              {row.name}: {count(row.clicks)} clicks
            </li>
          ))}
        </ul>
      )}
      <h3>Popular linked part identities</h3>
      {!data.popular_linked_parts.length ? (
        <p>No linked-part activity has been recorded.</p>
      ) : (
        <ul>
          {data.popular_linked_parts.map((row) => (
            <li key={row.id}>
              <DocumentLink
                href={"/parts/catalog?part=" + encodeURIComponent(row.id)}
              >
                {row.number_normalized} · {row.name}
              </DocumentLink>
              : {count(row.clicks)} clicks
            </li>
          ))}
        </ul>
      )}
      <h3>Campaigns</h3>
      {!data.campaign_activity.length ? (
        <p>No campaigns have been created.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>State</th>
                <th>Impressions</th>
                <th>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {data.campaign_activity.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.status}</td>
                  <td>{count(row.impressions)}</td>
                  <td>{count(row.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
