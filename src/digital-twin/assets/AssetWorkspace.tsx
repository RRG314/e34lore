"use client";
import { DocumentLink } from "../../components/DocumentLink";

import { useState } from "react";
import { db, useApp } from "../../components/context";
import { PageIntro, Notice } from "../../components/common";
import { CatalogPartField, type PartIdentity } from "../../components/CatalogPartField";
import inventory from "../../../data/digital-twin/asset-inventory.json";
import { useKeyedResource } from "../../hooks/use-keyed-resource";
import type { ReconstructionJob, TwinGraph } from "../types";
import { nominalSeals } from "../model-registry";
import { inspectGLB } from "./glb";
import { downloadJSON } from "../../lib/download";
export function AssetWorkspace({
  graph,
  revisionId,
}: {
  graph: TwinGraph;
  revisionId: string;
}) {
  const { user, toast } = useApp();
  const [chosenNode,setNodeId]=useState<string|null>(null),[part,setPart]=useState<PartIdentity|null>(null),[partQuery,setPartQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  type Job={id:string;user_id:string;node_id:string|null;part_id:string|null;method:ReconstructionJob['method'];status:ReconstructionJob['status'];notes:string};
  type Evidence={id:string;job_id:string;description:string;rights_evidence:string}&({source_url:string;storage_path:null}|{source_url:null;storage_path:string});
  const resource=useKeyedResource<{roles:string[];jobs:Job[];evidence:Evidence[]}>(JSON.stringify([user?.id,refresh]),async signal=>{
    const [r,j,e]=await Promise.all([db.rpc('current_permissions').abortSignal(signal),db.from('reconstruction_jobs').select('*').order('created_at',{ascending:false}).limit(100).abortSignal(signal),db.from('reconstruction_evidence').select('*').order('created_at',{ascending:false}).limit(500).abortSignal(signal)]);
    if(r.error||j.error||e.error)throw Error('Source records unavailable');return {roles:r.data||[],jobs:j.data||[],evidence:e.data||[]};
  },{enabled:!!user,failureMessage:'Source submissions could not load.'});
  const jobs=resource.data?.jobs||[],evidence=resource.data?.evidence||[],roles=resource.data?.roles||[];
  const requestedNode=typeof location==='undefined'?'':new URLSearchParams(location.search).get('node');
  const node=graph.nodes.find(n=>n.id===(chosenNode||requestedNode))||graph.nodes.find(n=>n.id==='engine')||graph.nodes[0],nodeId=node.id;
  const reviewer = roles.includes("reviewer") || roles.includes("admin");
  return (
    <div className="page twin-assets">
      <PageIntro
        eyebrow="TECHNICAL ASSET WORKSPACE"
        title="Geometry and source records."
        description="Asset provenance, review status and reconstruction requirements."
      />
      <DocumentLink className="text-link" href="/workshop">
        ← Back to workshop
      </DocumentLink>
      <Notice>
        No complete, reusable 1995 E34 M50 engine-bay CAD was established in the
        source search. Existing exterior models are attributed visual
        references. Internal components require source geometry, measured
        reconstruction and review.
      </Notice>
      <section className="twin-asset-section">
        <h2>Reconstruction record</h2>
        <label>
          Target component
          <select value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
            {graph.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </label>
        <div className="twin-requirements">
          <div>
            <h3>Required evidence</h3>
            <ul>
              {node.missingEvidence.map((x) => (
                <li key={x}>{x}</li>
              ))}
              <li>
                Front, rear, both sides, top and underside views; overlapping
                oblique views for reconstruction.
              </li>
              <li>
                Known scale, mounting centres, mating surfaces and at least one
                independent check dimension.
              </li>
              <li>
                Engine/production identity and documented permission to use the
                source.
              </li>
            </ul>
          </div>
          <div>
            <h3>Publication review</h3>
            <p>
              Visual fidelity, dimensions, installed alignment, mechanical
              relationships and removal procedure are reviewed separately. A
              scan or generated mesh alone does not approve any of them.
            </p>
            <button
              className="button"
              onClick={() =>
                downloadJSON(
                  {
                    configuration: graph.configuration,
                    node,
                    requiredViews: [
                      "front",
                      "rear",
                      "left",
                      "right",
                      "top",
                      "underside",
                      "overlapping obliques",
                    ],
                    requiredMeasurements: [
                      "scale reference",
                      "mounting centres",
                      "mating surfaces",
                      "independent check dimension",
                    ],
                    methodCandidates: [
                      "licensed-cad",
                      "multiview",
                      "dimensioned-drawing",
                      "standard-parametric",
                      "manual-reconstruction",
                    ],
                  },
                  "e34-reconstruction-" + node.id + ".json",
                )
              }
            >
              Export reconstruction brief
            </button>
          </div>
        </div>
        {user ? (
          <form
            className="twin-submission-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form);
              setBusy(true);
              setError("");
              let uploaded: string | null = null,
                jobId: string | null = null;
              try {
                const url = String(f.get("url") || "").trim(),
                  file = f.get("model") as File | null,
                  rights = String(f.get("rights"));
                if (!url && !file?.size)
                  throw Error(
                    "Provide an evidence URL or an embedded GLB file.",
                  );
                if (url && new URL(url).protocol !== "https:")
                  throw Error("Use an HTTPS source URL.");
                if (file?.size) inspectGLB(await file.arrayBuffer());
                const j = await db
                  .from("reconstruction_jobs")
                  .insert({
                    user_id: user.id,
                    part_id: part?.id || node.partId,
                    configuration_revision_id: revisionId,
                    node_id: node.id,
                    method: f.get("method"),
                    notes: f.get("notes"),
                    required_views: [
                      "front",
                      "rear",
                      "left",
                      "right",
                      "top",
                      "underside",
                      "overlapping obliques",
                    ],
                    required_measurements: [
                      "scale reference",
                      "mounting centres",
                      "independent check dimension",
                    ],
                  })
                  .select("id")
                  .single();
                if (j.error) throw j.error;
                jobId = j.data.id;
                if (url) {
                  const r = await db.from("reconstruction_evidence").insert({
                    user_id: user.id,
                    job_id: jobId,
                    source_url: url,
                    description: String(f.get("notes")),
                    rights_evidence: rights,
                  });
                  if (r.error) throw r.error;
                }
                if (file?.size) {
                  uploaded =
                    user.id + "/" + jobId + "/" + crypto.randomUUID() + ".glb";
                  const u = await db.storage
                    .from("e34-twin-submissions")
                    .upload(uploaded, file, {
                      contentType: "model/gltf-binary",
                      upsert: false,
                    });
                  if (u.error) throw u.error;
                  const r = await db.from("reconstruction_evidence").insert({
                    user_id: user.id,
                    job_id: jobId,
                    storage_path: uploaded,
                    description: String(f.get("notes")),
                    rights_evidence: rights,
                  });
                  if (r.error) throw r.error;
                }
                toast("Private source submission saved for technical review.");
                form.reset();
                setPart(null);
                setRefresh((x) => x + 1);
              } catch (err) {
                if (uploaded)
                  await db.storage
                    .from("e34-twin-submissions")
                    .remove([uploaded]);
                if (jobId)
                  await db.from("reconstruction_jobs").delete().eq("id", jobId);
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <h3>Submit source material</h3>
            <CatalogPartField
              value={partQuery}
              selected={part}
              onChange={(v) => {
                setPartQuery(v);
                setPart(null);
              }}
              onSelect={(p) => {
                setPart(p);
                setPartQuery(p.number_normalized || p.name);
              }}
            />
            <label>
              Reconstruction method
              <select name="method">
                <option value="licensed-cad">Licensed CAD</option>
                <option value="multiview">
                  Multi-view photographs or scan
                </option>
                <option value="dimensioned-drawing">Dimensioned drawing</option>
                <option value="standard-parametric">
                  Identified standard hardware
                </option>
                <option value="manual-reconstruction">
                  Measured reconstruction
                </option>
              </select>
            </label>
            <label>
              Source evidence URL
              <input name="url" type="url" placeholder="https://" />
            </label>
            <label>
              Optimized embedded GLB (optional, up to 100 MB)
              <input name="model" type="file" accept=".glb,model/gltf-binary" />
            </label>
            <label>
              Identity, measurements and known limitations
              <textarea
                name="notes"
                required
                minLength={10}
                maxLength={12000}
              />
            </label>
            <label>
              Ownership or license evidence
              <textarea
                name="rights"
                required
                minLength={10}
                maxLength={12000}
              />
            </label>
            <button disabled={busy} className="button primary">
              {busy ? "Saving source…" : "Submit for review"}
            </button>
            <p className="small muted">
              Uploads stay private to you and technical reviewers. Source
              geometry is kept separately from approved runtime assets.
            </p>
          </form>
        ) : (
          <p>
            <DocumentLink href="/account?next=/workshop/assets">Sign in</DocumentLink> to submit your
            own scans, models or source evidence.
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </section>
      <section className="twin-asset-section">
        <h2>
          {reviewer ? "Technical review queue" : "Your source submissions"}
        </h2>
        {!jobs.length && <p>No submissions yet.</p>}
        {jobs.map((j) => (
          <article className="twin-job" key={j.id}>
            <div>
              <strong>
                {graph.nodes.find((n) => n.id === j.node_id)?.name ||
                  j.node_id ||
                  j.part_id}
              </strong>
              <span>
                {j.method} · {j.status}
              </span>
            </div>
            <p>{j.notes}</p>
            {evidence
              .filter((e) => e.job_id === j.id)
              .map((e) => (
                <div className="twin-source-evidence" key={e.id}>
                  <p>{e.description}</p>
                  <small>Rights evidence: {e.rights_evidence}</small>
                  {e.source_url ? (
                    <a href={e.source_url} rel="noreferrer" target="_blank">
                      Open source evidence ↗
                    </a>
                  ) : (
                    <button
                      onClick={async () => {
                        const r = await db.storage
                          .from("e34-twin-submissions")
                          .createSignedUrl(e.storage_path!, 60, {
                            download: true,
                          });
                        if (r.error) setError(r.error.message);
                        else {
                          const a = document.createElement("a");
                          a.href = r.data.signedUrl;
                          a.rel = "noreferrer";
                          a.target = "_blank";
                          a.click();
                        }
                      }}
                    >
                      Download private source model
                    </button>
                  )}
                </div>
              ))}
            {reviewer && (
              <label>
                Review state
                <select
                  value={j.status}
                  onChange={async (e) => {
                    const r = await db
                      .from("reconstruction_jobs")
                      .update({ status: e.target.value })
                      .eq("id", j.id);
                    if (r.error) setError(r.error.message);
                    else setRefresh((x) => x + 1);
                  }}
                >
                  {[
                    "needs-evidence",
                    "ready",
                    "processing",
                    "review",
                    "failed",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {j.user_id === user?.id && (
              <button
                className="text-link"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const paths = evidence
                    .filter((e):e is typeof e & {storage_path:string} => e.job_id === j.id && !!e.storage_path)
                    .map((e) => e.storage_path);
                  const deleted = paths.length
                    ? await db.storage
                        .from("e34-twin-submissions")
                        .remove(paths)
                    : { error: null };
                  if (deleted.error) setError(deleted.error.message);
                  else {
                    const r = await db
                      .from("reconstruction_jobs")
                      .delete()
                      .eq("id", j.id);
                    if (r.error) setError(r.error.message);
                    else setRefresh((x) => x + 1);
                  }
                  setBusy(false);
                }}
              >
                Delete submission and source uploads
              </button>
            )}
          </article>
        ))}
      </section>
      <section className="twin-asset-section">
        <h2>Nominal circular seal models</h2>
        <p>
          {nominalSeals.length} canonical catalog parts now have original
          parametric 3D models and two browser LODs. Catalog A×B is interpreted
          as inside diameter × circular cross-section. Each interpretation
          requires technical review; material, tolerance, installed deformation
          and fitment are unverified.
        </p>
        <div className="twin-seal-register">
          {nominalSeals.map((seal) => (
            <a
              key={seal.partId}
              href={"/parts/catalog?part=" + encodeURIComponent(seal.partId)}
            >
              <strong>{seal.number}</strong>
              <span>{seal.name}</span>
              <small>
                {seal.insideDiameterMm} mm ID · {seal.crossSectionMm} mm section
                · {seal.outerDiameterMm} mm nominal OD
              </small>
            </a>
          ))}
        </div>
        <a
          href="https://www.trelleborg.com/seals/-/media/tss-media-repository/tss_website/pdf-and-other-literature/catalogs/o_ring_gb_en.pdf"
          rel="noreferrer"
          target="_blank"
        >
          Dimension convention reference · Trelleborg O-Rings & Back-up Rings ↗
        </a>
      </section>
      <section className="twin-asset-section">
        <h2>Source discovery register</h2>
        <p>
          Research candidates remain distinct from assets approved for use.
          Sampling resolution and creator claims are not independent dimensional
          verification.
        </p>
        <div className="twin-source-grid">
          {inventory.assets.map((a) => (
            <article key={a.id}>
              <span className="eyebrow">{a.status.replaceAll("_", " ")}</span>
              <h3>{a.name}</h3>
              <p>{a.targetApplicability}</p>
              <a href={a.sourceUrl} rel="noreferrer" target="_blank">
                Original source ↗
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
