-- Forward-only hardening. No user data, role assignments or Auth settings change.
create function public.security_session_active(target_user_id uuid,target_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select target_user_id is not null and target_session_id is not null and exists(
  select 1 from auth.sessions s where s.id=target_session_id and s.user_id=target_user_id
  and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function public.security_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.security_session_active(uuid,uuid) to service_role;

create function e34_private.current_staff_session() returns boolean
language plpgsql stable security definer set search_path='' as $$
declare sid uuid; actor uuid:=auth.uid();
begin
 if actor is null or coalesce(auth.jwt()->>'aal','')<>'aal2' then return false;end if;
 begin sid:=(auth.jwt()->>'session_id')::uuid;exception when invalid_text_representation then return false;end;
 return sid is not null and exists(select 1 from auth.sessions s where s.id=sid and s.user_id=actor
  and s.aal::text='aal2' and (s.not_after is null or s.not_after>now()))
  and exists(select 1 from auth.mfa_factors where user_id=actor and status::text='verified');
end$$;
revoke all on function e34_private.current_staff_session() from public,anon,authenticated;
grant execute on function e34_private.current_staff_session() to anon,authenticated;

create or replace function e34_private.has_role(required_role text) returns boolean
language sql stable security definer set search_path='' as $$
 select e34_private.current_staff_session() and exists(select 1 from e34_private.staff_roles
  where user_id=auth.uid() and (role=required_role or role='admin'));
$$;
create or replace function e34_private.media_moderator() returns boolean
language sql stable security definer set search_path='' as $$
 select e34_private.current_staff_session() and exists(select 1 from e34_private.staff_roles
  where user_id=auth.uid() and role in ('moderator','admin'));
$$;

create function e34_private.security_status() returns jsonb
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
 'email_alerts','Not configured',
 'backup_restore','See the dated isolated recovery report; a production recovery drill is not certified here');
end$$;
create function public.security_status() returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.security_status()$$;
revoke all on function e34_private.security_status(),public.security_status() from public,anon,authenticated;
grant execute on function e34_private.security_status(),public.security_status() to authenticated;

-- Private uploads remain inert evidence; restrict reservations to an owned job.
-- Ten retained objects bounds each account to at most 1 GB at the bucket limit.
create table e34_private.twin_upload_attempts(
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null default 'object' check(kind in ('object','job','evidence')),
 created_at timestamptz not null default now()
);
create index twin_upload_attempt_window on e34_private.twin_upload_attempts(user_id,created_at);
alter table e34_private.twin_upload_attempts enable row level security;
revoke all on e34_private.twin_upload_attempts from public,anon,authenticated;
create function e34_private.reserve_twin_upload(object_name text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); job uuid;
begin
 if actor is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or
  not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then return false;end if;
 if object_name !~ ('^'||actor::text||'/[0-9a-f-]{36}/[0-9a-f-]{36}[.](glb|jpg|jpeg|png)$') then return false;end if;
 begin job:=split_part(object_name,'/',2)::uuid;exception when invalid_text_representation then return false;end;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,431));
 if not exists(select 1 from public.reconstruction_jobs where id=job and user_id=actor and status in ('needs-evidence','failed')) then return false;end if;
 if (select count(*) from storage.objects where bucket_id='e34-twin-submissions' and name like actor::text||'/%')>=10 then return false;end if;
 if (select count(*) from e34_private.twin_upload_attempts where user_id=actor and kind='object' and created_at>now()-interval '1 hour')>=5 then return false;end if;
 delete from e34_private.twin_upload_attempts where user_id=actor and created_at<now()-interval '1 day';
 insert into e34_private.twin_upload_attempts(user_id) values(actor);
 return true;
end$$;
revoke all on function e34_private.reserve_twin_upload(text) from public,anon,authenticated;
grant execute on function e34_private.reserve_twin_upload(text) to authenticated;
drop policy twin_files_upload on storage.objects;
create policy twin_files_upload on storage.objects for insert to authenticated
 with check(bucket_id='e34-twin-submissions' and e34_private.reserve_twin_upload(name));

-- Avoid a new dead tuple once the daily counter is saturated. Retention is
-- already scheduled independently of visitors; do not scan/delete per event.
create or replace function e34_private.record_usage(area_name text) returns void
language plpgsql security definer set search_path='' as $$begin
 if area_name is null or area_name not in ('home','reference','manual','guides','catalog','workshop','diagnostics','community','cars','app') then return;end if;
 insert into e34_private.usage_daily(day,area,opens) values(current_date,area_name,1)
 on conflict(day,area) do update set opens=e34_private.usage_daily.opens+1
 where e34_private.usage_daily.opens<1000000;
end$$;

-- Metadata submissions must also be bounded; removing a job cannot reset attempts.
create function e34_private.limit_twin_submission() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); operation text:=case when tg_table_name='reconstruction_jobs' then 'job' else 'evidence' end;
begin
 if coalesce(current_setting('role',true),'none') not in ('anon','authenticated') then return new;end if;
 if actor is null or actor<>new.user_id or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then raise exception 'A verified account is required for source submissions' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,431));
 if (select count(*) from e34_private.twin_upload_attempts where user_id=actor and kind=operation and created_at>now()-interval '1 hour') >= (case when operation='job' then 10 else 30 end) then raise exception 'Source submission limit reached. Try again later' using errcode='54000';end if;
 delete from e34_private.twin_upload_attempts where user_id=actor and created_at<now()-interval '1 day';
 insert into e34_private.twin_upload_attempts(user_id,kind) values(actor,operation);
 return new;
end$$;
revoke all on function e34_private.limit_twin_submission() from public,anon,authenticated;
create trigger twin_job_submission_limit before insert on public.reconstruction_jobs for each row execute function e34_private.limit_twin_submission();
create trigger twin_evidence_submission_limit before insert on public.reconstruction_evidence for each row execute function e34_private.limit_twin_submission();
alter table public.reconstruction_jobs add constraint twin_source_array_bounds check(
 jsonb_typeof(required_views)='array' and jsonb_typeof(required_measurements)='array' and jsonb_typeof(source_urls)='array'
 and octet_length(required_views::text)<=8000 and octet_length(required_measurements::text)<=8000 and octet_length(source_urls::text)<=8000
) not valid;
