-- Anonymous Auth identities may submit bounded questions/replies for review.
-- They do not inherit verified-member contribution rights or staff permissions.
create table e34_private.guest_submissions (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users on delete cascade,
 thread_id uuid references public.threads on delete cascade,
 post_id uuid references public.posts on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reason text not null default '',
 created_at timestamptz not null default now(), reviewed_at timestamptz,
 reviewed_by uuid references auth.users on delete set null,
 check(num_nonnulls(thread_id,post_id)=1), unique(thread_id),unique(post_id)
);
create index guest_submissions_author on e34_private.guest_submissions(author_id,created_at desc);
create index guest_submissions_queue on e34_private.guest_submissions(created_at,id) where status='pending';
create index guest_submissions_reviewer on e34_private.guest_submissions(reviewed_by);
alter table e34_private.guest_submissions enable row level security;
revoke all on e34_private.guest_submissions from public,anon,authenticated;
create policy no_client_guest_queue on e34_private.guest_submissions for all to anon,authenticated using(false) with check(false);

create or replace function e34_private.community_can_contribute(actor uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if actor is null then raise exception 'Sign in to contribute'; end if;
 if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) and not (
   coalesce(current_setting('e34.guest_submission',true)=actor::text,false) and
   exists(select 1 from auth.users where id=actor and is_anonymous is true)
 ) then raise exception 'Confirm your email before contributing'; end if;
 if exists(select 1 from e34_private.community_restrictions where user_id=community_can_contribute.actor and kind<>'warning' and revoked_at is null and (expires_at is null or expires_at>now())) then raise exception 'Posting is restricted. See Community settings for the reason and appeal option.'; end if;
end $$;

-- Run after the existing normalization/rate/context triggers. In particular the
-- original contribution guard resets new.hidden, so ordering here is deliberate.
create function e34_private.guard_guest_pending() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from auth.users where id=auth.uid() and is_anonymous is true) then
   if current_setting('e34.guest_submission',true) is distinct from auth.uid()::text or new.author_id<>auth.uid() then raise exception 'Use the guest submission form'; end if;
   new.hidden:=true;
 end if;
 return new;
end $$;
create function e34_private.record_guest_submission() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from auth.users where id=new.author_id and is_anonymous is true) then
   if not new.hidden then raise exception 'Guest contributions require review'; end if;
   insert into e34_private.guest_submissions(author_id,thread_id,post_id)
   values(new.author_id,case when tg_table_name='threads' then new.id end,case when tg_table_name='posts' then new.id end);
 end if;
 return new;
end $$;
revoke all on function e34_private.guard_guest_pending(),e34_private.record_guest_submission() from public,anon,authenticated;
create trigger zz_guest_pending before insert on public.threads for each row execute function e34_private.guard_guest_pending();
create trigger zz_guest_pending before insert on public.posts for each row execute function e34_private.guard_guest_pending();
create trigger record_guest_submission after insert on public.threads for each row execute function e34_private.record_guest_submission();
create trigger record_guest_submission after insert on public.posts for each row execute function e34_private.record_guest_submission();

create function e34_private.submit_guest_contribution(payload jsonb,target_thread uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); row_data public.threads; created_id uuid; recent integer; previous_flag text;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and is_anonymous is true) then raise exception 'Start a guest session before submitting'; end if;
 if not exists(select 1 from auth.sessions where user_id=actor and id::text=auth.jwt()->>'session_id') then raise exception 'A current guest session is required'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or char_length(payload::text)>40000 then raise exception 'Invalid guest submission'; end if;
 if char_length(btrim(coalesce(payload->>'body',''))) not between 40 and 20000 then raise exception 'Write 40–20000 characters with the details of your question or reply'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select count(*) into recent from e34_private.guest_submissions where author_id=actor and created_at>now()-interval '24 hours' and ((target_thread is null and thread_id is not null) or (target_thread is not null and post_id is not null));
 if recent >= (case when target_thread is null then 2 else 10 end) then raise exception 'Guest posting limit reached. Please try again tomorrow or use a verified account'; end if;
 previous_flag:=current_setting('e34.guest_submission',true);
 perform set_config('e34.guest_submission',actor::text,true);
 perform e34_private.community_can_contribute(actor);
 insert into public.profiles(id,display_name) values(actor,'Guest '||left(replace(actor::text,'-',''),8)) on conflict(id) do nothing;
 if target_thread is not null then
   insert into public.posts(thread_id,author_id,body,hidden) values(target_thread,actor,payload->>'body',true) returning id into created_id;
 else
   if char_length(btrim(coalesce(payload->>'title',''))) not between 8 and 160 then raise exception 'Use a title of 8–160 characters'; end if;
   row_data:=jsonb_populate_record(null::public.threads,payload);
   insert into public.threads(author_id,title,body,category,template_id,starter_topic_id,tag_ids,model_id,engine,component_id,part_id,catalog_position_id,manual_chapter_id,guide_id,guide_revision,guide_step,journal_update_id,article_slug,diagnostic_slug,configuration_revision_id,node_id,garage_entry_id,vehicle_configuration,observations,hidden)
   values(actor,row_data.title,row_data.body,coalesce(row_data.category,'General E34 Community'),coalesce(row_data.template_id,'general'),row_data.starter_topic_id,coalesce(row_data.tag_ids,'{}'),row_data.model_id,row_data.engine,row_data.component_id,row_data.part_id,row_data.catalog_position_id,row_data.manual_chapter_id,row_data.guide_id,row_data.guide_revision,row_data.guide_step,row_data.journal_update_id,row_data.article_slug,row_data.diagnostic_slug,row_data.configuration_revision_id,row_data.node_id,row_data.garage_entry_id,coalesce(row_data.vehicle_configuration,'{}'),coalesce(row_data.observations,'{}'),true)
   returning id into created_id;
 end if;
 perform set_config('e34.guest_submission',coalesce(previous_flag,''),true);
 return created_id;
end $$;

create function e34_private.guest_submission_state(for_review boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'A guest or member session is required'; end if;
 if for_review and not (e34_private.has_role('moderator') and coalesce(auth.jwt()->>'aal','')='aal2') then raise exception 'Moderator permission and MFA required'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at),'[]') from (
  select s.id,s.status,s.reason,s.created_at,s.reviewed_at,
   coalesce(s.thread_id,p.thread_id) as discussion_id,s.post_id,
   case when s.post_id is null then 'question' else 'reply' end as kind,
   coalesce(t.title,parent.title) as title,coalesce(t.body,p.body) as body
  from e34_private.guest_submissions s
  left join public.threads t on t.id=s.thread_id left join public.posts p on p.id=s.post_id
  left join public.threads parent on parent.id=p.thread_id
  where (for_review and s.status='pending') or (not for_review and s.author_id=auth.uid())
  order by case when for_review then s.created_at end asc,s.created_at desc limit 100
 )r);
end $$;
create function e34_private.review_guest_submission(submission uuid,approve boolean,reason text) returns void
language plpgsql security definer set search_path='' as $$
declare row_data e34_private.guest_submissions;
begin
 if not e34_private.has_role('moderator') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Moderator permission and MFA required'; end if;
 if approve is null or char_length(btrim(coalesce(reason,''))) not between 10 and 2000 then raise exception 'Give a moderation reason in 10–2000 characters'; end if;
 select * into row_data from e34_private.guest_submissions where id=submission for update;
 if row_data.id is null or row_data.status<>'pending' then raise exception 'This guest submission is no longer awaiting review'; end if;
 if approve then
  if exists(select 1 from e34_private.community_restrictions where user_id=row_data.author_id and kind<>'warning' and revoked_at is null and (expires_at is null or expires_at>now())) then raise exception 'This guest is currently restricted'; end if;
  if row_data.post_id is not null and not exists(select 1 from public.posts p join public.threads t on t.id=p.thread_id where p.id=row_data.post_id and not t.hidden and not t.locked) then raise exception 'The discussion is no longer accepting replies'; end if;
 end if;
 -- For approval the author can be anonymous; the reviewer controls publication.
 perform e34_private.moderate_community(
  case when row_data.post_id is null then case when approve then 'restore-thread' else 'hide-thread' end else case when approve then 'restore-post' else 'hide-post' end end,
  coalesce(row_data.thread_id,row_data.post_id),reason);
 update e34_private.guest_submissions set status=case when approve then 'approved' else 'rejected' end,reason=review_guest_submission.reason,reviewed_by=auth.uid(),reviewed_at=now() where id=submission;
end $$;
create function public.submit_guest_contribution(payload jsonb,target_thread uuid default null) returns uuid language sql security invoker set search_path='' as $$select e34_private.submit_guest_contribution(payload,target_thread);$$;
create function public.guest_submission_state(for_review boolean default false) returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.guest_submission_state(for_review);$$;
create function public.review_guest_submission(submission uuid,approve boolean,reason text) returns void language sql security invoker set search_path='' as $$select e34_private.review_guest_submission(submission,approve,reason);$$;
revoke all on function public.submit_guest_contribution(jsonb,uuid),public.guest_submission_state(boolean),public.review_guest_submission(uuid,boolean,text),e34_private.submit_guest_contribution(jsonb,uuid),e34_private.guest_submission_state(boolean),e34_private.review_guest_submission(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.submit_guest_contribution(jsonb,uuid),public.guest_submission_state(boolean),public.review_guest_submission(uuid,boolean,text),e34_private.submit_guest_contribution(jsonb,uuid),e34_private.guest_submission_state(boolean),e34_private.review_guest_submission(uuid,boolean,text) to authenticated;
