"use client";
import {localWheelPackages} from "./local-wheel-packages";
import { DocumentLink } from "../components/DocumentLink";
import { Modal } from "../components/common";
import { buildGuideHref, buildServiceGuide } from "./guide-reference";
import { formatPartNumber } from "../domain/fitment";
import { publicProjection, type PublicBuild } from "./public";
import type { BuildState } from "./schema";
export function downloadBuild(
  content: BuildState | PublicBuild,
  privateSheet: boolean,
) {
  const data = {
    format: "e34lore-build-v1",
    visibility: privateSheet ? "private" : "public",
    exportedAt: new Date().toISOString(),
    build: content,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = (privateSheet ? "private-" : "public-") + "e34-build.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function BuildSummary({ build, privateSheet=false }: { build: PublicBuild; privateSheet?:boolean }) {
  const money = (n: number | null | undefined) =>
    n == null
      ? "Unknown"
      : new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: build.currency,
        }).format(n / 100);
  const guideIds = [
    ...new Set(
      build.components
        .flatMap((c) => c.guideIds)
        .concat(build.tasks.flatMap((t) => (t.guideId ? [t.guideId] : []))),
    ),
  ];
  return (
    <div className="build-sheet-content">
      <h2>{build.title}</h2>
      <p>
        {[
          build.configuration.year,
          build.configuration.model,
          build.configuration.engine,
          build.configuration.transmission,
          build.configuration.body,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p>{build.description}</p>
      <p>
        Style: {build.style.replaceAll("-", " ")} · {build.lifecycle}
      </p>
      <h3>Appearance</h3>
      <p>
        Paint:{" "}
        {build.appearance.paint.enabled
          ? build.appearance.paint.color + " · " + build.appearance.paint.finish
          : "Reference finish"}
        {build.appearance.paint.factoryCode
          ? " · BMW code " + build.appearance.paint.factoryCode
          : ""}
        . Wheels: {localWheelPackages.find(wheel=>wheel.id===build.appearance.wheels.packageId)?.label||build.appearance.wheels.packageId.replaceAll("-", " ")}.
      </p>
      <p className="small muted">
        Appearance studies do not establish fitment. Mechanical selections are
        plan-only unless a supported visual is listed.
      </p>
      <h3>Parts & modifications</h3>
      {build.components.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Identity</th>
                <th>Quantity / stage</th>
                <th>{privateSheet?"Costs per unit":"Shared costs per unit"}</th>
              </tr>
            </thead>
            <tbody>
              {build.components.map((c, i) => (
                <tr key={i}>
                  <td>
                    {c.name}
                    <small>
                      {c.system} · {c.publicNotes}
                    </small>
                  </td>
                  <td>
                    {c.number
                      ? formatPartNumber(c.number)
                      : [c.manufacturer, c.productCode, c.kind]
                          .filter(Boolean)
                          .join(" · ")}
                    {c.partId && (
                      <DocumentLink
                        href={
                          "/parts/catalog?part=" + encodeURIComponent(c.partId)
                        }
                      >
                        Catalog ↗
                      </DocumentLink>
                    )}
                  </td>
                  <td>
                    {c.quantity} · {c.stage}
                  </td>
                  <td>
                    {Object.hasOwn(c, "estimate") ? (
                      <>
                        Estimate {money(c.estimate)}
                        <br />
                        Actual {money(c.actual)}
                      </>
                    ) : (
                      "Not shared"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No selected parts.</p>
      )}
      <h3>Compatibility qualifications</h3>
      <p>
        Catalog selections retain their source conditions. No selected part is
        certified by its visual appearance or owner progress. Mounting,
        dimensions, brake clearance, wiring and supporting components need
        evidence for the actual vehicle.
      </p>
      {build.components.map((c, i) => (
        <p className="small" key={i}>
          {c.name}:{" "}
          {c.fabrication === "required"
            ? "Owner reports fabrication required."
            : "Review current source evidence and unresolved installation checks."}
          {c.partId && (
            <>
              {" "}
              <DocumentLink
                href={"/parts/catalog?part=" + encodeURIComponent(c.partId)}
              >
                Fitment and interchange ↗
              </DocumentLink>
            </>
          )}
        </p>
      ))}
      <h3>Work plan</h3>
      {build.tasks.length ? (
        <ol>
          {build.tasks.map((t, i) => (
            <li key={i}>
              <strong>{t.title}</strong> · {t.status}
              {t.dueOn ? " · due " + t.dueOn : ""}
              {t.completedOn ? " · completed " + t.completedOn : ""}
              <p>{t.notes}</p>
              {t.guideId && (
                <DocumentLink href={buildGuideHref(t.guideId)}>
                  Walkthrough ↗
                </DocumentLink>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p>No public tasks selected.</p>
      )}
      {build.milestones.length > 0 && (
        <>
          <h3>Milestones</h3>
          <ul>
            {build.milestones.map((m, i) => (
              <li key={i}>
                {m.title} · {m.date || "Date not set"}
                <p>{m.notes}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3>Tools & procedures</h3>
      {guideIds.length ? (
        guideIds.map((id) => {
          const g = buildServiceGuide(id);
          return g ? (
            <div key={id}>
              <DocumentLink href={buildGuideHref(id)}>
                {g.guide.title} ↗
              </DocumentLink>
              <p>
                {g.guide.duration} · {g.guide.durationBasis}
              </p>
              <p>{g.tools.map((t) => t.name).join("; ")}</p>
              <small>
                {g.guide.source.title} · {g.guide.source.section} · revision{" "}
                {g.revision}
              </small>
            </div>
          ) : (
            <p key={id}>
              <DocumentLink href={buildGuideHref(id)}>
                Review the saved procedure and tool list ↗
              </DocumentLink>
            </p>
          );
        })
      ) : (
        <p>
          No procedures selected. Tool and job-time requirements are not
          established.
        </p>
      )}
    </div>
  );
}
export function BuildSheet({
  state,
  onClose,
}: {
  state: BuildState;
  onClose: () => void;
}) {
  const sheet = publicProjection(state);
  sheet.description = state.description;
  sheet.components = state.components.map((c) => ({
    ...publicProjection({ ...state, components: [{ ...c, publicCost: true }] })
      .components[0],
    publicNotes: c.privateNotes + "\n" + c.publicNotes,
  }));
  sheet.tasks = state.tasks;
  sheet.milestones = state.milestones;
  return (
    <Modal title="Private build sheet" onClose={onClose} wide>
      <div className="build-print-actions">
        <p>
          This sheet includes private notes and all recorded costs. Keep it for
          your own records.
        </p>
        <button className="button outline" onClick={() => window.print()}>
          Print build sheet
        </button>
        <button
          className="button outline"
          onClick={() => downloadBuild(state, true)}
        >
          Export private JSON
        </button>
      </div>
      <article className="build-print">
        <p className="eyebrow">PRIVATE BUILD SHEET</p>
        <BuildSummary build={sheet} privateSheet />
        <h3>Target configuration</h3>
        <dl>
          {Object.entries(state.targetConfiguration).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v || "Unknown"}</dd>
            </div>
          ))}
        </dl>
        <h3>Private notes</h3>
        <p>{state.privateNotes}</p>
        <h3>Outstanding dependencies</h3>
        <ul>
          {state.tasks
            .filter((t) => !["verified", "deferred"].includes(t.status))
            .map((t) => (
              <li key={t.id}>
                {t.title}
                {t.dependencies.length
                  ? " · requires " +
                    t.dependencies
                      .map(
                        (id) =>
                          state.tasks.find((x) => x.id === id)?.title ||
                          "Unavailable task",
                      )
                      .join("; ")
                  : ""}
              </li>
            ))}
        </ul>
      </article>
    </Modal>
  );
}
