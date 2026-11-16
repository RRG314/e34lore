-- Native community extension. Apply after contribution-revisions.sql.
-- Editorial records are resources, never fabricated member conversations.
create table public.community_categories (
 slug text primary key, name text not null unique, description text not null, sort_order integer not null unique
);
insert into public.community_categories values
 ('technical','Technical Help & Troubleshooting','Diagnosis, measurements and configuration-specific questions.',1),
 ('maintenance','Maintenance, Repairs & DIY','Service records, repair methods and documented outcomes.',2),
 ('modifications','Performance, Modifications & Swaps','Changes to the original configuration and their consequences.',3),
 ('restorations','Restorations & Build Journals','Long-term projects, condition records and restoration decisions.',4),
 ('parts','Parts, Compatibility & Sourcing','Part identification, catalog conditions and interchange evidence.',5),
 ('general','General E34 Community','Ownership, introductions and shared experience.',6),
 ('research','Technical Research & Documentation','Source comparisons, manual clarifications and technical review.',7),
 ('support','Announcements, Feedback & Site Support','Community rules, corrections and site support.',8);
create table public.community_editorials (
 slug text primary key check(slug ~ '^[a-z0-9-]{1,100}$'),
 category text not null references public.community_categories(name),
 title text not null, kind text not null check(kind in ('resource','known-issue','manual-clarification')),
 revision integer not null default 1, published_at timestamptz not null default now()
);
create table public.community_tags (
 id text primary key, label text not null, family text not null,
 member_assignable boolean not null default true
);
alter table public.community_categories enable row level security;
alter table public.community_editorials enable row level security;
alter table public.community_tags enable row level security;
revoke all on public.community_categories,public.community_editorials,public.community_tags from public,anon,authenticated;
grant select on public.community_categories,public.community_editorials,public.community_tags to anon,authenticated;
create policy categories_read on public.community_categories for select to anon,authenticated using(true);
create policy editorials_read on public.community_editorials for select to anon,authenticated using(true);
create policy tags_read on public.community_tags for select to anon,authenticated using(true);

alter table public.threads drop constraint threads_category_check;
update public.threads set category=case category when 'Technical help' then 'Technical Help & Troubleshooting' when 'Parts & fitment' then 'Parts, Compatibility & Sourcing' when 'Build journals' then 'Restorations & Build Journals' when 'General discussion' then 'General E34 Community' else category end;
alter table public.threads add constraint thread_category foreign key(category) references public.community_categories(name);
alter table public.threads add column starter_topic_id text references public.community_editorials(slug) on delete set null,
 add column template_id text not null default 'troubleshooting' check(template_id in ('troubleshooting','repair','interchange','restoration','modification','research','general')),
 add column tag_ids text[] not null default '{}' check(cardinality(tag_ids)<=12),
 add column locked boolean not null default false;
create index threads_starter_cursor on public.threads(starter_topic_id,created_at desc,id desc);
create index threads_tags on public.threads using gin(tag_ids);
alter table public.posts add column in_reply_to_post_id uuid,
 add constraint reply_same_thread foreign key(in_reply_to_post_id,thread_id) references public.posts(id,thread_id) on delete cascade;
create index posts_reply_parent on public.posts(in_reply_to_post_id);

create table public.community_preferences (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 target_user_id uuid not null references auth.users on delete cascade,
 mode text not null check(mode in ('mute','block')), created_at timestamptz not null default now(),
 primary key(user_id,target_user_id),check(user_id<>target_user_id)
);
alter table public.community_preferences enable row level security;
revoke all on public.community_preferences from public,anon,authenticated;
grant select,insert,update,delete on public.community_preferences to authenticated;
create policy preferences_own on public.community_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create index preferences_target on public.community_preferences(target_user_id);
create table e34_private.community_actions (
 id bigint generated always as identity primary key, actor uuid not null references auth.users on delete cascade,
 action text not null, created_at timestamptz not null default now()
);
create index community_actions_actor_time on e34_private.community_actions(actor,created_at);
create table e34_private.community_restrictions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 kind text not null check(kind in ('warning','timeout','suspension','ban')),
 reason text not null check(char_length(reason) between 10 and 2000),
 internal_note text not null default '' check(char_length(internal_note)<=4000),
 expires_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(),
 actor uuid references auth.users on delete set null,
 check(kind in ('warning','ban') or expires_at is not null)
);
create index restrictions_user on e34_private.community_restrictions(user_id,created_at desc);
alter table e34_private.audit_events add column metadata jsonb not null default '{}';
create table public.community_appeals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade,
 restriction_id uuid not null references e34_private.community_restrictions on delete cascade,
 body text not null check(char_length(body) between 40 and 4000),
 status text not null default 'open' check(status in ('open','reviewing','resolved')),
 response text not null default '' check(char_length(response)<=4000), created_at timestamptz not null default now()
);
alter table public.community_appeals enable row level security;
revoke all on public.community_appeals from public,anon,authenticated;
grant select on public.community_appeals to authenticated;
create policy appeals_read on public.community_appeals for select to authenticated using(user_id=(select auth.uid()) or (select e34_private.has_role('moderator')));
create index appeals_user on public.community_appeals(user_id);
create index appeals_restriction on public.community_appeals(restriction_id);

create function e34_private.community_can_contribute(actor uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if actor is null then raise exception 'Sign in to contribute'; end if;
 if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Confirm your email before contributing'; end if;
 if exists(select 1 from e34_private.community_restrictions where user_id=community_can_contribute.actor and kind<>'warning' and revoked_at is null and (expires_at is null or expires_at>now())) then raise exception 'Posting is restricted. See Community settings for the reason and appeal option.'; end if;
end $$;
revoke all on function e34_private.community_can_contribute(uuid) from public,anon,authenticated;
create function e34_private.community_blocked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_preferences where mode='block' and ((user_id=a and target_user_id=b) or (user_id=b and target_user_id=a)));
$$;
revoke all on function e34_private.community_blocked(uuid,uuid) from public,anon,authenticated;
create function e34_private.guard_community() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); parent public.threads; target public.posts; recent integer; is_staff boolean;
begin
 if tg_table_name='threads' then
  new.category:=case new.category when 'Technical help' then 'Technical Help & Troubleshooting' when 'Parts & fitment' then 'Parts, Compatibility & Sourcing' when 'Build journals' then 'Restorations & Build Journals' when 'General discussion' then 'General E34 Community' else new.category end;
  if cardinality(new.tag_ids)<>(select count(distinct x) from unnest(new.tag_ids) x) or exists(select 1 from unnest(new.tag_ids) x where not exists(select 1 from public.community_tags t where t.id=x and t.member_assignable)) then raise exception 'Choose up to twelve distinct community tags'; end if;
 end if;
 if actor is null then return new; end if;
 is_staff:=e34_private.has_role('moderator') and coalesce(auth.jwt()->>'aal','')='aal2';
 if tg_op='UPDATE' and (new.hidden is distinct from old.hidden or (tg_table_name='threads' and (to_jsonb(new)->>'locked') is distinct from (to_jsonb(old)->>'locked'))) and not is_staff then raise exception 'Moderator permission and MFA required'; end if;
 if new.author_id<>actor then
  if not is_staff then raise exception 'Moderator permission and MFA required'; end if;
  return new;
 end if;
 perform e34_private.community_can_contribute(actor);
 if tg_op='INSERT' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
  if exists(select 1 from auth.users where id=actor and created_at>now()-interval '24 hours') then
   if (select count(*) from regexp_matches(new.body,'https?://','g'))>2 then raise exception 'New members can include up to two external links per post'; end if;
   if tg_table_name='threads' then select count(*) into recent from public.threads where author_id=actor and created_at>now()-interval '1 hour';
   else select count(*) into recent from public.posts where author_id=actor and created_at>now()-interval '1 hour'; end if;
   if recent >= (case when tg_table_name='threads' then 3 else 10 end) then raise exception 'New-member posting limit reached. Please try again later.'; end if;
  end if;
 end if;
 if tg_table_name='threads' then
  if tg_op='INSERT' and new.locked then raise exception 'New discussions cannot be locked by their author'; end if;
 end if;
 if tg_table_name='posts' then
  if tg_op='UPDATE' and new.in_reply_to_post_id is distinct from old.in_reply_to_post_id then raise exception 'Reply context is immutable'; end if;
  select * into parent from public.threads where id=new.thread_id;
  if tg_op='INSERT' and (parent.id is null or parent.hidden or parent.locked) then raise exception 'This discussion is closed to new replies'; end if;
  if tg_op='INSERT' and e34_private.community_blocked(actor,parent.author_id) then raise exception 'A member block prevents this reply'; end if;
  if new.in_reply_to_post_id is not null then
   select * into target from public.posts where id=new.in_reply_to_post_id and thread_id=new.thread_id;
   if tg_op='INSERT' and (target.id is null or target.hidden or e34_private.community_blocked(actor,target.author_id)) then raise exception 'This reply target is unavailable'; end if;
  end if;
  if tg_op='UPDATE' and char_length(btrim(new.body))<40 and exists(select 1 from public.community_feedback where explanation_post_id=new.id) then raise exception 'A bad-advice explanation must retain at least forty characters'; end if;
 end if;
 return new;
end $$;
revoke all on function e34_private.guard_community() from public,anon,authenticated;

create table public.community_feedback (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 value text not null check(value in ('helpful','bad-advice')), target_version integer not null check(target_version>0),
 reason_code text check(reason_code in ('configuration','incorrect','unsafe','unsupported','outdated','other')),
 explanation_post_id uuid references public.posts on delete cascade,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(post_id,user_id),
 check((value='helpful' and explanation_post_id is null and reason_code is null) or (value='bad-advice' and explanation_post_id is not null and reason_code is not null))
);
create index feedback_user on public.community_feedback(user_id);
create index feedback_explanation on public.community_feedback(explanation_post_id);
alter table public.community_feedback enable row level security;
revoke all on public.community_feedback from public,anon,authenticated;
grant select on public.community_feedback to authenticated;
create policy feedback_own on public.community_feedback for select to authenticated using(user_id=(select auth.uid()));
create trigger a_community_guard before insert or update on public.threads for each row execute function e34_private.guard_community();
create trigger a_community_guard before insert or update on public.posts for each row execute function e34_private.guard_community();
-- Preserve owner deletion rights; staff moderation requires an MFA session.
create policy thread_staff_mfa_delete on public.threads as restrictive for delete to authenticated using(author_id=(select auth.uid()) or coalesce((select auth.jwt()->>'aal'),'')='aal2');
create policy post_staff_mfa_delete on public.posts as restrictive for delete to authenticated using(author_id=(select auth.uid()) or coalesce((select auth.jwt()->>'aal'),'')='aal2');

create function public.set_community_feedback(target_post uuid, expected_version integer, feedback_value text, explanation text default '', reason text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); target public.posts; parent public.threads; reply_id uuid; existing public.community_feedback;
begin
 perform e34_private.community_can_contribute(v_actor);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text,0));
 if (select count(*) from e34_private.community_actions where community_actions.actor=v_actor and created_at>now()-interval '1 hour' and action='feedback')>=60 then raise exception 'Feedback limit reached. Please try again later.'; end if;
 select * into target from public.posts where id=target_post for update;
 select * into parent from public.threads where id=target.thread_id for key share;
 if target.id is null or target.hidden or parent.hidden or parent.id is null then raise exception 'This advice is unavailable'; end if;
 if target.author_id=v_actor then raise exception 'You cannot rate your own advice'; end if;
 if e34_private.community_blocked(v_actor,target.author_id) or e34_private.community_blocked(v_actor,parent.author_id) then raise exception 'A member block prevents this feedback'; end if;
 if target.content_version<>expected_version then raise exception 'This advice has changed. Read the latest version before rating it.'; end if;
 if feedback_value is null or feedback_value not in ('helpful','bad-advice','remove') then raise exception 'Choose Helpful or Bad advice'; end if;
 select * into existing from public.community_feedback where post_id=target_post and user_id=v_actor;
 if feedback_value='remove' then delete from public.community_feedback where post_id=target_post and user_id=v_actor;
 else
  if feedback_value='bad-advice' then
   if reason is null or reason not in ('configuration','incorrect','unsafe','unsupported','outdated','other') or char_length(btrim(explanation)) not between 40 and 6000 then raise exception 'Explain the concern in 40–6000 characters and choose a reason'; end if;
   if parent.locked then raise exception 'This discussion is closed. Report the concern to moderation.'; end if;
   if existing.value='bad-advice' and existing.target_version=expected_version and exists(select 1 from public.posts where id=existing.explanation_post_id and not hidden) then raise exception 'You already explained this vote. Edit your linked reply or remove the vote first.'; end if;
   insert into public.posts(thread_id,author_id,body,in_reply_to_post_id) values(target.thread_id,v_actor,explanation,target_post) returning id into reply_id;
  else reason:=null;
  end if;
  insert into public.community_feedback(post_id,user_id,value,target_version,reason_code,explanation_post_id)
   values(target_post,v_actor,feedback_value,expected_version,reason,reply_id)
   on conflict(post_id,user_id) do update set value=excluded.value,target_version=excluded.target_version,reason_code=excluded.reason_code,explanation_post_id=excluded.explanation_post_id,updated_at=now();
 end if;
 insert into e34_private.community_actions(actor,action) values(v_actor,'feedback');
 return reply_id;
end $$;
revoke all on function public.set_community_feedback(uuid,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.set_community_feedback(uuid,integer,text,text,text) to authenticated;

-- Bounded public aggregates reveal no voter identities. Explicit visibility checks
-- are essential because these helpers intentionally cross feedback-owner RLS.
create function public.community_feedback_summary(post_ids uuid[])
returns table(post_id uuid,helpful bigint,bad_advice bigint,my_vote text,explanation_post_id uuid)
language sql stable security definer set search_path='' as $$
 select p.id,
 count(f.id) filter(where f.value='helpful'),
 count(f.id) filter(where f.value='bad-advice'),
 max(f.value) filter(where f.user_id=auth.uid()),
 (array_agg(f.explanation_post_id) filter(where f.user_id=auth.uid()))[1]
 from public.posts p join public.threads t on t.id=p.thread_id
 left join public.community_feedback f on f.post_id=p.id and f.target_version=p.content_version
 and (f.value='helpful' or exists(select 1 from public.posts e where e.id=f.explanation_post_id and not e.hidden and e.thread_id=p.thread_id and e.author_id=f.user_id and e.in_reply_to_post_id=p.id and char_length(btrim(e.body))>=40))
 where cardinality(post_ids)<=100 and p.id=any(post_ids) and not p.hidden and not t.hidden
 group by p.id;
$$;
revoke all on function public.community_feedback_summary(uuid[]) from public,anon,authenticated;
grant execute on function public.community_feedback_summary(uuid[]) to anon,authenticated;
create function public.top_helpful_comments()
returns table(post_id uuid,thread_id uuid,thread_title text,body text,display_name text,helpful bigint,bad_advice bigint,content_version integer)
language sql stable security definer set search_path='' as $$
 select p.id,p.thread_id,t.title,left(p.body,500),coalesce(pr.display_name,'Member'),
 count(*) filter(where f.value='helpful'),count(*) filter(where f.value='bad-advice'),p.content_version
 from public.posts p join public.threads t on t.id=p.thread_id
 join public.community_feedback f on f.post_id=p.id and f.target_version=p.content_version
 left join public.profiles pr on pr.id=p.author_id
 where not p.hidden and not t.hidden
 and (f.value='helpful' or exists(select 1 from public.posts e where e.id=f.explanation_post_id and not e.hidden and e.thread_id=p.thread_id and e.author_id=f.user_id and e.in_reply_to_post_id=p.id and char_length(btrim(e.body))>=40))
 group by p.id,t.id,pr.display_name
 having count(*) filter(where f.value='helpful')>0
 order by count(*) filter(where f.value='helpful') desc,count(*) filter(where f.value='bad-advice'),p.created_at,p.id limit 5;
$$;
revoke all on function public.top_helpful_comments() from public,anon,authenticated;
grant execute on function public.top_helpful_comments() to anon,authenticated;

create function public.browse_community(search_query text default '',category_filter text default '',tag_filter text default '',starter_filter text default '',page_size integer default 21,cursor_created_at timestamptz default null,cursor_id uuid default null)
returns setof public.threads language sql stable security invoker set search_path='' as $$
 select t.* from public.threads t where char_length(search_query)<=300
 and(category_filter='' or t.category=category_filter) and(tag_filter='' or tag_filter=any(t.tag_ids))
 and(starter_filter='' or t.starter_topic_id=starter_filter)
 and(btrim(search_query)='' or to_tsvector('english',t.title||' '||t.body)@@websearch_to_tsquery('english',search_query))
 and((cursor_created_at is null and cursor_id is null) or(t.created_at,t.id)<(cursor_created_at,cursor_id))
 order by t.created_at desc,t.id desc limit least(greatest(page_size,1),51);
$$;
revoke all on function public.browse_community(text,text,text,text,integer,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.browse_community(text,text,text,text,integer,timestamptz,uuid) to anon,authenticated;
-- Compatibility for existing callers and archived links.
create or replace function public.browse_discussions(search_query text default '',category_filter text default '',page_size integer default 21,cursor_created_at timestamptz default null,cursor_id uuid default null)
returns setof public.threads language sql stable security invoker set search_path='' as $$
 select * from public.browse_community(search_query,case category_filter when 'Technical help' then 'Technical Help & Troubleshooting' when 'Parts & fitment' then 'Parts, Compatibility & Sourcing' when 'Build journals' then 'Restorations & Build Journals' when 'General discussion' then 'General E34 Community' else category_filter end,'','',page_size,cursor_created_at,cursor_id);
$$;

create function public.my_community_restrictions()
returns table(id uuid,kind text,reason text,expires_at timestamptz,revoked_at timestamptz,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select id,kind,reason,expires_at,revoked_at,created_at from e34_private.community_restrictions where user_id=auth.uid() order by created_at desc limit 100;
$$;
revoke all on function public.my_community_restrictions() from public,anon,authenticated;
grant execute on function public.my_community_restrictions() to authenticated;
create function public.appeal_community_restriction(restriction uuid,explanation text) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid; v_actor uuid:=auth.uid();
begin
 if v_actor is null or not exists(select 1 from e34_private.community_restrictions where id=restriction and user_id=v_actor) then raise exception 'Restriction unavailable'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text,0));
 if exists(select 1 from public.community_appeals where restriction_id=restriction and user_id=v_actor and status<>'resolved') then raise exception 'An appeal is already open'; end if;
 if (select count(*) from public.community_appeals where user_id=v_actor and created_at>now()-interval '1 day')>=3 then raise exception 'Appeal limit reached'; end if;
 insert into public.community_appeals(user_id,restriction_id,body) values(v_actor,restriction,explanation) returning id into new_id; return new_id;
end $$;
revoke all on function public.appeal_community_restriction(uuid,text) from public,anon,authenticated;
grant execute on function public.appeal_community_restriction(uuid,text) to authenticated;

-- All staff operations below require server-verified role plus MFA.
create function public.moderate_community(action text,target_id uuid,reason text,restriction_kind text default null,until_time timestamptz default null,internal_note text default '') returns void
language plpgsql security definer set search_path='' as $$
begin
 if not e34_private.has_role('moderator') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Moderator permission and MFA required'; end if;
 if char_length(btrim(reason)) not between 10 and 2000 then raise exception 'Give a moderation reason in 10–2000 characters'; end if;
 if action='hide-thread' then update public.threads set hidden=true where id=target_id;
 elsif action='restore-thread' then update public.threads set hidden=false where id=target_id;
 elsif action='lock-thread' then update public.threads set locked=true where id=target_id;
 elsif action='unlock-thread' then update public.threads set locked=false where id=target_id;
 elsif action='hide-post' then update public.posts set hidden=true where id=target_id;
 elsif action='restore-post' then update public.posts set hidden=false where id=target_id;
 elsif action='restrict' then
  if restriction_kind in ('timeout','suspension') and (until_time is null or until_time<=now() or until_time>now()+interval '365 days') then raise exception 'Choose a future expiry within one year'; end if;
  insert into e34_private.community_restrictions(user_id,kind,reason,internal_note,expires_at,actor) values(target_id,restriction_kind,reason,internal_note,until_time,auth.uid());
 elsif action='revoke-restriction' then update e34_private.community_restrictions set revoked_at=now() where id=target_id;
 elsif action='resolve-appeal' then update public.community_appeals set status='resolved',response=reason where id=target_id;
 else raise exception 'Unknown moderation action'; end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata) values(auth.uid(),'community:'||action,'community',target_id::text,jsonb_build_object('reason',reason));
end $$;
revoke all on function public.moderate_community(text,uuid,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.moderate_community(text,uuid,text,text,timestamptz,text) to authenticated;

create function public.community_moderation_state() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not e34_private.has_role('moderator') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Moderator permission and MFA required'; end if;
 return jsonb_build_object(
  'restrictions',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from(select * from e34_private.community_restrictions order by created_at desc limit 100)r),
  'appeals',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from(select * from public.community_appeals where status<>'resolved' order by created_at limit 100)a),
  'audit',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from(select * from e34_private.audit_events where action like 'community:%' order by created_at desc limit 50)e),
  'counts',jsonb_build_object('threads',(select count(*) from public.threads),'replies',(select count(*) from public.posts),'open_reports',(select count(*) from public.reports where status in ('open','reviewing'))));
end $$;
revoke all on function public.community_moderation_state() from public,anon,authenticated;
grant execute on function public.community_moderation_state() to authenticated;
create policy report_staff_mfa on public.reports as restrictive for update to authenticated using(coalesce((select auth.jwt()->>'aal'),'')='aal2') with check(coalesce((select auth.jwt()->>'aal'),'')='aal2');
