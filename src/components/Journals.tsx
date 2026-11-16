"use client";
import { LinkedText } from "./LinkedText";
import { DocumentLink } from "./DocumentLink";
import { ShareControls } from "./ShareControls";
import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, Plus, Pencil, LockKeyhole } from "lucide-react";
import { db, useApp } from "./context";
import { Empty, Modal, Notice, Tag } from "./common";
import { manualGuides } from "../data/manual";
import { guideRevision, guideStepContext } from "../domain/walkthrough";
import { CatalogPartField, type PartIdentity } from "./CatalogPartField";
import { RelatedDiscussions } from "./RelatedDiscussions";
import { ReportButton } from "./ReportButton";

type Entry = {
  id: string;
  user_id: string;
  vehicle_id: string;
  entry_date: string;
  title: string;
  body: string;
  stage: string;
  mileage: number | null;
  cost: number | null;
  currency: string;
  private_notes: string;
  guide_id: string | null;
  guide_revision: string | null;
  guide_step: number | null;
  part_id: string | null;
  content_version: number;
};
type PublicJournalEntry=Pick<Entry,'id'|'entry_date'|'title'|'body'|'stage'|'guide_id'|'guide_revision'|'guide_step'|'part_id'>;
type RelatedJournalEntry=Pick<PublicJournalEntry,'id'|'title'|'entry_date'|'guide_step'>&{garage_entry_id:string;garage:{id:string;user_id:string;published:boolean;hidden:boolean}};
type Publication = {
  source_id: string;
  public_id: string;
  garage_entry_id: string;
  published: boolean;
  hidden: boolean;
  source_version: number;
};
const stages: Record<string, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  paused: "Paused",
};
function EntryLinks({
  entry,
}: {
  entry: {
    guide_id: string | null;
    guide_revision: string | null;
    guide_step: number | null;
    part_id: string | null;
  };
}) {
  return (
    <div className="inline-tags journal-references">
      {entry.guide_id && (
        <a
          href={
            "/guides/" +
            entry.guide_id +
            (entry.guide_revision ? "?revision=" + entry.guide_revision : "") +
            (entry.guide_step ? "#guide-step-" + entry.guide_step : "")
          }
        >
          {manualGuides.find((g) => g.slug === entry.guide_id)?.title ||
            "Walkthrough"}
          {entry.guide_step ? " · Step " + entry.guide_step : ""}{" "}
          <ArrowUpRight size={14} />
        </a>
      )}
      {entry.part_id && (
        <a href={"/parts/catalog?part=" + encodeURIComponent(entry.part_id)}>
          Linked OEM reference <ArrowUpRight size={14} />
        </a>
      )}
    </div>
  );
}
export function PrivateJournal(props:{vehicleId:string;nickname:string}) {
  const {user}=useApp();
  if(!user||user.is_anonymous)return null;
  return <AccountJournal key={user.id+':'+props.vehicleId} {...props}/>;
}
function AccountJournal({
  vehicleId,
  nickname,
}: {
  vehicleId: string;
  nickname: string;
}) {
  const { user, toast } = useApp();
  const [error] = useState(""),
    [limit, setLimit] = useState(20),
    [revision, setRevision] = useState(0),
    [edit, setEdit] = useState<Entry | null | undefined>(),
    [publish, setPublish] = useState<Entry | null>(null),
    [busy, setBusy] = useState(false);
  const [requestedGuide] = useState(()=>typeof location==='undefined'?'':new URLSearchParams(location.search).get('journal_guide')||''),
    [requestedStep] = useState(()=>typeof location==='undefined'?'':new URLSearchParams(location.search).get('journal_step')||'');
  const key=[user?.id||'',vehicleId,revision,limit].join(':');
  const [result,setResult]=useState<{key:string;rows:Entry[];publications:Publication[];error:string;more:boolean}|null>(null);
  const current=result?.key===key?result:null,rows=current?.rows||[],publications=current?.publications||[],loading=!current;
  useEffect(() => {
    let alive = true;
    Promise.all([
      db
        .from("owner_journal_entries")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("entry_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1),
      db.rpc("my_journal_publications"),
    ]).then(([a, b]) => {
      if (!alive) return;
      setResult({key,rows:(a.data||[]).slice(0,limit),more:(a.data||[]).length>limit,publications:b.data||[],error:a.error?.message||b.error?.message||''});
    }).catch(()=>{if(alive)setResult({key,rows:[],publications:[],more:false,error:'Your journal could not load. Retry this page.'});});
    return () => {
      alive = false;
    };
  }, [vehicleId, user?.id, key, limit]);
  const refresh = () => setRevision((x) => x + 1);
  return (
    <section className="private-journal">
      <div className="section-heading">
        <div>
          <span className="eyebrow">RESTORATION & OWNERSHIP JOURNAL</span>
          <h2>{nickname}: the work log</h2>
        </div>
        <button className="button primary" onClick={() => setEdit(null)}>
          <Plus size={16} />
          Add journal update
        </button>
      </div>
      <p>
        Record plans, discoveries, repairs and results. Updates are private
        until you publish them individually to this car’s shared garage.
      </p>
      {requestedGuide && (
        <Notice>
          Continue from{" "}
          <strong>
            {manualGuides.find((g) => g.slug === requestedGuide)?.title ||
              "your walkthrough"}
          </strong>
          {requestedStep ? " · Step " + requestedStep : ""}. Select Add journal
          update to attach it to your record.
        </Notice>
      )}
      {(error||current?.error) && <Notice tone="warning">{error||current?.error}</Notice>}
      {loading && <p>Loading journal…</p>}
      {!loading && !current?.error && !rows.length && (
        <Empty title="No journal updates yet.">
          Record the starting condition, your goals or the work you have just
          completed.
        </Empty>
      )}
      <div className="journal-timeline">
        {rows.map((entry) => {
          const p = publications.find((x) => x.source_id === entry.id);
          return (
            <article key={entry.id}>
              <div className="inline-tags">
                <time>{entry.entry_date}</time>
                <Tag>{stages[entry.stage]}</Tag>
                <Tag tone={p?.published ? "green" : undefined}>
                  {p?.published ? "Published snapshot" : "Private"}
                </Tag>
              </div>
              <h3>{entry.title}</h3>
              <p className="post-body"><LinkedText text={entry.body}/></p>
              <EntryLinks entry={entry} />
              <details className="journal-private">
                <summary>
                  <LockKeyhole size={14} />
                  Private record details
                </summary>
                <dl>
                  <dt>Odometer</dt>
                  <dd>{entry.mileage ?? "Not recorded"}</dd>
                  <dt>Cost</dt>
                  <dd>
                    {entry.cost == null
                      ? "Not recorded"
                      : entry.cost + " " + entry.currency}
                  </dd>
                  <dt>Private notes</dt>
                  <dd className="post-body">{entry.private_notes || "None"}</dd>
                </dl>
              </details>
              {p?.hidden && (
                <Notice tone="warning">
                  The published update is hidden by moderation. Publishing again
                  does not restore visibility.
                </Notice>
              )}
              {p?.published && p.source_version !== entry.content_version && (
                <p className="small muted">
                  You have private edits. Readers still see the last published
                  version.
                </p>
              )}
              <div className="post-actions">
                <button className="text-link" onClick={() => setEdit(entry)}>
                  <Pencil size={14} />
                  Edit private update
                </button>
                <button className="text-link" onClick={() => setPublish(entry)}>
                  {p ? "Review & republish" : "Review & publish"}
                </button>
                {p?.published && (
                  <>
                    <a
                      href={
                        "/garages/" +
                        user?.id +
                        "/" +
                        p.garage_entry_id +
                        "#journal-" +
                        p.public_id
                      }
                    >
                      View published update ↗
                    </a>
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const r = await db.rpc("withdraw_journal_entry", {
                          source: entry.id,
                        });
                        setBusy(false);
                        if (r.error) toast(r.error.message);
                        else {
                          toast("Update is private again.");
                          refresh();
                        }
                      }}
                    >
                      Make private
                    </button>
                  </>
                )}
                <button
                  className="text-link muted"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !confirm(
                        "Delete this journal update and its published snapshot?",
                      )
                    )
                      return;
                    const r = await db
                      .from("owner_journal_entries")
                      .delete()
                      .eq("id", entry.id)
                      .eq("content_version", entry.content_version)
                      .select("id");
                    if (r.error) toast(r.error.message);
                    else if (!r.data?.length)
                      toast("The update changed. Reload before deleting.");
                    else refresh();
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {current?.more && (
        <button
          className="button outline"
          onClick={() => setLimit((n) => n + 20)}
        >
          Load earlier updates
        </button>
      )}
      {edit !== undefined && (
        <JournalEditor
          key={edit?.id || "new-" + vehicleId}
          vehicleId={vehicleId}
          entry={edit}
          requestedGuide={requestedGuide}
          requestedStep={requestedStep}
          onClose={() => setEdit(undefined)}
          onSaved={() => {
            setEdit(undefined);
            refresh();
          }}
        />
      )}
      {publish && (
        <Modal
          title="Review this public journal update"
          onClose={() => {
            if (!busy) setPublish(null);
          }}
        >
          <Notice>
            This publishes the date, title, journal text, work status and
            reference links below. Odometer, cost and private notes stay
            private. The car must have a shared garage story.
          </Notice>
          <article className="journal-publish-preview">
            <time>{publish.entry_date}</time>
            <h3>{publish.title}</h3>
            <Tag>{stages[publish.stage]}</Tag>
            <p className="post-body"><LinkedText text={publish.body}/></p>
            <EntryLinks entry={publish} />
          </article>
          <p className="small muted">By publishing this version, you permit its public display under the <DocumentLink href="/terms#contributions">contribution terms</DocumentLink>. <DocumentLink href="/privacy#visibility">Publication and privacy</DocumentLink>.</p>
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await db.rpc("publish_journal_entry", {
                source: publish.id,
                expected_version: publish.content_version,
              });
              setBusy(false);
              if (r.error) toast(r.error.message);
              else {
                toast("Journal update published.");
                setPublish(null);
                refresh();
              }
            }}
          >
            Publish this version
          </button>
        </Modal>
      )}
    </section>
  );
}

function JournalEditor({
  vehicleId,
  entry,
  requestedGuide,
  requestedStep,
  onClose,
  onSaved,
}: {
  vehicleId: string;
  entry: Entry | null;
  requestedGuide: string;
  requestedStep: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [guide, setGuide] = useState(
      entry?.guide_id || (guideRevision(requestedGuide) ? requestedGuide : ""),
    ),
    [step, setStep] = useState(
      entry?.guide_step ? String(entry.guide_step) : requestedStep,
    ),
    [part, setPart] = useState<PartIdentity | null>(null),
    [partQuery, setPartQuery] = useState(""),
    [partId, setPartId] = useState(entry?.part_id || "");
  const selected = guideRevision(guide),
    stepContext = selected && guideStepContext(guide, selected.revision, step);
  return (
    <Modal
      title={entry ? "Edit journal update" : "Add journal update"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          const values = {
            vehicle_id: vehicleId,
            entry_date: String(f.get("date")),
            title: String(f.get("title")),
            body: String(f.get("body")),
            stage: String(f.get("stage")),
            mileage: f.get("mileage") ? Number(f.get("mileage")) : null,
            cost: f.get("cost") ? Number(f.get("cost")) : null,
            currency: String(f.get("currency")).toUpperCase(),
            private_notes: String(f.get("private_notes") || ""),
            guide_id: guide || null,
            guide_revision: stepContext?.revision || null,
            guide_step: stepContext?.step || null,
            part_id: partId || null,
          };
          const r = entry
            ? await db
                .from("owner_journal_entries")
                .update(values)
                .eq("id", entry.id)
                .eq("content_version", entry.content_version)
                .select("id")
            : await db
                .from("owner_journal_entries")
                .insert(values)
                .select("id");
          setBusy(false);
          if (r.error) setError(r.error.message);
          else if (!r.data?.length)
            setError(
              "This update changed on another device. Your text is still here; copy it before closing and reload the latest record.",
            );
          else {
            toast("Saved privately.");
            onSaved();
          }
        }}
      >
        <div className="form-grid">
          <label>
            Date
            <input
              type="date"
              name="date"
              required
              defaultValue={
                entry?.entry_date || new Date().toLocaleDateString("en-CA")
              }
            />
          </label>
          <label>
            Work status
            <select name="stage" defaultValue={entry?.stage || "planned"}>
              {Object.entries(stages).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Title
          <input
            name="title"
            required
            minLength={2}
            maxLength={160}
            defaultValue={entry?.title}
          />
        </label>
        <label>
          Journal text
          <textarea
            name="body"
            required
            minLength={20}
            maxLength={20000}
            rows={8}
            defaultValue={entry?.body}
          />
        </label>
        <div className="form-grid">
          <label>
            Linked walkthrough
            <select
              value={guide}
              onChange={(e) => {
                setGuide(e.target.value);
                setStep("");
              }}
            >
              <option value="">None</option>
              {manualGuides.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <label>
              Specific step (optional)
              <select
                value={stepContext ? step : ""}
                onChange={(e) => setStep(e.target.value)}
              >
                <option value="">Entire walkthrough</option>
                {selected.steps.map((s, i) => (
                  <option key={s} value={i + 1}>
                    {i + 1}. {s}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {entry?.guide_revision &&
          selected?.revision !== entry.guide_revision && (
            <Notice tone="warning">
              The walkthrough has changed. Review the current step before
              relinking this update.
            </Notice>
          )}
        <p className="small">Linked part (optional)</p>
        <CatalogPartField
          value={partQuery}
          selected={part}
          onChange={(value) => {
            setPartQuery(value);
            setPart(null);
            setPartId("");
          }}
          onSelect={(value) => {
            setPart(value);
            setPartId(value.id);
            setPartQuery(value.number_normalized || value.name);
          }}
        />
        {partId && !part && (
          <p>
            Existing reference:{" "}
            <a href={"/parts/catalog?part=" + encodeURIComponent(partId)}>
              {partId}
            </a>{" "}
            <button
              type="button"
              className="text-link"
              onClick={() => setPartId("")}
            >
              Remove
            </button>
          </p>
        )}
        <fieldset>
          <legend>Private details</legend>
          <div className="form-grid">
            <label>
              Odometer
              <input
                name="mileage"
                type="number"
                min={0}
                max={100000000}
                step="any"
                defaultValue={entry?.mileage ?? ""}
              />
            </label>
            <label>
              Cost
              <input
                name="cost"
                type="number"
                min={0}
                max={100000000}
                step="0.01"
                defaultValue={entry?.cost ?? ""}
              />
            </label>
            <label>
              Currency
              <input
                name="currency"
                pattern="[A-Za-z]{3}"
                minLength={3}
                maxLength={3}
                defaultValue={entry?.currency || "USD"}
              />
            </label>
          </div>
          <label>
            Private notes
            <textarea
              name="private_notes"
              maxLength={12000}
              rows={3}
              defaultValue={entry?.private_notes}
            />
          </label>
        </fieldset>
        {error && <Notice tone="warning">{error}</Notice>}
        <button className="button primary" disabled={busy}>
          Save privately
        </button>
      </form>
    </Modal>
  );
}

export function PublicJournal({
  garageId,
  ownerId,
}: {
  garageId: string;
  ownerId: string;
}) {
  const [rows, setRows] = useState<PublicJournalEntry[]>([]),
    [limit, setLimit] = useState(10),
    [more, setMore] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const focus =
      new URLSearchParams(location.search).get("journal") ||
      location.hash.match(/^#journal-([0-9a-f-]{36})$/)?.[1];
    db.from("garage_journal_entries")
      .select("*")
      .eq("garage_entry_id", garageId)
      .eq("published", true)
      .eq("hidden", false)
      .order("entry_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1)
      .then(async (r) => {
        let visible = (r.data || []).slice(0, limit);
        if (
          focus &&
          /^[0-9a-f-]{36}$/.test(focus) &&
          !visible.some((row) => row.id === focus)
        ) {
          const target = await db
            .from("garage_journal_entries")
            .select("*")
            .eq("id", focus)
            .eq("garage_entry_id", garageId)
            .eq("published", true)
            .eq("hidden", false)
            .maybeSingle();
          if (target.data) visible = [...visible, target.data];
        }
        if (active) {
          setRows(visible);
          setMore((r.data || []).length > limit);
          setError(r.error?.message || "");
        }
      });
    return () => {
      active = false;
    };
  }, [garageId, limit]);
  useEffect(() => {
    const anchor = location.hash;
    if (/^#journal-[0-9a-f-]{36}$/.test(anchor))
      document.getElementById(anchor.slice(1))?.scrollIntoView({ block: "start" });
  }, [rows]);
  return (
    <section className="public-journal">
      <div className="section-heading">
        <div>
          <span className="eyebrow">RESTORATION & OWNERSHIP</span>
          <h2>The journal</h2>
        </div>
        <BookOpen size={22} />
      </div>
      {error && <Notice tone="warning">{error}</Notice>}
      {!rows.length && !error && (
        <p className="muted">This owner has not published journal updates.</p>
      )}
      <div className="journal-timeline">
        {rows.map((entry) => (
          <article key={entry.id} id={"journal-" + entry.id}>
            <div className="inline-tags">
              <time>{entry.entry_date}</time>
              <Tag>{stages[entry.stage]}</Tag>
            </div>
            <h3>{entry.title}</h3>
            <p className="post-body"><LinkedText text={entry.body}/></p>
            <EntryLinks entry={entry} />
            <div className="post-actions">
              <a
                className="text-link"
                href={
                  "/community/new?" +
                  new URLSearchParams({
                    journal: entry.id,
                    garage: garageId,
                    template: "restoration",
                    category: "Restorations & Build Journals",
                  }).toString()
                }
              >
                Discuss this journal update <ArrowUpRight size={14} />
              </a>
              <ReportButton type="journal" id={entry.id} />
              <ShareControls
                title={entry.title}
                href={
                  "/garages/" +
                  ownerId +
                  "/" +
                  garageId +
                  "?journal=" +
                  entry.id +
                  "#journal-" +
                  entry.id
                }
              />
            </div>
            <RelatedDiscussions kind="journal" id={entry.id} />
          </article>
        ))}
      </div>
      {more && (
        <button
          className="button outline"
          onClick={() => setLimit((n) => n + 10)}
        >
          Load earlier updates
        </button>
      )}
    </section>
  );
}

export function RelatedJournalEntries({
  kind,
  id,
}: {
  kind: "guide" | "part";
  id: string;
}) {
  const [rows, setRows] = useState<RelatedJournalEntry[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    db.from("garage_journal_entries")
      .select(
        "id,title,entry_date,guide_step,garage_entry_id,garage:garage_showcases!inner(id,user_id,published,hidden)",
      )
      .eq(kind === "guide" ? "guide_id" : "part_id", id)
      .eq("published", true)
      .eq("hidden", false)
      .eq("garage.published", true)
      .eq("garage.hidden", false)
      .order("entry_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(5)
      .then((r) => {
        if (active) {
          const source=(r.data||[]) as unknown as (Omit<RelatedJournalEntry,'garage'>&{garage:RelatedJournalEntry['garage']|RelatedJournalEntry['garage'][]|null})[];
          setRows(source.flatMap(row=>{const garage=Array.isArray(row.garage)?row.garage[0]:row.garage;return garage?.id===row.garage_entry_id&&garage.published&&!garage.hidden?[{...row,garage}]:[];}));
          setError(r.error?.message || "");
        }
      });
    return () => {
      active = false;
    };
  }, [kind, id]);
  return (
    <section className="related-discussions">
      <h3>Owners’ work logs</h3>
      {error ? (
        <p className="small">Journal updates could not load: {error}</p>
      ) : rows.length ? (
        rows.map((r) => (
          <a
            key={r.id}
            href={
              "/garages/" +
              r.garage.user_id +
              "/" +
              r.garage_entry_id +
              "#journal-" +
              r.id
            }
          >
            {r.title}
            <span className="small">
              {r.entry_date}
              {r.guide_step ? " · Step " + r.guide_step : ""} ↗
            </span>
          </a>
        ))
      ) : (
        <p className="small muted">
          No published journal updates link to this {kind} yet.
        </p>
      )}
      <a
        href={
          "/garage?" +
          new URLSearchParams(
            kind === "guide" ? { journal_guide: id } : { install_part: id },
          ).toString()
        }
      >
        Record your work in My Garage ↗
      </a>
    </section>
  );
}
