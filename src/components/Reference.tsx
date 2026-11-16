"use client";
import { useKeyedResource } from "../hooks/use-keyed-resource";
import { DocumentLink } from "./DocumentLink";
import { ServiceOverview } from "../servicing/ServiceOverview";
import { componentGuideHref, componentRepairHref, componentHref, componentWorkshopHref, type ComponentContext } from "../servicing/context";
import { GuideSupport } from './GuideSupport';
import { guideKindLabels } from '../domain/guide-support';
import { previewFeatures } from "../release/features";
import { JourneyBar } from "../repair/JourneyBar";
import { repairPlan } from "../repair/plan";
import { track, normalizeSearch, resourceTarget } from "../analytics/client";
import { supportReference } from "../../supabase/functions/_shared/support-contract.mjs";
import { catalogOrderingRows } from "../lib/catalog-integrity";
import { catalogSearchQuery } from "../domain/catalog";
import { ShareControls } from "./ShareControls";
import { e30ManualSources, e30CatalogArchive } from "../series/e30-manual";
import { e30Guides } from "../series/e30-repairs";
import e30Evidence from "../../data/series/e30-evidence.json";
import { modelKey, seriesDefinitions, seriesHref } from "../series/registry";
import { ServiceSourceIndex } from "./ServiceSourceIndex";
import { repairTopicsFor } from "../repair/library";
import { useGuideRevision, GuideRevisionHistory } from "./GuideRevisions";
import { useRepairJourney } from '../repair/use-journey';
import { topicForGuide } from '../repair/library';
import { RepairCommunity } from '../repair/RepairCommunity';
import { stepDiscussionHref } from "../domain/walkthrough";
import { RelatedJournalEntries } from "./Journals";
import { RelatedDiscussions } from "./RelatedDiscussions";
import { GuideSourceVisual, EnginePhotoCredits } from "./GuideVisuals";
import { useVehicleCatalog } from "../lib/use-vehicle-catalog";
import heroPhotos from "../data/hero-photos.json";
import { roadmap } from '../data/roadmap';
import { editorials, editorialHref } from "../community/content";
import { useEffect, useState, useRef } from "react";
import { Search, ArrowUpRight, ChevronRight, ArrowLeft, Printer, Flag, BookOpen, ArrowRight } from "lucide-react";
import { models, systems, parts, articles, assemblies } from "../data/catalog";
import { modelSources } from "../data/model-sources";
import { chapterSystems } from "../data/manual-navigation";
import { manualSource, manualChapters, manualGuides } from "../data/manual";
import { searchRecords, getSearchTerms, type SearchRecord } from "../domain/search";
import { e30FuseReference } from "../series/e30-quick-reference";
import { quickReferenceSearch } from "../data/quick-reference";
import { e34FuseReference } from "../data/fuse-panel-layouts";
import { searchRepairReferences } from "../domain/repair-search";
import { db, useApp } from "./context";
import { GuideRetailerReferences } from "./Commercial";
import { catalogIdentityHref, type CatalogIdentityHit } from "../domain/catalog";
import { PageIntro, Tag, Icon, Notice, LinkArrow, SaveButton, Empty, Modal } from "./common";
export function Correction({
  type,
  id,
}: {
  type: "guide" | "part" | "article" | "fitment";
  id: string;
}) {
  const { requireAuth, toast } = useApp();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="text-link"
        onClick={() => {
          if (requireAuth()) setOpen(true);
        }}
      >
        <Flag size={14} />
        Suggest a correction
      </button>
      {open && (
        <Modal title="Improve this reference" onClose={() => setOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const f = new FormData(e.currentTarget);
              const { error } = await db.from("review_submissions").insert({
                target_type: type,
                target_id: id,
                correction: f.get("correction"),
                evidence_url: f.get("evidence") || null,
              });
              setBusy(false);
              if (error) toast(error.message);
              else {
                setOpen(false);
                toast("Correction submitted for technical review.");
              }
            }}
          >
            <p className="muted">
              Describe the change and the evidence. A suggestion remains pending
              until reviewed.
            </p>
            <label>
              Proposed correction
              <textarea
                name="correction"
                required
                minLength={20}
                maxLength={12000}
                rows={6}
              />
            </label>
            <label>
              Source URL (optional)
              <input
                type="url"
                name="evidence"
                pattern="https://.*"
                placeholder="https://"
              />
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? "Submitting…" : "Submit for review"}
            </button>
            <p className="small muted">Need a private reply as well? <DocumentLink href={'/support?category='+(type==='guide'?'guide-correction':'part-correction')+'&reference='+encodeURIComponent(supportReference(location.pathname+location.search))}>Contact support about this page</DocumentLink>. Technical changes still go through this review form.</p>
          </form>
        </Modal>
      )}
    </>
  );
}
export function ReferencePage({initialSystem="",initialTab}:{initialSystem?:string;initialTab?:string}) {
  const [system, setSystem] = useState(systems.some(s=>s.id===initialSystem)?initialSystem:""),
    [tab, setTab] = useState(initialTab === "models" ? "models" : "systems");
  const { vehicle, series } = useApp();
  const seriesModels = seriesDefinitions[series].models;
  const selected = systems.find((s) => s.id === system);
  const chapters = (series === "e34" ? manualChapters : []).filter(
    (c) => !system || chapterSystems(c.id).includes(system),
  );
  return (
    <div className="page">
      <PageIntro
        eyebrow={series.toUpperCase() + " SYSTEMS & SPECIFICATIONS"}
        title="Technical reference."
        description="Model information, vehicle systems and indexed service-manual sections."
      />
      <div className="tabs">
        <button
          className={tab === "systems" ? "active" : ""}
          onClick={() => setTab("systems")}
        >
          Systems & reference
        </button>
        <button
          className={tab === "models" ? "active" : ""}
          onClick={() => setTab("models")}
        >
          Model directory <span>{seriesModels.length}</span>
        </button>
      </div>
      {tab === "models" ? (
        <>
          <Notice>
            Model families are listed here to make coverage gaps visible.
            Detailed production configurations and non-U.S. specifications still
            need additional sources.
          </Notice>
          <div className="model-grid">
            {seriesModels.map((m) => (
              <DocumentLink key={m.id} href={"/models/" + m.id}>
                <span className="model-badge">{m.id}</span>
                <p>{m.label}</p>
                <div>
                  {m.engines.map((e) => (
                    <Tag key={e}>{e}</Tag>
                  ))}
                </div>
                <small>{m.coverage}</small>
                <ArrowUpRight size={19} />
              </DocumentLink>
            ))}
          </div>
        </>
      ) : (
        <div className="reference-layout">
          <aside className="filter-sidebar">
            <span className="eyebrow">VEHICLE SYSTEMS</span>
            <button
              className={!system ? "selected" : ""}
              onClick={() => setSystem("")}
            >
              All systems<span>{series === "e30" ? repairTopicsFor(series).length : manualChapters.length}</span>
            </button>
            {systems.map((s) => (
              <button
                key={s.id}
                className={system === s.id ? "selected" : ""}
                onClick={() => setSystem(s.id)}
              >
                <Icon name={s.icon} size={17} />
                {s.name}
                <ChevronRight size={14} />
              </button>
            ))}
            <DocumentLink
              href="/encyclopedia?tab=models"
              onClick={(e) => {
                e.preventDefault();
                setTab("models");
              }}
            >
              Browse model families
              <ArrowUpRight size={15} />
            </DocumentLink>
          </aside>
          <div>
            <div className="section-heading">
              <div>
                <h2>{selected?.name || "Vehicle systems"}</h2>
                <p className="muted">
                  {selected?.description ||
                    "Select a system for technical articles and service-manual references."}
                </p>
              </div>
              <Tag>{vehicle.model || "ALL " + series.toUpperCase() + " MODELS"}</Tag>
            </div>
            <div className="article-rows">
              {(series === "e34" ? articles : [])
                .filter((a) => !system || a.system === system)
                .map((a) => (
                  <DocumentLink key={a.slug} href={"/articles/" + a.slug}>
                    <span className="reference-icon">
                      <BookOpen size={23} />
                    </span>
                    <div>
                      <Tag>EXPLAINER</Tag>
                      <h3>{a.title}</h3>
                      <p>{a.summary}</p>
                    </div>
                    <ArrowUpRight size={19} />
                  </DocumentLink>
                ))}
            </div>
            <h3 className="subsection-label">
              {series === "e30" ? "Repair and manual references" : <>Manual section references <span>{chapters.length}</span></>}
            </h3>
            <div className="chapter-list">
              {chapters.map((c) => (
                <DocumentLink key={c.id} href={"/manual/" + c.id}>
                  <span className="chapter-code">{c.id}</span>
                  <div>
                    <h3>{c.title}</h3>
                    <p>
                      Printed {c.printedPages} · PDF {c.pdfStart}–{c.pdfEnd}
                    </p>
                  </div>
                  <Tag>INDEXED</Tag>
                  <ArrowUpRight size={16} />
                </DocumentLink>
              ))}
            </div>
            {series === "e30" && <div className="article-rows">
              {repairTopicsFor(series).filter(job => !system || job.systems.includes(system)).map(job => <DocumentLink key={job.id} href={"/repairs/" + job.id}><BookOpen size={19}/><strong>{job.title}</strong><ArrowUpRight size={17}/></DocumentLink>)}
              <DocumentLink href="/manual"><BookOpen size={19}/><strong>Service manual sources</strong><ArrowUpRight size={17}/></DocumentLink>
            </div>}
            {series === "e34" && !chapters.length && (
              <Empty title="This system needs a source">
                The supplied manual does not establish this reference. Share a
                source for review.
              </Empty>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export function ModelPage({ id }: { id: string }) {
  const { series } = useApp();
  const m = seriesDefinitions[series].models.find(model => model.id === decodeURIComponent(id || ""));
  const evidenceIds = e30Evidence.models.find(model => model.model === m?.id)?.sourceIds ?? [];
  const references = series === "e30" ? e30Evidence.sources.filter(source => evidenceIds.includes(source.id)).map(source => ({title: "BMW " + (m?.id || "") + " · manufacturer reference", url: source.url})) : modelSources[m?.id || ""] || [];
  if (!m)
    return (
      <div className="page">
        <Empty title="Model not found">
          Choose a model from the directory.
        </Empty>
      </div>
    );
  return (
    <div className="page narrow">
      <DocumentLink className="back-link" href="/encyclopedia">
        <ArrowLeft size={16} />
        Model directory
      </DocumentLink>
      <PageIntro
        eyebrow={series.toUpperCase() + " / MODEL FAMILY"}
        title={"BMW " + m.id}
        description={m.label}
      />
      <div className="spec-panel">
        <div>
          <span>Engine families represented</span>
          <strong>{m.engines.join(" / ")}</strong>
        </div>
        <div>
          <span>{series === "e30" ? "Documented production years" : "Supplied manual coverage"}</span>
          <strong>{m.coverage}</strong>
        </div>
        <div>
          <span>Exact production / option catalog</span>
          <strong>Not yet established</strong>
        </div>
      </div>
      <Notice>
        Engine families listed under a badge do not establish fitment. Confirm
        the installed engine, market, body and production date before using any
        part or repair record.
      </Notice>
      <div className="source-box">
        <BookOpen size={20} />
        <div>
          <strong>Model-family references</strong>
          {references.map((source) => (
            <p key={source.url}>
              <DocumentLink href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </DocumentLink>
            </p>
          ))}
          <p>
            Engine-family taxonomy only. Manufacturer archive pages may contain
            AI-assisted text, inconsistent dates or other conflicts; exact
            production, option and fitment claims require separate evidence.
          </p>
        </div>
      </div>
      <RelatedDiscussions kind="model" id={modelKey(series, m.id)} />
      <h2>Connected knowledge</h2>
      <div className="article-rows">
        {(series === "e30" ? e30Guides : manualGuides)
          .filter((g) =>
            g.engines.some((e) => (m.engines as readonly string[]).includes(e)),
          )
          .map((g) => (
            <DocumentLink href={"/guides/" + g.slug} key={g.slug}>
              <div>
                <h3>{g.title}</h3>
                <p>{g.applicability}</p>
              </div>
              <ArrowUpRight size={18} />
            </DocumentLink>
          ))}
      </div>
      <div className="form-actions">
        <LinkArrow href="/parts">Explore components</LinkArrow>
        <LinkArrow href={"/community/new?model=" + encodeURIComponent(m.id) + "&series=" + series}>
          Ask about this model
        </LinkArrow>
      </div>
    </div>
  );
}
export function ArticlePage({ slug }: { slug: string }) {
  const a = articles.find((a) => a.slug === slug);
  if (!a)
    return (
      <div className="page">
        <Empty title="Article not found">
          Browse the encyclopedia to find a reference.
        </Empty>
      </div>
    );
  return (
    <article className="page narrow">
      <DocumentLink className="back-link" href="/encyclopedia">
        <ArrowLeft size={16} />
        Encyclopedia
      </DocumentLink>
      <PageIntro
        eyebrow="FIELD NOTES / TECHNICAL EXPLAINER"
        title={a.title}
        description={a.summary}
      >
        <SaveButton kind="article" id={a.slug} title={a.title} />
      </PageIntro>
      <div className="article-body">
        {a.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="source-box">
        <BookOpen size={20} />
        <div>
          <strong>Source & scope</strong>
          <p>{a.source}</p>
          <DocumentLink href="/resources#evidence">View coverage and evidence policy</DocumentLink>
        </div>
      </div>
      <Correction type="article" id={a.slug} />
      <RelatedDiscussions kind="article" id={a.slug} />
      <div className="related-links">
        <DocumentLink href={"/repairs?system=" + a.system}>
          Related inspection guides
          <ArrowRight size={18} />
        </DocumentLink>
        <DocumentLink href="/parts">
          Connected parts & assemblies
          <ArrowRight size={18} />
        </DocumentLink>
        <DocumentLink href={"/community/new?article=" + a.slug + "&component=" + a.system}>
          Ask a question
          <ArrowRight size={18} />
        </DocumentLink>
      </div>
    </article>
  );
}
export { RepairLibrary as RepairPage } from '../repair/RepairLibrary';
export function GuidePage({
  slug,
  revision,
  component,
}: {
  slug: string;
  revision?: string;
  component: Partial<ComponentContext>;
}) {
  const source = useGuideRevision(slug, revision);
  const g = source.guide;
  const { vehicle, requireAuth, toast, series } = useApp();
  const journey = useRepairJourney();
  const topic = topicForGuide(slug);
  const [outcome, setOutcome] = useState(false);
  if (!g)
    return (
      <div className="page">
        <Empty
          title={source.loading ? "Loading guide revision…" : "Guide not found"}
        >
          {source.error || "Browse the repair center for a guide."}
        </Empty>
      </div>
    );
  return (
    <div className="page guide-page">
      <DocumentLink href={journey.href(topic ? componentRepairHref(topic.id,component) : "/repairs")} className="back-link">
        <ArrowLeft size={16} />
        Repair walkthroughs
      </DocumentLink>
      <PageIntro
        eyebrow={"WORKSHOP GUIDE / " + g.system.toUpperCase()}
        title={g.title}
        description={g.summary}
      >
        <div className="inline-tags">
          <SaveButton kind="guide" id={slug} title={g.title} />
          {previewFeatures.interactiveRepairs && slug === repairPlan.guide && source.revision === repairPlan.revision && (
            <DocumentLink className="button" href={journey.href("/workshop/repair")}>
              Open interactive repair <ArrowUpRight size={16} />
            </DocumentLink>
          )}
          <button
            className="icon-button"
            aria-label="Print guide"
            onClick={() => window.print()}
          >
            <Printer size={19} />
          </button>
        </div>
      </PageIntro>
      {(component.nodeId || component.partId) && (
        <nav className="inline-tags" aria-label="Selected component">
          {component.nodeId && (
            <DocumentLink className="button outline" href={journey.href(componentWorkshopHref(component))}>
              <ArrowLeft size={16} /> Back to part in Workshop
            </DocumentLink>
          )}
          {component.partId && (
            <DocumentLink className="button outline" href={journey.href(componentHref({...component,partId:component.partId}))}>
              <ArrowLeft size={16} /> {component.positionId ? "Back to catalog position" : "Back to part in catalog"}
            </DocumentLink>
          )}
        </nav>
      )}
      <JourneyBar journey={journey}/>
      {source.archived && (
        <Notice tone="warning">
          Archived guide version.{" "}
          <DocumentLink href={journey.href(componentGuideHref(slug, component))}>Open the current version ↗</DocumentLink>
        </Notice>
      )}
      <div className="inline-tags guide-meta">
        <Tag>{g.level}</Tag>
        <Tag>{guideKindLabels[g.kind]}</Tag>
        <span>{g.duration}</span>
        <Tag tone="amber">SOURCE-BASED GUIDE</Tag>
        <span>{g.sourceChecked?'Source references recorded':'Source checking incomplete'} · technical review pending</span>
      </div>
      {vehicle.engine && g.engines.length > 0 && !g.engines.includes(vehicle.engine) && (
        <Notice tone="warning">
          This guide does not establish applicability to your selected{" "}
          {vehicle.engine} engine.
        </Notice>
      )}
      {series === "e34" && vehicle.model &&
        (!manualSource.coverage.some((c) => c.model === vehicle.model) ||
          vehicle.market !== "USA") && (
          <Notice tone="warning">
            This source covers the named U.S. models. Your selected model or
            market is outside that established scope, or is still unknown.
            Confirm applicability before using this guide.
          </Notice>
        )}
      <GuideSupport guide={g} series={series} archived={source.archived} component={component} navigation={{vehicle:journey.activeId,scan:journey.scanId}}/>
      <div className="guide-layout">
        <aside className="guide-sidebar">
          <h3>Before you start</h3>
          <dl>
            <dt>Scope</dt>
            <dd>{g.kind}</dd>
            <dt>Engine coverage</dt>
            <dd>{g.engines.join(" / ")}</dd>

          </dl>
          <ServiceOverview guideId={slug} revision={source.revision} navigation={{vehicle:journey.activeId,scan:journey.scanId}} component={component} compact/>
          <p className="small muted">{g.durationBasis}</p>
          <GuideRevisionHistory slug={slug} revision={source.revision} />
          <DocumentLink href="#source">
            Source & applicability
            <ArrowUpRight size={14} />
          </DocumentLink>
          <nav className="guide-step-index" aria-label="Walkthrough steps">
            <span className="eyebrow">IN THIS WALKTHROUGH</span>
            {g.steps.map((s, i) => (
              <DocumentLink key={s.title} href={"#guide-step-" + (i + 1)}>
                {String(i + 1).padStart(2, "0")} · {s.title}
              </DocumentLink>
            ))}
          </nav>
        </aside>
        <article>
          <div className="safety-box">
            <h3>Read before working</h3>
            <ul>
              {g.cautions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <GuideSourceVisual slug={slug} />
          <div className="section-heading">
            <h2>{g.kind==='planning'?'Planning checklist':g.kind==='inspection'?'Inspection steps':g.kind==='reference'?'Reference checks':'Walkthrough'}</h2>
          </div>
          <div className="guide-steps">
            {g.steps.map((s, i) => (
              <section
                key={s.title}
                id={"guide-step-" + (i + 1)}
              >
                <span className="guide-step-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{s.title}</h3>
                  {g.jobSupport?.steps[i] && <div className="guide-step-preparation">
                    {g.jobSupport.steps[i].tools.length > 0 && <p><strong>Tools:</strong> {g.jobSupport.steps[i].tools.join(" · ")}</p>}
                    <DocumentLink href={g.jobSupport.steps[i].source.href}>Manual {g.jobSupport.steps[i].source.printed} ↗</DocumentLink>
                  </div>}
                  <p>{s.body}</p>
                  <div className="completion-check">
                    <span><strong>Check:</strong> {s.check}</span>
                  </div>
                  <div className="step-actions">
                    <DocumentLink href="#source">Check cited manual pages ↗</DocumentLink>
                    <ShareControls
                      title={g.title + " · Step " + (i + 1)}
                      href={
                        "/guides/" +
                        slug +
                        "?revision=" +
                        source.revision +
                        "#guide-step-" +
                        (i + 1)
                      }
                    />
                    <DocumentLink
                      href={stepDiscussionHref(slug, i + 1, g.system, {
                        revision: source.revision,
                        title: s.title,
                      })}
                    >
                      Ask about this step ↗
                    </DocumentLink>
                    <DocumentLink
                      href={
                        journey.href("/garage?" +
                        new URLSearchParams({
                          tab: "journal",
                          journal_guide: slug,
                          journal_step: String(i + 1),
                        }).toString())
                      }
                    >
                      Add to my journal ↗
                    </DocumentLink>
                  </div>
                </div>
              </section>
            ))}
          </div>
          {g.kind!=='replacement'?<div className="outcome-callout"><h3>{g.kind==='planning'?'Keep the plan with your car':'Record your findings'}</h3><p>Keep observations and unresolved questions in your private journal before deciding on a repair.</p><DocumentLink className="button outline" href={journey.href('/garage?tab=journal&journal_guide='+encodeURIComponent(slug))}>Add to My garage ↗</DocumentLink></div>:<div className="outcome-callout">
            <h3>Repair outcome</h3>
            <p>
              Your observations can help the next owner. An outcome report
              remains owner-reported until reviewed.
            </p>
            <button
              className="button primary"
              onClick={() => {
                if (requireAuth()) setOutcome(true);
              }}
            >
              Record an outcome
              <ArrowUpRight size={16} />
            </button>
          </div>}
          <div className="source-box" id="source">
            <BookOpen size={22} />
            <div>
              <strong>{g.track ? "Factory baseline · " : ""}{g.source.title}</strong>
              <p>
                {g.source.section}{g.source.pdfPages.length > 0 && " · PDF pages " + g.source.pdfPages.join(", ")}
              </p>
              <p>{g.applicability}</p>
              {series === "e34" && <div className="inline-tags">
                {manualChapters.filter((chapter) => g.source.pdfPages.some(
                  (page) => page >= chapter.pdfStart && page <= chapter.pdfEnd,
                )).map((chapter) => (
                  <DocumentLink className="button outline" key={chapter.id} href={"/manual/" + chapter.id}>
                    {chapter.id} · {chapter.title}
                  </DocumentLink>
                ))}
              </div>}
              {g.evidence && (
                <ul className="guide-evidence-links">
                  {g.evidence.map((reference) => (
                    <li key={reference.href}><DocumentLink href={reference.href}>{reference.label} <ArrowUpRight size={14} /></DocumentLink></li>
                  ))}
                </ul>
              )}
              <DocumentLink href="/resources#evidence">
                Source coverage, rights and review status
              </DocumentLink>
            </div>
          </div>
          {g.relatedGuides && (
            <section className="related-links" aria-label="Related walkthroughs">
              {g.relatedGuides.flatMap((id) => {
                const related = manualGuides.find((guide) => guide.slug === id);
                return related ? [<DocumentLink key={id} href={"/guides/" + id}>{related.title} <ArrowRight size={17} /></DocumentLink>] : [];
              })}
            </section>
          )}
          <Correction type="guide" id={slug} />
          <GuideRetailerReferences guideId={slug}/>
          <RelatedJournalEntries kind="guide" id={slug} />
          {topic && <RepairCommunity topic={topic}/>}
          <div className="related-links">
            <DocumentLink
              href={
                series === "e34" && assemblies.some((a) => a.system === g.system)
                  ? "/parts?assembly=" +
                    assemblies.find((a) => a.system === g.system)!.id
                  : "/encyclopedia?system=" + g.system
              }
            >
              Explore the connected system
              <ArrowRight size={17} />
            </DocumentLink>
            <DocumentLink href={"/community/new?guide=" + slug + "&component=" + g.system + "&series=" + series}>
              Discuss this guide
              <ArrowRight size={17} />
            </DocumentLink>
          </div>
        </article>
      </div>
      {outcome && (
        <Modal
          title="Record your observations"
          onClose={() => setOutcome(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const { error } = await db.from("repair_outcomes").insert({
                guide_id: slug,
                result: f.get("result"),
                notes: f.get("notes"),
              });
              if (error) toast(error.message);
              else {
                toast("Outcome recorded privately for technical review.");
                setOutcome(false);
              }
            }}
          >
            <label>
              What changed?
              <select name="result">
                <option value="resolved">Symptom resolved</option>
                <option value="improved">Improved</option>
                <option value="unchanged">Unchanged</option>
                <option value="worse">Worse</option>
                <option value="not_completed">Not completed</option>
              </select>
            </label>
            <label>
              Vehicle, work and observations
              <textarea
                name="notes"
                required
                minLength={10}
                maxLength={12000}
                rows={5}
              />
            </label>
            <button className="button primary">Save outcome</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
export function ResourcesPage({initialChapter=""}:{initialChapter?:string}) {
  const { series } = useApp();
  return series === "e30"
    ? <ServiceSourceIndex title="Service literature & sources." description="E30 catalog, workshop and electrical references." sources={[...e30ManualSources,{id:"oem",title:"BMW E30 original parts archive",url:e30CatalogArchive,scope:"Select the original model, market, steering and build date.",systems:[]}]} />
    : <IndexedResourcesPage initialChapter={initialChapter}/>;
}
function IndexedResourcesPage({initialChapter}:{initialChapter:string}) {
  const [q, setQ] = useState(""),[chapter,setChapter]=useState(initialChapter);
  const list = manualChapters.filter(
    (c) =>
      (!chapter || c.id === chapter) &&
      (!q || (c.id + " " + c.title).toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="page">
      <PageIntro
        eyebrow="SERVICE LITERATURE"
        title="Service literature & sources."
        description="Manual sections, catalog references and the scope of each source."
      />
      <section className="source-feature">
        <div className="book-cover">
          <span>BENTLEY PUBLISHERS</span>
          <strong>
            BMW
            <br />5 SERIES
          </strong>
          <b>E34</b>
          <small>SERVICE MANUAL / SOURCE RECORD</small>
        </div>
        <div>
          <Tag tone="green">REGISTERED SOURCE</Tag>
          <h2>{manualSource.title}</h2>
          <p>
            {manualSource.publisher} · {manualSource.pdfPageCount} supplied PDF
            pages · edition not established
          </p>
          <div className="source-coverage">
            {manualSource.coverage.map((c) => (
              <span key={c.model}>
                {c.model}
                <b>{c.modelYears}</b>
              </span>
            ))}
          </div>
          <p className="muted">
            U.S. market. Sedan and Touring where specified. The scan ends
            partway through the index; publisher-edition completeness is
            unknown.
          </p>
          <DocumentLink href="#chapters" className="button outline">
            Browse {manualChapters.length} chapter references
            <ArrowRight size={17} />
          </DocumentLink>
          <p className="small muted">
            The supplied PDF is a private source. Redistribution permission has
            not been established; no full download is offered.
          </p>
        </div>
      </section>
      <section id="chapters">
        <div className="section-heading">
          <h2>Chapter index</h2>
          <div className="input-icon">
            <Search size={16} />
            <input
              placeholder="Search chapter references"
              aria-label="Search chapter references"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setChapter("");
              }}
            />
          </div>
          {chapter && (
            <button className="button quiet" onClick={() => setChapter("")}>
              Show all chapters
            </button>
          )}
        </div>
        <div className="chapter-list resource-chapters">
          {list.map((c) => (
            <div key={c.id}>
              <span className="chapter-code">{c.id}</span>
              <div>
                <h3>{c.title}</h3>
                <p>
                  {c.printedPages} · PDF {c.pdfStart}–{c.pdfEnd}
                </p>
              </div>
              <Tag>HEADER INDEXED</Tag>
              <DocumentLink href={"/manual/" + c.id}>
                Open chapter
                <ArrowUpRight size={14} />
              </DocumentLink>
            </div>
          ))}
        </div>
      </section>
      <section id="evidence" className="policy-section">
        <div className="eyebrow">EVIDENCE & COVERAGE</div>
        <h2>Evidence classifications</h2>
        <div className="policy-grid">
          <div>
            <h3>Catalog-listed</h3>
            <p>
              A part identity observed in the cited catalog. Current
              availability, replacement chains and your car’s fitment require
              separate confirmation.
            </p>
          </div>
          <div>
            <h3>Reference-only</h3>
            <p>
              A component identified in a source or original schematic. An OEM
              identity or precise configuration has not been established.
            </p>
          </div>
          <div>
            <h3>Source-based guide</h3>
            <p>
              An independently written guide with checked source pages. It is awaiting
              technical review and must not be read as a certified repair
              procedure.
            </p>
          </div>
          <div>
            <h3>Owner-reported</h3>
            <p>
              A community observation or accepted answer. Acceptance by a thread
              author is distinct from independent technical verification.
            </p>
          </div>
        </div>
        <Notice>
          Coverage gaps: detailed non-U.S. models, M5/diesel/525iX procedures,
          production-option catalog, complete OEM assemblies, verified
          replacement procedures, current supersession data and wiring-circuit
          validation.
        </Notice>
      </section>
      <section id="privacy" className="policy-section">
        <h2>Privacy & account data</h2><p>Choose a public username, keep your garage private and publish only the car stories, photos or journal snapshots you want to share. Your private records are separate from those published snapshots.</p>
        <p><DocumentLink href="/privacy">Read the privacy policy and manage optional measurement</DocumentLink>.</p>
        <h3 id="account-deletion">Manage your records</h3><p>Use Account settings to manage sign-in security, sign out other devices or delete your account. Export your records from My Garage first. Guest sessions have a deletion control under Your guest submissions.</p>
        <p><DocumentLink href="/account">Open Account settings</DocumentLink> · <DocumentLink href="/garage">Open My Garage</DocumentLink> · <DocumentLink href="/terms">Terms of use</DocumentLink> · <DocumentLink href="/copyright">Copyright & permissions</DocumentLink></p>
      </section>
      <section id="credits" className="policy-section">
        <h2>Credits & independence.</h2>
        <p><DocumentLink href="/copyright">Copyright and permissions</DocumentLink> · <DocumentLink href="/THIRD-PARTY-NOTICES.txt">Third-party software notices</DocumentLink></p>
        <p>Touring body surfaces also adapt <DocumentLink href="https://sketchfab.com/3d-models/bmw-5-series-e34-sedan-and-touring-e3d8d4f5cdd24a549b54d10f0f0ec8f8" target="_blank" rel="noreferrer">BMW 5 Series E34 Sedan and Touring by Nieve5677 / niev</DocumentLink>, under <DocumentLink href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</DocumentLink>. Changes include source selection, alignment, segmentation, cabin adaptation and web optimization. <DocumentLink href="/models/ATTRIBUTION.json">Model credits and license records</DocumentLink>.</p>
        <EnginePhotoCredits />
        <p>
          The reusable E34 model and reference image depict “BMW 525i e34 |
          Project Zomboid” by{" "}
          <DocumentLink
            href="https://sketchfab.com/UVZZZ"
            target="_blank"
            rel="noreferrer"
          >
            Uralvagonzavod / UVZZZ (now Silbergrau)
          </DocumentLink>
          , adapted for E34 Lore under{" "}
          <DocumentLink
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </DocumentLink>
          . <DocumentLink href="/models/e34-525i/LICENSE.md">Adaptation notes</DocumentLink>. The
          model is a visual reference and is not factory CAD.
        </p>
        <p>
          Home photographs:{" "}
          {heroPhotos.map((photo, i) => (
            <span key={photo.id}>
              {i > 0 ? "; " : ""}
              <DocumentLink href={photo.filePageUrl} target="_blank" rel="noreferrer">
                {photo.title}
              </DocumentLink>{" "}
              by {photo.creator},{" "}
              <DocumentLink href={photo.licenseUrl} target="_blank" rel="noreferrer">
                {photo.license}
              </DocumentLink>
              . {photo.changes}
            </span>
          ))}{" "}
          Catalog drawings carry their BMW/source attribution. Bentley references
          include printed and PDF page locators. The supplied scan and its
          figure excerpts are kept with the private source material. The mechanical reference meshes are illustrative and are not dimensionally verified factory CAD. Licensed body and cabin surfaces retain their source credits. OEM
          identity references link to their catalog source. BMW and related
          marks identify the vehicles discussed; this independent project is not
          affiliated with BMW AG.
        </p>
      </section>
    </div>
  );
}
const referenceSearchRecords: SearchRecord[] = [
  ...roadmap.filter(item=>item.status!=='Available').map(item=>({id:'roadmap:'+item.id,title:item.title+' · '+item.status,summary:[item.intro,...item.items,...('note' in item?[item.note]:[])].join(' '),kind:'Reference' as const,href:'/roadmap#'+item.id})),
  {id:'account-data-controls',title:'Account data, export and deletion',summary:'Change your username, manage sign-in security, sign out devices, export garage records or delete your account.',kind:'Reference',href:'/privacy#control'},
  {id:'bmw-specialists',title:'BMW specialists and owner recommendations',summary:'Find a BMW mechanic, workshop, restoration business or recommend a specialist in your area.',kind:'Reference',href:'/community/specialists'},
  {id:'site-policies',title:'Terms, privacy and copyright',summary:'Site terms, contribution permissions, account privacy, contact and copyright concerns.',kind:'Reference',href:'/terms'},
  {id:"retailer-links-disclosure",title:"Retailer links & advertising",summary:"Affiliate disclosure, independent parts matching, sponsor placements and optional anonymous commercial counts.",kind:"Reference",href:"/partnerships"},
  ...parts.map((p) => ({
    id: p.id,
    title: p.name,
    summary: p.detail + " " + p.note,
    kind: "Part",
    href: "/parts?assembly=" + p.assembly + "&part=" + p.id,
    number: p.number,
    engines: p.engines,
  })),
  ...articles.map((a) => ({
    id: a.slug,
    title: a.title,
    summary: a.summary,
    kind: "Article",
    href: "/articles/" + a.slug,
    system: a.system,
  })),
  ...models.map((m) => ({
    id: m.id,
    title: "BMW " + m.id,
    summary: m.label + " " + m.engines.join(" "),
    kind: "Model",
    href: "/models/" + m.id,
  })),
];
export function SearchPage({ initialQuery = "" }: { initialQuery?: string }) {
  const [q,setQ]=useState(initialQuery),[type,setType]=useState('All');
  const {vehicle,user,authRevision,series}=useApp(),vehicleCatalog=useVehicleCatalog(),observation=useRef<{key:string;id:string}|null>(null);
  const safe=q.trim().slice(0,200),communityQuery=q.replace(/[^a-zA-Z0-9 ]/g,'').slice(0,80).trim(),scope=user?.id+':'+authRevision;
  const sourceError=series==="e34"&&vehicle.model&&vehicleCatalog.ready&&!vehicleCatalog.context?(vehicleCatalog.error||(vehicleCatalog.ambiguous?'More than one source catalog could apply. Choose a source in the parts catalog.':'No source catalog matches this vehicle yet. Choose a source in the parts catalog.')):'';
  const threadResource=useKeyedResource<SearchRecord[]>(JSON.stringify([scope,communityQuery]),async signal=>{
    const r=await db.rpc('browse_community',{search_query:getSearchTerms(communityQuery).join(' OR '),page_size:30}).select('id,title,body').abortSignal(signal);
    if(r.error)throw r.error;return (Array.isArray(r.data)?r.data:[]).map((t:{id:string;title:string;body:string})=>({id:t.id,title:t.title,summary:t.body.slice(0,200),kind:'Discussion' as const,href:'/community/'+t.id}));
  },{enabled:communityQuery.length>=2,delayMs:250,failureMessage:'Discussion search could not load.'});
  const catalogResource=useKeyedResource<SearchRecord[]>(JSON.stringify([series,safe,vehicle.model,vehicleCatalog.context?.id]),async signal=>{
    const request=series==="e30"?db.rpc("catalog_find_series_parts",{search_query:catalogSearchQuery(safe),series_filter:series,context_preference:vehicleCatalog.context?.id||null,max_results:60}):vehicle.model?db.rpc('catalog_find_parts',{search_query:catalogSearchQuery(safe),context_filter:vehicleCatalog.context!.id,max_results:60}):db.rpc('catalog_search_parts',{search_query:catalogSearchQuery(safe),max_results:60});
    const r=await request.abortSignal(signal);if(r.error)throw r.error;const seen=new Set<string>();
    return catalogOrderingRows((r.data||[])as CatalogIdentityHit[]).filter(p=>{if(seen.has(p.part_id))return false;seen.add(p.part_id);return true;}).map(p=>({id:p.part_id,title:p.name,number:p.number_normalized,summary:p.position_id?p.context_name+' · '+p.assembly_title+' · position '+p.reference:series==='e30'?'Source-listed replacement number':'BMW number recorded · ordering position under review',kind:'Part' as const,href:catalogIdentityHref(p)}));
  },{enabled:safe.length>=2&&vehicleCatalog.ready&&!sourceError,delayMs:250,failureMessage:'Catalog search is unavailable. You can still browse the parts catalog.'});
  const garageResource=useKeyedResource<SearchRecord[]>(JSON.stringify([scope,safe]),async signal=>{
    const r=await db.rpc('browse_garage_entries',{search_query:safe.slice(0,300),page_size:12}).abortSignal(signal);
    if(r.error)throw r.error;return (r.data||[]).map((g:{id:string;user_id:string;title:string;story:string})=>({id:'garage:'+g.id,title:g.title,summary:g.story.slice(0,200),kind:'Garage' as const,href:'/garages/'+g.user_id+'/'+g.id}));
  },{enabled:safe.length>=2,delayMs:250,failureMessage:'Garage search could not load.'});
  const threads=threadResource.data||[],catalogResults=catalogResource.data||[],garageResults=garageResource.data||[],remoteError=sourceError||catalogResource.error||threadResource.error||garageResource.error;
  const catalogDone=catalogResource.data?q+'|'+(vehicleCatalog.context?.id||''):'',communityDone=threadResource.data?q:'',garageDone=garageResource.data?q:'';
  const otherResults = [
    ...(series === "e30" ? catalogResults : []),
    ...searchRecords(
      [
        ...(series === "e30" ? repairTopicsFor(series).map(job => ({id:job.id,title:job.title,summary:job.engines.join(" / "),kind:"Manual job" as const,href:"/repairs/"+job.id})) : referenceSearchRecords).filter(
          (r) => !(vehicle.model&&r.kind==="Part")&&!catalogResults.some((p) => p.id === r.id),
        ),
        ...(series === "e34" ? catalogResults : []),
        ...threads,
        ...garageResults,
        ...editorials.map((e) => ({
          id: "editorial:" + e.slug,
          title: e.title,
          summary: e.summary,
          kind: "Discussion" as const,
          href: editorialHref(e.slug),
        })),
      ],
      q,
      vehicle.engine,
    ),
  ];
  const repairMatches = series === "e34" ? searchRepairReferences(q, vehicle.engine) : [];
  const diagnosticResults = repairMatches.filter((r) => r.kind === "Diagnostic");
  const guides = repairMatches.filter((r) => r.kind === "Guide");
  const sources = repairMatches.filter((r) => r.kind === "Source");
  const manualJobResults = repairMatches.filter((r) => r.kind === "Manual job").slice(0, 16);
  const exactOemQuery = /^\d{11}$/.test(q.replace(/[.\s-]/g, ""));
  const wiringResults:SearchRecord[] = /\b(?:wiring|electrical|schematic(?:s)?|pinout(?:s)?)\b/i.test(safe)
    ? [{id:'wiring-reference',title:'Wiring & Electrical',summary:'BMW circuit diagrams, connector views and wiring manuals.',kind:'Source',href:'/electrical'}]
    : [];
  const results = (
    q.trim() && !exactOemQuery
      ? [...wiringResults, ...quickReferenceSearch(q, series === "e30" ? e30FuseReference(vehicle) : e34FuseReference(vehicle.year,vehicle.model)), ...diagnosticResults, ...guides, ...manualJobResults, ...sources, ...otherResults]
      : [...otherResults, ...guides, ...sources]
  ).filter((r) => type === "All" || r.kind === type);
  const outcomeKey=q+'|'+(vehicleCatalog.context?.id||'')+'|'+type;
  useEffect(()=>{if(q.trim().length<2||remoteError||catalogDone!==q+'|'+(vehicleCatalog.context?.id||'')||communityDone!==q||garageDone!==q||observation.current?.key===outcomeKey)return;
    const id=crypto.randomUUID();observation.current={key:outcomeKey,id};track('search','/search',{search_id:id,topic:normalizeSearch(q),results:Math.min(10000,results.length),...(vehicle.model?{model:vehicle.model}:{})});
  },[q,type,catalogDone,communityDone,garageDone,remoteError,outcomeKey,vehicleCatalog.context?.id,vehicle.model,results.length]);
  return (
    <div className="page search-page">
      <PageIntro
        eyebrow={series.toUpperCase() + " SEARCH"}
        title={"Search " + series.toUpperCase() + " reference."}
        description="Search symptoms, OEM numbers, fluid capacities, fuses and community discussions."
      />
      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault();
          history.replaceState(null, "", seriesHref("/search?q=" + encodeURIComponent(q), series));
        }}
      >
        <Search size={23} />
        <input
          autoFocus
          aria-label={"Search " + series.toUpperCase() + " knowledge"}
          placeholder="Part number, component, symptom or model"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="button primary">
          Search
          <ArrowRight size={17} />
        </button>
      </form>
      {series==="e34"&&vehicle.model&&<p className="search-vehicle-scope">Parts search: {vehicleCatalog.context?.name||'your selected '+vehicle.model}. Production and equipment conditions still apply. <DocumentLink href="/parts/interchange">Interchange & replacements ↗</DocumentLink></p>}
      <div className="tabs search-tabs">
        {[
          "All",
          "Guide",
          "Diagnostic",
          "Part",
          "Article",
          "Model",
          "Source",
          "Manual job",
          "Discussion",
          "Garage",
        ].map((t) => (
          <button
            key={t}
            className={type === t ? "active" : ""}
            onClick={() => setType(t)}
          >
            {t === "All" ? "Everything" : t + "s"}
          </button>
        ))}
      </div>
      <div className="results-meta">
        {results.length} results{" "}
        {vehicle.engine &&
          " · relevance includes " + vehicle.engine + " context"}
      </div>
      {!!q.trim() && !exactOemQuery && (type === "All" || type === "Guide") && !guides.length && (
        <Notice>
          No walkthrough matches this search.{" "}
          {sources.length ? (
            <button className="button outline" onClick={() => setType("Source")}>Show matching manual chapters</button>
          ) : (
            <DocumentLink href="/manual">Browse the manual chapters</DocumentLink>
          )}
        </Notice>
      )}
      {remoteError && (
        <Notice tone="warning">
          {remoteError} <DocumentLink href="/parts/catalog">Browse catalog</DocumentLink>
        </Notice>
      )}
      {catalogResults.length > 0 && (
        <DocumentLink
          className="text-link"
          href={"/parts/catalog?q=" + encodeURIComponent(q)}
        >
          Browse matching assembly positions in the catalog
          <ArrowUpRight size={15} />
        </DocumentLink>
      )}
      <div className="search-results">
        {results.map((r) => (
          <DocumentLink href={r.href} key={r.kind + r.id} onClick={()=>{const target=resourceTarget(r.href);if(target&&observation.current?.key===outcomeKey)track("search_result","/search",{search_id:observation.current.id,target});}}>
            <Tag>{r.kind === "Guide" && "scope" in r ? String(r.scope) : r.kind}</Tag>
            <div>
              <h2>{r.title}</h2>
              <p>{r.summary}</p>
              {r.number && <code>{r.number}</code>}
            </div>
            <ArrowUpRight size={18} />
          </DocumentLink>
        ))}
      </div>
      {!results.length && (
        <Empty title="No matching records">
          Try a component name, fewer words or an OEM part number.
          <DocumentLink
            className="button outline"
            href={"/community/new?title=" + encodeURIComponent(q)}
          >
            Ask the community
            <ArrowUpRight size={16} />
          </DocumentLink>
        </Empty>
      )}
    </div>
  );
}
