"use client";
import { DocumentLink } from "../components/DocumentLink";
import { lazy, Suspense, useEffect, useState } from "react";
import { db, useApp } from "../components/context";
import { PageIntro } from "../components/common";
import { ReportButton } from "../components/ReportButton";
import { RelatedDiscussions } from "../components/RelatedDiscussions";
import { PhotoImage } from "../components/CarPhotos";
import { models } from "../data/catalog";
import { buildStyles, buildSystems } from "./schema";
import { type BuildPublication } from "./public";
import { BuildSummary, downloadBuild } from "./BuildSheet";
import { track } from "../analytics/client";
const Viewer = lazy(() =>
  import("../digital-twin/public/ReferenceWorkshop").then((m) => ({
    default: m.ReferenceWorkshop,
  })),
);
export function PublicBuilds({ id }: { id?: string }) {
  return id ? <PublicBuild key={id} id={id} /> : <BuildGallery />;
}
function BuildGallery() {
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState(""),
    [model, setModel] = useState(""),
    [style, setStyle] = useState(""),
    [system, setSystem] = useState(""),
    [rows, setRows] = useState<BuildPublication[]>([]),
    [status, setStatus] = useState("Loading public builds…"),
    [cursor, setCursor] = useState<{ updated: string; id: string } | null>(
      null,
    ),
    [more, setMore] = useState(false);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      db.rpc("browse_builds", {
        search_query: search.slice(0, 300),
        model_filter: model,
        style_filter: style,
        system_filter: system,
        page_size: 21,
        cursor_updated: cursor?.updated || null,
        cursor_id: cursor?.id || null,
      }).then(({ data, error }) => {
        if (!live) return;
        if (error) {
          setStatus(
            "Builds could not load. Check your connection and try again.",
          );
          return;
        }
        const next = (data || []) as BuildPublication[];
        setRows((old) =>
          cursor ? [...old, ...next.slice(0, 20)] : next.slice(0, 20),
        );
        setMore(next.length > 20);
        setStatus(
          next.length ? "" : "No published builds match these filters yet.",
        );
      });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [search, model, style, system, cursor, refresh]);
  return (
    <section className="page">
      <PageIntro
        eyebrow="COMMUNITY BUILDS"
        title="E34 builds"
        description="Published plans, restorations and owner projects. Technical claims keep their source conditions."
      />
      <div className="build-gallery-filters">
        <label>
          Search builds
          <input
            type="search"
            maxLength={300}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor(null);
            }}
          />
        </label>
        <label>
          Model
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setCursor(null);
            }}
          >
            <option value="">All models</option>
            {models.map((m) => (
              <option value={m.id} key={m.id}>
                {m.id} · {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Style
          <select
            value={style}
            onChange={(e) => {
              setStyle(e.target.value);
              setCursor(null);
            }}
          >
            <option value="">All styles</option>
            {buildStyles.map((v) => (
              <option value={v} key={v}>
                {v.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Modification
          <select
            value={system}
            onChange={(e) => {
              setSystem(e.target.value);
              setCursor(null);
            }}
          >
            <option value="">All systems</option>
            {buildSystems.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">{status}</p>
      <button
        className="text-link"
        onClick={() => {
          setCursor(null);
          setRefresh((n) => n + 1);
        }}
      >
        Refresh builds
      </button>
      <div className="build-card-grid">
        {rows.map((p) => (
          <article className="build-card" key={p.id}>
            <span
              className="build-color"
              style={{
                background: p.snapshot.appearance.paint.enabled
                  ? p.snapshot.appearance.paint.color
                  : "#d8dcd3",
              }}
            />
            <div>
              <small>
                {p.snapshot.configuration.model} ·{" "}
                {p.snapshot.style.replaceAll("-", " ")}
              </small>
              <h2>
                <DocumentLink href={"/builds/" + p.id}>
                  {p.snapshot.title} ↗
                </DocumentLink>
              </h2>
              <p>{p.snapshot.description.slice(0, 200)}</p>
              <small>
                Updated {new Date(p.updated_at).toLocaleDateString()}
              </small>
            </div>
          </article>
        ))}
      </div>
      {more && (
        <button
          className="button outline"
          onClick={() => {
            const last = rows.at(-1);
            if (last) setCursor({ updated: last.updated_at, id: last.id });
          }}
        >
          More builds
        </button>
      )}
      <DocumentLink className="button primary" href="/workshop?mode=build">
        Start your own build ↗
      </DocumentLink>
    </section>
  );
}
function PublicBuild({ id }: { id: string }) {
  const { user, requireAuth, toast } = useApp();
  const [result, setResult] = useState<{
      row: BuildPublication | null;
      error: string;
    } | null>(null),
    [owner, setOwner] = useState(""),
    [photos, setPhotos] = useState<
      { id: string; object_path: string; alt_text: string; caption: string }[]
    >([]),
    [follow, setFollow] = useState(false),
    [busy, setBusy] = useState(false),
    [showModel, setShowModel] = useState(false);
  useEffect(() => {
    let live = true;
    const abort = new AbortController();
    db.from("build_publications")
      .select("*")
      .eq("id", id)
      .abortSignal(AbortSignal.any([abort.signal, AbortSignal.timeout(12000)]))
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!live) return;
        setResult({
          row: data,
          error: error
            ? "Build could not load. Check your connection and retry."
            : "",
        });
        if (data) {
          track("build_view", "/builds");
          const [p, images] = await Promise.all([
            db
              .from("profiles")
              .select("display_name")
              .eq("id", data.owner_id)
              .maybeSingle(),
            db
              .from("build_photos")
              .select("id,object_path,alt_text,caption")
              .eq("build_id", id)
              .order("created_at")
              .limit(24),
          ]);
          if (live) {
            setOwner(p.data?.display_name || "E34 Lore member");
            setPhotos(images.data || []);
          }
        }
      });
    return () => {
      live = false;
      abort.abort();
    };
  }, [id]);
  useEffect(() => {
    if (!user) return;
    let live = true;
    db.from("build_follows")
      .select("build_id")
      .eq("build_id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (live) setFollow(!!data);
      });
    return () => {
      live = false;
    };
  }, [user, id]);
  if (!result)
    return (
      <p className="page" role="status">
        Loading public build…
      </p>
    );
  if (result.error || !result.row)
    return (
      <section className="page">
        <h1>
          {result.error ? "Build unavailable" : "This build is not published"}
        </h1>
        <p>
          {result.error ||
            "It may have been made private, removed or held for review."}
        </p>
        <DocumentLink href="/builds">Browse published builds ↗</DocumentLink>
      </section>
    );
  const { snapshot: s } = result.row;
  return (
    <section className="page public-build">
      <DocumentLink href="/builds" className="text-link">
        ← All builds
      </DocumentLink>
      <PageIntro
        eyebrow="PUBLIC BUILD"
        title={s.title}
        description={s.description}
      />
      <p>
        By{" "}
        <DocumentLink href={"/garages/" + result.row.owner_id}>
          {owner}
        </DocumentLink>{" "}
        · Published version {result.row.version} ·{" "}
        {new Date(result.row.updated_at).toLocaleDateString()}
      </p>
      <div className="form-actions">
        <button
          className="button outline"
          disabled={busy}
          onClick={async () => {
            if (!requireAuth()) return;
            setBusy(true);
            const { error } = await db.rpc("follow_build", {
              build: id,
              enabled: !follow,
            });
            setBusy(false);
            if (error) toast(error.message);
            else setFollow(!follow);
          }}
        >
          {follow ? "Unfollow build" : "Follow published updates"}
        </button>
        <button
          className="button outline"
          onClick={() => downloadBuild(s, false)}
        >
          Export public JSON
        </button>
        <button className="button outline" onClick={() => window.print()}>
          Print public sheet
        </button>
        <ReportButton type="build" id={id} />
      </div>
      {showModel ? (
        <Suspense
          fallback={<p role="status">Loading published 3D reference…</p>}
        >
          <Viewer
            embedded
            initialReference={s.reference.id}
            initialModelRevision={String(s.reference.revision)}
            buildAppearance={s.appearance}
          />
        </Suspense>
      ) : (
        <div className="build-viewer-placeholder">
          <span
            className="build-color"
            style={{
              background: s.appearance.paint.enabled
                ? s.appearance.paint.color
                : "#d8dcd3",
            }}
          />
          <button className="button outline" onClick={() => setShowModel(true)}>
            Open interactive build preview
          </button>
          <p className="small">
            Loads the published appearance and supported wheels. Mechanical
            swaps and missing accessories remain plan-only.
          </p>
        </div>
      )}
      <div className="private-photo-grid">
        {photos.map((p) => (
          <figure key={p.id}>
            <PhotoImage path={p.object_path} alt={p.alt_text} />
            <figcaption>{p.caption}</figcaption>
          </figure>
        ))}
      </div>
      <article className="build-print">
        <BuildSummary build={s} />
      </article>
      <RelatedDiscussions kind="build" id={id} />
    </section>
  );
}
