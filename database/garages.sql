-- Ownership history remains private. Public garages are explicit, limited snapshots.
alter table public.owned_vehicles add column ownership_status text not null default 'current' check(ownership_status in ('current','previous')),
 add column acquired_year integer check(acquired_year between 1987 and 2100),
 add column released_year integer check(released_year between 1987 and 2100),
 add constraint ownership_years check((released_year is null or acquired_year is null or released_year>=acquired_year) and (ownership_status='previous' or released_year is null));
create table public.garage_showcases (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 title text not null check(char_length(btrim(title)) between 2 and 120),model_id text not null references public.vehicle_models,
 configuration jsonb not null default '{}' check(jsonb_typeof(configuration)='object' and octet_length(configuration::text)<=2048 and configuration-array['model','engine','year','month','market','body','transmission','steering']='{}'),
 ownership_status text not null check(ownership_status in ('current','previous')),
 acquired_year integer check(acquired_year between 1987 and 2100),released_year integer check(released_year between 1987 and 2100),
 story text not null check(char_length(btrim(story)) between 40 and 12000),
 published boolean not null default true,hidden boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index garage_showcases_recent on public.garage_showcases(created_at desc,id desc);
create index garage_showcases_owner on public.garage_showcases(user_id,created_at desc);
alter table public.garage_showcases enable row level security;
revoke all on public.garage_showcases from public,anon,authenticated;
grant select on public.garage_showcases to anon,authenticated;
create policy garages_public_read on public.garage_showcases for select to anon using(published and not hidden);
create policy garages_member_read on public.garage_showcases for select to authenticated using((published and not hidden) or user_id=(select auth.uid()));
create table e34_private.garage_publications (
 entry_id uuid primary key references public.garage_showcases on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 vehicle_id uuid not null,
 foreign key(vehicle_id,user_id) references public.owned_vehicles(id,user_id) on delete cascade,
 unique(user_id,vehicle_id)
);
alter table e34_private.garage_publications enable row level security;
revoke all on e34_private.garage_publications from public,anon,authenticated;
create policy garage_bindings_private on e34_private.garage_publications for all to anon,authenticated using(false) with check(false);
create function e34_private.remove_garage_snapshot() returns trigger
language plpgsql security definer set search_path='' as $$begin delete from public.garage_showcases where id=old.entry_id;return old;end$$;
revoke all on function e34_private.remove_garage_snapshot() from public,anon,authenticated;
create trigger garage_source_removed after delete on e34_private.garage_publications for each row execute function e34_private.remove_garage_snapshot();

create function e34_private.publish_garage_vehicle(vehicle uuid,entry_title text,entry_story text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v public.owned_vehicles;entry uuid;config jsonb;
begin
 perform e34_private.community_can_contribute(v_actor);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text,0));
 select * into v from public.owned_vehicles where id=vehicle and user_id=v_actor;
 if v.id is null then raise exception 'Choose a vehicle from your private garage'; end if;
 if(select count(*) from e34_private.community_actions where community_actions.actor=v_actor and action='garage' and created_at>now()-interval '1 hour')>=10 then raise exception 'Garage publishing limit reached. Please try later.'; end if;
 select coalesce(jsonb_object_agg(key,value),'{}') into config from jsonb_each(v.configuration) where key=any(array['model','engine','year','month','market','body','transmission','steering']) and jsonb_typeof(value)='string' and char_length(value#>>'{}')<=100;
 config:=config||jsonb_build_object('model',v.model_id);
 select entry_id into entry from e34_private.garage_publications where user_id=v_actor and vehicle_id=vehicle;
 if entry is null then
  insert into public.garage_showcases(user_id,title,model_id,configuration,ownership_status,acquired_year,released_year,story)
  values(v_actor,entry_title,v.model_id,config,v.ownership_status,v.acquired_year,v.released_year,entry_story) returning id into entry;
  insert into e34_private.garage_publications(entry_id,user_id,vehicle_id) values(entry,v_actor,vehicle);
 else
  update public.garage_showcases set title=entry_title,configuration=config,model_id=v.model_id,ownership_status=v.ownership_status,acquired_year=v.acquired_year,released_year=v.released_year,story=entry_story,published=true,updated_at=now() where id=entry and user_id=v_actor;
 end if;
 insert into e34_private.community_actions(actor,action) values(v_actor,'garage');
 return entry;
end$$;
revoke all on function e34_private.publish_garage_vehicle(uuid,text,text) from public,anon,authenticated;
grant execute on function e34_private.publish_garage_vehicle(uuid,text,text) to authenticated;
create function public.publish_garage_vehicle(vehicle uuid,entry_title text,entry_story text) returns uuid language sql security invoker set search_path='' as $$select e34_private.publish_garage_vehicle(vehicle,entry_title,entry_story);$$;
revoke all on function public.publish_garage_vehicle(uuid,text,text) from public,anon,authenticated;
grant execute on function public.publish_garage_vehicle(uuid,text,text) to authenticated;

create function e34_private.my_garage_publications()
returns table(entry_id uuid,vehicle_id uuid,title text,story text,published boolean,hidden boolean)
language sql stable security definer set search_path='' as $$
 select g.id,b.vehicle_id,g.title,g.story,g.published,g.hidden from public.garage_showcases g join e34_private.garage_publications b on b.entry_id=g.id where b.user_id=auth.uid();
$$;
revoke all on function e34_private.my_garage_publications() from public,anon,authenticated;
grant execute on function e34_private.my_garage_publications() to authenticated;
create function public.my_garage_publications()
returns table(entry_id uuid,vehicle_id uuid,title text,story text,published boolean,hidden boolean)
language sql stable security invoker set search_path='' as $$select * from e34_private.my_garage_publications();$$;
revoke all on function public.my_garage_publications() from public,anon,authenticated;
grant execute on function public.my_garage_publications() to authenticated;

-- Unpublishing is a privacy action and remains available during a posting restriction.
create function e34_private.unpublish_garage(entry uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.garage_showcases set published=false,updated_at=now() where id=entry and user_id=auth.uid();
 if not found then raise exception 'Garage entry unavailable'; end if;
end$$;
revoke all on function e34_private.unpublish_garage(uuid) from public,anon,authenticated;
grant execute on function e34_private.unpublish_garage(uuid) to authenticated;
create function public.unpublish_garage(entry uuid) returns void language sql security invoker set search_path='' as $$select e34_private.unpublish_garage(entry);$$;
revoke all on function public.unpublish_garage(uuid) from public,anon,authenticated;
grant execute on function public.unpublish_garage(uuid) to authenticated;

create function public.browse_garages(search_query text default '',ownership_filter text default '',page_size integer default 21,cursor_created_at timestamptz default null,cursor_id uuid default null)
returns setof public.garage_showcases language sql stable security invoker set search_path='' as $$
 select g.* from public.garage_showcases g where g.published and not g.hidden and char_length(search_query)<=300
 and not e34_private.community_muted(g.user_id)
 and(ownership_filter='' or g.ownership_status=ownership_filter)
 and(btrim(search_query)='' or to_tsvector('english',g.title||' '||g.story||' '||g.model_id)@@websearch_to_tsquery('english',search_query))
 and((cursor_created_at is null and cursor_id is null)or(g.created_at,g.id)<(cursor_created_at,cursor_id))
 order by g.created_at desc,g.id desc limit least(greatest(page_size,1),51);
$$;
revoke all on function public.browse_garages(text,text,integer,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.browse_garages(text,text,integer,timestamptz,uuid) to anon,authenticated;
alter table public.threads add column garage_entry_id uuid references public.garage_showcases on delete set null;
create index threads_garage_entry on public.threads(garage_entry_id,created_at desc);
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check(target_type in ('thread','post','guide','part','garage'));

create or replace function e34_private.moderate_community(action text,target_id uuid,reason text,restriction_kind text default null,until_time timestamptz default null,internal_note text default '') returns void
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
 elsif action='hide-garage' then update public.garage_showcases set hidden=true where id=target_id;
 elsif action='restore-garage' then update public.garage_showcases set hidden=false where id=target_id;
 elsif action='restrict' then
  if restriction_kind in ('timeout','suspension') and (until_time is null or until_time<=now() or until_time>now()+interval '365 days') then raise exception 'Choose a future expiry within one year'; end if;
  insert into e34_private.community_restrictions(user_id,kind,reason,internal_note,expires_at,actor) values(target_id,restriction_kind,reason,internal_note,until_time,auth.uid());
 elsif action='revoke-restriction' then update e34_private.community_restrictions set revoked_at=now() where id=target_id;
 elsif action='resolve-appeal' then update public.community_appeals set status='resolved',response=reason where id=target_id;
 else raise exception 'Unknown moderation action'; end if;
 if not found then raise exception 'Moderation target not found'; end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata) values(auth.uid(),'community:'||action,'community',target_id::text,jsonb_build_object('reason',reason));
end $$;

create or replace function e34_private.guard_community() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); parent public.threads; target public.posts; recent integer; is_staff boolean;
begin
 -- FK cleanup may affect a discussion by another author. Only permit the
 -- precise nulling operation after its referenced public snapshot is gone.
 if tg_table_name='threads' and tg_op='UPDATE' then
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

create function e34_private.guard_thread_garage() returns trigger language plpgsql security definer set search_path='' as $$
declare shared public.garage_showcases;
begin
 if tg_op='UPDATE' and new.garage_entry_id is not distinct from old.garage_entry_id then return new; end if;
 if new.garage_entry_id is not null then
  select * into shared from public.garage_showcases where id=new.garage_entry_id and published and not hidden;
  if shared.id is null then raise exception 'Choose a published garage entry'; end if;
  new.model_id:=shared.model_id;
  new.engine:=nullif(shared.configuration->>'engine','');
  new.vehicle_configuration:=shared.configuration;
 end if;
 return new;
end $$;
revoke all on function e34_private.guard_thread_garage() from public,anon,authenticated;
create trigger a_thread_garage before insert or update on public.threads for each row execute function e34_private.guard_thread_garage();
create function public.browse_garage_entries(search_query text default '',ownership_filter text default '',owner_filter uuid default null,page_size integer default 21,cursor_created_at timestamptz default null,cursor_id uuid default null)
returns setof public.garage_showcases language sql stable security invoker set search_path='' as $$
 select g.* from public.garage_showcases g where g.published and not g.hidden and char_length(search_query)<=300
 and not e34_private.community_muted(g.user_id) and(owner_filter is null or g.user_id=owner_filter)
 and(ownership_filter='' or g.ownership_status=ownership_filter)
 and(btrim(search_query)='' or to_tsvector('english',g.title||' '||g.story||' '||g.model_id)@@websearch_to_tsquery('english',search_query))
 and((cursor_created_at is null and cursor_id is null)or(g.created_at,g.id)<(cursor_created_at,cursor_id))
 order by g.created_at desc,g.id desc limit least(greatest(page_size,1),51);
$$;
revoke all on function public.browse_garage_entries(text,text,uuid,integer,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.browse_garage_entries(text,text,uuid,integer,timestamptz,uuid) to anon,authenticated;
create or replace function public.browse_garages(search_query text default '',ownership_filter text default '',page_size integer default 21,cursor_created_at timestamptz default null,cursor_id uuid default null)
returns setof public.garage_showcases language sql stable security invoker set search_path='' as $$select * from public.browse_garage_entries(search_query,ownership_filter,null,page_size,cursor_created_at,cursor_id);$$;
