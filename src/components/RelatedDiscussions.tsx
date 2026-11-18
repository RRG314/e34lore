"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { db } from "./context";
import { DocumentLink } from './DocumentLink';
import {ExternalSourceLinks} from '../references/ExternalSourceLinks';
import type {ReferenceTarget} from '../references/context';
export function RelatedDiscussions({
  kind,
  id,
  revision,
  related,
  referenceId,
}: {
  kind:
    | "part"
    | "guide"
    | "model"
    | "component"
    | "article"
    | "diagnostic"
    | "node"
    | "garage"
    | "journal"
    | "build";
  id: string;
  revision?: string;
  related?: ReferenceTarget[];
  referenceId?:string;
}) {
  const queryKey=kind+'|'+id+'|'+(revision||'');
  const [result,setResult]=useState<{key:string;rows:{id:string;title:string;accepted_answers?:{post_id:string}[]}[];error:boolean}|null>(null);
  const current=result?.key===queryKey?result:null;
  const rows=current?.rows||[],error=current?.error;
  useEffect(() => {
    let active = true;
    const abort=new AbortController();
    let query = db
      .from("threads")
      .select("id,title,accepted_answers(post_id)")
      .eq(
        {
          part: "part_id",
          guide: "guide_id",
          model: "model_id",
          component: "component_id",
          article: "article_slug",
          diagnostic: "diagnostic_slug",
          node: "node_id",
          garage: "garage_entry_id",
          journal: "journal_update_id",
          build: "build_id",
        }[kind],
        id,
      );
    if (kind === "node")
      query = query.eq("configuration_revision_id", revision || "");
    query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(5)
      .abortSignal(AbortSignal.any([abort.signal,AbortSignal.timeout(12000)]))
      .then(({ data, error }) => {
        if (active) {
          setResult({key:queryKey,rows:data||[],error:!!error});
        }
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [kind, id, revision,queryKey]);
  return (
    <><section className="related-discussions">
      <h3>Member discussions</h3>
      {!current ? <p className="small muted" role="status">Loading linked discussions…</p> : error ? (
        <p className="small">Discussions could not load. Open the community to browse or try again later.</p>
      ) : rows.length ? (
        rows.map((r) => (
          <DocumentLink key={r.id} href={"/community/" + r.id}>
            {r.title}
            {r.accepted_answers?.length ? (
              <span className="small"> · Owner accepted a solution</span>
            ) : null}
            <ArrowUpRight size={14} />
          </DocumentLink>
        ))
      ) : (
        <p className="small muted">No discussions linked to this {kind} yet.</p>
      )}
      <DocumentLink
        href={
          "/community/new?" +
          new URLSearchParams({
            [kind === "diagnostic" ? "symptom" : kind]: id,
            ...(revision ? { configuration_revision: revision } : {}),
          }).toString()
        }
      >
        Start a linked discussion
        <ArrowUpRight size={14} />
      </DocumentLink>
    </section>{!['node','garage','journal','build'].includes(kind)&&<ExternalSourceLinks target={{kind:kind as ReferenceTarget['kind'],id}} related={related} referenceId={referenceId}/>}</>
  );
}
