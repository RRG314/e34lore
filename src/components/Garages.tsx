"use client";
import { displayModel, seriesDefinitions, seriesForModel, seriesHref } from "../series/registry";
import {LinkedText} from "./LinkedText";
import {DocumentLink} from "./DocumentLink";
import { useEffect, useState } from "react";
import { ArrowUpRight, Car, Search } from "lucide-react";
import { db, useApp } from "./context";
import { Empty, Modal, Notice, PageIntro, Tag } from "./common";
import { ReportButton } from "./ReportButton";
import {CarPhotoManager,CarPhotoGallery,CarCover} from "./CarPhotos";
import {GarageAvatar,useGarageAvatars} from "./GarageProfile";
import { PublicJournal } from "./Journals";
import { RelatedDiscussions } from "./RelatedDiscussions";
import { type Vehicle } from "../data/catalog";
export type Showcase = {
  featured_at: string | null;
  id: string;
  user_id: string;
  title: string;
  model_id: string;
  configuration: Partial<Vehicle>;
  ownership_status: string;
  acquired_year: number | null;
  released_year: number | null;
  story: string;
  published: boolean;
  hidden: boolean;
  created_at: string;
};
type PrivateCar = {
  id: string;
  nickname: string;
  model_id: string;
  configuration: Partial<Vehicle>;
  ownership_status?: string;
  acquired_year?: number | null;
  released_year?: number | null;
};
const period = (v: {
  acquired_year?: number | null;
  released_year?: number | null;
  ownership_status?: string;
}) =>
  v.acquired_year
    ? String(v.acquired_year) +
      "–" +
      (v.released_year ||
        (v.ownership_status === "previous" ? "unknown" : "present"))
    : v.released_year
      ? "Until " + v.released_year
      : "Ownership dates not recorded";

type GaragePublication={entry_id:string;vehicle_id:string;title:string;story:string;published:boolean;hidden:boolean;sharedFields?:string[]};
const optionalVehicleFields = [
  ['engine','Engine'],['year','Model year'],['month','Build month'],['market','Market'],
  ['body','Body style'],['transmission','Transmission'],['steering','Steering'],
] as const;
export function GaragePublicationPanel({
  vehicle,
  onChanged,
  onSharingChanged,
}: {
  vehicle: PrivateCar;
  onChanged: () => void;
  onSharingChanged: () => void;
}) {
  const { user, toast } = useApp();
  const firstOwnershipYear = seriesDefinitions[seriesForModel(vehicle.model_id)].years[0];
  const [publication, setPublication] = useState<GaragePublication|null>(null),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [publicationReady,setPublicationReady]=useState(false);
  useEffect(() => {
    let active = true;
    if (!user) return;
    db.rpc("my_garage_publications").then(async ({ data, error }) => {
      if(!active)return;
      if(error){setError('Could not load sharing settings.');return;}
      const entry=((data||[]) as GaragePublication[]).find(row=>row.vehicle_id===vehicle.id);
      if(!entry){setPublication(null);setPublicationReady(true);return;}
      const shared=await db.from('garage_showcases').select('configuration,acquired_year,released_year')
        .eq('id',entry.entry_id).eq('user_id',user.id).maybeSingle();
      if(!active)return;
      if(shared.error||!shared.data){setError('Could not load sharing settings.');return;}
      const fields=Object.keys(shared.data.configuration||{});
      if(shared.data.acquired_year||shared.data.released_year)fields.push('ownership_dates');
      setPublication({...entry,sharedFields:fields});
      setPublicationReady(true);
    });
    return () => {
      active = false;
    };
  }, [user, vehicle.id, revision]);
  return (
    <section className="garage-publication">
      <div>
        <span className="eyebrow">OWNERSHIP & THE CAR’S STORY</span>
        <h3>
          {vehicle.ownership_status === "previous"
            ? "Previously owned"
            : "Currently owned"}
        </h3>
        <p className="small muted">{period(vehicle)}</p>
      </div>
      <details>
        <summary>Update ownership dates</summary>
        <form
          key={
            vehicle.id +
            vehicle.ownership_status +
            vehicle.acquired_year +
            vehicle.released_year
          }
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            const status = String(f.get("status"));
            const { error } = await db
              .from("owned_vehicles")
              .update({
                ownership_status: status,
                acquired_year: f.get("acquired")
                  ? Number(f.get("acquired"))
                  : null,
                released_year:
                  status === "previous" && f.get("released")
                    ? Number(f.get("released"))
                    : null,
              })
              .eq("id", vehicle.id);
            setBusy(false);
            if (error) toast(error.message);
            else {
              toast(
                "Ownership record updated. Republish separately to update a shared story.",
              );
              onChanged();
            }
          }}
        >
          <div className="form-grid">
            <label>
              Ownership
              <select
                name="status"
                defaultValue={vehicle.ownership_status || "current"}
              >
                <option value="current">Currently owned</option>
                <option value="previous">Previously owned</option>
              </select>
            </label>
            <label>
              Acquired year (optional)
              <input
                name="acquired"
                type="number"
                min={firstOwnershipYear}
                max={2100}
                defaultValue={vehicle.acquired_year || ""}
              />
            </label>
            <label>
              Year ownership ended (optional)
              <input
                name="released"
                type="number"
                min={firstOwnershipYear}
                max={2100}
                defaultValue={vehicle.released_year || ""}
              />
            </label>
          </div>
          <button className="button outline" disabled={busy}>
            Save ownership record
          </button>
        </form>
      </details>
      <div className="publication-actions">
        <p>
          {publication?.published
            ? "A public garage story is shared for this car."
            : "Your service history stays private. You can share a separate story and a limited vehicle description in the garages."}
        </p>
        <button className="button outline" disabled={!publicationReady} onClick={() => {setError('');setOpen(true);}}>
          {publication ? "Edit shared story" : "Share this car’s story"}
          <ArrowUpRight size={15} />
        </button>
        {publication?.published && (
          <>
            <a
              className="text-link"
              href={"/garages/" + user?.id + "/" + publication.entry_id}
            >
              View garage entry ↗
            </a>
            <button
              className="text-link"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const { error } = await db.rpc("unpublish_garage", {
                  entry: publication.entry_id,
                });
                setBusy(false);
                if (error) toast(error.message);
                else {
                  setRevision((r) => r + 1);
                  onSharingChanged();
                  toast("Garage entry unpublished.");
                }
              }}
            >
              Unpublish
            </button>
          </>
        )}
      </div>
      <CarPhotoManager vehicleId={vehicle.id} garageId={publication?.published?publication.entry_id:undefined} onChanged={onSharingChanged}/>
      {error && <Notice tone="warning">{error}</Notice>}
      {publication?.hidden && (
        <Notice tone="warning">
          This entry is hidden by moderation. Editing it does not restore
          visibility.
        </Notice>
      )}
      {open && (
        <Modal
          title="Share a garage story"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>
            Share the car’s history, what it means to you, work you’ve done or
            what happened after you sold it. This creates a separate public
            entry.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              const { error } = await db.rpc("publish_garage_vehicle", {
                vehicle: vehicle.id,
                entry_title: String(f.get("title")),
                entry_story: String(f.get("story")),
                shared_fields: f.getAll("sharedFields").map(String),
              });
              setBusy(false);
              if (error) setError(error.message);
              else {
                setOpen(false);
                setRevision((r) => r + 1);
                onSharingChanged();
                toast("Garage story published.");
              }
            }}
          >
            <label>
              Public title
              <input
                name="title"
                defaultValue={publication?.title || "BMW "+displayModel(vehicle.model_id)}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <fieldset className="garage-share-preview">
              <legend>Details to share</legend>
              <p>Your public name, BMW model and ownership status appear with the story.</p>
              {optionalVehicleFields.map(([key,label])=>vehicle.configuration[key]&&<label className="check" key={key}>
                <input type="checkbox" name="sharedFields" value={key} defaultChecked={publication?.sharedFields?.includes(key)}/>
                {label} · {vehicle.configuration[key]}
              </label>)}
              {!!(vehicle.acquired_year||vehicle.released_year)&&<label className="check">
                <input type="checkbox" name="sharedFields" value="ownership_dates" defaultChecked={publication?.sharedFields?.includes("ownership_dates")}/>
                Ownership dates · {period(vehicle)}
              </label>}
            </fieldset>
            <label>
              Your car’s story
              <textarea
                name="story"
                defaultValue={publication?.story || ""}
                minLength={40}
                maxLength={12000}
                rows={8}
                required
                placeholder="How you found it, what you’ve learned, the work and the memories…"
              />
            </label>
            <p className="small muted">
              Keep full VINs, addresses, ownership documents and private contact
              details out of the story. You can unpublish it at any time.
            </p>
            {error && <Notice tone="warning">{error}</Notice>}
            <button className="button primary" disabled={busy}>
              {busy
                ? "Publishing…"
                : publication
                  ? "Update & publish story"
                  : "Publish garage story"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}

export function GaragesPage({
  ownerId,
  entryId,
}: {
  ownerId?: string;
  entryId?: string;
}) {
  const { user } = useApp();
  const avatars=useGarageAvatars(ownerId?[ownerId]:[]);
  const [rows, setRows] = useState<Showcase[]>([]),
    [names, setNames] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [q, setQ] = useState(""),
    [query, setQuery] = useState(""),
    [ownership, setOwnership] = useState(""),
    [cursor, setCursor] = useState<{ created_at: string; id: string } | null>(
      null,
    ),
    [more, setMore] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(q.trim());
      setCursor(null);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const result = entryId
        ? await db
            .from("garage_showcases")
            .select("*")
            .eq("id", entryId)
            .eq("user_id", ownerId!)
            .maybeSingle()
        : await db.rpc("browse_garage_entries", {
            search_query: query,
            ownership_filter: ownership,
            owner_filter: ownerId || null,
            page_size: 21,
            cursor_created_at: cursor?.created_at || null,
            cursor_id: cursor?.id || null,
          });
      if (!active) return;
      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }
      const data: Showcase[] = entryId
        ? result.data
          ? [result.data as Showcase]
          : []
        : (result.data || []).slice(0, 20);
      setRows((old) =>
        cursor
          ? [...old, ...data.filter((r) => !old.some((x) => x.id === r.id))]
          : data,
      );
      setMore(!entryId && (result.data || []).length > 20);
      const ids = [...new Set(data.map((r) => r.user_id))];
      if (ids.length) {
        const p = await db
          .from("profiles")
          .select("id,display_name")
          .in("id", ids);
        if (active)
          setNames((old) => ({
            ...old,
            ...Object.fromEntries(
              (p.data || []).map((p) => [p.id, p.display_name]),
            ),
          }));
      }
      if (active) setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [entryId, ownerId, query, ownership, cursor, user?.id]);
  const entry = entryId ? rows[0] : null;
  return (
    <div className="page garages-page">
      {ownerId&&<a
        href={entryId ? "/garages/" + ownerId : "/community/garages"}
        className="back-link"
      >
        ← {entryId ? "Owner’s garage" : "Member garages"}
      </a>}
      <PageIntro
        eyebrow={entryId ? "SHARED CAR STORY" : "COMMUNITY"}
        share={Boolean(ownerId)}
        title={
          entry?.title ||
          (entryId
            ? "Garage story."
            : ownerId
              ? names[ownerId] ? names[ownerId]+"’s garage" : "Member garage"
              : "Member garages")
        }
        description={
          entry
            ? "Shared by " + (names[entry.user_id] || "Member")
            : ownerId ? "Cars and stories this member has shared." : "Browse the cars members have chosen to share."
        }
      >
        {!entryId&&ownerId&&rows.length>0&&<GarageAvatar path={avatars[ownerId]} name={names[ownerId]} className="public-garage-avatar"/>}
        {!entryId&&!ownerId&&<DocumentLink className="button outline" href="/garage">Open My Garage <ArrowUpRight size={16}/></DocumentLink>}
      </PageIntro>
      {error && <Notice tone="warning">{error}</Notice>}
      {loading && !cursor ? (
        <p className="loading-state">Opening the garages…</p>
      ) : entryId ? (
        entry ? (
          <>
            <div className="garage-story-layout">
              <article>
                <div className="garage-record-heading">
                  <span className="garage-model-mark">{seriesForModel(entry.model_id).toUpperCase()} {displayModel(entry.model_id)}</span>
                  <div>
                    <Tag>
                      {entry.ownership_status === "previous"
                        ? "PREVIOUSLY OWNED"
                        : "CURRENTLY OWNED"}
                    </Tag>
                    <p>{period(entry)}</p>
                    <a href={"/garages/" + entry.user_id}>
                      More from this owner <ArrowUpRight size={14} />
                    </a>
                  </div>
                </div>
                {(!entry.published || entry.hidden) && (
                  <Notice tone="warning">
                    This entry is not visible to other members.
                  </Notice>
                )}
                <CarPhotoGallery garageId={entry.id}/><p className="post-body garage-story-text"><LinkedText text={entry.story}/></p>
                <div className="post-actions">
                  <ReportButton type="garage" id={entry.id} />
                  <a
                    className="text-link"
                    href={
                      "/community/new?" +
                      new URLSearchParams({
                        garage: entry.id,
                        model: displayModel(entry.model_id),
                        template: "general",
                        category: "General E34 Community",
                      }).toString()
                    }
                  >
                    Discuss this car <ArrowUpRight size={14} />
                  </a>
                </div>
                <PublicJournal garageId={entry.id} ownerId={entry.user_id}/><RelatedDiscussions kind="garage" id={entry.id} />
              </article>
              <aside className="thread-context">
                <span className="eyebrow">SHARED VEHICLE RECORD</span>
                <h3>BMW {displayModel(entry.model_id)}</h3>
                <dl>
                  {Object.entries({
                    Engine: entry.configuration.engine,
                    Production: [
                      entry.configuration.year,
                      entry.configuration.month,
                    ]
                      .filter(Boolean)
                      .join("-"),
                    Market: entry.configuration.market,
                    Body: entry.configuration.body,
                    Transmission: entry.configuration.transmission,
                    Steering: entry.configuration.steering,
                  }).filter(([,value])=>Boolean(value)).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="small muted">
                  Owner-provided configuration and history. A garage story does
                  not establish fitment or verify a repair.
                </p>
                <a href={seriesHref("/models/" + displayModel(entry.model_id), seriesForModel(entry.model_id))}>
                  Model reference <ArrowUpRight size={14} />
                </a>
                <a href={seriesHref("/parts/catalog", seriesForModel(entry.model_id))}>
                  OEM reference <ArrowUpRight size={14} />
                </a>
              </aside>
            </div>
          </>
        ) : (
          <Empty title="Garage entry unavailable">
            It may be unpublished or no longer shared.{" "}
            <DocumentLink href="/community/garages">Browse member garages</DocumentLink>
          </Empty>
        )
      ) : (
        <>
          <div className="garage-directory-tools">
            <div className="input-icon">
              <Search size={16} />
              <input
                aria-label="Search garages"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Model, project or story"
                maxLength={300}
              />
            </div>
            <label>
              Ownership
              <select
                value={ownership}
                onChange={(e) => {
                  setCursor(null);
                  setOwnership(e.target.value);
                }}
              >
                <option value="">All cars</option>
                <option value="current">Currently owned</option>
                <option value="previous">Previously owned</option>
              </select>
            </label>
          </div>
          {rows.length ? (
            <div className="garage-cards">
              {rows.map((g) => (
                <a key={g.id} href={"/garages/" + g.user_id + "/" + g.id}>
                  <CarCover garageId={g.id}/><div className="garage-card-model">
                    <Car size={22} />
                    <strong>{seriesForModel(g.model_id).toUpperCase()} {displayModel(g.model_id)}</strong>
                    {g.configuration.engine&&<span>{g.configuration.engine}</span>}
                  </div>
                  <div>
                    <Tag>
                      {g.ownership_status === "previous"
                        ? "PREVIOUSLY OWNED"
                        : "CURRENTLY OWNED"}
                    </Tag>
                    <h2>{g.title}</h2>
                    <p>
                      {g.story.slice(0, 200)}
                      {g.story.length > 200 ? "…" : ""}
                    </p>
                    <small>
                      {names[g.user_id] || "Member"}{(g.acquired_year||g.released_year)?' · '+period(g):''}
                    </small>
                  </div>
                  <ArrowUpRight size={18} />
                </a>
              ))}
            </div>
          ) : (
            <Empty
              title={
                q || ownership
                  ? "No matching garage stories"
                  : ownerId ? "No shared car stories" : "No garage stories yet"
              }
            >
              {ownerId ? "Any cars this member shares will appear here." : "Share a current car, a project or a car you used to own from My Garage."}
            </Empty>
          )}
          {more && (
            <button
              className="button outline"
              disabled={loading}
              onClick={() => {
                const last = rows[rows.length - 1];
                setCursor({ created_at: last.created_at, id: last.id });
              }}
            >
              Load more garage stories
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function ShopComingSoon({exchange=false}:{exchange?:boolean}){
 return <div className="page shop-page"><PageIntro eyebrow="E34 LORE / COMING SOON" title={exchange?'Member parts exchange.':'E34 Lore merchandise.'} description={exchange?'Member sales and trades are not open yet.':'The merchandise shop is not open yet.'}/><section className="policy-section"><h2>Follow the roadmap</h2><p>We’ll add listings when the service and its terms are ready. The OEM catalog remains a technical reference; E34 Lore does not sell its listed vehicle parts.</p><DocumentLink className="button primary" href="/roadmap#marketplace">See what’s coming <ArrowUpRight size={16}/></DocumentLink><p><DocumentLink href="/parts/catalog">Browse the OEM reference</DocumentLink> · <DocumentLink href="/community">Visit the community</DocumentLink></p></section></div>;
}
