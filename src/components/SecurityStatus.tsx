"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { db, useApp } from "./context";
import { Notice, PageIntro } from "./common";
import { DocumentLink } from "./DocumentLink";
const statusSchema = z.object({
  checked_at:z.string(), current_mfa_session:z.literal(true),
  tables_without_rls:z.number().int().nonnegative(),
  definers_without_fixed_search_path:z.number().int().nonnegative(),
  public_storage_buckets:z.number().int().nonnegative(),
  media_cleanup_pending:z.number().int().nonnegative(),
  upload_attempts_last_hour:z.number().int().nonnegative(),
  audit_events_last_day:z.number().int().nonnegative(),
  support_enabled:z.boolean(), support_failed_deliveries:z.number().int().nonnegative(),
  support_pending_attachments:z.number().int().nonnegative(), support_cleanup_pending:z.number().int().nonnegative(),
  model_upload_attempts_last_hour:z.number().int().nonnegative(),
  provider_log_monitoring:z.string(), email_alerts:z.string(), backup_restore:z.string(),
});
export function SecurityStatus() {
  const {user,authReady,authRevision}=useApp();
  const [refresh,setRefresh]=useState(0);
  const userId=user?.id, isGuest=user?.is_anonymous;
  const scope=JSON.stringify([userId,authRevision,refresh]);
  const [result,setResult]=useState<{scope:string;data?:z.infer<typeof statusSchema>;error?:string}>();
  const current=result?.scope===scope?result:undefined;
  useEffect(()=>{
    if(!userId || isGuest) return;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    let active=true;
    Promise.resolve(db.rpc("security_status").abortSignal(controller.signal)).then(r=>{
      if(r.error) throw new Error("Administrator access and an authenticator session are required. If verified, try again or check the backend deployment.");
      const data=statusSchema.parse(r.data);
      if(active)setResult({scope,data});
    }).catch((error:unknown)=>{
      if(active)setResult({scope,error:controller.signal.aborted?"The security check timed out. Try again.":error instanceof Error?error.message:"The security check could not load."});
    }).finally(()=>clearTimeout(timer));
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[userId,isGuest,scope]);
  return <div className="page">
    <PageIntro eyebrow="Administration" title="Security status" description="Current database safeguards and checks that still need attention.">
      <DocumentLink href="/manage" className="button outline">Site management</DocumentLink>
      <button className="button outline" onClick={()=>setRefresh(x=>x+1)} disabled={!authReady || (!!user && !current)}>Refresh checks</button>
    </PageIntro>
    {!authReady?<p role="status">Checking your account…</p>:!user || user.is_anonymous?<Notice><p>Sign in with your administrator account to view this page.</p><DocumentLink href="/account?next=%2Fmanage%2Fsecurity">Sign in</DocumentLink></Notice>:!current?<p role="status">Checking safeguards…</p>:current.error?<Notice tone="warning"><p role="alert">{current.error}</p><DocumentLink href="/account?next=%2Fmanage%2Fsecurity#account-security">Verify authenticator</DocumentLink></Notice>:current.data && <>
      <p className="small">Checked {new Date(current.data.checked_at).toLocaleString()}. Current administrator MFA session verified by the database.</p>
      <dl className="spec-list">
        {([
          ["Application tables without row security",current.data.tables_without_rls],
          ["Privileged functions without fixed search paths",current.data.definers_without_fixed_search_path],
          ["Public storage buckets",current.data.public_storage_buckets],
          ["Photo files awaiting cleanup",current.data.media_cleanup_pending],
          ["Photo reservation attempts in the past hour",current.data.upload_attempts_last_hour],
          ["Audit events in the past day",current.data.audit_events_last_day],
          ["Model source upload attempts in the past hour",current.data.model_upload_attempts_last_hour],
          ["Support delivery failures needing review (past seven days)",current.data.support_failed_deliveries],
          ["Support attachments awaiting processing",current.data.support_pending_attachments],
          ["Support files awaiting cleanup",current.data.support_cleanup_pending],
        ] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <h2>Operational checks</h2>
      <p>Support delivery: {current.data.support_enabled?'enabled':'inactive'}. <DocumentLink href="/manage/support">Open the private support inbox</DocumentLink>.</p>
      <p>{current.data.provider_log_monitoring}</p>
      <p>Email alerts: {current.data.email_alerts}.</p>
      <p>{current.data.backup_restore}</p>
      <p className="small muted">These checks report configuration and queue counts. They do not certify that every attack is prevented or that a production backup can be restored.</p>
    </>}
  </div>;
}
