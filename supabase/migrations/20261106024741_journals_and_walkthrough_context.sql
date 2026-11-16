-- Private vehicle records are never used as the public journal projection.
alter table public.owned_vehicles add column exterior_color text not null default '' check(char_length(exterior_color)<=100),
 add column interior_trim text not null default '' check(char_length(interior_trim)<=100),
 add column private_notes text not null default '' check(char_length(private_notes)<=12000);

create table public.guide_step_index (
 guide_id text not null references public.guides,revision text not null check(revision ~ '^[a-f0-9]{24}$'),
 step_number integer not null check(step_number between 1 and 200),title text not null,
 primary key(guide_id,revision,step_number)
);
alter table public.guide_step_index enable row level security;
revoke all on public.guide_step_index from public,anon,authenticated;
grant select on public.guide_step_index to anon,authenticated;
create policy guide_steps_read on public.guide_step_index for select to anon,authenticated using(true);

create table public.guide_progress (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,
 vehicle_id uuid,guide_id text not null references public.guides,revision text not null,
 completed_steps integer[] not null default '{}' check(cardinality(completed_steps)<=200),
 content_version integer not null default 1,updated_at timestamptz not null default now(),
 unique nulls not distinct(user_id,vehicle_id,guide_id,revision),
 foreign key(vehicle_id,user_id) references public.owned_vehicles(id,user_id) on delete cascade
);
create index guide_progress_vehicle on public.guide_progress(vehicle_id,user_id);
create function e34_private.guard_guide_progress() returns trigger language plpgsql set search_path='' as $$begin
 if not exists(select 1 from public.guide_step_index where guide_id=new.guide_id and revision=new.revision) or exists(select 1 from unnest(new.completed_steps) n where not exists(select 1 from public.guide_step_index where guide_id=new.guide_id and revision=new.revision and step_number=n+1)) or cardinality(new.completed_steps)<>(select count(distinct n) from unnest(new.completed_steps)n) then raise exception 'Invalid checks for this guide revision'; end if;
 if tg_op='UPDATE' and (new.id,new.user_id,new.vehicle_id,new.guide_id,new.revision) is distinct from (old.id,old.user_id,old.vehicle_id,old.guide_id,old.revision) then raise exception 'Progress identity is immutable'; end if;
 new.content_version:=case when tg_op='UPDATE' then old.content_version+1 else 1 end;new.updated_at:=now();return new;
end$$;
revoke all on function e34_private.guard_guide_progress() from public,anon,authenticated;
create trigger guard_progress before insert or update on public.guide_progress for each row execute function e34_private.guard_guide_progress();
alter table public.guide_progress enable row level security;
revoke all on public.guide_progress from public,anon,authenticated;
grant select,insert,update,delete on public.guide_progress to authenticated;
create policy progress_own on public.guide_progress for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create table public.owner_journal_entries (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,
 vehicle_id uuid not null,entry_date date not null default current_date,
 title text not null check(char_length(btrim(title)) between 2 and 160),body text not null check(char_length(btrim(body)) between 20 and 20000),
 stage text not null default 'planned' check(stage in ('planned','in_progress','completed','paused')),
 mileage numeric check(mileage between 0 and 100000000),cost numeric check(cost between 0 and 100000000),currency text not null default 'USD' check(currency ~ '^[A-Z]{3}$'),
 private_notes text not null default '' check(char_length(private_notes)<=12000),
 guide_id text references public.guides,guide_revision text,guide_step integer,part_id text references public.parts,
 content_version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(vehicle_id,user_id) references public.owned_vehicles(id,user_id) on delete cascade,
 foreign key(guide_id,guide_revision,guide_step) references public.guide_step_index,
 check((guide_revision is null and guide_step is null) or (guide_id is not null and guide_revision is not null and guide_step is not null))
);
create index journal_owner_vehicle on public.owner_journal_entries(user_id,vehicle_id,entry_date desc,id desc);
create index journal_vehicle_fk on public.owner_journal_entries(vehicle_id,user_id);
create index journal_guide_fk on public.owner_journal_entries(guide_id,guide_revision,guide_step);
create index journal_part_fk on public.owner_journal_entries(part_id);
create function e34_private.guard_journal_entry() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='UPDATE' and (new.id,new.user_id,new.vehicle_id,new.created_at) is distinct from(old.id,old.user_id,old.vehicle_id,old.created_at) then raise exception 'Journal identity is immutable';end if;
 new.content_version:=case when tg_op='UPDATE' then old.content_version+1 else 1 end;new.updated_at:=now();return new;
end$$;
revoke all on function e34_private.guard_journal_entry() from public,anon,authenticated;
create trigger journal_version before insert or update on public.owner_journal_entries for each row execute function e34_private.guard_journal_entry();
alter table public.owner_journal_entries enable row level security;
revoke all on public.owner_journal_entries from public,anon,authenticated;
grant select,insert,update,delete on public.owner_journal_entries to authenticated;
create policy journal_private on public.owner_journal_entries for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create table public.garage_journal_entries (
 id uuid primary key default gen_random_uuid(),garage_entry_id uuid not null references public.garage_showcases on delete cascade,
 user_id uuid not null references auth.users on delete cascade,entry_date date not null,title text not null,body text not null,stage text not null,
 guide_id text references public.guides,guide_revision text,guide_step integer,part_id text references public.parts,
 published boolean not null default true,hidden boolean not null default false,source_version integer not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(guide_id,guide_revision,guide_step) references public.guide_step_index,
 check((guide_revision is null and guide_step is null) or (guide_id is not null and guide_revision is not null and guide_step is not null))
);
create index garage_journal_cursor on public.garage_journal_entries(garage_entry_id,entry_date desc,id desc);
create index garage_journal_user on public.garage_journal_entries(user_id);
create index garage_journal_guide on public.garage_journal_entries(guide_id,guide_revision,guide_step);
create index garage_journal_part on public.garage_journal_entries(part_id);
alter table public.garage_journal_entries enable row level security;
revoke all on public.garage_journal_entries from public,anon,authenticated;
grant select on public.garage_journal_entries to anon,authenticated;
create policy journal_public_read on public.garage_journal_entries for select to anon,authenticated using(
 (published and not hidden and exists(select 1 from public.garage_showcases g where g.id=garage_entry_id and g.published and not g.hidden))
 or user_id=(select auth.uid())
);
create table e34_private.journal_publications (
 source_id uuid primary key references public.owner_journal_entries on delete cascade,
 public_id uuid unique not null references public.garage_journal_entries on delete cascade,user_id uuid not null references auth.users on delete cascade
);
create index journal_bindings_public on e34_private.journal_publications(public_id);
create index journal_bindings_user on e34_private.journal_publications(user_id);
alter table e34_private.journal_publications enable row level security;
revoke all on e34_private.journal_publications from public,anon,authenticated;
create policy journal_binding_deny on e34_private.journal_publications for all to anon,authenticated using(false) with check(false);
create function e34_private.remove_journal_snapshot() returns trigger language plpgsql security definer set search_path='' as $$begin delete from public.garage_journal_entries where id=old.public_id;return old;end$$;
revoke all on function e34_private.remove_journal_snapshot() from public,anon,authenticated;
create trigger journal_source_removed after delete on e34_private.journal_publications for each row execute function e34_private.remove_journal_snapshot();

create function e34_private.publish_journal_entry(source uuid,expected_version integer) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();j public.owner_journal_entries;shared uuid;publication uuid;
begin
 perform e34_private.community_can_contribute(actor);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 select * into j from public.owner_journal_entries where id=source and user_id=actor for update;
 if j.id is null then raise exception 'Journal entry unavailable';end if;
 if j.content_version<>expected_version then raise exception 'Journal changed. Reload and review before publishing.';end if;
 select g.id into shared from e34_private.garage_publications b join public.garage_showcases g on g.id=b.entry_id where b.vehicle_id=j.vehicle_id and b.user_id=actor and g.published and not g.hidden;
 if shared is null then raise exception 'Share this car’s garage story before publishing journal updates';end if;
 if(select count(*) from e34_private.community_actions where community_actions.actor=publish_journal_entry.actor and action='journal' and created_at>now()-interval '1 hour')>=20 then raise exception 'Journal publishing limit reached. Please try later.';end if;
 select public_id into publication from e34_private.journal_publications where source_id=source and user_id=actor;
 if publication is null then
  insert into public.garage_journal_entries(garage_entry_id,user_id,entry_date,title,body,stage,guide_id,guide_revision,guide_step,part_id,source_version)
  values(shared,actor,j.entry_date,j.title,j.body,j.stage,j.guide_id,j.guide_revision,j.guide_step,j.part_id,j.content_version) returning id into publication;
  insert into e34_private.journal_publications values(source,publication,actor);
 else
  update public.garage_journal_entries set entry_date=j.entry_date,title=j.title,body=j.body,stage=j.stage,guide_id=j.guide_id,guide_revision=j.guide_revision,guide_step=j.guide_step,part_id=j.part_id,source_version=j.content_version,published=true,updated_at=now() where id=publication and user_id=actor;
 end if;
 insert into e34_private.community_actions(actor,action) values(actor,'journal');
 return publication;
end$$;
create function public.publish_journal_entry(source uuid,expected_version integer) returns uuid language sql security invoker set search_path='' as $$select e34_private.publish_journal_entry(source,expected_version);$$;
create function e34_private.withdraw_journal_entry(source uuid) returns void language plpgsql security definer set search_path='' as $$begin
 update public.garage_journal_entries set published=false,updated_at=now() where id=(select public_id from e34_private.journal_publications where source_id=source and user_id=auth.uid());
 if not found then raise exception 'Journal publication unavailable';end if;
end$$;
create function public.withdraw_journal_entry(source uuid) returns void language sql security invoker set search_path='' as $$select e34_private.withdraw_journal_entry(source);$$;
create function e34_private.my_journal_publications() returns table(source_id uuid,public_id uuid,garage_entry_id uuid,published boolean,hidden boolean,source_version integer) language sql stable security definer set search_path='' as $$
 select b.source_id,p.id,p.garage_entry_id,p.published,p.hidden,p.source_version from e34_private.journal_publications b join public.garage_journal_entries p on p.id=b.public_id where b.user_id=auth.uid();
$$;
create function public.my_journal_publications() returns table(source_id uuid,public_id uuid,garage_entry_id uuid,published boolean,hidden boolean,source_version integer) language sql stable security invoker set search_path='' as $$select * from e34_private.my_journal_publications();$$;
revoke all on function e34_private.publish_journal_entry(uuid,integer),public.publish_journal_entry(uuid,integer),e34_private.withdraw_journal_entry(uuid),public.withdraw_journal_entry(uuid),e34_private.my_journal_publications(),public.my_journal_publications() from public,anon,authenticated;
grant execute on function e34_private.publish_journal_entry(uuid,integer),public.publish_journal_entry(uuid,integer),e34_private.withdraw_journal_entry(uuid),public.withdraw_journal_entry(uuid),e34_private.my_journal_publications(),public.my_journal_publications() to authenticated;

alter table public.threads add column guide_revision text,add column guide_step integer,
 add column journal_update_id uuid references public.garage_journal_entries on delete set null,
 add foreign key(guide_id,guide_revision,guide_step) references public.guide_step_index,
 add check((guide_revision is null and guide_step is null) or (guide_id is not null and guide_revision is not null and guide_step is not null));
create index threads_guide_step on public.threads(guide_id,guide_revision,guide_step,created_at desc);
create index threads_journal_update on public.threads(journal_update_id);
create function e34_private.guard_thread_journal() returns trigger language plpgsql security definer set search_path='' as $$
declare j public.garage_journal_entries;begin
 if tg_op='UPDATE' and new.journal_update_id is not distinct from old.journal_update_id then return new;end if;
 if new.journal_update_id is not null then
  select * into j from public.garage_journal_entries where id=new.journal_update_id and published and not hidden;
  if j.id is null or not exists(select 1 from public.garage_showcases where id=j.garage_entry_id and published and not hidden) then raise exception 'Choose a published journal update';end if;
  new.garage_entry_id:=j.garage_entry_id;new.guide_id:=j.guide_id;new.guide_revision:=j.guide_revision;new.guide_step:=j.guide_step;new.part_id:=j.part_id;
 end if;return new;
end$$;
revoke all on function e34_private.guard_thread_journal() from public,anon,authenticated;
create trigger a_thread_0_journal before insert or update on public.threads for each row execute function e34_private.guard_thread_journal();

create or replace function e34_private.guard_community() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); parent public.threads; target public.posts; recent integer; is_staff boolean;
begin
 -- FK cleanup may affect a discussion by another author. Only permit the
 -- precise nulling operation after its referenced public snapshot is gone.
 if tg_table_name='threads' and tg_op='UPDATE' then
  if old.journal_update_id is not null and new.journal_update_id is null
   and (to_jsonb(new)-'journal_update_id')=(to_jsonb(old)-'journal_update_id')
   and not exists(select 1 from public.garage_journal_entries where id=old.journal_update_id) then return new; end if;
  if to_jsonb(old)->>'garage_entry_id' is not null and to_jsonb(new)->>'garage_entry_id' is null
   and (to_jsonb(new)-'garage_entry_id')=(to_jsonb(old)-'garage_entry_id')
   and not exists(select 1 from public.garage_showcases where id=(to_jsonb(old)->>'garage_entry_id')::uuid) then return new; end if;
 end if;
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


-- Immutable guide/step identities generated from the reviewed application content.
insert into public.guide_step_index(guide_id,revision,step_number,title) values
('identify-your-engine','bffabae78e2e7427069e0d7e',1,'Record the actual vehicle'),
('identify-your-engine','bffabae78e2e7427069e0d7e',2,'Choose a source-supported starting point'),
('identify-your-engine','bffabae78e2e7427069e0d7e',3,'Check the car against its history'),
('identify-your-engine','bffabae78e2e7427069e0d7e',4,'Carry the identity forward'),
('cooling-system-visual-check','355ab87150fd6bf2a1f95a8b',1,'Make the work area safe'),
('cooling-system-visual-check','355ab87150fd6bf2a1f95a8b',2,'Record level and visible leakage'),
('cooling-system-visual-check','355ab87150fd6bf2a1f95a8b',3,'Look over hoses and the drive belt'),
('cooling-system-visual-check','355ab87150fd6bf2a1f95a8b',4,'Inspect the radiator air path'),
('cooling-system-visual-check','355ab87150fd6bf2a1f95a8b',5,'Choose the next test from the evidence'),
('cooling-fan-airflow-check','ec0626f718e48c7bed2d7c3e',1,'Describe when the symptom happens'),
('cooling-fan-airflow-check','ec0626f718e48c7bed2d7c3e',2,'Identify the two fan arrangements'),
('cooling-fan-airflow-check','ec0626f718e48c7bed2d7c3e',3,'Inspect visible condition'),
('cooling-fan-airflow-check','ec0626f718e48c7bed2d7c3e',4,'Escalate to the appropriate controlled test'),
('m50-water-pump-job-planning','a0ebe9e0e41c6f2c55976074',1,'Confirm the M50 application'),
('m50-water-pump-job-planning','a0ebe9e0e41c6f2c55976074',2,'Plan access before draining'),
('m50-water-pump-job-planning','a0ebe9e0e41c6f2c55976074',3,'Match the pump and sealing parts'),
('m50-water-pump-job-planning','a0ebe9e0e41c6f2c55976074',4,'Preserve the installation cautions'),
('m50-water-pump-job-planning','a0ebe9e0e41c6f2c55976074',5,'Plan completion checks'),
('battery-connections-first-check','3b60d5c1f6145f24b09ade71',1,'Find the battery for this configuration'),
('battery-connections-first-check','3b60d5c1f6145f24b09ade71',2,'Inspect without disturbing the connections'),
('battery-connections-first-check','3b60d5c1f6145f24b09ade71',3,'Follow the ground path visually'),
('battery-connections-first-check','3b60d5c1f6145f24b09ade71',4,'Check the alternator belt visually'),
('battery-connections-first-check','3b60d5c1f6145f24b09ade71',5,'Request the next measurement'),
('front-strut-component-identification','d42647ea4f23a5c5480bb16f',1,'Distinguish the nearby components'),
('front-strut-component-identification','d42647ea4f23a5c5480bb16f',2,'Read the strut as an assembly'),
('front-strut-component-identification','d42647ea4f23a5c5480bb16f',3,'Check the production split'),
('front-strut-component-identification','d42647ea4f23a5c5480bb16f',4,'Verify fitment before ordering')
on conflict do nothing;
