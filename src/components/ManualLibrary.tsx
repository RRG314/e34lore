"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Search,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { manualChapters, manualGuides, manualSource } from "../data/manual";
import {
  chapterSystems,
  chapterGuides,
  chapterAssemblies,
  sourceOrientations,
} from "../data/manual-navigation";
import { manualJobs } from "../data/manual-jobs";
import { DocumentLink } from './DocumentLink';
import {manualPageLocator} from '../domain/guide-support';
import { searchRepairReferences } from "../domain/repair-search";
import { systems, assemblies } from "../data/catalog";
import { e34ElectricalManual } from "../data/fuse-panel-layouts";
import { E30ManualLibrary } from "./E30ManualLibrary";
import { db, useApp } from "./context";
import { Empty, Notice, PageIntro, Tag } from "./common";
type ManualProps = { chapterId?: string; initialQuery?: string; pdfPage?: string };
export function ManualLibrary(props: ManualProps) {
  const { series } = useApp();
  return series === "e30"
    ? <E30ManualLibrary {...props}/>
    : <IndexedManualLibrary {...props}/>;
}
function IndexedManualLibrary({ chapterId, initialQuery = "",pdfPage }: ManualProps) {
  const [query, setQuery] = useState(initialQuery.slice(0, 160)),
    [system, setSystem] = useState("");
  const chapter = manualChapters.find((c) => c.id === chapterId),
    appendix =
      chapterId === "EWD"
        ? {
            id: "EWD",
            title: "Electrical wiring appendix",
            pdfStart: 441,
            pdfEnd: 466,
            printedPages: "EWD-1 to EWD-26",
          }
        : chapterId === "INDEX"
          ? {
              id: "INDEX",
              title: "Available source index",
              pdfStart: 467,
              pdfEnd: 472,
              printedPages: "Index 1 to Index 6",
            }
          : null;
  const selected = chapter || appendix;
  const searchMatches = searchRepairReferences(query, "", system);
  const chapterHits = new Set(searchMatches.filter((record) => record.kind === "Source").map((record) => record.href));
  const guideMatches = searchMatches.filter((record) => record.kind === "Guide");
  const jobMatches = searchMatches.filter((record) => record.kind === "Manual job").slice(0, 16);
  const indexedJobs = manualChapters.reduce((count, chapter) => count + manualJobs(chapter.id).length, 0);
  const matches = manualChapters.filter(
    (c) =>
      (!system || chapterSystems(c.id).includes(system)) &&
      (!query.trim() || chapterHits.has("/manual/" + c.id) ||
        [c.id, c.title, c.printedPages, ...chapterSystems(c.id)]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase())),
  );
  if (selected) {
    const locator=manualPageLocator(selected,pdfPage);
    const jobs = manualJobs(selected.id);
    const guides = chapterGuides(selected.id),
      orientation = sourceOrientations[selected.id],
      index = manualChapters.findIndex((c) => c.id === selected.id),
      related = assemblies.filter((a) =>
        (chapterAssemblies[selected.id] || []).includes(a.id),
      );
    return (
      <div className="page manual-chapter-page">
        <DocumentLink href="/manual" className="back-link">
          ← Manual chapters
        </DocumentLink>
        <PageIntro
          eyebrow={"SERVICE LITERATURE / " + selected.id}
          title={selected.title}
          description={`${selected.printedPages} · supplied PDF ${selected.pdfStart}–${selected.pdfEnd}`}
        >
          <a
            href={
              "/community/new?" +
              new URLSearchParams({
                chapter: selected.id,
                component: chapterSystems(selected.id)[0] || "",
                category: "Technical Help & Troubleshooting",
                title: "Question about " + selected.title,
              }).toString()
            }
            className="button primary"
          >
            Ask about this chapter <ArrowUpRight size={16} />
          </a>
        </PageIntro>
        {pdfPage!==undefined&&<section className="manual-page-locator" aria-label="Requested manual page" role="status"><strong>{locator?'Source page '+locator.printed+' · supplied PDF p. '+locator.pdf:'This page is outside the indexed chapter.'}</strong><p>The private scan is not displayed here. Use this locator in your copy of the manual; related jobs and available walkthroughs are below.</p></section>}
        {(selected.id === "610" || selected.id === "EWD") && <section className="manual-page-locator" aria-label="BMW factory electrical manual">
          <strong>BMW 1995 Electrical Troubleshooting Manual</strong>
          <p><DocumentLink href="/electrical">Browse circuit diagrams <ArrowUpRight size={14}/></DocumentLink></p>
          <p><a href={e34ElectricalManual+"#page=21"} target="_blank" rel="noopener noreferrer">Power distribution box drawings, 0670.0 <ArrowUpRight size={14}/></a></p>
          <p><a href={e34ElectricalManual+"#page=25"} target="_blank" rel="noopener noreferrer">Fuse charts, 0670.1 <ArrowUpRight size={14}/></a></p>
        </section>}
        {(selected.id === "020" || selected.id === "610" || selected.id === "EWD") && (
          <nav className="qr-manual-shortcuts" aria-label="Quick reference for this chapter">
            <a href={selected.id === "020" ? "/quick-reference/fluids" : "/quick-reference/fuses"}>
              {selected.id === "020" ? "Fluids and capacities" : "Interactive fuse diagrams"} <ArrowUpRight size={15} />
            </a>
            <DocumentLink href="/quick-reference/locations">Component locations <ArrowUpRight size={15} /></DocumentLink>
          </nav>
        )}
        <div className="manual-chapter-layout">
          <article>
            <div className="inline-tags">
              <Tag>SOURCE INDEXED</Tag>
              {guides.length > 0 && (
                <Tag>
                  {guides.length} LINKED GUIDE{guides.length === 1 ? "" : "S"}
                </Tag>
              )}
            </div>
            {orientation ? (
              <section className="manual-orientation">
                <span className="eyebrow">
                  ORIGINAL REFERENCE · {orientation.locator}
                </span>
                <h2>{orientation.title}</h2>
                {orientation.paragraphs.map((text) => (
                  <p key={text}>{text}</p>
                ))}
                <h3>Useful details to record</h3>
                <ul>
                  {orientation.record.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
                <DocumentLink href="/garage" className="button outline">
                  Record work in My Garage <ArrowUpRight size={15} />
                </DocumentLink>
              </section>
            ) : (
              <section>
                <h2>Use this source with your vehicle record</h2>
                <p>
                  {chapter?.coverage ||
                    "The available appendix belongs to the registered U.S.-market source scan. The wiring appendix and partial index are separate from the 47 repair chapters."}
                </p>
                <p>
                  Match the installed engine, production period and relevant
                  equipment before using a source procedure. The links below
                  connect the chapter to current reference content and member
                  experience.
                </p>
              </section>
            )}
            {jobs.length > 0 && (
              <section className="manual-job-index">
                <h2>Jobs in this chapter</h2>
                <p>Open each repair job for linked DIY guides, owner walkthroughs and comments. The locator points to the start of the topic in your service manual.</p>
                <ul>
                  {jobs.map((job) => (
                    <li key={job.anchor} id={job.anchor}>
                      <div><strong>{job.title}</strong>
                        <small>{selected.id}-{job.page} · PDF p. {selected.pdfStart + job.page - 1}</small>
                      </div>
                      <DocumentLink href={"/repairs/" + selected.id + '-' + job.anchor}>Guides & owner fixes <ArrowUpRight size={14} /></DocumentLink>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <div className="section-row">
                <h2>Walkthroughs from these pages</h2>
                <DocumentLink href="/repairs">All walkthroughs ↗</DocumentLink>
              </div>
              {guides.length ? (
                <div className="manual-guide-links">
                  {guides.map((g) => (
                    <a href={"/guides/" + g.slug} key={g.slug}>
                      <BookOpen size={20} />
                      <div>
                        <h3>{g.title}</h3>
                        <p>{g.summary}</p>
                        <small>
                          {g.source.section} · {g.track ? "build planning" : g.kind} · source-based guide
                        </small>
                      </div>
                      <ArrowUpRight size={16} />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  This chapter currently has source locators. Use the cited pages for the shop procedure.
                </p>
              )}
            </section>
            <section>
              <h2>Drawings and component references</h2>
              {related.length ? (
                <div className="manual-assembly-links">
                  {related.map((a) => (
                    <a href={"/parts?assembly=" + a.id} key={a.id}>
                      <strong>{a.title}</strong>
                      <span>
                        Open interactive drawing <ArrowUpRight size={14} />
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p>
                  Use the OEM catalog to find an assembly under an independent
                  source vehicle selection. Chapter membership does not
                  establish a part’s fitment.
                </p>
              )}
              <DocumentLink href="/parts/catalog" className="button outline">
                Browse illustrated OEM catalog <ArrowUpRight size={15} />
              </DocumentLink>
            </section>
            <ChapterDiscussions id={selected.id} />
          </article>
          <aside className="manual-source-aside">
            <span className="eyebrow">SOURCE RECORD</span>
            <h3>{manualSource.publisher}</h3>
            <p>{manualSource.title}</p>
            <dl>
              <div>
                <dt>Printed reference</dt>
                <dd>{selected.printedPages}</dd>
              </div>
              <div>
                <dt>Supplied PDF pages</dt>
                <dd>
                  {selected.pdfStart}–{selected.pdfEnd}
                </dd>
              </div>
              <div>
                <dt>Source coverage</dt>
                <dd>
                  U.S. 525i, 535i, 530i and 540i in the documented model years
                </dd>
              </div>
              <div>
                <dt>Content state</dt>
                <dd>
                  {orientation
                    ? "Source-checked original orientation"
                    : "Chapter location indexed"}
                </dd>
              </div>
            </dl>
            <p className="small">
              The private scan is not distributed here. An indexed chapter is
              distinct from a reviewed repair procedure.
            </p>
            <DocumentLink href="/resources#evidence">Sources and coverage ↗</DocumentLink>
            <h3>Related systems</h3>
            {chapterSystems(selected.id).map((id) => (
              <a href={"/encyclopedia?system=" + id} key={id}>
                {systems.find((s) => s.id === id)?.name || id} ↗
              </a>
            ))}
            <DocumentLink href="/guides/identify-your-engine">
              Identify your installed engine ↗
            </DocumentLink>
          </aside>
        </div>
        <nav
          className="manual-chapter-pager"
          aria-label="Adjacent manual chapters"
        >
          {index > 0 ? (
            <a href={"/manual/" + manualChapters[index - 1].id}>
              <ArrowLeft size={15} />
              {manualChapters[index - 1].id} {manualChapters[index - 1].title}
            </a>
          ) : (
            <span />
          )}
          {index >= 0 && index < manualChapters.length - 1 && (
            <a href={"/manual/" + manualChapters[index + 1].id}>
              {manualChapters[index + 1].id} {manualChapters[index + 1].title}
              <ArrowRight size={15} />
            </a>
          )}
        </nav>
      </div>
    );
  }
  return (
    <div className="page manual-library">
      <PageIntro
        eyebrow="E34 LORE / SERVICE LITERATURE"
        title="Service manual chapters."
        description="Browse the mobile chapter index, illustrated references and repair walkthroughs."
      />
      <nav className="qr-manual-shortcuts" aria-label="Manual shortcuts">
        <DocumentLink href="/quick-reference/fluids">Fluids and capacities <ArrowUpRight size={15} /></DocumentLink>
        <DocumentLink href="/quick-reference/fuses">Fuse diagrams <ArrowUpRight size={15} /></DocumentLink>
        <DocumentLink href="/quick-reference/locations">Component locations <ArrowUpRight size={15} /></DocumentLink>
        <DocumentLink href="/manual/EWD">Wiring appendix <ArrowUpRight size={15} /></DocumentLink>
      </nav>
      <div className="manual-library-summary">
        <div>
          <strong>{manualChapters.length}</strong>
          <span>Indexed repair chapters</span>
        </div>
        <div>
          <strong>{indexedJobs}</strong>
          <span>Indexed jobs and topics</span>
        </div>
        <div>
          <strong>{manualGuides.length}</strong>
          <span>Source-based repair guides</span>
        </div>
      </div>
      <Notice>
        Source coverage: U.S. 525i 1989–95, 535i 1989–93, 530i and 540i 1994–95.
        An indexed chapter is a source locator; it does not mean every repair
        instruction is available or approved on the site.
      </Notice>
      <div className="manual-library-tools">
        <div className="input-icon">
          <Search size={17} />
          <input
            aria-label="Search manual chapters"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chapter number, system or subject"
            maxLength={160}
          />
        </div>
        <label>
          Vehicle system
          <select value={system} onChange={(e) => setSystem(e.target.value)}>
            <option value="">All systems</option>
            {systems.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {guideMatches.length > 0 && (
        <details className="qr-manual-guides" open={query.trim() ? true : undefined}>
          <summary>{guideMatches.length} {query.trim() ? "matching" : "original"} walkthrough{guideMatches.length === 1 ? "" : "s"}</summary>
          <div className="qr-links">
            {guideMatches.map((guide) => (
              <a key={guide.id} href={guide.href}>{guide.title} <ArrowUpRight size={14} /></a>
            ))}
          </div>
        </details>
      )}
      {jobMatches.length > 0 && (
        <section className="manual-job-index">
          <h2>Matching manual jobs</h2>
          <ul>{jobMatches.map((job) => (
            <li key={job.id}><div><strong>{job.title}</strong><small>{job.summary}</small></div>
              <a href={job.href}>Open locator <ArrowUpRight size={14} /></a>
            </li>
          ))}</ul>
        </section>
      )}
      <h2 id="manual-chapters">Repair chapters</h2>
      <div className="manual-chapter-cards">
        {matches.map((c) => (
          <a href={"/manual/" + c.id} key={c.id}>
            <span className="chapter-code">{c.id}</span>
            <div>
              <h2>{c.title}</h2>
              <p>
                {c.printedPages} · PDF {c.pdfStart}–{c.pdfEnd}
              </p>
              <small>
                {sourceOrientations[c.id]
                  ? "Original source orientation available"
                  : chapterGuides(c.id).length
                    ? chapterGuides(c.id).length + " linked walkthroughs"
                    : "Source chapter indexed"}
              </small>
            </div>
            <ArrowUpRight size={18} />
          </a>
        ))}
      </div>
      {!matches.length && (
        <Empty title="No matching repair chapters">
          Try a chapter code or a different system.
        </Empty>
      )}
      <section>
        <h2>Appendices in the supplied scan</h2>
        <div className="manual-appendices">
          <DocumentLink href="/manual/EWD">
            <strong>Electrical wiring</strong>
            <span>EWD-1–26 · PDF 441–466</span>
          </DocumentLink>
          <DocumentLink href="/manual/INDEX">
            <strong>Available index</strong>
            <span>PDF 467–472 · ends within P</span>
          </DocumentLink>
          <DocumentLink href="/resources">
            <strong>Source record and image credits</strong>
            <span>Edition, coverage and evidence status</span>
          </DocumentLink>
        </div>
      </section>
    </div>
  );
}
function ChapterDiscussions({ id }: { id: string }) {
  const [rows, setRows] = useState<{id:string;title:string;created_at:string}[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    db.from("threads")
      .select("id,title,created_at")
      .eq("manual_chapter_id", id)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data, error }) => {
        if (active) {
          setRows(data || []);
          setError(error?.message || "");
        }
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <section>
      <h2>Chapter discussions</h2>
      {error ? (
        <Notice tone="warning">Discussions could not load. {error}</Notice>
      ) : rows.length ? (
        rows.map((t) => (
          <p key={t.id}>
            <a href={"/community/" + t.id}>{t.title} ↗</a>
          </p>
        ))
      ) : (
        <p className="muted">
          No discussions linked to this chapter yet. Ask with the car’s
          configuration and exact source page so other owners can follow the
          same reference.
        </p>
      )}
    </section>
  );
}
