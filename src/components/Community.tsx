"use client";
import type { ContributionSnapshot } from "../domain/revisions";
import { useScopedState } from "../hooks/use-scoped-state";
import { DocumentLink, navigateDocument } from "./DocumentLink";
import { LinkedText } from "./LinkedText";
import { ShareControls } from "./ShareControls";
import { ContributionNotice } from './SitePolicies';
import { GuestAccess } from "./GuestAccess";
import { ReportButton } from "./ReportButton";
import { useEffect, useMemo, useRef, useState } from "react";
import { attachRepairContext, repairComposeContext, repairComposeDefaults, repairDraftKey, repairFromObservations, repairOwnerPostsHref } from '../repair/community';
import { specialistThreadPrefix } from "../community/specialists";
import { ArrowUpRight, ArrowLeft, MessageSquare, Search, CheckCircle2, Send, Trash2, Pencil, Check, Link as LinkIcon, History } from "lucide-react";
import { db, useApp } from "./context";
import { displayModel, modelKey, seriesDefinitions, seriesForModel, seriesHref, seriesIds, type Series } from "../series/registry";
import { articles, quickSymptoms, systems, parts, emptyVehicle, sanitizeVehicle } from "../data/catalog";
import { GarageAvatar,useGarageAvatars } from "./GarageProfile";
import { restoreCommunityDraft, type CommunityDraft } from "../community/drafts";
import { e30Guides } from "../series/e30-repairs";
import { manualGuides, manualChapters } from "../data/manual";
import { PageIntro, Tag, Notice, Empty, Modal, SaveButton } from "./common";
import { RevisionHistory } from "./RevisionHistory";
import { catalogPositionHref, type CatalogPosition } from "../domain/catalog";
import { MemberControls, useCommunityPreferences } from "./CommunityGovernance";
import { formatPartNumber } from "../domain/fitment";
import { communityCategories, communityTags, discussionTemplates, editorials, editorialHref, templateBody, type TemplateId } from "../community/content";
import { AdviceFeedback, CommunityTagPicker, ProposeReview, type AdviceSummary } from "./CommunityFeatures";
import { boardForCategory, communityBoardHref, communityBoardLabel, communityBoards, communityBoardSelection, communityReplyHref, type CommunityBoardSelection } from '../community/boards';
type DiscussionSummary={body:string;engine:string|null;id:string;author_id:string;title:string;category:string;model_id:string|null;created_at:string;posts:{count:number}[];accepted_answers:{post_id:string}[]};
type Reply=ContributionSnapshot&{id:string;thread_id:string;author_id:string;created_at:string;content_version:number;in_reply_to_post_id:string|null;hidden:boolean};
type DiscussionRecord=ContributionSnapshot&{starter_topic_id:string|null;tag_ids:string[];id:string;author_id:string;title:string;category:string;created_at:string;content_version:number;locked:boolean;article_slug:string|null;diagnostic_slug:string|null;node_id:string|null;configuration_revision_id:string|null;catalog_position_id:string|null;guide_revision:string|null;guide_step:number|null;build_id:string|null;journal_update_id:string|null;manual_chapter_id:string|null;garage:{id:string;user_id:string;title:string}|null;tags:string[]};
const categories = communityCategories.map((c) => c.name);
const date = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export function CommunityPage({boardQuery}:{boardQuery?:Record<string,string|undefined>}) {
  const { user, series } = useApp();
  const { preferences, error: preferenceError } = useCommunityPreferences();
  const initial = communityBoardSelection(boardQuery);
  const [list, setList] = useState<DiscussionSummary[]>([]),
    [names, setNames] = useState<Record<string, string>>({}),
    [boardId,setBoardId] = useState(initial.board),
    [tag, setTag] = useState(initial.tag),
    [q, setQ] = useState(initial.q),
    [searchQuery, setSearchQuery] = useState(initial.q),
    [cursor, setCursor] = useState<{ created_at: string; id: string } | null>(
      null,
    ),
    [hasMore, setHasMore] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [refresh,setRefresh] = useState(0);
  const board = communityBoards.find(item=>item.id===boardId);
  const category = board?.name ?? '';
  const selection = {board:boardId,tag,q:q.trim()};
  const visible = list.filter(thread=>!preferences.some(p=>p.target_user_id===thread.author_id));
  const avatars=useGarageAvatars(visible.map(thread=>thread.author_id));
  const composeHref = communityBoardHref(selection,'/community/new');
  useEffect(() => {
    const url = seriesHref(communityBoardHref({board:boardId,tag,q:searchQuery}),series);
    window.history.replaceState(window.history.state,'',url);
  }, [boardId,tag,searchQuery,series]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setCursor(null);
      setSearchQuery(q.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    let active = true;
    async function get() {
      setLoading(true);
      setError(false);
      const { data, error } = await db
        .rpc("browse_community", {
          search_query: searchQuery,
          category_filter: category,
          tag_filter: tag,
          page_size: 21,
          cursor_created_at: cursor?.created_at || null,
          cursor_id: cursor?.id || null,
        })
        .select("*,posts(count),accepted_answers(post_id)");
      if (!active) return;
      if (error) setError(true);
      else {
        const page: DiscussionSummary[] = (data || []).slice(0, 20);
        setList((previous) =>
          cursor === null
            ? page
            : [
                ...previous,
                ...page.filter(
                  (row) => !previous.some((old) => old.id === row.id),
                ),
              ],
        );
        setHasMore((data || []).length > 20);
        const ids = [...new Set(page.map((t) => t.author_id))];
        if (ids.length) {
          const p = await db
            .from("profiles")
            .select("id,display_name")
            .in("id", ids);
          if (active)
            setNames((previous) => ({
              ...previous,
              ...Object.fromEntries(
                (p.data || []).map((x) => [x.id, x.display_name]),
              ),
            }));
        }
      }
      setLoading(false);
    }
    get();
    return () => {
      active = false;
    };
  }, [category, tag, searchQuery, cursor, user?.id, refresh]);
  return (
    <div className="page">
      <PageIntro
        eyebrow="COMMUNITY"
        title="Discussions"
        description="Ask a repair question, compare parts or share what worked on your car."
        share={false}
      >
        <DocumentLink href={composeHref} className="button primary">
          Start a discussion
          <ArrowUpRight size={17} />
        </DocumentLink>
      </PageIntro>
      <div className="community-board-filters">
          <label>
            Board
            <select value={boardId} onChange={event=>{
              setCursor(null);
              setBoardId(communityBoardSelection({board:event.target.value}).board);
            }}>
              <option value="">All boards</option>
              {communityBoards.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Tag
            <select
              value={tag}
              onChange={(e) => {
                setCursor(null);
                setTag(communityBoardSelection({tag:e.target.value}).tag);
              }}
            >
              <option value="">All tags</option>
              {communityTags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="community-board-search">
            Search
            <span className="input-icon">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={q}
                maxLength={160}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search discussions"
                placeholder="Search discussions"
              />
            </span>
          </label>
      </div>
      <section aria-labelledby="community-discussion-heading">
          <div className="section-heading">
            <h2 id="community-discussion-heading">{board?.label || "Recent discussions"}</h2>
            <DocumentLink className="text-link" href="/community/settings">Community settings</DocumentLink>
          </div>
          {preferenceError && (
            <Notice tone="warning">
              Member preferences couldn’t load.
            </Notice>
          )}
          {error && (
            <Notice tone="warning">
              Discussions couldn’t load. <button type="button" className="text-link" onClick={()=>{
                setCursor(null);
                setRefresh(value=>value+1);
              }}>Try again</button>
            </Notice>
          )}
          {loading && cursor === null ? (
            <p className="loading-state">Loading discussions…</p>
          ) : !error && visible.length ? (
            <div className="thread-list">
              {visible.map((t) => (
                  <DocumentLink key={t.id} href={communityBoardHref(selection,"/community/" + t.id)}>
                    <GarageAvatar className="thread-avatar" name={names[t.author_id]||'Member'} path={avatars[t.author_id]}/>
                    <div className="thread-summary">
                      <div className="inline-tags">
                        <Tag>{communityBoardLabel(t.category)}</Tag>
                        {t.accepted_answers?.length > 0 && (
                          <Tag tone="green">AUTHOR ACCEPTED</Tag>
                        )}
                        {t.model_id && (
                          <span>
                            {displayModel(t.model_id)} {t.engine}
                          </span>
                        )}
                      </div>
                      <h3>{t.title}</h3>
                      <p>
                        {t.body.slice(0, 180)}
                        {t.body.length > 180 ? "…" : ""}
                      </p>
                      <small>
                        {names[t.author_id] || "Member"} · {date(t.created_at)}
                      </small>
                    </div>
                    <span className="thread-reply-count">
                      <MessageSquare size={17} />
                      {t.posts?.[0]?.count || 0}
                    </span>
                    <ArrowUpRight size={18} />
                  </DocumentLink>
                ))}
            </div>
          ) : !error ? (
            <Empty
              title={
                q || board || tag ? "No matching discussions" : "No discussions yet"
              }
            >
              {q || board || tag ? 'Try a different search or change the filters.' : 'Start with a question or share what worked on your car.'}
              {(q || board || tag) && <button type="button" className="text-link" onClick={()=>{
                setQ(''); setSearchQuery(''); setBoardId(''); setTag(''); setCursor(null);
              }}>Clear filters</button>}
            </Empty>
          ) : null}
          {!error && hasMore && list.length > 0 && (
            <div className="form-actions">
              <span className="small muted" role="status">
                {visible.length} discussions shown
              </span>
              <button
                className="button outline"
                disabled={loading}
                onClick={() => {
                  const last = list[list.length - 1];
                  setCursor({ created_at: last.created_at, id: last.id });
                }}
              >
                {loading ? "Loading…" : "Load more discussions"}
              </button>
            </div>
          )}
      </section>
    </div>
  );
}
function QuestionForm({boardSelection}:{boardSelection:CommunityBoardSelection}) {
  const { vehicle, user, authReady, requireAuth, toast, series, seriesEnabled } = useApp();
  const startBoard = communityBoards.find(item=>item.id===boardSelection.board);
  const [composeSeries, setComposeSeries] = useState<Series>(series);
  const [specialistDraft,setSpecialistDraft]=useState(false);
  const specialistTemplate = useRef("");
  const defaultDraftKey = series + ".question.draft.v1" + (startBoard?'.'+startBoard.id:'');
  const draftStorageKey = useRef(defaultDraftKey);
  const [repairContext, setRepairContext] = useState<ReturnType<typeof repairComposeContext>>(null);
  const [busy, setBusy] = useState(false),
    [storedDraft, setDraft] = useState<CommunityDraft>({
      chapter: "",
      title: "",
      body: "",
      category: startBoard?.name ?? communityCategories[0].name as string,
      template: (startBoard?.template ?? "troubleshooting") as TemplateId,
      starter: "",
      tags: [] as string[],
      model: "",
      engine: "",
      component: "",
      part: "",
      catalogPosition: "",
      guide: "",
      article: "",
      diagnostic: "",
      node: "",
      referenceRevision: "",
      garage: "",
      build: "",
      journal: "",
      guideRevision: "",
      guideStep: "",
      observations: [] as { question: string; answer: string }[],
    }),
    [context, setContext] = useState(false);
  const draft=useMemo(()=>({...storedDraft,model:storedDraft.garage?storedDraft.model:storedDraft.model||(composeSeries === series && vehicle.model ? modelKey(series, vehicle.model) : ''),engine:storedDraft.garage?storedDraft.engine:storedDraft.engine||(composeSeries === series ? vehicle.engine : '')}),[storedDraft,vehicle.model,vehicle.engine,composeSeries,series]);
  const contextKey=JSON.stringify([context,draft.part,draft.catalogPosition,draft.node,draft.referenceRevision,draft.garage,draft.build,draft.journal,draft.guide,draft.guideRevision,draft.guideStep]);
  const
    [linkedPart, setLinkedPart] = useScopedState<{
      id: string;
      name: string;
      number_normalized: string | null;
    } | null>(contextKey,null),
    [linkedBuild,setLinkedBuild]=useScopedState<{id:string;title:string;configuration:Record<string,string>}|null>(contextKey,null),
    [linkedGarage, setLinkedGarage] = useScopedState<{
      id: string;
      model_id: string;
      configuration: Record<string, string>;
    } | null>(contextKey,null),
    [linkedNode, setLinkedNode] = useScopedState<{ name: string } | null>(contextKey,null),
    [linkedPosition, setLinkedPosition] = useScopedState<CatalogPosition | null>(
      contextKey,null,
    ),
    [linkError, setLinkError] = useScopedState(contextKey,""),
    [linkReady, setLinkReady] = useScopedState(contextKey,false);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const repair = repairComposeContext(p);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the URL and existing browser question/repair draft once.
    setRepairContext(repair);
    if (repair) setComposeSeries(repair.topic.series??'e34');
    const specialist=p.get('intent')==='specialist';
    draftStorageKey.current = repair ? repairDraftKey(repair.topic, repair.intent) : specialist ? 'e34.question.specialist.draft.v1' : defaultDraftKey;
    setSpecialistDraft(specialist);
    specialistTemplate.current = specialist ? (p.get("observations") || "").trim() : "";
    setDraft((d) => ({
      ...d,
      chapter: [...manualChapters.map((c) => c.id), "EWD", "INDEX"].includes(
        p.get("chapter") || "",
      )
        ? p.get("chapter")!
        : "",
      title: p.get("title") || "",
      body: p.get("observations") || "",
      model: p.get("model") ? modelKey(series, displayModel(p.get("model")!)) : "",
      engine: "",
      component: systems.some((s) => s.id === p.get("component"))
        ? p.get("component")!
        : "",
      article: articles.some((a) => a.slug === p.get("article"))
        ? p.get("article")!
        : "",
      diagnostic: quickSymptoms.some((s) => s.id === p.get("symptom"))
        ? p.get("symptom")!
        : "",
      node: (p.get("node") || "").slice(0, 160),
      referenceRevision: (p.get("configuration_revision") || "").slice(0, 160),
      build: (p.get("build")||"").slice(0,36),
      garage: (p.get("garage") || "").slice(0, 36),
      journal: (p.get("journal") || "").slice(0, 36),
      guideRevision: (p.get("guide_revision") || "").slice(0, 24),
      guideStep: (p.get("guide_step") || "").slice(0, 3),
      part: (p.get("part") || "").slice(0, 100),
      catalogPosition: (p.get("catalog_position") || "").slice(0, 160),
      guide: (series === "e30" ? e30Guides : manualGuides).some((g) => g.slug === p.get("guide"))
        ? p.get("guide")!
        : "",
    }));
    setContext(true);
    try {
      const saved = restoreCommunityDraft(
        JSON.parse(sessionStorage.getItem(draftStorageKey.current) || "null"),
      );
      if (saved)
        setDraft((d) => ({
          ...d,
          ...saved,
          ...(p.get("title") ? { title: p.get("title")! } : {}),
          ...(p.get("observations") ? { body: p.get("observations")! } : {}),
          ...(p.get("chapter") ? { chapter: d.chapter } : {}),
          ...(p.get("part") ? { part: d.part } : {}),
          ...(p.get("catalog_position")
            ? { catalogPosition: d.catalogPosition }
            : {}),
          ...(p.get("guide")
            ? {
                guide: d.guide,
                guideRevision: d.guideRevision,
                guideStep: d.guideStep,
              }
            : {}),
          ...(p.get("journal") ? { journal: d.journal } : {}),
          ...(p.get("component") ? { component: d.component } : {}),
          ...(p.get("article") ? { article: d.article } : {}),
          ...(p.get("symptom") ? { diagnostic: d.diagnostic } : {}),
          ...(p.get("node")
            ? { node: d.node, referenceRevision: d.referenceRevision }
            : {}),
          ...(p.get("build") ? {build:d.build}:{}),
          ...(p.get("garage") ? { garage: d.garage } : {}),
        }));
    } catch {}
    const starter = editorials.find((t) => t.slug === p.get("starter"));
    if (starter)
      setDraft((d) => ({
        ...d,
        starter: starter.slug,
        category: starter.category,
        template: starter.template,
      }));
    else if (communityCategories.some((c) => c.name === p.get("category")))
      setDraft((d) => ({ ...d, category: p.get("category")! }));
    const requestedTemplate = p.get("template");
    if (requestedTemplate && requestedTemplate in discussionTemplates)
      setDraft((d) => ({ ...d, template: requestedTemplate as TemplateId }));
    if (p.get("symptom"))
      try {
        const handoff = JSON.parse(
          sessionStorage.getItem("e34.diagnostic.handoff.v1") || "null",
        );
        if (
          handoff?.symptom === p.get("symptom") &&
          typeof handoff.summary === "string"
        ) {
          setDraft((d) => ({
            ...d,
            body: handoff.summary.slice(0, 20000),
            observations: Array.isArray(handoff.observations)
              ? handoff.observations.slice(0, 20)
              : [],
          }));
          sessionStorage.removeItem("e34.diagnostic.handoff.v1");
        }
      } catch {}
    if (repair) {
      let saved: Partial<CommunityDraft> = {};
      try { saved = restoreCommunityDraft(JSON.parse(sessionStorage.getItem(draftStorageKey.current) || 'null')); } catch {}
      setDraft(d => attachRepairContext({ ...d, ...repairComposeDefaults(repair.topic, repair.intent),
        ...saved, template: repair.intent === 'repair-writeup' ? 'repair' : 'general', category: 'Maintenance, Repairs & DIY',
        observations: saved.observations || [],
      }, repair.topic));
    }
  }, []);
  useEffect(() => {
    if (!context) return;
    let active = true;
    async function resolve() {
      try {
        if (draft.journal) {
          const r = await db
            .from("garage_journal_entries")
            .select(
              "id,build_id,garage_entry_id,guide_id,guide_revision,guide_step,part_id",
            )
            .eq("id", draft.journal)
            .eq("published", true)
            .eq("hidden", false)
            .maybeSingle();
          if (r.error) throw r.error;
          if (!r.data)
            throw new Error(
              "This journal update is unavailable. Remove its attachment to continue.",
            );
          const j = r.data;
          if (active)
            setDraft((d) => ({
              ...d,
              garage: j.garage_entry_id,build:j.build_id||"",
              guide: j.guide_id || "",
              guideRevision: j.guide_revision || "",
              guideStep: j.guide_step ? String(j.guide_step) : "",
              part: j.part_id || "",
            }));
        }
        if (draft.guideRevision || draft.guideStep) {
          const n = Number(draft.guideStep);
          if (
            !draft.guide ||
            !draft.guideRevision ||
            !Number.isInteger(n) ||
            n < 1
          )
            throw new Error(
              "Walkthrough context needs a guide revision and valid step. Remove its attachment to continue.",
            );
          const r = await db
            .from("guide_step_index")
            .select("title")
            .eq("guide_id", draft.guide)
            .eq("revision", draft.guideRevision)
            .eq("step_number", n)
            .maybeSingle();
          if (r.error) throw r.error;
          if (!r.data)
            throw new Error(
              "The attached walkthrough step is unavailable. Remove its attachment to continue.",
            );
        }
        if(draft.build){const g=await db.from('build_publications').select('id,snapshot').eq('id',draft.build).eq('published',true).eq('hidden',false).maybeSingle();if(g.error||!g.data)throw new Error('The attached build is unavailable. Remove its attachment to continue.');const snapshot=g.data.snapshot as{title:string;configuration:Record<string,string>};if(active){setLinkedBuild({id:g.data.id,title:snapshot.title,configuration:snapshot.configuration});setDraft(d=>({...d,model:snapshot.configuration.model||'',engine:snapshot.configuration.engine||''}));}}
        if (draft.garage) {
          const g = await db
            .from("garage_showcases")
            .select("id,model_id,configuration")
            .eq("id", draft.garage)
            .eq("published", true)
            .eq("hidden", false)
            .maybeSingle();
          if (g.error) throw g.error;
          if (!g.data)
            throw new Error(
              "The attached garage story is unavailable. Remove its attachment to continue.",
            );
          const garage = g.data;
          if (active) {
            setLinkedGarage(garage);
            setDraft((d) => ({
              ...d,
              model: garage.model_id,
              engine: garage.configuration.engine || "",
            }));
          }
        }
        if (draft.node || draft.referenceRevision) {
          if (!draft.node || !draft.referenceRevision)
            throw new Error(
              "Workshop context needs both a revision and node. Reopen it from the workshop or remove the attachment.",
            );
          const node = await db
            .from("assembly_nodes")
            .select("name,part_id")
            .eq("configuration_revision_id", draft.referenceRevision)
            .eq("id", draft.node)
            .maybeSingle();
          if (node.error) throw node.error;
          if (
            !node.data ||
            (draft.part &&
              node.data.part_id &&
              draft.part !== node.data.part_id)
          )
            throw new Error(
              "The workshop node does not match the attached part.",
            );
          if (active) setLinkedNode(node.data);
        }
        if (draft.catalogPosition) {
          const row = await db
            .from("part_assembly_positions")
            .select("*,parts(id,name,number_normalized)")
            .eq("id", draft.catalogPosition)
            .maybeSingle();
          if (row.error) throw row.error;
          if (!row.data || (draft.part && row.data.part_id !== draft.part))
            throw new Error(
              "The attached catalog position does not match the part. Remove the attachment or reopen it from the catalog.",
            );
          if (active) {
            setLinkedPosition(row.data as CatalogPosition);
            setLinkedPart(row.data.parts);
            if (!draft.part)
              setDraft((d) => ({ ...d, part: row.data.part_id }));
          }
        } else if (draft.part) {
          const row = await db
            .from("parts")
            .select("id,name,number_normalized")
            .eq("id", draft.part)
            .maybeSingle();
          if (row.error) throw row.error;
          if (!row.data)
            throw new Error(
              "The attached part could not be found. Remove the attachment or select it again in the catalog.",
            );
          if (active) setLinkedPart(row.data);
        }
      } catch (reason) {
        if (active) setLinkError((reason as Error).message);
      } finally {
        if (active) setLinkReady(true);
      }
    }
    resolve();
    return () => {
      active = false;
    };
  }, [
    context,
    draft.part,
    draft.catalogPosition,
    draft.node,
    draft.referenceRevision,
    draft.garage,draft.build,
    draft.journal,
    draft.guide,
    draft.guideRevision,
    draft.guideStep,setLinkError,setLinkReady,setLinkedBuild,setLinkedGarage,setLinkedNode,setLinkedPart,setLinkedPosition,
  ]);
  useEffect(() => {
    if (context)
      sessionStorage.setItem(draftStorageKey.current, JSON.stringify(draft));
  }, [draft, context, specialistDraft]);
  const update = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const backHref = repairContext ? repairOwnerPostsHref(repairContext.topic) :
    specialistDraft ? '/community/specialists' : communityBoardHref(boardSelection);
  const backSeries = repairContext ? repairContext.topic.series??'e34' : series;
  return (
    <div className="page question-page">
      <DocumentLink href={backHref} series={backSeries} className="back-link">
        <ArrowLeft size={16} />
        {repairContext ? 'Back to repair discussion' : specialistDraft ? 'BMW specialists' : 'Back to '+(startBoard?.label||'discussions')}
      </DocumentLink>
      <PageIntro
        eyebrow={repairContext ? backSeries.toUpperCase()+" REPAIR DISCUSSION" : startBoard?.label ?? "COMMUNITY"}
        title={repairContext ? repairContext.intent === 'repair-writeup' ? 'Share your repair walkthrough.' : 'Add a comment or question.' : specialistDraft?'Share a BMW specialist.':'New discussion.'}
        description={repairContext ? repairContext.topic.title : specialistDraft?'Recommend a business you have used, or provide a sourced correction to a listing.':undefined}
      />
      <div className="question-layout">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!linkReady || linkError) return;
            if (draft.body.trim() === templateBody(draft.template).trim() ||
                (specialistDraft && draft.body.trim() === specialistTemplate.current)) {
              toast("Add your observations to the template before posting.");
              return;
            }
            let title = draft.title.trim();
            if (specialistDraft) {
              const business = title.toLocaleLowerCase().startsWith(specialistThreadPrefix.toLocaleLowerCase())
                ? title.slice(specialistThreadPrefix.length).trim() : title;
              if (!business) {
                toast("Add the business name to your discussion title.");
                return;
              }
              title = specialistThreadPrefix + " " + business;
              if (title.length > 160) {
                toast("Shorten the title so it fits with the BMW specialist label (160 characters total).");
                return;
              }
            }
            if (!user?.is_anonymous && !requireAuth()) return;
            setBusy(true);
            const linkedDraft = repairContext ? attachRepairContext(draft, repairContext.topic) : draft;
            const values = {
                title,
                body: linkedDraft.body,
                category: linkedDraft.category,
                template_id: linkedDraft.template,
                starter_topic_id: linkedDraft.starter || null,
                tag_ids: linkedDraft.tags || [],
                model_id: linkedDraft.model || null,
                engine: linkedDraft.engine || null,
                component_id: linkedDraft.component || null,
                part_id: linkedDraft.part || null,
                catalog_position_id: linkedDraft.catalogPosition || null,
                manual_chapter_id: linkedDraft.chapter || null,
                guide_id: linkedDraft.guide || null,
                guide_revision: linkedDraft.guideRevision || null,
                guide_step: linkedDraft.guideStep ? Number(linkedDraft.guideStep) : null,
                journal_update_id: linkedDraft.journal || null,
                article_slug: linkedDraft.article || null,
                diagnostic_slug: linkedDraft.diagnostic || null,
                configuration_revision_id: linkedDraft.referenceRevision || null,
                node_id: linkedDraft.node || null,
                garage_entry_id: linkedDraft.garage || null,
                build_id: linkedDraft.build || null,
                vehicle_configuration: sanitizeVehicle(
                  linkedBuild ? linkedBuild.configuration : linkedGarage
                    ? linkedGarage.configuration
                    : {
                        ...(linkedDraft.model === modelKey(series, vehicle.model)
                          ? vehicle
                          : emptyVehicle),
                        model: displayModel(linkedDraft.model),
                        engine: linkedDraft.engine,
                      },
                ),
                observations: linkedDraft.observations,
              };
            const { data, error } = user?.is_anonymous
              ? await db.rpc("submit_guest_contribution", { payload: values })
              : await db.from("threads").insert(values).select("id").single();
            setBusy(false);
            if (error) toast(error.message);
            else {
              sessionStorage.removeItem(draftStorageKey.current);
              location.href = user?.is_anonymous ? "/account?guest=submitted" :
                seriesHref(communityBoardHref(boardSelection,"/community/" + data.id),composeSeries);
            }
          }}
        >
          <label>
            {repairContext ? repairContext.intent === 'repair-writeup' ? 'Walkthrough title' : 'Comment title' : 'Discussion title'}
            <input
              required
              disabled={!linkReady || busy}
              minLength={8}
              maxLength={160}
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder={specialistDraft ? "BMW specialist: business name and location" : "e.g. M50 temperature rises at idle, returns to normal at speed"}
            />
          </label>
          <label>
            {repairContext?.intent === 'repair-writeup' ? 'Your walkthrough' : repairContext ? 'Your comment or question' : 'Your post'}
            <textarea
              required
              disabled={!linkReady || busy}
              minLength={user?.is_anonymous ? 40 : 20}
              maxLength={20000}
              rows={12}
              value={draft.body}
              onChange={(e) => update("body", e.target.value)}
              placeholder={
                "What you observed\nWhen it happens\nRecent work or changes\nTests already performed and their results\nWhat you’re trying to establish"
              }
            />
          </label>
          {repairContext && <p className="small muted">{repairContext.intent === 'repair-writeup' ? 'Include the tools, time, numbered repair steps, manual references and result. Add links to your process photos or video; credit other people’s originals.' : 'Add a useful detail, a source link, or a specific question. The repair job stays attached to this post.'}</p>}
          <GuestAccess />
          {draft.starter && (
            <Notice>
              Starting from{" "}
              <a href={editorialHref(draft.starter)}>
                {editorials.find((t) => t.slug === draft.starter)?.title}
              </a>
              . Give this thread a title and details specific to your own case.
            </Notice>
          )}
          {!repairContext && (draft.chapter ||
            draft.article ||
            draft.diagnostic ||
            draft.node ||
            draft.garage ||
            draft.journal) && (
            <Notice>
              <strong>Attached reference</strong>
              <p>
                {draft.chapter && (
                  <>
                    Manual chapter{" "}
                    <a href={"/manual/" + draft.chapter}>{draft.chapter}</a> is
                    attached.{" "}
                  </>
                )}
                {draft.journal && "A published journal update is attached. "}
                {draft.garage &&
                  "A shared garage story is attached to this discussion."}
                {draft.article &&
                  articles.find((a) => a.slug === draft.article)?.title}
                {draft.diagnostic &&
                  quickSymptoms.find((s) => s.id === draft.diagnostic)?.title}
                {draft.node &&
                  "Workshop: " +
                    (linkedNode?.name || draft.node) +
                    " · " +
                    draft.referenceRevision}
              </p>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    chapter: "",
                    article: "",
                    diagnostic: "",
                    node: "",
                    referenceRevision: "",
                    garage: "",
      build: "",
                    journal: "",
                    guideRevision: "",
                    guideStep: "",
                  }))
                }
              >
                Remove reference attachment
              </button>
            </Notice>
          )}
          {!repairContext && (draft.part || draft.guide) && (
            <div className="linked-context">
              <LinkIcon size={16} />
              Attached context:{" "}
              {linkedPosition?.source_name ||
                linkedPart?.name ||
                parts.find((p) => p.id === draft.part)?.name ||
                manualGuides.find((g) => g.slug === draft.guide)?.title}
              {draft.guideStep && (
                <span>
                  Step {draft.guideStep} · guide revision{" "}
                  {draft.guideRevision.slice(0, 8)}
                </span>
              )}
              {linkedPart?.number_normalized && (
                <code>{formatPartNumber(linkedPart.number_normalized)}</code>
              )}
              {linkedPosition && (
                <a href={catalogPositionHref(linkedPosition)}>
                  Drawing position {linkedPosition.reference}
                </a>
              )}
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    part: "",
                    catalogPosition: "",
                    guide: "",
                    guideRevision: "",
                    guideStep: "",
                    journal: "",
                  }))
                }
              >
                Remove attachment
              </button>
            </div>
          )}
          {draft.build&&<div className="linked-context"><LinkIcon size={16}/>Attached build: <DocumentLink href={'/builds/'+encodeURIComponent(draft.build)}>{linkedBuild?.title||'Published build'}</DocumentLink><button type="button" className="text-link" onClick={()=>setDraft(d=>({...d,build:''}))}>Remove build attachment</button></div>}
          {linkError && <Notice tone="warning">{linkError}</Notice>}
          <details className="discussion-details">
            <summary>Vehicle, category, tags and templates</summary>
            <div className="discussion-details-fields">
              <div className="form-grid">
                <label>
                  Category
                  <select
                    value={draft.category}
                    disabled={!!repairContext}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        category: e.target.value,
                        template:
                          communityCategories.find((c) => c.name === e.target.value)
                            ?.template || "general",
                      }))
                    }
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{communityBoardLabel(c)}</option>
                    ))}
                  </select>
                </label>
                {seriesEnabled && <label>BMW series<select value={draft.garage ? seriesForModel(draft.model) : composeSeries} disabled={!!draft.garage || !!repairContext} onChange={e => {
                  setComposeSeries(e.target.value as Series);
                  setDraft(d => ({ ...d, model: "", engine: "" }));
                }}>{seriesIds.map(id => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></label>}
                <label>
                  Vehicle model
                  <select
                    value={draft.model}
                    disabled={!!draft.garage}
                    onChange={(e) => update("model", e.target.value)}
                  >
                    <option value="">Not established</option>
                    {seriesDefinitions[draft.garage ? seriesForModel(draft.model) : composeSeries].models.map((m) => (
                      <option key={m.id} value={modelKey(draft.garage ? seriesForModel(draft.model) : composeSeries, m.id)}>{m.id}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Installed engine
                  <input
                    maxLength={50}
                    value={draft.engine}
                    readOnly={!!draft.garage}
                    onChange={(e) => update("engine", e.target.value)}
                    placeholder="e.g. M50TU, or unknown"
                  />
                </label>
                <label>
                  Vehicle system
                  <select
                    value={draft.component}
                    onChange={(e) => update("component", e.target.value)}
                  >
                    <option value="">Not established</option>
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="small muted">
                {
                  communityCategories.find((c) => c.name === draft.category)
                    ?.description
                }
              </p>
              <CommunityTagPicker
                value={draft.tags || []}
                onChange={(tags) => setDraft((d) => ({ ...d, tags }))}
              />
              <div className="discussion-template">
                <label>
                  Post template
                  <select
                    value={draft.template}
                    disabled={!!repairContext}
                    onChange={(e) => update("template", e.target.value)}
                  >
                    {Object.entries(discussionTemplates).map(([id, t]) => (
                      <option value={id} key={id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="button outline"
                  onClick={() => {
                    if (
                      !draft.body.trim() ||
                      confirm("Replace the current post text with this template?")
                    )
                      update("body", templateBody(draft.template));
                  }}
                >
                  Insert template
                </button>
                <p className="small muted">
                  {discussionTemplates[draft.template]?.fields.join(" · ")}
                </p>
              </div>
            </div>
          </details>
          <div className="small muted">
            Draft saved in this tab. Keep VINs and contact details private.
            Publish car photos from your shared garage.
          </div>
          {authReady && !user && (
            <Notice>
              Sign in to publish. Your draft is saved in this tab.
            </Notice>
          )}
          <ContributionNotice/>
          <div className="form-actions">
            <DocumentLink href={backHref} series={backSeries} className="button quiet">
              Cancel
            </DocumentLink>
            <button
              className="button primary"
              disabled={busy || !linkReady || !!linkError}
            >
              {busy ? "Publishing…" : repairContext?.intent === "repair-writeup" ? "Publish my walkthrough" : repairContext ? "Post comment or question" : "Post discussion"}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </form>
        <aside className="question-tips">
          {repairContext ? <><span className="eyebrow">HELP THE NEXT OWNER</span><h3>{repairContext.intent === 'repair-writeup' ? 'Make the fix repeatable' : 'Keep the discussion useful'}</h3><ol><li><strong>Identify your car.</strong><p>Include production date, engine, transmission and relevant modifications.</p></li><li><strong>Show the work.</strong><p>List tools, parts and time. Explain the steps you actually performed and any difficulties.</p></li><li><strong>Link the evidence.</strong><p>Add the manual pages and links to your photos, video or the original guide. Describe any differences on your car.</p></li><li><strong>Report the result.</strong><p>Say what improved, what you checked afterward and what remains unresolved.</p></li></ol></> : specialistDraft?<><span className="eyebrow">RECOMMENDATIONS & CORRECTIONS</span><h3>Help another owner find the right shop</h3><ol><li><strong>Identify the business.</strong><p>Give its official website, city, region and country.</p></li><li><strong>Describe first-hand work.</strong><p>Include the car, the work and the approximate date. Separate your experience from what a business advertises.</p></li><li><strong>Disclose your connection.</strong><p>Say if you own or work for the business, or received an incentive.</p></li><li><strong>Keep corrections specific.</strong><p>Link the source and explain what should change. Keep private documents and personal contact details out of your post.</p></li></ol></>:<><span className="eyebrow">HELP OTHERS HELP YOU</span>
          <h3>Include in your report</h3>
          <ol>
            <li>
              <strong>Identify the car.</strong>
              <p>
                Production date, market, engine and modifications matter more
                than the badge alone.
              </p>
            </li>
            <li>
              <strong>Describe what you observed.</strong>
              <p>
                “Temperature rises at idle” is more useful than “my fan clutch
                is bad.”
              </p>
            </li>
            <li>
              <strong>Separate tests from guesses.</strong>
              <p>Share how you checked it and what happened.</p>
            </li>
            <li>
              <strong>Close the loop.</strong>
              <p>
                Return with the outcome. Mark a useful reply, even when the
                answer needs more work.
              </p>
            </li>
          </ol></>}
        </aside>
      </div>
    </div>
  );
}
export function ThreadPage({id,boardQuery}:{id:string;boardQuery?:Record<string,string|undefined>}) {
  const boardSelection = communityBoardSelection(boardQuery);
  if (id === "new") return <QuestionForm boardSelection={boardSelection}/>;
  return <Discussion key={id} id={id} boardSelection={boardSelection}/>;
}
function Discussion({id,boardSelection}:{id:string;boardSelection:CommunityBoardSelection}) {
  const { user, requireAuth, toast, series } = useApp();
  const { preferences, error: preferenceError } = useCommunityPreferences();
  const [thread, setThread] = useState<DiscussionRecord|null>(null),
    [posts, setPosts] = useState<Reply[]>([]),
    [names, setNames] = useState<Record<string, string>>({}),
    [summaries, setSummaries] = useState<Record<string, AdviceSummary>>({}),
    [feedbackError, setFeedbackError] = useState(""),
    [replyCursor, setReplyCursor] = useState<{
      created_at: string;
      id: string;
    } | null>(null),
    [replyPrevious, setReplyPrevious] = useState<
      ({ created_at: string; id: string } | null)[]
    >([]),
    [replyMore, setReplyMore] = useState(false),
    [focusPost, setFocusPost] = useState<string | null>(()=>typeof location!=="undefined"?new URLSearchParams(location.search).get("reply"):null),
    [replyError, setReplyError] = useState(false),
    [accepted, setAccepted] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [history, setHistory] = useState<{
      type: "thread" | "post";
      target: ContributionSnapshot&{id:string;author_id:string;content_version:number};
    } | null>(null),
    [savingEdit, setSavingEdit] = useState(false),
    [edit, setEdit] = useState<{
      id: string;
      body: string;
      title?: string;
      version: number;
      latest?: { body: string; title?: string; content_version: number };
    } | null>(null);
  const avatars=useGarageAvatars([...(thread?[thread.author_id]:[]),...posts.map(post=>post.author_id)]);
  const postedReply = useRef<string|null>(null);
  useEffect(()=>{
    const id = postedReply.current;
    if (!id || !posts.some(post=>post.id===id)) return;
    document.getElementById('post-'+id)?.scrollIntoView({block:'nearest'});
    postedReply.current = null;
  },[posts]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal,AbortSignal.timeout(12000)]);
    async function get() {
      setError('');
      const t = await db
        .from("threads")
        .select("*,garage:garage_showcases(id,user_id,title)")
        .eq("id", id)
        .abortSignal(signal).maybeSingle();
      if (!active) return;
      if (t.error) {
        setError('The discussion couldn’t load. Try again in a moment.');
        setLoading(false);
        return;
      }
      if (!t.data) {
        setError("This conversation is unavailable.");
        setLoading(false);
        return;
      }
      setThread(t.data);
      const [p, a] = await Promise.all([
        db.rpc("browse_community_replies", {
          discussion: id,
          page_size: 51,
          cursor_created_at: replyCursor?.created_at || null,
          cursor_id: replyCursor?.id || null,
          focus_post: replyCursor ? null : focusPost,
        }).abortSignal(signal),
        db
          .from("accepted_answers")
          .select("post_id")
          .eq("thread_id", id)
          .abortSignal(signal).maybeSingle(),
      ]);
      if (!active) return;
      setReplyError(!!p.error);
      if (p.error) {
        setLoading(false);
        return;
      }
      const replyRows:Reply[] = (p.data || []).slice(0, 50);
      setPosts(replyRows);
      setReplyMore((p.data || []).length > 50);
      setSummaries({});
      setFeedbackError("");
      if (replyRows.length) {
        const feedback = await db.rpc("community_feedback_summary", {
          post_ids: replyRows.map((r) => r.id),
        }).abortSignal(signal);
        if (!active) return;
        if (feedback.error) setFeedbackError(feedback.error.message);
        else
          setSummaries(
            Object.fromEntries(
              (feedback.data || []).map((r: AdviceSummary) => [r.post_id, r]),
            ),
          );
      }
      setAccepted(a.data?.post_id || "");
      const ids = [
        ...new Set([
          t.data.author_id,
          ...replyRows.map((x) => x.author_id),
        ]),
      ];
      const profiles = await db
        .from("profiles")
        .select("id,display_name")
        .in("id", ids).abortSignal(signal);
      if (active) {
        setNames(
          Object.fromEntries(
            (profiles.data || []).map((x) => [x.id, x.display_name]),
          ),
        );
        setLoading(false);
      }
    }
    get();
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, revision, user?.id, replyCursor, focusPost]);
  if (loading)
    return (
      <div className="page">
        <p className="loading-state">Opening the conversation…</p>
      </div>
    );
  if (error || !thread)
    return (
      <div className="page">
        <Empty title="Conversation unavailable">
          {error}
          <DocumentLink className="button outline" href={communityBoardHref(boardSelection)}>
            Back to discussions
          </DocumentLink>
        </Empty>
      </div>
    );
  async function remove(table: string, rid: string) {
    if (
      !confirm(
        "Delete your " +
          (table === "threads" ? "conversation and its replies" : "reply") +
          "?",
      )
    )
      return;
    const { error } = await db.from(table).delete().eq("id", rid);
    if (error) toast(error.message);
    else if (table === "threads") navigateDocument(seriesHref(communityBoardHref(boardSelection),series));
    else setRevision((r) => r + 1);
  }
  const own = thread.author_id === user?.id;
  const repair = repairFromObservations(thread.observations);
  const threadBoard = boardForCategory(thread.category);
  const backToBoard = communityBoardHref(boardSelection.board || boardSelection.tag || boardSelection.q
    ? boardSelection : {...boardSelection,board:threadBoard?.id??''});
  return (
    <div className="page discussion-page">
      <DocumentLink className="back-link" href={backToBoard}>
        <ArrowLeft size={16} />
        Back to discussions
      </DocumentLink>
      {repair && <p className="linked-context"><DocumentLink href={repairOwnerPostsHref(repair)} series={repair.series??'e34'}>Back to repair: {repair.title} <ArrowUpRight size={14}/></DocumentLink></p>}
      <div className="inline-tags">
        <Tag>{communityBoardLabel(thread.category)}</Tag>
        {accepted && <Tag tone="green">ANSWER ACCEPTED BY AUTHOR</Tag>}
      </div>
      <PageIntro
        eyebrow={
          [thread.model_id && displayModel(thread.model_id), thread.engine].filter(Boolean).join(" / ") ||
          "COMMUNITY"
        }
        title={thread.title}
        description={
          "Started by " +
          (names[thread.author_id] || "Member") +
          " · " +
          date(thread.created_at)
        }
      >
        {!thread.locked&&<DocumentLink className="button primary" href="#write-reply"><MessageSquare size={16}/>Reply</DocumentLink>}
        <SaveButton kind="thread" id={id} title={thread.title} />
      </PageIntro>
      {thread.locked && (
        <Notice>
          This discussion is closed to new replies. Use Report for a concern
          that needs staff attention.
        </Notice>
      )}
      {thread.starter_topic_id && (
        <p className="small">
          Started from{" "}
          <a href={editorialHref(thread.starter_topic_id)}>
            {editorials.find((t) => t.slug === thread.starter_topic_id)
              ?.title || "a reference topic"}
          </a>
        </p>
      )}
      <div className="inline-tags">
        {(thread.tag_ids || []).map((tag: string) => (
          <Tag key={tag}>
            {communityTags.find((t) => t.id === tag)?.label || tag}
          </Tag>
        ))}
      </div>
      <div className="discussion-layout">
        <article>
          <div className="original-post">
            <div className="post-author">
              <GarageAvatar className="thread-avatar" name={names[thread.author_id]||'Member'} path={avatars[thread.author_id]}/>
              <strong>{avatars[thread.author_id]
                ? <DocumentLink href={'/garages/'+thread.author_id}>{names[thread.author_id]||'Member'}</DocumentLink>
                : names[thread.author_id]||'Member'}</strong>
              <Tag>THREAD AUTHOR</Tag>
            </div>
            <p className="post-body"><LinkedText text={thread.body}/></p>
            <div className="post-actions">
              <button
                className="text-link muted"
                onClick={() => setHistory({ type: "thread", target: thread })}
              >
                <History size={13} />
                History · v{thread.content_version}
              </button>
              <ReportButton type="thread" id={id} />
              <MemberControls
                id={thread.author_id}
                name={names[thread.author_id] || "Member"}
              />
              {own && (
                <>
                  <button
                    className="text-link"
                    onClick={() =>
                      setEdit({
                        id,
                        body: thread.body,
                        title: thread.title,
                        version: thread.content_version,
                      })
                    }
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    className="text-link"
                    onClick={() => remove("threads", id)}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="section-heading reply-heading">
            <h2>Replies</h2>
          </div>
          {replyError&&<Notice tone="warning">Replies couldn’t load. <button
            className="text-link" type="button" onClick={()=>setRevision(value=>value+1)}>Try again</button></Notice>}
          {preferenceError && (
            <Notice tone="warning">
              Member preferences could not load: {preferenceError}
            </Notice>
          )}
          {posts.some((p) =>
            preferences.some((m) => m.target_user_id === p.author_id),
          ) && (
            <p className="small muted">
              Some replies are hidden by your member preferences.{" "}
              <DocumentLink href="/community/settings">Manage preferences</DocumentLink>
            </p>
          )}
          {feedbackError && (
            <Notice tone="warning">
              Feedback could not load: {feedbackError}
            </Notice>
          )}
          <div className="reply-list">
            {posts
              .filter(
                (p) =>
                  !preferences.some((m) => m.target_user_id === p.author_id),
              )
              .map((p) => (
                <section
                  key={p.id}
                  id={"post-" + p.id}
                  className={accepted === p.id ? "reply accepted" : "reply"}
                >
                  <div className="post-author">
                    <GarageAvatar className="thread-avatar" name={names[p.author_id]||'Member'} path={avatars[p.author_id]}/>
                    <strong>{avatars[p.author_id]
                      ? <DocumentLink href={'/garages/'+p.author_id}>{names[p.author_id]||'Member'}</DocumentLink>
                      : names[p.author_id]||'Member'}</strong>
                    <small>{date(p.created_at)}</small>
                    {accepted === p.id && (
                      <Tag tone="green">
                        <CheckCircle2 size={12} />
                        Author accepted
                      </Tag>
                    )}
                  </div>
                  {p.in_reply_to_post_id && (
                    <DocumentLink
                      className="reply-parent small"
                      href={communityReplyHref(id,p.in_reply_to_post_id,boardSelection)}
                    >
                      View the reply this answers <ArrowUpRight size={14}/>
                    </DocumentLink>
                  )}
                  <p className="post-body"><LinkedText text={p.body}/></p>
                  <AdviceFeedback
                    post={p}
                    summary={summaries[p.id]}
                    onChanged={() => setRevision((r) => r + 1)}
                  />
                  <div className="post-actions">
                    <button
                      className="text-link muted"
                      onClick={() => setHistory({ type: "post", target: p })}
                    >
                      <History size={13} />
                      History · v{p.content_version}
                    </button>
                    <ReportButton type="post" id={p.id} />
                    <ShareControls
                      title={thread.title}
                      copyLabel="Copy reply link"
                      href={seriesHref(communityReplyHref(id,p.id,boardSelection),series)}
                    />
                    <ProposeReview post={p} />
                    <MemberControls
                      id={p.author_id}
                      name={names[p.author_id] || "Member"}
                    />
                    {own && (
                      <button
                        className="text-link"
                        onClick={async () => {
                          const { error } =
                            accepted === p.id
                              ? await db
                                  .from("accepted_answers")
                                  .delete()
                                  .eq("thread_id", id)
                              : await db.from("accepted_answers").upsert(
                                  {
                                    thread_id: id,
                                    post_id: p.id,
                                    accepted_by: user!.id,
                                  },
                                  { onConflict: "thread_id" },
                                );
                          if (error) toast(error.message);
                          else {
                            toast(
                              accepted === p.id
                                ? "Accepted answer removed."
                                : "Answer marked as accepted by you.",
                            );
                            setRevision((r) => r + 1);
                          }
                        }}
                      >
                        <Check size={14} />
                        {accepted === p.id
                          ? "Unmark answer"
                          : "Accept this answer"}
                      </button>
                    )}
                    {p.author_id === user?.id && (
                      <>
                        <button
                          className="text-link"
                          onClick={() =>
                            setEdit({
                              id: p.id,
                              body: p.body,
                              version: p.content_version,
                            })
                          }
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          className="text-link"
                          onClick={() => remove("posts", p.id)}
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </section>
              ))}
          </div>
          <div className="reply-pagination">
            <button
              className="button outline"
              disabled={!replyPrevious.length && !focusPost}
              onClick={() => {
                setFocusPost(null);
                setReplyCursor(replyPrevious[replyPrevious.length - 1] || null);
                setReplyPrevious((p) => p.slice(0, -1));
              }}
            >
              Earlier replies
            </button>
            <span className="small muted">Up to 50 replies per page</span>
            <button
              className="button outline"
              disabled={!replyMore}
              onClick={() => {
                const last = posts[posts.length - 1];
                setReplyPrevious((p) => [...p, replyCursor]);
                setReplyCursor({ created_at: last.created_at, id: last.id });
              }}
            >
              Later replies
            </button>
          </div>
          {!thread.locked && (
            <form
              id="write-reply"
              className="reply-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user?.is_anonymous && !requireAuth()) return;
                setBusy(true);
                const { data, error } = user?.is_anonymous
                  ? await db.rpc("submit_guest_contribution", { payload: { body }, target_thread: id })
                  : await db.from("posts").insert({ thread_id: id, body }).select("id").single();
                setBusy(false);
                if (error) toast(error.message);
                else {
                  setBody("");
                  if (user?.is_anonymous) toast("Reply submitted for moderator review. Track it in Your guest submissions.");
                  else {
                    if (replyMore || posts.length>=50) {
                      setReplyCursor(null);
                      setReplyPrevious([]);
                      setFocusPost(data.id);
                    }
                    postedReply.current = data.id;
                    toast('Reply posted.');
                  }
                  setRevision((r) => r + 1);
                }
              }}
            >
              <GuestAccess />
              <label>
                Your reply
                <textarea
                  rows={6}
                  required
                  minLength={user?.is_anonymous ? 40 : 2}
                  maxLength={20000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share a test, an observation or a source. Explain which configuration it applies to."
                />
              </label>
              <button className="button primary" disabled={busy}>
                {busy ? "Posting…" : "Post reply"}
                <Send size={16} />
              </button>
            </form>
          )}
        </article>
        <aside className="thread-context">
          <span className="eyebrow">VEHICLE & REFERENCES</span>
          <h3>{thread.model_id ? displayModel(thread.model_id) : "Model unknown"}</h3>
          <dl>
            <dt>Engine</dt>
            <dd>{thread.engine || "Not established"}</dd>
            <dt>System</dt>
            <dd>
              {systems.find((s) => s.id === thread.component_id)?.name ||
                "Not established"}
            </dd>
            <dt>Production</dt>
            <dd>
              {[
                thread.vehicle_configuration?.year,
                thread.vehicle_configuration?.month,
              ]
                .filter(Boolean)
                .join("-") || "Not established"}
            </dd>
            <dt>Market</dt>
            <dd>{thread.vehicle_configuration?.market || "Not established"}</dd>
            <dt>Body / transmission</dt>
            <dd>
              {[
                thread.vehicle_configuration?.body,
                thread.vehicle_configuration?.transmission,
              ]
                .filter(Boolean)
                .join(" / ") || "Not established"}
            </dd>
          </dl>
          {thread.article_slug && (
            <a href={"/articles/" + thread.article_slug}>
              Linked technical article <ArrowUpRight size={15} />
            </a>
          )}
          {thread.garage && (
            <a
              href={
                "/garages/" + thread.garage.user_id + "/" + thread.garage.id
              }
            >
              {thread.garage.title} · Garage story <ArrowUpRight size={15} />
            </a>
          )}
          {thread.diagnostic_slug && (
            <a
              href={
                "/diagnostics?symptom=" +
                encodeURIComponent(thread.diagnostic_slug)
              }
            >
              Linked diagnostic flow <ArrowUpRight size={15} />
            </a>
          )}
          {thread.node_id && (
            <a
              href={
                "/workshop?" +
                new URLSearchParams({
                  node: thread.node_id,
                  configuration_revision: thread.configuration_revision_id||"",
                }).toString()
              }
            >
              Linked workshop component & revision <ArrowUpRight size={15} />
            </a>
          )}
          {thread.part_id && (
            <a
              href={
                thread.catalog_position_id
                  ? "/parts/catalog?position=" +
                    encodeURIComponent(thread.catalog_position_id)
                  : "/parts/catalog?part=" + encodeURIComponent(thread.part_id)
              }
            >
              {thread.catalog_position_id
                ? "Open linked drawing position"
                : "Open linked component"}
              <ArrowUpRight size={15} />
            </a>
          )}
          {thread.guide_id && (
            <a
              href={
                "/guides/" +
                thread.guide_id +
                (thread.guide_revision
                  ? "?revision=" + thread.guide_revision
                  : "") +
                (thread.guide_step ? "#guide-step-" + thread.guide_step : "")
              }
            >
              {thread.guide_step
                ? "Read walkthrough · Step " + thread.guide_step
                : "Read linked guide"}
              <ArrowUpRight size={15} />
            </a>
          )}
          {thread.build_id&&<a className="button outline" href={"/builds/"+thread.build_id}>Related public build ↗</a>}
          {thread.journal_update_id && thread.garage && (
            <a
              href={
                "/garages/" +
                thread.garage.user_id +
                "/" +
                thread.garage.id +
                "#journal-" +
                thread.journal_update_id
              }
            >
              Read linked journal update <ArrowUpRight size={15} />
            </a>
          )}
          {thread.manual_chapter_id && (
            <a href={"/manual/" + thread.manual_chapter_id}>
              Manual chapter {thread.manual_chapter_id} ↗
            </a>
          )}
          {thread.guide_revision && (
            <p className="small muted">
              Guide revision {thread.guide_revision.slice(0, 8)} · step context
              preserved from the original question.
            </p>
          )}
          <DocumentLink href="/diagnostics">
            Start a structured investigation
            <ArrowUpRight size={15} />
          </DocumentLink>
          <p className="small muted">
            Community advice may be incomplete. An accepted answer is not
            independent technical verification.
          </p>
        </aside>
      </div>
      {history && (
        <RevisionHistory
          type={history.type}
          id={history.target.id}
          current={history.target}
          onClose={() => setHistory(null)}
          onEdit={
            history.target.author_id === user?.id
              ? (snapshot) => {
                  setEdit({
                    id: history.target.id,
                    body: snapshot.body,
                    ...(history.type === "thread"
                      ? { title: snapshot.title }
                      : {}),
                    version: history.target.content_version,
                  });
                  setHistory(null);
                }
              : undefined
          }
        />
      )}
      {edit && (
        <Modal title="Edit your contribution" onClose={() => setEdit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (savingEdit || edit.latest) return;
              setSavingEdit(true);
              const isThread = edit.title !== undefined;
              const table = isThread ? "threads" : "posts";
              const { data, error } = await db
                .from(table)
                .update({
                  body: edit.body,
                  ...(isThread ? { title: edit.title } : {}),
                })
                .eq("id", edit.id)
                .eq("content_version", edit.version)
                .select("id");
              setSavingEdit(false);
              if (error) toast(error.message);
              else if (!data?.length) {
                const latest = await db
                  .from(table)
                  .select("body,content_version" + (isThread ? ",title" : ""))
                  .eq("id", edit.id)
                  .maybeSingle();
                if (latest.error || !latest.data)
                  toast(
                    "This contribution is no longer available. Your text is still in the editor.",
                  );
                else
                  setEdit({
                    ...edit,
                    latest: latest.data as unknown as {
                      body: string;
                      title?: string;
                      content_version: number;
                    },
                  });
              } else {
                setEdit(null);
                setRevision((r) => r + 1);
              }
            }}
          >
            {edit.latest && (
              <Notice tone="warning">
                Another edit was saved while this editor was open. Your text is
                still here. Review version {edit.latest.content_version} before
                saving.
                <details>
                  <summary>Read the latest saved text</summary>
                  {edit.latest.title && <strong>{edit.latest.title}</strong>}
                  <p className="post-body"><LinkedText text={edit.latest.body}/></p>
                </details>
                <button
                  type="button"
                  className="button outline"
                  onClick={() =>
                    setEdit({
                      ...edit,
                      version: edit.latest!.content_version,
                      latest: undefined,
                    })
                  }
                >
                  Keep my text and use v{edit.latest.content_version} as the
                  base
                </button>
              </Notice>
            )}
            {edit.title !== undefined && (
              <label>
                Title
                <input
                  minLength={8}
                  maxLength={160}
                  required
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </label>
            )}
            <label>
              Body
              <textarea
                required
                minLength={edit.title !== undefined ? 20 : 2}
                maxLength={20000}
                rows={8}
                value={edit.body}
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
              />
            </label>
            <p className="small muted">
              Saving creates a new recorded version. Earlier text stays in the
              contribution history.
            </p>
            <button
              className="button primary"
              disabled={savingEdit || !!edit.latest}
            >
              {savingEdit ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
