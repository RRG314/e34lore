"use client";
import { catalogPositionAllowed } from "../lib/catalog-integrity";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { db, useApp } from "./context";
import { Tag } from "./common";
import {
  formatPartNumber,
  summarizeFitmentEvidence,
  fitmentEvidenceQuestions,
  type FitmentEvidence,
} from "../domain/fitment";
import { catalogPositionHref } from "../domain/catalog";
import { fetchAllRows } from "../lib/data-export";
import { displayModel, modelKey, seriesForModel } from "../series/registry";
import { DocumentLink } from "./DocumentLink";

type Source = { title: string; url: string | null };
type FitmentRecord = FitmentEvidence & { source: Source | null };
type InterchangeRecord = {
  id: string;
  relationship: string;
  conditions: string;
  review_status: string;
  target: { id: string; number_normalized: string | null; name: string };
  source: Source | null;
  position: {
    id: string;
    context_id: string;
    assembly_id: string;
    reference: string;
    active: boolean;
    context: { name: string };
  } | null;
};
type Evidence = {
  fitments: FitmentRecord[];
  interchanges: InterchangeRecord[];
};

const fitmentLabels = {
  conflicting: "Conflicting source records",
  incompatible: "Source documents incompatibility",
  conditional: "Documented application with checks",
  unknown: "Fitment not established",
};

export function PartCompatibility({
  partId,
  vehicleOverride,
}: {
  partId: string;
  vehicleOverride?: import("../data/catalog").Vehicle;
}) {
  const { vehicle: globalVehicle, series } = useApp();
  const vehicle = vehicleOverride || globalVehicle;
  const [loaded, setLoaded] = useState<{ partId: string; result: Evidence | "unavailable" }>();
  const [retry, setRetry] = useState(0);
  const result = loaded?.partId === partId ? loaded.result : undefined;
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      if (active) setLoaded({ partId, result: "unavailable" });
    }, 12000);
    const fitments = fetchAllRows<FitmentRecord>((from, to) =>
      db
        .from("part_fitments")
        .select(
          "id,model_id,engine,market,body,production_from,production_to,status,conditions,source:sources(title,url)",
        )
        .eq("part_id", partId)
        .abortSignal(controller.signal)
        .order("id")
        .range(from, to)
        .returns<FitmentRecord[]>(),
    );
    const interchanges = fetchAllRows<InterchangeRecord>((from, to) =>
      db
        .from("part_interchanges")
        .select(
          "id,relationship,conditions,review_status,target:parts!part_interchanges_target_part_id_fkey(id,number_normalized,name),source:sources(title,url),position:part_assembly_positions!part_interchanges_source_position_part_fk(id,context_id,assembly_id,reference,active,context:vehicle_catalog_contexts(name))",
        )
        .eq("source_part_id", partId)
        .abortSignal(controller.signal)
        .order("id")
        .range(from, to)
        .returns<InterchangeRecord[]>(),
    );
    Promise.all([fitments, interchanges]).then(
      ([fitmentRows, interchangeRows]) => {
        clearTimeout(timeout);
        if (active && !controller.signal.aborted)
          setLoaded({ partId, result: { fitments: fitmentRows, interchanges: interchangeRows } });
      },
      () => {
        clearTimeout(timeout);
        if (active) setLoaded({ partId, result: "unavailable" });
      },
    );
    return () => {
      active = false;
      controller.abort(); clearTimeout(timeout);
    };
  }, [partId, retry]);

  if (!result)
    return (
      <p role="status" className="small muted">
        Checking application evidence…
      </p>
    );
  if (result === "unavailable")
    return <p role="status">Application evidence could not be loaded. <button className="text-link" onClick={() => setRetry(n => n + 1)}>Retry</button></p>;

  const fitments = result.fitments.filter(row => row.model_id ? seriesForModel(row.model_id) === series : series === "e34");
  const summary = summarizeFitmentEvidence(fitments, { ...vehicle, model: vehicle.model ? modelKey(series, vehicle.model) : "" });
  const direct = result.interchanges.filter(
    (record) =>
      !record.position ||
      (seriesForModel(record.position.context_id) === series && record.position.active && catalogPositionAllowed(record.position.id)),
  );
  return (
    <section
      className="catalog-compatibility"
      aria-label="Fitment and interchange evidence"
    >
      <h3>Fitment and interchange evidence</h3>
      <Tag tone={summary.status === "unknown" ? "neutral" : "amber"}>
        {fitmentLabels[summary.status]}
      </Tag>
      {!vehicle.model && (
        <p className="small muted">
          Select your vehicle to compare your configuration with the documented
          scope.
        </p>
      )}
      {summary.status === "conflicting" && (
        <p>
          Applicable records disagree. Resolve the difference using the cited
          sources before selecting a part.
        </p>
      )}
      <div className="fitment-evidence-summary">
        {summary.rows.length ? summary.rows.filter(row => row.scope !== "outside").slice(0, 3).map(row => {
          const source = result.fitments.find(item => item.id === row.id)?.source;
          const questions = fitmentEvidenceQuestions(row, vehicle);
          return <article key={row.id}>
            <dl>
              <dt>Source</dt><dd>{source?.url ? <DocumentLink href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</DocumentLink> : source?.title || "No source recorded"}</dd>
              <dt>Applies to</dt><dd>{[row.model_id && displayModel(row.model_id), row.engine, row.market, row.body].filter(Boolean).join(" · ") || "Configuration not specified"}{(row.production_from || row.production_to) && <span> · {row.production_from || "start not stated"} to {row.production_to || "end not stated"}</span>}</dd>
              <dt>Restrictions</dt><dd>{row.conditions || "No restrictions recorded; confirm against the original source."}</dd>
              <dt>Still to check</dt><dd>{!source && "Find the original supporting source. "}{questions.join(" ")} Check gearbox, factory options and changes to the car against its installed parts.</dd>
            </dl>
          </article>;
        }) : <p>No application source is linked to this number. A photograph or catalog listing alone does not establish fitment.</p>}
        {summary.rows.length > 0 && summary.rows.every(row => row.scope === "outside") && <p>None of the recorded applications matches your selected configuration. Open the source records below to compare the differences.</p>}
      </div>
      {summary.rows.length > 0 && (
        <details>
          <summary>
            {summary.rows.length} application{" "}
            {summary.rows.length === 1 ? "record" : "records"}
          </summary>
          <ul>
            {summary.rows.map((row) => {
              const source = result.fitments.find(
                (item) => item.id === row.id,
              )?.source;
              return (
                <li key={row.id}>
                  <strong>
                    {[row.model_id && displayModel(row.model_id), row.engine, row.market, row.body]
                      .filter(Boolean)
                      .join(" · ") || "Scope unspecified"}
                  </strong>
                  {(row.production_from || row.production_to) && (
                    <small>
                      Production {row.production_from || "open"} to{" "}
                      {row.production_to || "open"}
                    </small>
                  )}
                  <small>
                    {row.status} ·{" "}
                    {row.scope === "matches"
                      ? "selected scope"
                      : row.scope === "outside"
                        ? "different scope"
                        : "configuration incomplete"}
                  </small>
                  <p>{row.conditions}</p>
                  {source?.url && (
                    <a href={source.url}>
                      {source.title} <ArrowUpRight size={14} />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
      {direct.length ? (
        <div className="catalog-direct-records">
          <h4>Direct interchange records</h4>
          {direct.map((record) => (
            <article key={record.id}>
              <a
                href={
                  "/parts/catalog?part=" + encodeURIComponent(record.target.id)
                }
              >
                {formatPartNumber(record.target.number_normalized)} ·{" "}
                {record.target.name} <ArrowUpRight size={14} />
              </a>
              <p className="small muted">
                {record.relationship.replaceAll("_", " ")} ·{" "}
                {record.review_status.replaceAll("-", " ")}
              </p>
              <p>{record.conditions}</p>
              {!record.source && <p className="small">No supporting source is recorded. Do not use this record alone to choose a replacement.</p>}
              {record.position && (
                <a href={catalogPositionHref(record.position)}>
                  {record.position.context.name} · position{" "}
                  {record.position.reference} <ArrowUpRight size={14} />
                </a>
              )}
              {record.source?.url && (
                <a href={record.source.url}>
                  Original catalog record <ArrowUpRight size={14} />
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="small muted">
          No direct interchange has been documented for this number.
        </p>
      )}
    </section>
  );
}
