"use client";
import { DocumentLink } from "./DocumentLink";

import { track } from "../analytics/client";
import { WhereToBuy } from "./Commercial";
import { PartMedia } from './PartMedia';
import { RelatedJournalEntries } from "./Journals";
import { RelatedDiscussions } from "./RelatedDiscussions";
import { useState, useCallback } from "react";
import { Search, ArrowUpRight, ChevronRight, Copy, ExternalLink, Layers, Box, BookOpen } from "lucide-react";
import { parts, assemblies } from "../data/catalog";
import { evaluateFitment, formatPartNumber, normalizePartNumber } from "../domain/fitment";
import { useApp } from "./context";
import { PageIntro, Tag, SaveButton } from "./common";
import { Correction } from "./Reference";
import { Diagram, PartThumbnail } from "./Diagram";
import { Quantity } from "./Quantity";
import { VehicleScene } from "./VehicleScene";
export function PartsPage({
  initialAssembly,
  initialPart,
}: {
  initialAssembly?: string;
  initialPart?: string;
}) {
  const startPart = parts.find((p) => p.id === initialPart);
  const startAssembly =
    startPart?.assembly ||
    assemblies.find((a) => a.id === initialAssembly)?.id ||
    "water-pump";
  const [assembly, setA] = useState(startAssembly),
    [selected, setSelected] = useState(
      startPart?.id || parts.find((p) => p.assembly === startAssembly)!.id,
    ),
    [q, setQ] = useState(""),
    [view, setView] = useState("assembly"),
    [tab, setTab] = useState("details");
  const { vehicle, toast } = useApp();
  const selectAssembly = useCallback((id: string) => {
    track("assembly_view","drawing:"+id);
    setA(id);
    setSelected(parts.find((p) => p.assembly === id)!.id);
    setView("assembly");
    setQ("");
    history.replaceState(null, "", "/parts?assembly=" + id);
  }, []);
  const selectPart = (id: string) => {
    const nextAssembly = parts.find((p) => p.id === id)!.assembly;
    track("component_select","part:"+id);
    setA(nextAssembly);
    setSelected(id);
    setTab("details");
    history.replaceState(
      null,
      "",
      "/parts?assembly=" + nextAssembly + "&part=" + id,
    );
    if (matchMedia("(max-width:760px)").matches)
      requestAnimationFrame(() =>
        document
          .querySelector(".part-inspector")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
  };
  const a = assemblies.find((a) => a.id === assembly)!;
  const p = parts.find((p) => p.id === selected)!;
  const list = parts.filter((p) =>
    q
      ? normalizePartNumber(p.number || "").includes(normalizePartNumber(q)) ||
        p.name.toLowerCase().includes(q.toLowerCase())
      : p.assembly === assembly,
  );
  const fitment = evaluateFitment(p, vehicle);
  return (
    <div className="page parts-page">
      <PageIntro
        eyebrow="BMW E34 / PARTS & ASSEMBLIES"
        title="Service figures & 3D references."
        description="Select an assembly, identify the drawing position, then check the part number and vehicle conditions."
      />
      <div className="parts-workspace">
        <aside className="assembly-sidebar">
          <span className="eyebrow">ASSEMBLY LIBRARY</span>
          <div className="input-icon">
            <Search size={16} />
            <input
              aria-label="Search parts by name or number"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name or OEM number"
            />
          </div>
          {q ? (
            <div className="part-search-results">
              {list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setA(p.assembly);
                    selectPart(p.id);
                    setQ("");
                  }}
                >
                  <strong>{p.name}</strong>
                  <small>{formatPartNumber(p.number)}</small>
                </button>
              ))}
              {!list.length && (
                <p className="muted">
                  No matching reference components. Search the full parts
                  catalog.
                </p>
              )}
            </div>
          ) : (
            <nav aria-label="Assemblies">
              {assemblies.map((item) => (
                <button
                  key={item.id}
                  className={item.id === assembly ? "selected" : ""}
                  onClick={() => selectAssembly(item.id)}
                >
                  <span className="assembly-group">{item.group}</span>
                  <span>
                    {item.title}
                    <small>
                      {parts.filter((p) => p.assembly === item.id).length}{" "}
                      components
                    </small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </nav>
          )}
          <div className="assembly-library-note">
            <BookOpen size={20} />
            <strong>Catalog scope</strong>
            <p>
              {assemblies.length} assemblies ·{" "}
              {parts.filter((p) => p.number).length} OEM records. Catalog
              quantities and service-manual labels are listed separately.
            </p>
            <DocumentLink href="/resources#evidence">
              Sources & coverage
              <ArrowUpRight size={14} />
            </DocumentLink>
          </div>
        </aside>
        <section className="assembly-main">
          <div className="assembly-title">
            <div>
              <span className="eyebrow">
                {a.code} / {a.system.toUpperCase()}
              </span>
              <h2>{a.title}</h2>
            </div>
            <div
              className="view-toggle"
              role="group"
              aria-label="Explorer view"
            >
              <button
                className={view === "assembly" ? "active" : ""}
                onClick={() => setView("assembly")}
              >
                <Layers size={16} />
                Assembly
              </button>
              <button
                className={view === "car" ? "active" : ""}
                onClick={() => setView("car")}
              >
                <Box size={16} />
                Vehicle
              </button>
            </div>
          </div>
          {view === "assembly" ? (
            <Diagram
              key={assembly}
              assembly={assembly}
              selected={selected}
              onSelect={selectPart}
            />
          ) : (
            <VehicleScene onAssembly={selectAssembly} />
          )}
          <div className="diagram-boundary">{a.boundary}</div>
          <div className="parts-table">
            <div className="table-heading">
              <h3>Assembly components</h3>
              <span>
                {parts.filter((p) => p.assembly === assembly).length} items ·
                click a row to inspect
              </span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Ref.</th>
                  <th>Component</th>
                  <th>OEM identity</th>
                  <th>Qty.</th>
                </tr>
              </thead>
              <tbody>
                {parts
                  .filter((p) => p.assembly === assembly)
                  .map((part) => (
                    <tr
                      key={part.id}
                      className={selected === part.id ? "selected" : ""}
                    >
                      <td>
                        <button
                          aria-label={"Select " + part.name}
                          onClick={() => selectPart(part.id)}
                        >
                          {part.ref}
                        </button>
                      </td>
                      <td>
                        <button onClick={() => selectPart(part.id)}>
                          {part.name}
                        </button>
                      </td>
                      <td>
                        <code>
                          {part.number
                            ? formatPartNumber(part.number)
                            : "Not established"}
                        </code>
                      </td>
                      <td>
                        {part.source.startsWith("manual:")
                          ? "Figure item"
                          : part.quantity}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside
          className="part-inspector"
          aria-label="Selected part information"
          aria-live="polite"
        >
          <div className="inspector-header">
            <button
              className="mobile-back-drawing text-link"
              onClick={() =>
                document
                  .querySelector(".assembly-title")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              Back to drawing
            </button>
            <span>COMPONENT / {p.ref}</span>
            <SaveButton kind="part" id={p.id} title={p.name} />
          </div>
          <PartThumbnail id={p.id} />
          <div className="inspector-body">
            <Tag tone={p.review === "catalog-listed" ? "green" : "amber"}>
              {p.review === "catalog-listed"
                ? "CATALOG-LISTED"
                : "REFERENCE ONLY"}
            </Tag>
            <h2>{p.name}</h2>
            <p>{p.detail}</p>
            {p.ref !== "—" &&
              parts.filter(
                (x) =>
                  x.assembly === p.assembly && x.ref === p.ref && x.id !== p.id,
              ).length > 0 && (
                <div className="position-alternatives">
                  <strong>Also listed at position {p.ref}</strong>
                  {parts
                    .filter(
                      (x) =>
                        x.assembly === p.assembly &&
                        x.ref === p.ref &&
                        x.id !== p.id,
                    )
                    .map((x) => (
                      <button key={x.id} onClick={() => selectPart(x.id)}>
                        {x.name}
                        <code>{formatPartNumber(x.number)}</code>
                      </button>
                    ))}
                </div>
              )}
            <div className="part-number">
              <small>BMW OEM NUMBER</small>
              <strong>{formatPartNumber(p.number)}</strong>
              {p.number && (
                <button
                  className="icon-button"
                  aria-label="Copy OEM part number"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(p.number!)
                      .then(() => toast("OEM number copied."))
                      .catch(() =>
                        toast("Select and copy the displayed number."),
                      );
                  }}
                >
                  <Copy size={15} />
                </button>
              )}
            </div>
            <div className="tabs inspector-tabs">
              <button
                className={tab === "details" ? "active" : ""}
                onClick={() => setTab("details")}
              >
                Details
              </button>
              <button
                className={tab === "fitment" ? "active" : ""}
                onClick={() => setTab("fitment")}
              >
                Fitment
              </button>
              <button
                className={tab === "links" ? "active" : ""}
                onClick={() => setTab("links")}
              >
                Connected
              </button>
            </div>
            {tab === "details" ? (
              <>
                <dl className="part-facts">
                  <div>
                    <dt>Assembly reference</dt>
                    <dd>{p.ref}</dd>
                  </div>
                  <div>
                    <dt>Listed quantity</dt>
                    <dd>
                      {p.source.startsWith("manual:")
                        ? "Not specified by figure"
                        : p.quantity}
                    </dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{p.sourceLabel}</dd>
                  </div>
                  {p.from && (
                    <div>
                      <dt>Catalog from</dt>
                      <dd>{p.from}</dd>
                    </div>
                  )}
                  {p.to && (
                    <div>
                      <dt>Catalog up to</dt>
                      <dd>{p.to}</dd>
                    </div>
                  )}
                </dl>
                <p className="part-note">{p.note}</p>
                {p.number&&<PartMedia number={p.number}/>}<WhereToBuy key={p.id} partId={p.id}/>
                {p.id === "pump-seal" && (
                  <>
                    <Quantity label="Catalog diameter" value={68} unit="mm" />
                    <Quantity
                      label="Catalog cross-section"
                      value={5}
                      unit="mm"
                    />
                  </>
                )}
                {p.id === "thermostat-seal" && (
                  <>
                    <Quantity label="Catalog diameter" value={60} unit="mm" />
                    <Quantity
                      label="Catalog cross-section"
                      value={3.5}
                      unit="mm"
                    />
                  </>
                )}
                {p.id === "thermostat" && (
                  <Quantity
                    label="Listed thermostat option"
                    value={88}
                    unit="C"
                  />
                )}
                {p.source.startsWith("https") ? (
                  <a
                    className="button outline full"
                    href={p.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Check original catalog
                    <ExternalLink size={15} />
                  </a>
                ) : (
                  <DocumentLink className="button outline full" href="/resources">
                    View manual source record
                    <ArrowUpRight size={15} />
                  </DocumentLink>
                )}
                {p.number && (
                  <a
                    className="button outline full"
                    href={"/parts/catalog?part=" + encodeURIComponent(p.id)}
                  >
                    Catalog listings & ordering conditions
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </>
            ) : tab === "fitment" ? (
              <>
                <div className={"fitment-result " + fitment.status}>
                  <Tag
                    tone={fitment.status === "incompatible" ? "red" : "amber"}
                  >
                    {fitment.label}
                  </Tag>
                  <h3>
                    {vehicle.model
                      ? [vehicle.year, vehicle.model, vehicle.engine]
                          .filter(Boolean)
                          .join(" ")
                      : "No vehicle selected"}
                  </h3>
                  <ul>
                    {fitment.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                <p className="small muted">
                  Compatibility is evaluated directly. No fitment is inferred
                  through another part or vehicle.
                </p>
              </>
            ) : (
              <div className="connected-part-links">
                <a href={"/repairs?system=" + a.system}>
                  Related guides
                  <ArrowUpRight size={16} />
                </a>
                <a
                  href={
                    "/articles/" +
                    (a.system === "cooling"
                      ? "cooling-system"
                      : "fitment-evidence")
                  }
                >
                  Technical context
                  <ArrowUpRight size={16} />
                </a>
                <a
                  href={
                    "/community/new?part=" + p.id + "&component=" + a.system
                  }
                >
                  Ask about this component
                  <ArrowUpRight size={16} />
                </a>
                <DocumentLink href="/articles/fitment-evidence">
                  Interchange evidence policy
                  <ArrowUpRight size={16} />
                </DocumentLink>
              </div>
            )}
            <Correction type="part" id={p.id} />
            <RelatedJournalEntries kind="part" id={p.id} /><RelatedDiscussions kind="part" id={p.id} />
          </div>
        </aside>
      </div>
      <div className="parts-help">
        <div>
          <span className="eyebrow">CAN’T FIND IT YET?</span>
          <h3>Part identification request</h3>
          <p>
            Start a parts inquiry with the selected assembly and vehicle
            attached.
          </p>
        </div>
        <a
          className="button primary"
          href={"/community/new?part=" + p.id + "&component=" + a.system}
        >
          Ask about this assembly
          <ArrowUpRight size={17} />
        </a>
      </div>
    </div>
  );
}
