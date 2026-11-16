-- Administrator-only aggregate monitoring; existing MFA/live-session gates remain authoritative.
create or replace function e34_private.security_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not e34_private.has_role('admin') then raise exception 'Administrator access and a current authenticator session are required' using errcode='42501';end if;
 return jsonb_build_object(
 'checked_at',now(),'current_mfa_session',true,
 'tables_without_rls',(select count(*) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','e34_private') and c.relkind='r' and not c.relrowsecurity),
 'definers_without_fixed_search_path',(select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','e34_private') and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'],false)),
 'public_storage_buckets',(select count(*) from storage.buckets where public),
 'media_cleanup_pending',(select count(*) from e34_private.media_cleanup_queue),
 'upload_attempts_last_hour',(select count(*) from e34_private.community_actions where action='photo' and created_at>now()-interval '1 hour'),
 'audit_events_last_day',(select count(*) from e34_private.audit_events where created_at>now()-interval '1 day'),
 'provider_log_monitoring','Check Supabase Auth/API logs and Resend delivery/webhook logs. Provider logs are not copied into this report.',
 'support_enabled',(select enabled from e34_private.support_configuration where id),
 'support_failed_deliveries',(select count(*) from public.support_messages where direction='outbound' and delivery_status in('failed','bounced','complained','suppressed','uncertain') and created_at>now()-interval '7 days'),
 'support_pending_attachments',(select count(*) from public.support_attachments where state in('pending','error')),
 'support_cleanup_pending',(select count(*) from e34_private.support_deleted_objects),
 'model_upload_attempts_last_hour',(select count(*) from e34_private.twin_upload_attempts where created_at>now()-interval '1 hour'),
 'email_alerts','Not configured; email setup deferred by the owner',
 'backup_restore','See the dated isolated recovery report; a production recovery drill is not certified here');
end$$;

-- Prune bounded abuse metadata independently of subsequent account activity.
-- This job never reads customer text, changes user records or sends mail.
create function e34_private.security_maintenance() returns integer
language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
 delete from e34_private.twin_upload_attempts where created_at<now()-interval '7 days';
 get diagnostics removed=row_count;
 return removed;
end$$;
revoke all on function e34_private.security_maintenance() from public,anon,authenticated;
select cron.schedule('e34-security-retention','25 4 * * *','select e34_private.security_maintenance();');
