-- Confirmed scan photographs: private by default, explicit consent and MFA review before reuse.
create function e34_private.scan_photo_session() returns boolean language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();sid uuid;begin
 if actor is null then return false;end if;
 begin sid:=(auth.jwt()->>'session_id')::uuid;exception when invalid_text_representation then return false;end;
 return exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id where u.id=actor and not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and s.id=sid and(s.not_after is null or s.not_after>now()));
end$$;
revoke all on function e34_private.scan_photo_session() from public,anon,authenticated;
grant execute on function e34_private.scan_photo_session() to authenticated;
create table public.observation_photos(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 observation_id uuid not null,part_id text not null references public.parts,
 photo_kind text not null check(photo_kind in('loose','installed','markings')),
 client_photo_key text not null check(client_photo_key ~ '^[a-zA-Z0-9:_-]{1,100}$'),
 object_path text not null unique,view_label text not null default 'unspecified' check(view_label in('front','back','side','detail','unspecified')),
 state text not null default 'processing' check(state in('processing','ready')),
 reuse_opt_in boolean not null default false,consent_revision text,consented_at timestamptz,withdrawn_at timestamptz,
 review_status text not null default 'private' check(review_status in('private','pending','approved','rejected','withdrawn')),
 review_reason text not null default '' check(char_length(review_reason)<=2000),reviewed_at timestamptz,
 width integer check(width between 1 and 1600),height integer check(height between 1 and 1600),
 bytes integer check(bytes between 1 and 2097152),sha256 text check(sha256 ~ '^[a-f0-9]{64}$'),created_at timestamptz not null default now(),
 foreign key(observation_id,user_id) references public.component_observations(id,user_id) on delete cascade,
 unique(observation_id,client_photo_key),check(object_path=user_id::text||'/'||id::text||'.jpg'),
 check(not reuse_opt_in or(consent_revision='part-reference-v1' and consented_at is not null and withdrawn_at is null)),
 check(review_status not in('pending','approved') or reuse_opt_in),
 check(state<>'ready' or(width is not null and height is not null and bytes is not null and sha256 is not null))
);
create index observation_photos_owner on public.observation_photos(user_id,created_at desc,id);
create index observation_photos_queue on public.observation_photos(review_status,created_at,id);
create index observation_photos_part on public.observation_photos(part_id,review_status,id);
create unique index observation_photos_approved_hash on public.observation_photos(sha256) where state='ready' and reuse_opt_in and review_status='approved';
alter table public.observation_photos enable row level security;
revoke all on public.observation_photos from public,anon,authenticated;
grant select on public.observation_photos to authenticated;
grant select,insert,update,delete on public.observation_photos to service_role;
create policy observation_photo_read on public.observation_photos for select to authenticated using((user_id=(select auth.uid()) and(select e34_private.scan_photo_session()))or(reuse_opt_in and withdrawn_at is null and(select e34_private.media_moderator())));
create trigger observation_photo_cleanup before delete on public.observation_photos for each row execute function e34_private.queue_car_photo_cleanup();
create function e34_private.reserve_observation_photo(observation uuid,client_key text,share_reference boolean,consent text,photo_view text) returns public.observation_photos language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();o public.component_observations;p public.observation_photos;photo uuid:=gen_random_uuid();effective_share boolean:=share_reference;begin
 if not e34_private.scan_photo_session() then raise exception 'Sign in with your verified account again' using errcode='42501';end if;
 perform e34_private.community_can_contribute(v_actor);perform pg_advisory_xact_lock(hashtextextended(v_actor::text,98235));
 select * into o from public.component_observations where id=observation and user_id=v_actor and status='owner_confirmed' and part_id is not null;
 if o.id is null or not exists(select 1 from public.parts n where n.id=o.part_id and n.number_normalized ~ '^\d{11}$'and n.number_normalized<>'00000000000')then raise exception 'Confirm the exact part and save its result first';end if;
 if client_key !~ '^[a-zA-Z0-9:_-]{1,100}$' or photo_view not in('front','back','side','detail','unspecified') or share_reference is null then raise exception 'Invalid photo details';end if;
 if share_reference and consent is distinct from 'part-reference-v1' then raise exception 'Confirm permission before sharing your photos';end if;
 if(select count(*)from e34_private.community_actions a where a.actor=v_actor and action in('scan-photo','scan-photo-retry') and created_at>now()-interval '1 hour')>=30 then raise exception 'Upload limit reached. Try again later';end if;
 select * into p from public.observation_photos where observation_id=observation and client_photo_key=client_key;
 if p.id is not null then
  if p.review_status='withdrawn' then effective_share:=false;end if;
  if p.state='processing' then
   if p.created_at>now()-interval '5 minutes' then raise exception 'This photo is already uploading. Try again shortly';end if;
   delete from public.observation_photos where id=p.id;p.id:=null;
  end if;
  if p.id is not null and p.reuse_opt_in and not share_reference then raise exception 'Sharing choice changed. Manage this saved photo before retrying';end if;
  if p.id is not null then insert into e34_private.community_actions(actor,action)values(v_actor,'scan-photo-retry');return p;end if;
 end if;
 if(select count(*)from public.observation_photos where observation_id=observation)>=3 or(select count(*)from public.observation_photos where user_id=v_actor)>=300 then raise exception 'Photo limit reached';end if;
 if(select count(*)from e34_private.community_actions a where a.actor=v_actor and action in('scan-photo','scan-photo-retry') and created_at>now()-interval '1 hour')>=30 then raise exception 'Upload limit reached. Try again later';end if;
 insert into public.observation_photos(id,user_id,observation_id,part_id,photo_kind,client_photo_key,object_path,view_label,reuse_opt_in,consent_revision,consented_at,review_status)
 values(photo,v_actor,observation,o.part_id,o.mode,client_key,v_actor::text||'/'||photo::text||'.jpg',photo_view,effective_share,case when effective_share then consent end,case when effective_share then now()end,case when effective_share then 'pending'else 'private'end) returning * into p;
 insert into e34_private.community_actions(actor,action) values(v_actor,'scan-photo');return p;
end$$;
create function public.reserve_observation_photo(observation uuid,client_key text,share_reference boolean,consent text,photo_view text default 'unspecified') returns public.observation_photos language sql security invoker set search_path='' as $$select e34_private.reserve_observation_photo(observation,client_key,share_reference,consent,photo_view)$$;
revoke all on function e34_private.reserve_observation_photo(uuid,text,boolean,text,text),public.reserve_observation_photo(uuid,text,boolean,text,text) from public,anon,authenticated;
grant execute on function e34_private.reserve_observation_photo(uuid,text,boolean,text,text),public.reserve_observation_photo(uuid,text,boolean,text,text) to authenticated;
create function public.complete_observation_photo(actor uuid,photo uuid,pixel_width integer,pixel_height integer,byte_count integer,content_hash text) returns void language plpgsql security invoker set search_path='' as $$begin
 update public.observation_photos set state='ready',width=pixel_width,height=pixel_height,bytes=byte_count,sha256=content_hash where id=photo and user_id=actor and state='processing';
 if not found then raise exception 'Photo upload is no longer pending';end if;end$$;
revoke all on function public.complete_observation_photo(uuid,uuid,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.complete_observation_photo(uuid,uuid,integer,integer,integer,text) to service_role;
create or replace function e34_private.can_read_car_photo(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select char_length(object_name)<100 and(
 exists(select 1 from public.owner_car_photos p where p.object_path=object_name and p.user_id=auth.uid() and p.state='ready')or
 exists(select 1 from public.garage_photos p join public.garage_showcases g on g.id=p.garage_id where p.object_path=object_name and((p.state='approved'and g.published and not g.hidden)or e34_private.media_moderator()))or
 exists(select 1 from public.observation_photos p where p.object_path=object_name and p.state='ready' and((p.user_id=auth.uid()and e34_private.scan_photo_session())or(p.reuse_opt_in and p.withdrawn_at is null and e34_private.media_moderator())or(p.reuse_opt_in and p.review_status='approved'and p.withdrawn_at is null))));
$$;
create function e34_private.withdraw_observation_photo(photo uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not e34_private.scan_photo_session() then raise exception 'Sign in again' using errcode='42501';end if;
 update public.observation_photos set reuse_opt_in=false,review_status='withdrawn',withdrawn_at=now() where id=photo and user_id=auth.uid();
 if not found then raise exception 'Photo unavailable';end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata)values(auth.uid(),'scan-photo:withdraw','observation_photos',photo::text,'{}');end$$;
create function public.withdraw_observation_photo(photo uuid) returns void language sql security invoker set search_path='' as $$select e34_private.withdraw_observation_photo(photo)$$;
revoke all on function e34_private.withdraw_observation_photo(uuid),public.withdraw_observation_photo(uuid) from public,anon,authenticated;
grant execute on function e34_private.withdraw_observation_photo(uuid),public.withdraw_observation_photo(uuid) to authenticated;
create function e34_private.review_observation_photo(photo uuid,decision text,reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if not e34_private.media_moderator() then raise exception 'A current moderator session and authenticator are required' using errcode='42501';end if;
 if decision not in('approved','rejected')or char_length(btrim(reason)) not between 10 and 2000 then raise exception 'Choose a decision and record the evidence';end if;
 if decision='approved'and exists(select 1 from public.observation_photos where id=photo and(width<160 or height<160))then raise exception 'Reference photos need at least 160 pixels on each side';end if;
 update public.observation_photos set review_status=decision,review_reason=reason,reviewed_at=now()where id=photo and state='ready'and reuse_opt_in and withdrawn_at is null;
 if not found then raise exception 'Shared photo unavailable';end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata)values(auth.uid(),'scan-photo:'||decision,'observation_photos',photo::text,jsonb_build_object('reason',reason));
end$$;
create function public.review_observation_photo(photo uuid,decision text,reason text) returns void language sql security invoker set search_path='' as $$select e34_private.review_observation_photo(photo,decision,reason)$$;
revoke all on function e34_private.review_observation_photo(uuid,text,text),public.review_observation_photo(uuid,text,text) from public,anon,authenticated;
grant execute on function e34_private.review_observation_photo(uuid,text,text),public.review_observation_photo(uuid,text,text) to authenticated;
create function e34_private.approved_part_photos(part_number text,page_size integer) returns table(id uuid,object_path text,width integer,height integer,sha256 text) language sql stable security definer set search_path='' as $$
 select p.id,p.object_path,p.width,p.height,p.sha256 from public.observation_photos p join public.parts n on n.id=p.part_id where part_number ~ '^\d{11}$' and n.number_normalized=part_number and p.photo_kind='loose' and p.state='ready'and p.reuse_opt_in and p.review_status='approved'and p.withdrawn_at is null order by p.id limit least(greatest(page_size,1),12);
$$;
create function public.approved_part_photos(part_number text,page_size integer default 6) returns table(id uuid,object_path text,width integer,height integer,sha256 text) language sql stable security invoker set search_path='' as $$select * from e34_private.approved_part_photos(part_number,page_size)$$;
revoke all on function e34_private.approved_part_photos(text,integer),public.approved_part_photos(text,integer) from public,anon,authenticated;
grant execute on function e34_private.approved_part_photos(text,integer),public.approved_part_photos(text,integer) to anon,authenticated;
create function e34_private.scanner_photo_review_queue() returns setof public.observation_photos language plpgsql stable security definer set search_path='' as $$begin
 if not e34_private.media_moderator() then raise exception 'Moderator session and authenticator required' using errcode='42501';end if;
 return query select p.* from public.observation_photos p where p.state='ready'and p.reuse_opt_in and p.review_status='pending'order by p.created_at,p.id limit 100;end$$;
create function public.scanner_photo_review_queue() returns setof public.observation_photos language sql stable security invoker set search_path='' as $$select * from e34_private.scanner_photo_review_queue()$$;
revoke all on function e34_private.scanner_photo_review_queue(),public.scanner_photo_review_queue() from public,anon,authenticated;
grant execute on function e34_private.scanner_photo_review_queue(),public.scanner_photo_review_queue() to authenticated;
create function e34_private.scanner_photo_dataset(after_id uuid) returns table(id uuid,part_number text,object_path text,sha256 text,width integer,height integer,view_label text,photo_kind text,object_group text,consent_revision text) language plpgsql stable security definer set search_path='' as $$begin
 if not e34_private.media_moderator() then raise exception 'Moderator session and authenticator required' using errcode='42501';end if;
 return query select p.id,n.number_normalized,p.object_path,p.sha256,p.width,p.height,p.view_label,p.photo_kind,encode(sha256(convert_to(p.observation_id::text,'UTF8')),'hex'),p.consent_revision from public.observation_photos p join public.parts n on n.id=p.part_id where p.state='ready'and p.reuse_opt_in and p.review_status='approved'and p.withdrawn_at is null and(after_id is null or p.id>after_id)order by p.id limit 100;end$$;
create function public.scanner_photo_dataset(after_id uuid default null) returns table(id uuid,part_number text,object_path text,sha256 text,width integer,height integer,view_label text,photo_kind text,object_group text,consent_revision text) language sql stable security invoker set search_path='' as $$select * from e34_private.scanner_photo_dataset(after_id)$$;
revoke all on function e34_private.scanner_photo_dataset(uuid),public.scanner_photo_dataset(uuid) from public,anon,authenticated;
grant execute on function e34_private.scanner_photo_dataset(uuid),public.scanner_photo_dataset(uuid) to authenticated;

create function e34_private.queue_observation_photo_cleanup(actor uuid,photo uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if actor is null or photo is null then raise exception 'Cleanup identity required';end if;
 insert into e34_private.media_cleanup_queue(object_path,user_id)values(actor::text||'/'||photo::text||'.jpg',actor)on conflict do nothing;
end$$;
create function public.queue_observation_photo_cleanup(actor uuid,photo uuid) returns void language sql security invoker set search_path='' as $$select e34_private.queue_observation_photo_cleanup(actor,photo)$$;
revoke all on function e34_private.queue_observation_photo_cleanup(uuid,uuid),public.queue_observation_photo_cleanup(uuid,uuid) from public,anon,authenticated;
grant execute on function e34_private.queue_observation_photo_cleanup(uuid,uuid),public.queue_observation_photo_cleanup(uuid,uuid) to service_role;
