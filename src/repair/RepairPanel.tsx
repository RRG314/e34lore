"use client";
import {useScopedState} from "../hooks/use-scoped-state";
import { ServiceOverview } from "../servicing/ServiceOverview";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Undo2 } from "lucide-react";
import { DocumentLink } from "../components/DocumentLink";
import { db, useApp } from "../components/context";
import { manualGuides } from "../data/manual";
import { stepDiscussionHref } from "../domain/walkthrough";
import {
  repairPlan,
  repairGuide,
  transitionOperations,
  repairScene,
} from "./plan";
import { useRepairJourney } from "./use-journey";
import { JourneyBar } from "./JourneyBar";
import { completedGuideSteps, journeyHref } from "../domain/repair-journey";
import { repairApplicability } from "../vehicle/configuration";
import { sanitizeVehicle } from "../data/catalog";
import {
  CatalogPartField,
  type PartIdentity,
} from "../components/CatalogPartField";
type Progress = {
  id: string;
  content_version: number;
  operation_ids: string[];
  repair_plan_id: string | null;
  service_record_id: string | null;
  scan_id: string | null;
  configuration_revision: string | null;
};
export function RepairPanel({
  initialScan,
  onScene,
  selection,
  xray,
  onXray,
}: {
  selection?: { node: string | null; seq: number };
  xray?: boolean;
  onXray?: (enabled: boolean) => void;
  initialVehicle?: string;
  initialScan?: string;
  onScene: (scene: { hidden: string[]; selected: string }) => void;
}) {
  const { user, vehicle, setVehicle, toast } = useApp(),
    owned = useRepairJourney(initialScan),
    guide = manualGuides.find((g) => g.slug === repairGuide)!;
  const car = owned.activeId, setCar = owned.selectCar;
  const partScope=JSON.stringify([user?.id,car,owned.scan?.id]);
  const [operation, setOperation] = useState(0),
    [done, setDone] = useState<string[]>([]),
    [row, setRow] = useState<Progress | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [outcome, setOutcome] = useState(""),
    [part, setPart] = useScopedState<PartIdentity | null>(partScope,!row?.service_record_id?owned.scan?.parts||null:null),
    [partQuery, setPartQuery] = useScopedState(partScope,!row?.service_record_id?owned.scan?.parts?.number_normalized||"":""),
    [quantity, setQuantity] = useState(1),
    [parts, setParts] = useState<
      { id: string; part_id: string; quantity: number }[]
    >([]),
    [config, setConfig] = useState<string | null>(null),
    [storedScan, setStoredScan] = useState<string | null>(null);
  useEffect(()=>{
    const requested=new URLSearchParams(location.search).get('operation');
    const index=repairPlan.operations.findIndex(operation=>operation.id===requested);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore a validated operation explicitly requested by a service link.
    if(index>=0)setOperation(index);
  },[]);
  const handledSelection = useRef(0),
    lastPickedNode = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selection?.node || handledSelection.current === selection.seq) return;
    handledSelection.current = selection.seq;
    lastPickedNode.current = selection.node;
    // Synchronize an explicitly selected external 3D component with its procedure.
    setOperation((current) => {
      if (repairPlan.operations[current].nodes.includes(selection.node!))
        return current;
      let next = repairPlan.operations.findIndex(
        (o) => o.nodes.includes(selection.node!) && !done.includes(o.id),
      );
      if (next < 0)
        next = repairPlan.operations.findIndex((o) =>
          o.nodes.includes(selection.node!),
        );
      return next < 0 ? current : next;
    });
  }, [selection, done]);
  const selectedCar = owned.cars.find((c) => c.id === car);
  useEffect(() => {
    if (selectedCar) setVehicle(sanitizeVehicle(selectedCar.configuration));
  }, [selectedCar, setVehicle]);
  const onSceneRef = useRef(onScene);
  const userId = user?.id,
    guest = user?.is_anonymous;
  useEffect(() => {
    onSceneRef.current = onScene;
  }, [onScene]);
  const op = repairPlan.operations[operation],
    localKey =
      "e34.repair." +
      (user?.id || "device") +
      "." +
      (car || "reference") +
      "." +
      repairPlan.id;
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the private snapshot at the external account/car/reload boundary.
    setLoading(true);
    setError("");
    setDone([]);
    setRow(null);
    setParts([]);
    setConfig(null);
    setStoredScan(null);
    if (!owned.ready) return;
    if (!userId || guest) {
      try {
        const ids = JSON.parse(localStorage.getItem(localKey) || "[]");
        let valid: string[] = [];
        for (const id of ids) valid = transitionOperations(valid, id);
        setDone(valid);
      } catch {}
      setLoading(false);
      return;
    }
    let q = db
      .from("guide_progress")
      .select(
        "id,content_version,operation_ids,repair_plan_id,service_record_id,scan_id,configuration_revision",
      )
      .eq("user_id", userId!)
      .eq("guide_id", repairGuide)
      .eq("revision", repairPlan.revision);
    q = car ? q.eq("vehicle_id", car) : q.is("vehicle_id", null);
    Promise.all([
      q.abortSignal(controller.signal).maybeSingle(),
      car
        ? db
            .from("vehicle_configuration_revisions")
            .select("id")
            .eq("vehicle_id", car)
            .order("revision", { ascending: false })
            .limit(1)
            .abortSignal(controller.signal)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
      .then(([r, c]) => {
        if (!live) return;
        if (r.error || c.error) {
          setError(
            "Saved repair progress could not load. Retry before recording steps.",
          );
          return;
        }
        if (r.data) {
          setRow(r.data);
          setDone(r.data.operation_ids || []);
          setStoredScan(r.data.scan_id);
          setConfig(r.data.configuration_revision);
          db.from("repair_parts_used")
            .select("id,part_id,quantity")
            .eq("progress_id", r.data.id)
            .eq("user_id", userId!)
            .limit(100)
            .abortSignal(controller.signal)
            .then((p) => {
              if (live && !p.error) setParts(p.data || []);
            });
        } else setConfig(c.data?.id || null);
      })
      .catch(() => {
        if (live) setError("Saved progress could not load.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [userId, guest, car, refresh, localKey, owned.ready]);
  useEffect(
    () => onSceneRef.current(repairScene(done, op.id, lastPickedNode.current)),
    [done, op.id],
  );
  async function record(undo = false) {
    if (busy || loading) return;
    setBusy(true);
    setError("");
    try {
      const next = transitionOperations(done, op.id, undo);
      if (!user || user.is_anonymous) {
        setDone(next);
        localStorage.setItem(localKey, JSON.stringify(next));
        return;
      }
      const steps = completedGuideSteps(repairPlan.operations, next);
      const values = {
        user_id: user.id,
        guide_id: repairGuide,
        revision: repairPlan.revision,
        vehicle_id: car || null,
        completed_steps: steps,
        repair_plan_id: repairPlan.id,
        operation_ids: next,
        configuration_revision: config,
        scan_id: storedScan || owned.scanId || null,
      };
      const result = row
        ? await db
            .from("guide_progress")
            .update(values)
            .eq("id", row.id)
            .eq("content_version", row.content_version)
            .select(
              "id,content_version,operation_ids,repair_plan_id,service_record_id,scan_id,configuration_revision",
            )
            .abortSignal(AbortSignal.timeout(15000))
            .maybeSingle()
        : await db
            .from("guide_progress")
            .insert(values)
            .select(
              "id,content_version,operation_ids,repair_plan_id,service_record_id,scan_id,configuration_revision",
            )
            .abortSignal(AbortSignal.timeout(15000))
            .single();
      if (result.error || !result.data)
        throw Error(
          "Progress could not be confirmed. Reload to reconcile any save from another device.",
        );
      setRow(result.data);
      setStoredScan(result.data.scan_id);
      setDone(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Progress could not save.");
    } finally {
      setBusy(false);
    }
  }
  const carConfig =
      owned.cars.find((c) => c.id === car)?.configuration || vehicle,
    applicability = repairApplicability(sanitizeVehicle(carConfig)),
    canRecord =
      !busy &&
      !loading &&
      owned.ready && !owned.scanLoading && !owned.error &&
      applicability.status !== "incompatible" &&
      op.requires.every((id) => done.includes(id));
  return (
    <section
      className="interactive-repair"
      aria-label="Interactive coolant pump repair"
    >
      <div className="repair-heading">
        <div>
          <span className="eyebrow">M50 / COOLANT PUMP</span>
          <h2>M50 coolant-pump service</h2>
        </div>
        <DocumentLink
          href={journeyHref("/guides/" + repairGuide + "?revision=" + repairPlan.revision, { vehicle: car, scan: storedScan || owned.scanId })}
        >
          <BookOpen size={16} />
          Read full procedure
        </DocumentLink>
      </div>
      <JourneyBar journey={owned}/>
      <div className="repair-context">
        <label>
          Repair for
          <select
            value={car}
            disabled={busy || owned.loading}
            onChange={(e) => {
              setCar(e.target.value);
              const c = owned.cars.find((c) => c.id === e.target.value);
              if (c) setVehicle(sanitizeVehicle(c.configuration));
              setOperation(0);
            }}
          >
            <option value="">Selected reference vehicle</option>
            {owned.cars.map((c) => (
              <option value={c.id} key={c.id}>
                {c.nickname}
              </option>
            ))}
          </select>
        </label>
        <span>
          {done.length} / {repairPlan.operations.length} recorded
        </span>
        {car && (
          <DocumentLink href={"/garage/configuration?vehicle=" + car}>
            Check installed configuration
          </DocumentLink>
        )}
      </div>
      <p className={"repair-applicability " + applicability.status}>
        {applicability.reason}
      </p>
      {onXray && (
        <label className="scan-consent">
          <input
            type="checkbox"
            checked={!!xray}
            onChange={(e) => onXray(e.target.checked)}
          />
          See through surrounding parts
        </label>
      )}
      {selection?.node &&
        !repairPlan.operations.some((o) =>
          o.nodes.includes(selection.node!),
        ) && (
          <p>
            This component is outside the coolant-pump procedure. Its catalog
            and related guides remain in the part details.
          </p>
        )}
      <p className="small repair-geometry-note">
        Illustrative 3D reference. Hidden components show procedural access;
        translations do not establish a safe removal path, dimensions or
        clearance. A missing modeled belt or seal stays unavailable.
      </p>
      <details>
        <summary>Safety, tools and source evidence</summary>
        <ul>
          {guide.cautions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <h3>Prepare before starting</h3>
        <ul>
          {guide.tools.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <DocumentLink href="/manual/170?pdf=212">
          Bentley 170-8–170-9, Figs. 12–13 · PDF 212–213
        </DocumentLink>
        <p>
          Your saved checklist keeps the procedure version you started with,
          even if a newer version is published.
        </p>
      </details>
      <ServiceOverview guideId={repairGuide} revision={repairPlan.revision} navigation={{vehicle:car,scan:storedScan||owned.scanId}} compact/>
      <div className="repair-operation-layout">
        <nav aria-label="Repair operations">
          {repairPlan.operations.map((o, i) => (
            <button
              key={o.id}
              className={operation === i ? "active" : ""}
              aria-current={operation === i ? "step" : undefined}
              onClick={() => setOperation(i)}
            >
              {done.includes(o.id) ? <Check size={15} /> : <span>{i + 1}</span>}
              {o.title}
            </button>
          ))}
        </nav>
        <article>
          <span className="eyebrow">
            {op.action.toUpperCase()} / {operation + 1} OF{" "}
            {repairPlan.operations.length}
          </span>
          <h3>{op.title}</h3>
          <p>{op.instruction}</p>
          <dl>
            <dt>Tools</dt>
            <dd>{op.tools.join(" · ")}</dd>
            <dt>Source</dt>
            <dd>Bentley {op.source}</dd>
            {op.torque && (
              <>
                <dt>Source tightening value</dt>
                <dd>
                  {op.torque.nm} Nm · {op.torque.scope}
                </dd>
              </>
            )}
          </dl>
          {op.requires.some((id) => !done.includes(id)) && (
            <p>
              Before recording this step:{" "}
              {op.requires
                .filter((id) => !done.includes(id))
                .map(
                  (id) => repairPlan.operations.find((o) => o.id === id)?.title,
                )
                .join("; ")}
              .
            </p>
          )}
          <div className="scan-actions">
            <button
              className="button"
              disabled={
                !canRecord || done.includes(op.id) || !!row?.service_record_id
              }
              onClick={() => record()}
            >
              Record step completed
            </button>
            <button
              className="button outline"
              disabled={
                busy ||
                loading ||
                !done.includes(op.id) ||
                !!row?.service_record_id
              }
              onClick={() => record(true)}
            >
              <Undo2 size={15} />
              Undo recorded step
            </button>
          </div>
          <div className="repair-step-navigation">
            <button
              disabled={operation === 0}
              onClick={() => setOperation((i) => i - 1)}
            >
              <ArrowLeft size={16} />
              Previous
            </button>
            <button
              disabled={operation === repairPlan.operations.length - 1}
              onClick={() => setOperation((i) => i + 1)}
            >
              Next
              <ArrowRight size={16} />
            </button>
          </div>
          <DocumentLink
            href={stepDiscussionHref(repairGuide, op.step + 1, "cooling", {
              revision: repairPlan.revision,
              title: op.title,
            })}
          >
            Ask the community about this step
          </DocumentLink>
        </article>
      </div>
      {loading && <p role="status">Loading saved repair…</p>}
      {error && (
        <p role="alert" className="scan-error">
          {error}
          <button onClick={() => setRefresh((n) => n + 1)}>
            Reload saved progress
          </button>
        </p>
      )}
      {owned.scan && storedScan && storedScan !== owned.scanId && <p>This saved repair keeps its original identification. The newly opened identification has not replaced it.</p>}
      {!user && (
        <p>
          Progress stays on this device.{" "}
          <DocumentLink href="/account?next=/workshop/repair">
            Sign in to save to your garage.
          </DocumentLink>
        </p>
      )}
      {row && (
        <details>
          <summary>Parts used and repair outcome</summary>
          <CatalogPartField
            value={partQuery}
            selected={part}
            onChange={(v) => {
              setPartQuery(v);
              setPart(null);
            }}
            onSelect={setPart}
          />
          <label>
            Quantity
            <input
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <button
            className="button outline"
            disabled={
              busy ||
              !part ||
              !Number.isInteger(quantity) ||
              quantity < 1 ||
              quantity > 1000
            }
            onClick={async () => {
              setBusy(true);
              const r = await db
                .from("repair_parts_used")
                .insert({ progress_id: row.id, part_id: part!.id, quantity })
                .select("id,part_id,quantity")
                .single();
              setBusy(false);
              if (r.error) setError("Part record could not save.");
              else {
                setParts((p) => [...p, r.data]);
                setPart(null);
              }
            }}
          >
            Record part used
          </button>
          {parts.map((p) => (
            <p key={p.id}>
              {p.quantity} ×{" "}
              <DocumentLink
                href={journeyHref("/parts/catalog?part=" + encodeURIComponent(p.part_id), { vehicle: car, scan: storedScan || owned.scanId })}
              >
                {p.part_id}
              </DocumentLink>
            </p>
          ))}
          <label>
            Actual repair outcome
            <textarea
              value={outcome}
              minLength={20}
              maxLength={3000}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Describe leak checks, temperature checks, cold-level recheck and any remaining issues."
            />
          </label>
          <button
            className="button"
            disabled={
              busy ||
              !car ||
              done.length !== repairPlan.operations.length ||
              outcome.trim().length < 20 ||
              !!row.service_record_id
            }
            onClick={async () => {
              setBusy(true);
              const r = await db
                .rpc("complete_interactive_repair", {
                  progress: row.id,
                  expected_version: row.content_version,
                  observation: outcome,
                })
                .abortSignal(AbortSignal.timeout(15000));
              setBusy(false);
              if (r.error)
                setError(
                  "Repair completion could not be confirmed. Reload before trying again.",
                );
              else {
                toast("Saved to service history and a private journal draft.");
                setRefresh((n) => n + 1);
              }
            }}
          >
            {row.service_record_id
              ? "Saved to your garage"
              : "Save service record and private journal draft"}
          </button>
          <p>
            Journal entries remain private until you publish them in your
            garage. Add photos with the existing garage photo controls.
          </p>
          {row.service_record_id && (
            <button
              className="button outline"
              disabled={busy}
              onClick={async () => {
                if (
                  !confirm(
                    "Start a new repair checklist? The completed service and journal records will stay in your garage.",
                  )
                )
                  return;
                setBusy(true);
                const r = await db
                  .rpc("start_next_interactive_repair", {
                    progress: row.id,
                    expected_version: row.content_version,
                  })
                  .abortSignal(AbortSignal.timeout(15000));
                setBusy(false);
                if (r.error)
                  setError(
                    "The next repair could not start. Reload before trying again.",
                  );
                else {
                  setOperation(0);
                  setRefresh((n) => n + 1);
                }
              }}
            >
              Start another repair
            </button>
          )}
          <DocumentLink href={journeyHref("/garage?tab=progress", { vehicle: car, scan: storedScan || owned.scanId })}>
            Open garage, photos and journal
          </DocumentLink>
        </details>
      )}
    </section>
  );
}
