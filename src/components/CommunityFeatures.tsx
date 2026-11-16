"use client";
import { DocumentLink } from "./DocumentLink";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  MessageSquare,
  ThumbsUp,
  MessageSquareWarning,
  Search,
} from "lucide-react";
import { db, useApp } from "./context";
import { Modal, Notice, PageIntro, Tag, Empty } from "./common";
import {
  communityCategories,
  communitySources,
  communityTags,
  editorials,
  editorialHref,
  starterHref,
  feedbackReasons,
} from "../community/content";
import { articles } from "../data/catalog";
import { manualGuides } from "../data/manual";
import { CatalogPartField, type PartIdentity } from "./CatalogPartField";

export function CommunityTagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  return (
    <fieldset className="community-tag-picker">
      <legend>
        Tags <span className="small muted">Optional · up to 12</span>
      </legend>
      <div>
        {value.map((id) => (
          <button
            key={id}
            type="button"
            className="tag"
            onClick={() => onChange(value.filter((x) => x !== id))}
          >
            {communityTags.find((t) => t.id === id)?.label || id} ×
            <span className="sr-only">Remove tag</span>
          </button>
        ))}
      </div>
      <label className="small">
        Add a tag
        <select
          value=""
          disabled={value.length >= 12}
          onChange={(e) => {
            if (e.target.value && !value.includes(e.target.value))
              onChange([...value, e.target.value]);
          }}
        >
          <option value="">Model, engine, symptom or system…</option>
          {[...new Set(communityTags.map((t) => t.family))].map((f) => (
            <optgroup label={f} key={f}>
              {communityTags
                .filter((t) => t.family === f && !value.includes(t.id))
                .map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <p className="small muted">
        Technical-review status is assigned through review, not by a posting
        tag.
      </p>
    </fieldset>
  );
}

export function ProposeReview({
  post,
}: {
  post: { id: string; content_version: number };
}) {
  const { requireAuth, toast } = useApp();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [kind, setKind] = useState("guide"),
    [partQuery, setPartQuery] = useState(""),
    [part, setPart] = useState<PartIdentity | null>(null),
    [error, setError] = useState("");
  return (
    <>
      <button
        className="text-link muted"
        onClick={() => {
          if (requireAuth()) setOpen(true);
        }}
      >
        Request technical review
      </button>
      {open && (
        <Modal
          title="Propose a reference correction"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>
            This submits comment version {post.content_version} with your
            evidence to the existing review desk. It does not publish a guide or
            mark the advice verified.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              const result = await db.rpc("propose_comment_for_review", {
                source_post: post.id,
                expected_version: post.content_version,
                target_kind: kind,
                target_identity:
                  kind === "guide"
                    ? String(f.get("guide"))
                    : kind === "article"
                      ? String(f.get("article"))
                      : part?.id,
                proposal: String(f.get("proposal")),
                source_url: String(f.get("source") || "") || null,
              });
              setBusy(false);
              if (result.error) setError(result.error.message);
              else {
                setOpen(false);
                toast("Submitted to the technical review desk.");
              }
            }}
          >
            <label>
              Reference type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="guide">Repair / inspection guide</option>
                <option value="part">Canonical part</option>
                <option value="article">Technical article</option>
              </select>
            </label>
            {kind === "guide" ? (
              <label>
                Guide
                <select name="guide" required>
                  <option value="">Choose a guide</option>
                  {manualGuides.map((g) => (
                    <option key={g.slug} value={g.slug}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : kind === "article" ? (
              <label>
                Article
                <select name="article" required>
                  <option value="">Choose an article</option>
                  {articles.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <CatalogPartField
                value={partQuery}
                selected={part}
                onChange={(v) => {
                  setPartQuery(v);
                  setPart(null);
                }}
                onSelect={(p) => {
                  setPart(p);
                  setPartQuery(p.name);
                }}
              />
            )}
            <label>
              Proposed correction and applicability
              <textarea
                name="proposal"
                required
                minLength={20}
                maxLength={12000}
                rows={5}
              />
            </label>
            <label>
              Evidence URL (optional)
              <input
                name="source"
                type="url"
                pattern="https://.*"
                placeholder="https://…"
              />
            </label>
            {error && <Notice tone="warning">{error}</Notice>}
            <button
              className="button primary"
              disabled={busy || (kind === "part" && !part)}
            >
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export type AdviceSummary = {
  post_id: string;
  helpful: number;
  bad_advice: number;
  my_vote: string | null;
  explanation_post_id: string | null;
};
export function AdviceFeedback({
  post,
  summary,
  onChanged,
}: {
  post: {
    id: string;
    thread_id: string;
    author_id: string;
    content_version: number;
    hidden?: boolean;
  };
  summary?: AdviceSummary;
  onChanged: () => void;
}) {
  const { user, requireAuth, toast } = useApp();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const own = post.author_id === user?.id;
  const explanationHref =
    "/community/" +
    post.thread_id +
    "?reply=" +
    summary?.explanation_post_id +
    "#post-" +
    summary?.explanation_post_id;
  async function vote(
    value: string,
    explanation = "",
    reason: string | null = null,
  ) {
    if (!requireAuth()) return;
    setBusy(true);
    setError("");
    const result = await db.rpc("set_community_feedback", {
      target_post: post.id,
      expected_version: post.content_version,
      feedback_value: value,
      explanation,
      reason,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      if (!open) toast(result.error.message);
      return;
    }
    setOpen(false);
    onChanged();
    toast(
      value === "bad-advice"
        ? "Your explanation was posted and linked to this advice."
        : value === "remove"
          ? "Feedback removed. Any explanation you posted remains in the discussion."
          : "Marked helpful.",
    );
  }
  return (
    <div className="advice-feedback">
      <div
        className="feedback-buttons"
        role="group"
        aria-label="Rate this advice"
      >
        <button
          className={
            summary?.my_vote === "helpful" ? "active helpful" : "helpful"
          }
          disabled={busy || own || post.hidden || !summary}
          aria-pressed={summary?.my_vote === "helpful"}
          title={own ? "You cannot rate your own advice" : undefined}
          onClick={() =>
            vote(summary?.my_vote === "helpful" ? "remove" : "helpful")
          }
        >
          <ThumbsUp size={15} />
          Helpful <span>{summary?.helpful ?? "—"}</span>
        </button>
        <button
          className={
            summary?.my_vote === "bad-advice" ? "active concern" : "concern"
          }
          disabled={busy || own || post.hidden || !summary}
          aria-pressed={summary?.my_vote === "bad-advice"}
          onClick={() => {
            if (requireAuth()) {
              setError("");
              setOpen(true);
            }
          }}
        >
          <MessageSquareWarning size={15} />
          Bad advice <span>{summary?.bad_advice ?? "—"}</span>
        </button>
      </div>
      {summary?.my_vote === "bad-advice" && (
        <span className="small">
          <a href={explanationHref}>Your explanation</a> ·{" "}
          <button
            className="text-link"
            disabled={busy}
            onClick={() => vote("remove")}
          >
            Remove vote
          </button>
        </span>
      )}
      {own && (
        <span className="small muted">
          Your comment · v{post.content_version}
        </span>
      )}
      {open && (
        <Modal
          title="Explain the concern"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>
            Identify the claim, explain which configuration it affects, and give
            a correction, source or test that would help. Your explanation will
            be posted as a public reply linked to this comment.
          </p>
          {summary?.my_vote === "bad-advice" ? (
            <>
              <Notice>
                You already explained this vote. Open your reply to edit it, or
                remove the vote before submitting a different explanation.
              </Notice>
              <a
                className="button outline"
                href={explanationHref}
                onClick={() => setOpen(false)}
              >
                Open your explanation
              </a>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                vote(
                  "bad-advice",
                  String(f.get("explanation")),
                  String(f.get("reason")),
                );
              }}
            >
              <label>
                What is the concern?
                <select name="reason" required>
                  <option value="">Choose a reason</option>
                  {feedbackReasons.map(([id, label]) => (
                    <option value={id} key={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Explanation
                <textarea
                  name="explanation"
                  required
                  minLength={40}
                  maxLength={6000}
                  rows={7}
                  placeholder="The claim I’m concerned about is… It applies differently to… The source or test that would help is…"
                />
              </label>
              <p className="small muted">
                Address the information and the evidence. Use Report for abuse
                or private information. Feedback applies to version{" "}
                {post.content_version}.
              </p>
              {error && <Notice tone="warning">{error}</Notice>}
              <button disabled={busy} className="button primary">
                {busy ? "Posting…" : "Post explanation & mark Bad advice"}
              </button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

type RankedComment = {
  post_id: string;
  thread_id: string;
  thread_title: string;
  body: string;
  display_name: string;
  helpful: number;
  bad_advice: number;
  content_version: number;
};
export function TopHelpfulComments() {
  const [rows, setRows] = useState<RankedComment[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    db.rpc("top_helpful_comments").then(({ data, error }) => {
      if (active) {
        setRows(data || []);
        setError(error?.message || "");
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="helpful-feature" aria-labelledby="helpful-heading">
      <div className="feature-heading">
        <ThumbsUp size={20} />
        <div>
          <span className="eyebrow">MEMBER RECOMMENDATIONS</span>
          <h2 id="helpful-heading">Five most helpful comments</h2>
        </div>
      </div>
      <p className="small muted">
        Ranked by Helpful votes on the current comment version. Member feedback
        is separate from technical review.
      </p>
      {error ? (
        <Notice tone="warning">Helpful comments could not load: {error}</Notice>
      ) : loading ? (
        <p role="status">Loading member recommendations…</p>
      ) : rows.length ? (
        <ol className="helpful-ranking">
          {rows.map((row, i) => (
            <li key={row.post_id}>
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              <a
                href={
                  "/community/" +
                  row.thread_id +
                  "?reply=" +
                  row.post_id +
                  "#post-" +
                  row.post_id
                }
              >
                <h3>{row.thread_title}</h3>
                <p>{row.body}</p>
                <small>
                  {row.display_name} · {row.helpful} helpful
                  {row.bad_advice
                    ? " · " + row.bad_advice + " bad-advice concerns"
                    : ""}{" "}
                  · v{row.content_version}
                </small>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <div className="ranking-empty">
          <MessageSquare size={25} />
          <h3>The first recommendations will come from members.</h3>
          <p>
            When a reply helps you, mark it Helpful. Up to five comments will
            appear here as votes are cast.
          </p>
          <DocumentLink href="/community/new" className="text-link">
            Start a discussion <ArrowUpRight size={14} />
          </DocumentLink>
        </div>
      )}
    </section>
  );
}

export function EditorialLibrary({ issues = false }: { issues?: boolean }) {
  const [category, setCategory] = useState(""),
    [q, setQ] = useState("");
  const base = issues
    ? editorials.filter((t) => t.kind !== "resource")
    : editorials;
  const rows = base.filter(
    (t) =>
      (!category || t.category === category) &&
      (!q ||
        [t.title, t.summary, ...t.paragraphs]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
  return (
    <div className="page editorial-library">
      <DocumentLink href="/community" className="back-link">
        ← Community
      </DocumentLink>
      <PageIntro
        eyebrow={
          issues
            ? "SOURCE NOTES & REPAIR QUESTIONS"
            : "THE COMMUNITY RESOURCE LIBRARY"
        }
        title={
          issues ? "Known issues & manual clarifications." : "Topics & repair references."
        }
        description={
          issues
            ? "Repair questions and service-manual clarifications. Each topic links its sources and notes where more information is needed."
            : "Recurring problems, repair references and owner topics. Open a topic, then ask a question about your own car."
        }
      >
        {!issues&&<DocumentLink href="/community/issues" className="button outline">Known issues & manual clarifications <ArrowUpRight size={16}/></DocumentLink>}
      </PageIntro>
      <div className="editorial-scope">
        <BookOpen size={18} />
        <p>
          <strong>E34 Lore reference · Updated 5 November 2026</strong>
          <br />
          Read the references, then start a discussion with details from your car.
          {issues &&
            " Inspection topics do not establish how often a fault occurs."}
        </p>
      </div>
      <div className="community-library-controls">
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {communityCategories.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          Find a resource
          <div className="input-icon">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cooling, no-start, part numbers…"
            />
          </div>
        </label>
        <span className="small muted" role="status">
          {rows.length} {rows.length === 1 ? "resource" : "resources"}
        </span>
      </div>
      <div className="editorial-cards">
        {rows.map((t) => (
          <a key={t.slug} href={editorialHref(t.slug)}>
            <span className="eyebrow">
              {t.kind === "manual-clarification"
                ? "MANUAL CLARIFICATION"
                : t.kind === "known-issue"
                  ? "INSPECTION TOPIC"
                  : "EDITORIAL RESOURCE"}
            </span>
            <h2>{t.title}</h2>
            <p>{t.summary}</p>
            <small>{t.category}</small>
            <ArrowUpRight size={18} />
          </a>
        ))}
      </div>
      {!rows.length && (
        <Empty title="No matching resources">
          Try another category or a shorter search.
        </Empty>
      )}
      {!issues&&<TopHelpfulComments />}
    </div>
  );
}

export function EditorialTopic({ slug }: { slug: string }) {
  const topic = editorials.find((t) => t.slug === slug);
  const [threads, setThreads] = useState<{ id: string; title: string }[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (!topic) return;
    let active = true;
    db.rpc("browse_community", { starter_filter: topic.slug, page_size: 6 })
      .select("id,title")
      .then(({ data, error }) => {
        if (active) {
          setThreads(Array.isArray(data) ? data : []);
          setError(error?.message || "");
        }
      });
    return () => {
      active = false;
    };
  }, [topic]);
  if (!topic)
    return (
      <div className="page">
        <Empty title="Resource not found">
          <DocumentLink href="/community/topics">Browse reference topics</DocumentLink>
        </Empty>
      </div>
    );
  return (
    <div className="page editorial-topic">
      <DocumentLink href="/community/topics" className="back-link">
        ← Resource library
      </DocumentLink>
      <PageIntro
        eyebrow={topic.category}
        title={topic.title}
        description={topic.summary}
      />
      <div className="discussion-layout">
        <article>
          <div className="editorial-byline">
            <BookOpen size={18} />
            <span>E34 Lore · Updated 5 November 2026</span>
            <Tag>{topic.kind.replaceAll("-", " ")}</Tag>
          </div>
          {topic.paragraphs.map((p, i) => (
            <p className="editorial-paragraph" key={i}>
              {p}
            </p>
          ))}
          <section className="editorial-prompts">
            <h2>Bring your own case</h2>
            <p>
              Use these questions to start a thread about the actual
              configuration, evidence and outcome.
            </p>
            <ol>
              {topic.prompts.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
            <a className="button primary" href={starterHref(topic)}>
              Start your own discussion <ArrowUpRight size={16} />
            </a>
          </section>
          <section className="editorial-related">
            <h2>Member discussions</h2>
            {error ? (
              <Notice tone="warning">{error}</Notice>
            ) : threads.length ? (
              threads.map((t) => (
                <a key={t.id} href={"/community/" + t.id}>
                  {t.title}
                  <ArrowUpRight size={15} />
                </a>
              ))
            ) : (
              <p>
                No member discussions linked yet. Your question can be the
                first.
              </p>
            )}
          </section>
        </article>
        <aside className="thread-context">
          <span className="eyebrow">SOURCE & STATUS</span>
          <h3>About this topic</h3>
          <p>
            Owner reports, accepted answers and member votes remain separate
            from technical verification.
          </p>
          <h3>References</h3>
          {topic.sources.length ? (
            topic.sources.map((id) => {
              const s = communitySources[id];
              return (
                <a
                  key={id}
                  href={s.href}
                  {...(s.href.startsWith("https:")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {s.label}
                  <ArrowUpRight size={14} />
                </a>
              );
            })
          ) : (
            <p>
              Original community guidance. No technical repair claim is
              established by this entry.
            </p>
          )}
          <DocumentLink href="/community/topics/manual-clarification-method">
            Submit a source clarification <ArrowUpRight size={14} />
          </DocumentLink>
        </aside>
      </div>
    </div>
  );
}
