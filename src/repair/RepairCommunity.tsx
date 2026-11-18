"use client";
import { useEffect, useState } from 'react';
import { ArrowUpRight, MessageSquare, PenLine } from 'lucide-react';
import { db, useApp } from '../components/context';
import { useCommunityPreferences } from '../components/CommunityGovernance';
import { LinkedText } from '../components/LinkedText';
import { DocumentLink } from '../components/DocumentLink';
import { repairContributionHref, repairObservationFilter } from './community';
import type { RepairTopic } from './library';

type Contribution = { id: string; title: string; body: string; template_id: string; author_id: string; created_at: string; model_id: string | null; engine: string | null };
type Snapshot = { key: string; cursorKey: string; rows: Contribution[]; names: Record<string, string>; more: boolean; error: boolean };
/** Uses the existing public threads and their moderation policies. No parallel comments store. */
export function RepairCommunity({ topic }: { topic: RepairTopic }) {
  const { user } = useApp();
  const { preferences } = useCommunityPreferences();
  const excluded = preferences.map(p => p.target_user_id).filter(id => /^[a-f0-9-]{36}$/i.test(id)).sort().join(',');
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<Snapshot | null>(null);
  const [pageCursor, setPageCursor] = useState<{ key: string; cursor: { created_at: string; id: string } } | null>(null);
  const key = topic.id + '|' + (topic.guide || '') + '|' + refresh + '|' + (user?.id || '') + '|' + excluded;
  const current = result?.key === key ? result : null;
  const cursor = pageCursor?.key === key ? pageCursor.cursor : null;
  const cursorKey = cursor?.id || 'first';
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]);
    async function read() {
      try {
        let query = db.from('threads').select('id,title,body,template_id,author_id,created_at,model_id,engine');
        query = topic.guide ? query.eq('guide_id', topic.guide) : query.contains('observations', repairObservationFilter(topic));
        if (excluded) query = query.not('author_id', 'in', '(' + excluded + ')');
        if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
        const response = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(21).abortSignal(signal);
        if (response.error) throw response.error;
        const rows = (response.data || []).slice(0, 20) as Contribution[];
        const authors = [...new Set(rows.map(row => row.author_id))];
        const profiles = authors.length ? await db.from('profiles').select('id,display_name').in('id', authors).abortSignal(signal) : null;
        if (profiles?.error) throw profiles.error;
        if (active) setResult(previous => ({ key, cursorKey,
          rows: cursor && previous?.key === key ? [...previous.rows, ...rows.filter(row => !previous.rows.some(old => old.id === row.id))] : rows,
          names: { ...(cursor && previous?.key === key ? previous.names : {}), ...Object.fromEntries((profiles?.data || []).map(p => [p.id, p.display_name])) },
          more: (response.data || []).length > 20, error: false }));
      } catch { if (active) setResult(previous => ({ key, cursorKey, rows: previous?.key === key ? previous.rows : [], names: previous?.key === key ? previous.names : {}, more: !!cursor, error: true })); }
    }
    void read();
    return () => { active = false; controller.abort(); };
  }, [key, topic, cursor, cursorKey, excluded]);
  const writeups = current?.rows.filter(row => row.template_id === 'repair') || [];
  const comments = current?.rows.filter(row => row.template_id !== 'repair') || [];
  function contribution(row: Contribution) {
    return <article className="repair-member-post" key={row.id}>
      <div className="small muted">{current?.names[row.author_id] || 'Member'} · {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{[row.model_id, row.engine].filter(Boolean).length > 0 && ' · ' + [row.model_id, row.engine].filter(Boolean).join(' / ')}</div>
      <h4><DocumentLink href={'/community/' + row.id}>{row.title}</DocumentLink></h4>
      <div className="repair-post-excerpt"><LinkedText text={row.body.slice(0, 1200) + (row.body.length > 1200 ? '\n…' : '')}/></div>
      <DocumentLink className="text-link" href={'/community/' + row.id}>Read and reply <ArrowUpRight size={14}/></DocumentLink>
    </article>;
  }
  return <section className="repair-community" id="owner-experience" aria-label="Owner walkthroughs and comments">
    <div className="section-heading"><h2>Owner walkthroughs & comments</h2></div>
    <div className="inline-tags">
      <DocumentLink className="button primary" href={repairContributionHref(topic, 'repair-writeup')}><PenLine size={16}/>Add my walkthrough</DocumentLink>
      <DocumentLink className="button outline" href={repairContributionHref(topic, 'repair-comment')}><MessageSquare size={16}/>Post a question, tip or correction</DocumentLink>
    </div>
    {current?.error && <div role="status"><p>Owner posts couldn’t load. Try again, or use the buttons above to start a draft.</p><button className="button outline" onClick={() => { setPageCursor(null); setRefresh(n => n + 1); }}>Retry owner posts</button></div>}
    {!current ? <p role="status">Loading owner posts…</p> : !current.error || current.rows.length > 0 ? <>
      <h3>Owner walkthroughs</h3>
      {writeups.length ? writeups.map(contribution) : <p className="muted">{current.more ? 'No walkthroughs in the posts loaded so far. Load more posts below.' : 'No owner walkthrough has been shared for this job yet. Add your tools, time, steps, photo links and result.'}</p>}
      <h3>Comments, tips & questions</h3>
      {comments.length ? comments.map(contribution) : <p className="muted">{current.more ? 'No comments in the posts loaded so far. Load more posts below.' : 'No comments linked to this job yet.'}</p>}
      {current.more && !current.error && <button className="button outline" disabled={current.cursorKey !== cursorKey} onClick={() => { const last = current.rows.at(-1); if (last) setPageCursor({ key, cursor: { created_at: last.created_at, id: last.id } }); }}>{current.cursorKey !== cursorKey ? 'Loading more…' : 'Load more owner posts'}</button>}
    </> : null}
    <p className="small muted">Check the vehicle and source before following a member’s repair.</p>
  </section>;
}
