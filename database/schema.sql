-- E34 Collective relational foundation. Applied through the Supabase migration API.
create schema if not exists e34_private;
revoke all on schema e34_private from public;
grant usage on schema e34_private to authenticated;

create table public.vehicle_models (id text primary key, name text not null, engines text[] not null, coverage text not null);
create table public.sources (id text primary key, title text not null, publisher text, url text, rights text not null, coverage jsonb not null default '{}', review_status text not null default 'unreviewed');
create table public.components (id text primary key, name text not null, system_id text not null);
create table public.assemblies (id text primary key, component_id text references public.components, title text not null, source_id text references public.sources, source_locator text, boundary text not null);
create table public.parts (id text primary key, assembly_id text not null references public.assemblies, name text not null, number_normalized text unique, source_id text references public.sources, source_locator text, review_status text not null check(review_status in ('catalog-listed','reference-only','verified')), detail jsonb not null default '{}');
create table public.part_fitments (id uuid primary key default gen_random_uuid(), part_id text not null references public.parts, model_id text references public.vehicle_models, engine text, market text, body text, production_from date, production_to date, status text not null check(status in ('confirmed','conditional','unverified','incompatible')), source_id text not null references public.sources, conditions text not null, check(production_to is null or production_from is null or production_to>=production_from));
create table public.part_interchanges (id uuid primary key default gen_random_uuid(), source_part_id text not null references public.parts, target_part_id text not null references public.parts, relationship text not null check(relationship in ('identical','direct_substitute','conditional','adaptable','incompatible')), source_id text not null references public.sources, conditions text not null, review_status text not null default 'unverified', check(source_part_id<>target_part_id));
create table public.guides (id text primary key, component_id text references public.components, title text not null, source_id text references public.sources, source_locator text not null, engines text[] not null default '{}', review_status text not null default 'draft', content jsonb not null);
create table public.profiles (id uuid primary key references auth.users on delete cascade, display_name text not null check(char_length(display_name) between 2 and 60), bio text not null default '' check(char_length(bio)<=1000), created_at timestamptz not null default now());
create table e34_private.staff_roles (user_id uuid references auth.users on delete cascade, role text check(role in ('reviewer','moderator','admin')), primary key(user_id,role));
create function e34_private.has_role(required_role text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from e34_private.staff_roles where user_id=(select auth.uid()) and role in(required_role,'admin')); $$;
revoke all on function e34_private.has_role(text) from public;
grant execute on function e34_private.has_role(text) to authenticated;

create table public.threads (id uuid primary key default gen_random_uuid(), author_id uuid not null default auth.uid() references auth.users on delete cascade, title text not null check(char_length(title) between 8 and 160), body text not null check(char_length(body) between 20 and 20000), category text not null check(category in ('Technical help','Parts & fitment','Build journals','General discussion')), model_id text references public.vehicle_models, engine text, component_id text references public.components, observations jsonb not null default '[]', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), hidden boolean not null default false);
create table public.posts (id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.threads on delete cascade, author_id uuid not null default auth.uid() references auth.users on delete cascade, body text not null check(char_length(body) between 2 and 20000), created_at timestamptz not null default now(), hidden boolean not null default false, unique(id,thread_id));
create table public.accepted_answers (thread_id uuid primary key references public.threads on delete cascade, post_id uuid not null, accepted_by uuid not null default auth.uid() references auth.users on delete cascade, created_at timestamptz not null default now(), foreign key(post_id,thread_id) references public.posts(id,thread_id) on delete cascade);
create table public.owned_vehicles (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, nickname text not null check(char_length(nickname) between 1 and 80), model_id text not null references public.vehicle_models, configuration jsonb not null default '{}', mileage numeric check(mileage>=0), mileage_unit text not null default 'mi' check(mileage_unit in ('mi','km')), created_at timestamptz not null default now(), unique(id,user_id));
create table public.service_records (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, vehicle_id uuid not null, title text not null check(char_length(title) between 2 and 160), performed_on date not null, mileage numeric check(mileage>=0), notes text not null default '' check(char_length(notes)<=12000), created_at timestamptz not null default now(), foreign key(vehicle_id,user_id) references public.owned_vehicles(id,user_id) on delete cascade);
create table public.bookmarks (user_id uuid not null default auth.uid() references auth.users on delete cascade, kind text not null check(kind in ('guide','part','article','thread')), target_id text not null check(char_length(target_id) between 1 and 120), title text not null check(char_length(title)<=200), created_at timestamptz not null default now(), primary key(user_id,kind,target_id));
create table public.repair_outcomes (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, guide_id text not null references public.guides, vehicle_id uuid, result text not null check(result in ('resolved','improved','unchanged','worse','not_completed')), notes text not null check(char_length(notes) between 10 and 12000), review_status text not null default 'reported' check(review_status in ('reported','reviewed','verified','disputed')), created_at timestamptz not null default now(), foreign key(vehicle_id,user_id) references public.owned_vehicles(id,user_id));
create table public.reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null default auth.uid() references auth.users on delete cascade, target_type text not null check(target_type in ('thread','post','guide','part')), target_id text not null, reason text not null check(char_length(reason) between 10 and 2000), status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')), created_at timestamptz not null default now());
create table public.review_submissions (id uuid primary key default gen_random_uuid(), author_id uuid not null default auth.uid() references auth.users on delete cascade, target_type text not null check(target_type in ('guide','part','article','fitment')), target_id text not null, correction text not null check(char_length(correction) between 20 and 12000), evidence_url text check(evidence_url ~ '^https://'), status text not null default 'pending' check(status in ('pending','accepted','rejected','needs_evidence')), created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, thread_id uuid references public.threads on delete cascade, message text not null, read_at timestamptz, created_at timestamptz not null default now());
create table e34_private.audit_events (id bigint generated always as identity primary key, actor_id uuid, action text not null, table_name text not null, record_id text, created_at timestamptz not null default now());

create index threads_recent on public.threads(created_at desc);
create index threads_author on public.threads(author_id);
create index posts_thread on public.posts(thread_id,created_at);
create index posts_author on public.posts(author_id);
create index owned_vehicles_owner on public.owned_vehicles(user_id);
create index service_records_vehicle on public.service_records(vehicle_id,user_id);
create index service_records_owner on public.service_records(user_id);
create index outcomes_owner on public.repair_outcomes(user_id);
create index outcomes_guide on public.repair_outcomes(guide_id);
create index notifications_owner on public.notifications(user_id,created_at desc);
create index reports_reporter on public.reports(reporter_id);
create index submissions_author on public.review_submissions(author_id);
create index fitment_part on public.part_fitments(part_id);
create index threads_search on public.threads using gin(to_tsvector('english',title||' '||body));

-- Immutable ownership and moderation fields; enforce rates independently of UI.
create function e34_private.guard_contribution() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid(); recent integer;
begin
 if actor is null then return new; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 if tg_op='INSERT' then
  if tg_table_name='threads' then select count(*) into recent from public.threads where author_id=actor and created_at>now()-interval '1 hour';
  elsif tg_table_name='posts' then select count(*) into recent from public.posts where author_id=actor and created_at>now()-interval '1 hour';
  elsif tg_table_name='reports' then select count(*) into recent from public.reports where reporter_id=actor and created_at>now()-interval '1 hour';
  else select count(*) into recent from public.review_submissions where author_id=actor and created_at>now()-interval '1 hour'; end if;
  if recent >= (case when tg_table_name='posts' then 40 else 10 end) then raise exception 'Contribution limit reached. Please try again later.'; end if;
  new.created_at:=now();
  if tg_table_name in ('threads','posts') then new.hidden:=false; end if;
 else
  if new.author_id<>old.author_id or new.created_at<>old.created_at then raise exception 'Ownership and creation time are immutable'; end if;
  if new.hidden is distinct from old.hidden and not e34_private.has_role('moderator') then raise exception 'Moderator permission required'; end if;
  if tg_table_name='posts' then
   if new.thread_id<>old.thread_id then raise exception 'Replies cannot move between discussions'; end if;
  end if;
  if tg_table_name='threads' then new.updated_at:=now(); end if;
 end if;
 return new;
end $$;
revoke all on function e34_private.guard_contribution() from public;
create trigger guard_threads before insert or update on public.threads for each row execute function e34_private.guard_contribution();
create trigger guard_posts before insert or update on public.posts for each row execute function e34_private.guard_contribution();
create trigger guard_reports before insert on public.reports for each row execute function e34_private.guard_contribution();
create trigger guard_submissions before insert on public.review_submissions for each row execute function e34_private.guard_contribution();

create function e34_private.notify_reply() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.notifications(user_id,thread_id,message) select author_id,new.thread_id,'A member replied to your discussion.' from public.threads where id=new.thread_id and author_id<>new.author_id;
 return new;
end $$;
revoke all on function e34_private.notify_reply() from public;
create trigger reply_notification after insert on public.posts for each row execute function e34_private.notify_reply();

-- RLS is enabled on every exposed table.
do $$ declare t text; begin
 foreach t in array array['vehicle_models','sources','components','assemblies','parts','part_fitments','part_interchanges','guides'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy reference_read on public.%I for select to anon,authenticated using(true)',t);
 execute format('grant select on public.%I to anon,authenticated',t);
 end loop;
end $$;
alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to anon,authenticated using(true);
create policy profile_insert on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
grant select on public.profiles to anon;
grant select,insert,update on public.profiles to authenticated;

alter table public.threads enable row level security;
create policy thread_read on public.threads for select to anon,authenticated using(not hidden or author_id=(select auth.uid()));
create policy thread_insert on public.threads for insert to authenticated with check(author_id=(select auth.uid()) and not hidden);
create policy thread_update on public.threads for update to authenticated using(author_id=(select auth.uid()) or e34_private.has_role('moderator')) with check(author_id=(select auth.uid()) or e34_private.has_role('moderator'));
create policy thread_delete on public.threads for delete to authenticated using(author_id=(select auth.uid()) or e34_private.has_role('moderator'));
alter table public.posts enable row level security;
create policy post_read on public.posts for select to anon,authenticated using((not hidden or author_id=(select auth.uid())) and exists(select 1 from public.threads where id=thread_id and not hidden));
create policy post_insert on public.posts for insert to authenticated with check(author_id=(select auth.uid()) and not hidden and exists(select 1 from public.threads where id=thread_id and not hidden));
create policy post_update on public.posts for update to authenticated using(author_id=(select auth.uid()) or e34_private.has_role('moderator')) with check(author_id=(select auth.uid()) or e34_private.has_role('moderator'));
create policy post_delete on public.posts for delete to authenticated using(author_id=(select auth.uid()) or e34_private.has_role('moderator'));
grant select on public.threads,public.posts to anon;
grant select,insert,update,delete on public.threads,public.posts to authenticated;

alter table public.accepted_answers enable row level security;
create policy answer_read on public.accepted_answers for select to anon,authenticated using(exists(select 1 from public.threads where id=thread_id and not hidden));
create policy answer_insert on public.accepted_answers for insert to authenticated with check(accepted_by=(select auth.uid()) and exists(select 1 from public.threads where id=thread_id and author_id=(select auth.uid())) and exists(select 1 from public.posts where id=post_id and not hidden));
create policy answer_delete on public.accepted_answers for delete to authenticated using(accepted_by=(select auth.uid()));
grant select on public.accepted_answers to anon;
grant select,insert,delete on public.accepted_answers to authenticated;

do $$ declare t text; begin
 foreach t in array array['owned_vehicles','service_records','bookmarks'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check(user_id=(select auth.uid()))',t);
 execute format('create policy owner_update on public.%I for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using(user_id=(select auth.uid()))',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
alter table public.repair_outcomes enable row level security;
create policy outcome_read on public.repair_outcomes for select to authenticated using(user_id=(select auth.uid()) or e34_private.has_role('reviewer'));
create policy outcome_insert on public.repair_outcomes for insert to authenticated with check(user_id=(select auth.uid()) and review_status='reported');
create policy outcome_review on public.repair_outcomes for update to authenticated using(e34_private.has_role('reviewer')) with check(e34_private.has_role('reviewer'));
grant select,insert,update on public.repair_outcomes to authenticated;

alter table public.reports enable row level security;
create policy report_read on public.reports for select to authenticated using(reporter_id=(select auth.uid()) or e34_private.has_role('moderator'));
create policy report_insert on public.reports for insert to authenticated with check(reporter_id=(select auth.uid()) and status='open');
create policy report_review on public.reports for update to authenticated using(e34_private.has_role('moderator')) with check(e34_private.has_role('moderator'));
grant select,insert,update on public.reports to authenticated;
alter table public.review_submissions enable row level security;
create policy submission_read on public.review_submissions for select to authenticated using(author_id=(select auth.uid()) or e34_private.has_role('reviewer'));
create policy submission_insert on public.review_submissions for insert to authenticated with check(author_id=(select auth.uid()) and status='pending');
create policy submission_review on public.review_submissions for update to authenticated using(e34_private.has_role('reviewer')) with check(e34_private.has_role('reviewer'));
grant select,insert,update on public.review_submissions to authenticated;
alter table public.notifications enable row level security;
create policy notification_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notification_update on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;

alter table e34_private.staff_roles enable row level security;
alter table e34_private.audit_events enable row level security;
revoke all on all tables in schema e34_private from anon,authenticated;
