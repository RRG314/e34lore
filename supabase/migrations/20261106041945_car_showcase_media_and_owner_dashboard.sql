-- Extend canonical garages; originals never enter Storage. Only server-reencoded JPEGs do.
alter table public.garage_showcases add column featured_at timestamptz;
create index garages_featured on public.garage_showcases(featured_at desc,id) where published and not hidden and featured_at is not null;
create table public.owner_car_photos (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 vehicle_id uuid not null, object_path text not null unique,
 caption text not null default '' check(char_length(caption)<=400),
 alt_text text not null check(char_length(btrim(alt_text)) between 5 and 240),
 state text not null default 'processing' check(state in ('processing','ready','deleting')),
 width integer check(width between 1 and 1600), height integer check(height between 1 and 1600),
 bytes integer check(bytes between 1 and 2097152), sha256 text check(sha256 ~ '^[a-f0-9]{64}$'),
 rights_confirmed_at timestamptz not null default now(), created_at timestamptz not null default now(),
 foreign key(vehicle_id,user_id) references public.owned_vehicles(id,user_id) on delete cascade,
 check(object_path=user_id::text||'/'||id::text||'.jpg'), unique(id,user_id)
);
create index owner_car_photos_vehicle on public.owner_car_photos(vehicle_id,created_at,id);
alter table public.owner_car_photos enable row level security;
revoke all on public.owner_car_photos from public,anon,authenticated;
grant select on public.owner_car_photos to authenticated;
create policy own_photo_metadata on public.owner_car_photos for select to authenticated using(user_id=(select auth.uid()));
create table public.garage_photos (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 garage_id uuid not null references public.garage_showcases on delete cascade,
 object_path text not null unique, width integer not null, height integer not null, bytes integer not null,
 caption text not null check(char_length(caption)<=400), alt_text text not null check(char_length(alt_text) between 5 and 240),
 state text not null default 'pending' check(state in ('pending','approved','rejected','hidden')),
 review_reason text not null default '', created_at timestamptz not null default now(), reviewed_at timestamptz,
 check(width between 1 and 1600 and height between 1 and 1600 and bytes between 1 and 2097152)
);
create index garage_photos_parent on public.garage_photos(garage_id,created_at,id);
create index garage_photos_queue on public.garage_photos(state,created_at,id);
alter table public.garage_photos enable row level security;
revoke all on public.garage_photos from public,anon,authenticated;
-- Review reasons are private to owner/staff through a separate API, not public SELECT.
grant select(id,user_id,garage_id,object_path,width,height,bytes,caption,alt_text,state,created_at,reviewed_at) on public.garage_photos to anon,authenticated;
create policy shared_photo_read on public.garage_photos for select to anon,authenticated using(
 (state='approved' and exists(select 1 from public.garage_showcases g where g.id=garage_id and g.published and not g.hidden))
 or user_id=(select auth.uid())
 or ((select e34_private.has_role('moderator')) and coalesce((select auth.jwt()->>'aal'),'')='aal2')
);
create table e34_private.car_photo_publications (
 photo_id uuid primary key references public.garage_photos on delete cascade,
 source_photo_id uuid not null unique references public.owner_car_photos on delete cascade,
 user_id uuid not null references auth.users on delete cascade
);
alter table e34_private.car_photo_publications enable row level security;
revoke all on e34_private.car_photo_publications from public,anon,authenticated;
create table e34_private.media_cleanup_queue (
 object_path text primary key,user_id uuid not null,created_at timestamptz not null default now()
);
alter table e34_private.media_cleanup_queue enable row level security;
revoke all on e34_private.media_cleanup_queue from public,anon,authenticated;
create function e34_private.queue_car_photo_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into e34_private.media_cleanup_queue(object_path,user_id) values(old.object_path,old.user_id) on conflict do nothing; return old;end$$;
revoke all on function e34_private.queue_car_photo_cleanup() from public,anon,authenticated;
create trigger queue_photo_delete before delete on public.owner_car_photos for each row execute function e34_private.queue_car_photo_cleanup();
create function e34_private.remove_photo_publication() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from public.garage_photos where id=old.photo_id; return old;end$$;
revoke all on function e34_private.remove_photo_publication() from public,anon,authenticated;
create trigger remove_photo_source after delete on e34_private.car_photo_publications for each row execute function e34_private.remove_photo_publication();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('e34-car-photos','e34-car-photos',false,2097152,array['image/jpeg']);
-- Direct uploads/updates are deliberately absent; the authenticated processor writes clean bytes.
create policy car_photo_read on storage.objects for select to anon,authenticated using(bucket_id='e34-car-photos' and (
 exists(select 1 from public.owner_car_photos p where p.object_path=name and p.user_id=(select auth.uid()) and p.state='ready')
 or exists(select 1 from public.garage_photos p where p.object_path=name and (
 (p.state='approved' and exists(select 1 from public.garage_showcases g where g.id=p.garage_id and g.published and not g.hidden))
 or ((select e34_private.has_role('moderator')) and coalesce((select auth.jwt()->>'aal'),'')='aal2')))
));

create function e34_private.reserve_car_photo(vehicle uuid,caption_text text,alternative_text text,rights_confirmed boolean) returns public.owner_car_photos
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); photo uuid:=gen_random_uuid(); result public.owner_car_photos;
begin
 perform e34_private.community_can_contribute(actor);
 if rights_confirmed is distinct from true then raise exception 'Confirm that you own the photo or have permission to share it'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if not exists(select 1 from public.owned_vehicles where id=vehicle and user_id=actor) then raise exception 'Choose your own car'; end if;
 if (select count(*) from public.owner_car_photos p where p.user_id=actor)>=100 or (select count(*) from public.owner_car_photos p where p.vehicle_id=vehicle)>=12 then raise exception 'Photo limit reached: 12 per car and 100 per account'; end if;
 if (select count(*) from e34_private.community_actions a where a.actor=reserve_car_photo.actor and a.action='photo' and a.created_at>now()-interval '1 hour')>=24 then raise exception 'Upload limit reached. Try again later'; end if;
 insert into public.owner_car_photos(id,user_id,vehicle_id,object_path,caption,alt_text) values(photo,actor,vehicle,actor::text||'/'||photo::text||'.jpg',caption_text,alternative_text) returning * into result;
 insert into e34_private.community_actions(actor,action) values(actor,'photo');
 return result;
end$$;
revoke all on function e34_private.reserve_car_photo(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function e34_private.reserve_car_photo(uuid,text,text,boolean) to authenticated;
create function public.reserve_car_photo(vehicle uuid,caption_text text,alternative_text text,rights_confirmed boolean) returns public.owner_car_photos language sql security invoker set search_path='' as $$select e34_private.reserve_car_photo(vehicle,caption_text,alternative_text,rights_confirmed);$$;
revoke all on function public.reserve_car_photo(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_car_photo(uuid,text,text,boolean) to authenticated;
-- Service-only completion: dimensions/hash never come from a member's database write.
create function public.complete_car_photo(actor uuid,photo uuid,pixel_width integer,pixel_height integer,byte_count integer,content_hash text) returns void
language plpgsql security invoker set search_path='' as $$begin
 update public.owner_car_photos set state='ready',width=pixel_width,height=pixel_height,bytes=byte_count,sha256=content_hash where id=photo and user_id=actor and state='processing';
 if not found then raise exception 'Upload reservation unavailable'; end if;
end$$;
revoke all on function public.complete_car_photo(uuid,uuid,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.complete_car_photo(uuid,uuid,integer,integer,integer,text) to service_role;

create function e34_private.publish_car_photo(photo uuid,entry uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.owner_car_photos; publication uuid;
begin
 perform e34_private.community_can_contribute(actor);
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into p from public.owner_car_photos where id=photo and user_id=actor and state='ready';
 if p.id is null or not exists(select 1 from e34_private.garage_publications b join public.garage_showcases g on g.id=b.entry_id where b.entry_id=entry and b.user_id=actor and b.vehicle_id=p.vehicle_id and g.published) then raise exception 'Publish your car story before sharing its photo'; end if;
 select photo_id into publication from e34_private.car_photo_publications where source_photo_id=photo;
 if publication is not null then raise exception 'This photo was already submitted. Withdraw it before submitting again'; end if;
 insert into public.garage_photos(user_id,garage_id,object_path,width,height,bytes,caption,alt_text) values(actor,entry,p.object_path,p.width,p.height,p.bytes,p.caption,p.alt_text) returning id into publication;
 insert into e34_private.car_photo_publications values(publication,photo,actor);
 return publication;
end$$;
revoke all on function e34_private.publish_car_photo(uuid,uuid) from public,anon,authenticated;
grant execute on function e34_private.publish_car_photo(uuid,uuid) to authenticated;
create function public.publish_car_photo(photo uuid,entry uuid) returns uuid language sql security invoker set search_path='' as $$select e34_private.publish_car_photo(photo,entry);$$;
revoke all on function public.publish_car_photo(uuid,uuid) from public,anon,authenticated;
grant execute on function public.publish_car_photo(uuid,uuid) to authenticated;
create function e34_private.my_car_photo_publications() returns table(source_photo_id uuid,photo_id uuid,garage_id uuid,state text,review_reason text)
language sql stable security definer set search_path='' as $$select b.source_photo_id,p.id,p.garage_id,p.state,p.review_reason from e34_private.car_photo_publications b join public.garage_photos p on p.id=b.photo_id where b.user_id=auth.uid();$$;
revoke all on function e34_private.my_car_photo_publications() from public,anon,authenticated;
grant execute on function e34_private.my_car_photo_publications() to authenticated;
create function public.my_car_photo_publications() returns table(source_photo_id uuid,photo_id uuid,garage_id uuid,state text,review_reason text) language sql stable security invoker set search_path='' as $$select * from e34_private.my_car_photo_publications();$$;
revoke all on function public.my_car_photo_publications() from public,anon,authenticated;
grant execute on function public.my_car_photo_publications() to authenticated;
create function e34_private.withdraw_car_photo(photo uuid) returns void language plpgsql security definer set search_path='' as $$begin
 -- Preserve a hidden/rejected disposition to prevent owner resubmission bypass.
 update public.garage_photos set state=case when state in ('hidden','rejected') then state else 'pending' end where id=photo and user_id=auth.uid();
 if not found then raise exception 'Photo unavailable'; end if;
 delete from public.garage_photos where id=photo and user_id=auth.uid() and state='pending';
end$$;
revoke all on function e34_private.withdraw_car_photo(uuid) from public,anon,authenticated;
grant execute on function e34_private.withdraw_car_photo(uuid) to authenticated;
create function public.withdraw_car_photo(photo uuid) returns void language sql security invoker set search_path='' as $$select e34_private.withdraw_car_photo(photo);$$;
revoke all on function public.withdraw_car_photo(uuid) from public,anon,authenticated;
grant execute on function public.withdraw_car_photo(uuid) to authenticated;

create function e34_private.review_car_photo(photo uuid,decision text,reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if not e34_private.has_role('moderator') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Moderator permission and MFA required'; end if;
 if decision not in ('approved','rejected','hidden','pending') or char_length(btrim(reason)) not between 10 and 2000 then raise exception 'Choose a decision and record a reason in 10–2000 characters'; end if;
 update public.garage_photos set state=decision,review_reason=reason,reviewed_at=now() where id=photo;
 if not found then raise exception 'Photo unavailable'; end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata) values(auth.uid(),'photo:'||decision,'garage_photos',photo::text,jsonb_build_object('reason',reason));
end$$;
revoke all on function e34_private.review_car_photo(uuid,text,text) from public,anon,authenticated;
grant execute on function e34_private.review_car_photo(uuid,text,text) to authenticated;
create function public.review_car_photo(photo uuid,decision text,reason text) returns void language sql security invoker set search_path='' as $$select e34_private.review_car_photo(photo,decision,reason);$$;
revoke all on function public.review_car_photo(uuid,text,text) from public,anon,authenticated;
grant execute on function public.review_car_photo(uuid,text,text) to authenticated;
create function e34_private.feature_garage(entry uuid,featured boolean,reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if not e34_private.has_role('moderator') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Moderator permission and MFA required'; end if;
 if char_length(btrim(reason)) not between 10 and 2000 then raise exception 'Record a feature reason in 10–2000 characters'; end if;
 if featured and not exists(select 1 from public.garage_photos where garage_id=entry and state='approved') then raise exception 'Approve a car photo before featuring this car'; end if;
 update public.garage_showcases set featured_at=case when featured then now() else null end where id=entry and (not featured or (published and not hidden));
 if not found then raise exception 'Published car unavailable'; end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata) values(auth.uid(),case when featured then 'garage:feature' else 'garage:unfeature' end,'garage_showcases',entry::text,jsonb_build_object('reason',reason));
end$$;
revoke all on function e34_private.feature_garage(uuid,boolean,text) from public,anon,authenticated;
grant execute on function e34_private.feature_garage(uuid,boolean,text) to authenticated;
create function public.feature_garage(entry uuid,featured boolean,reason text) returns void language sql security invoker set search_path='' as $$select e34_private.feature_garage(entry,featured,reason);$$;
revoke all on function public.feature_garage(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.feature_garage(uuid,boolean,text) to authenticated;

alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check(target_type in ('thread','post','guide','part','garage','journal','photo'));
-- Public RPC is bounded and respects parent RLS/mute. No new competing car identity.
create function public.browse_car_showcase(search_query text default '',featured_only boolean default false,page_size integer default 21,cursor_created_at timestamptz default null,cursor_id uuid default null)
returns setof public.garage_showcases language sql stable security invoker set search_path='' as $$
 select g.* from public.garage_showcases g where g.published and not g.hidden and char_length(search_query)<=300 and not e34_private.community_muted(g.user_id)
 and(not featured_only or (g.featured_at is not null and exists(select 1 from public.garage_photos p where p.garage_id=g.id and p.state='approved')))
 and(btrim(search_query)='' or to_tsvector('english',g.title||' '||g.story||' '||g.model_id)@@websearch_to_tsquery('english',search_query))
 and((cursor_created_at is null and cursor_id is null)or(g.created_at,g.id)<(cursor_created_at,cursor_id)) order by g.created_at desc,g.id desc limit least(greatest(page_size,1),21);
$$;
revoke all on function public.browse_car_showcase(text,boolean,integer,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.browse_car_showcase(text,boolean,integer,timestamptz,uuid) to anon,authenticated;

create table e34_private.usage_daily(day date not null,area text not null,opens bigint not null default 0,primary key(day,area));
alter table e34_private.usage_daily enable row level security;
revoke all on e34_private.usage_daily from public,anon,authenticated;
create function e34_private.record_usage(area_name text) returns void language plpgsql security definer set search_path='' as $$begin
 if area_name not in ('home','reference','manual','guides','catalog','workshop','diagnostics','community','cars','app') then return; end if;
 insert into e34_private.usage_daily(day,area,opens) values(current_date,area_name,1) on conflict(day,area) do update set opens=least(1000000,e34_private.usage_daily.opens+1);
 delete from e34_private.usage_daily where day<current_date-90;
end$$;
revoke all on function e34_private.record_usage(text) from public,anon,authenticated;
grant execute on function e34_private.record_usage(text) to anon,authenticated;
create function public.record_usage(area_name text) returns void language sql security invoker set search_path='' as $$select e34_private.record_usage(area_name);$$;
revoke all on function public.record_usage(text) from public,anon,authenticated;
grant execute on function public.record_usage(text) to anon,authenticated;
create function e34_private.owner_dashboard(search_text text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare output jsonb;
begin
 if not e34_private.has_role('moderator') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Moderator permission and MFA required'; end if;
 if char_length(search_text)>120 then raise exception 'Search is too long'; end if;
 select jsonb_build_object(
 'counts',jsonb_build_object('members',(select count(*) from public.profiles),'discussions',(select count(*) from public.threads where not hidden),'replies',(select count(*) from public.posts where not hidden),'shared_cars',(select count(*) from public.garage_showcases where published and not hidden),'pending_photos',(select count(*) from public.garage_photos where state='pending'),'open_reports',(select count(*) from public.reports where status='open'),'open_appeals',(select count(*) from public.community_appeals where status<>'resolved')),
 'usage',coalesce((select jsonb_agg(to_jsonb(x)) from(select day,area,opens from e34_private.usage_daily where day>=current_date-29 order by day,area)x),'[]'),
 'photos',coalesce((select jsonb_agg(to_jsonb(x)) from(select p.*,g.title as car_title,g.user_id as car_owner from public.garage_photos p join public.garage_showcases g on g.id=p.garage_id where p.state<>'approved' order by p.created_at limit 40)x),'[]'),
 'reports',coalesce((select jsonb_agg(to_jsonb(x)) from(select * from public.reports order by created_at desc limit 40)x),'[]'),
 'cars',coalesce((select jsonb_agg(to_jsonb(x)) from(select g.*,p.display_name from public.garage_showcases g left join public.profiles p on p.id=g.user_id where search_text='' or g.title ilike '%'||search_text||'%' or g.model_id ilike '%'||search_text||'%' order by g.created_at desc limit 40)x),'[]'),
 'threads',coalesce((select jsonb_agg(to_jsonb(x)) from(select t.id,t.title,t.hidden,t.locked,t.author_id,t.created_at,p.display_name from public.threads t left join public.profiles p on p.id=t.author_id where search_text='' or t.title ilike '%'||search_text||'%' order by t.created_at desc limit 40)x),'[]'),
 'members',coalesce((select jsonb_agg(to_jsonb(x)) from(select p.id,p.display_name,p.created_at from public.profiles p where search_text='' or p.display_name ilike '%'||search_text||'%' order by p.created_at desc limit 40)x),'[]')
 ) into output;return output;
end$$;
revoke all on function e34_private.owner_dashboard(text) from public,anon,authenticated;
grant execute on function e34_private.owner_dashboard(text) to authenticated;
create function public.owner_dashboard(search_text text default '') returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.owner_dashboard(search_text);$$;
revoke all on function public.owner_dashboard(text) from public,anon,authenticated;
grant execute on function public.owner_dashboard(text) to authenticated;
-- File deletion is through Storage's API; never delete storage.objects directly.
create function public.account_car_file_paths(target_user_id uuid,after_path text default '') returns table(path text) language sql stable security invoker set search_path='' as $$select name from storage.objects where bucket_id='e34-car-photos' and name like target_user_id::text||'/%' and name>after_path order by name limit 100;$$;
revoke all on function public.account_car_file_paths(uuid,text) from public,anon,authenticated;
grant execute on function public.account_car_file_paths(uuid,text) to service_role;
create function public.car_media_cleanup_paths(target_user_id uuid) returns table(path text) language sql security definer set search_path='' as $$select object_path from e34_private.media_cleanup_queue where user_id=target_user_id order by object_path limit 100;$$;
revoke all on function public.car_media_cleanup_paths(uuid) from public,anon,authenticated;
grant execute on function public.car_media_cleanup_paths(uuid) to service_role;
create function public.finish_car_media_cleanup(target_user_id uuid,paths text[]) returns void language sql security definer set search_path='' as $$delete from e34_private.media_cleanup_queue where user_id=target_user_id and object_path=any(paths);$$;
revoke all on function public.finish_car_media_cleanup(uuid,text[]) from public,anon,authenticated;
grant execute on function public.finish_car_media_cleanup(uuid,text[]) to service_role;

grant all on public.owner_car_photos,public.garage_photos to service_role;
