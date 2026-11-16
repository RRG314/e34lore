begin;

create table e34_private.garage_profile_photos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  source_photo_id uuid not null references public.owner_car_photos(id) on delete cascade,
  public_photo_id uuid references public.garage_photos(id) on delete set null
);
alter table e34_private.garage_profile_photos enable row level security;
revoke all on e34_private.garage_profile_photos from public,anon,authenticated;
create index garage_profile_source_photo on e34_private.garage_profile_photos(source_photo_id);
create index garage_profile_public_photo on e34_private.garage_profile_photos(public_photo_id) where public_photo_id is not null;

create function e34_private.my_garage_profile_photo()
returns table(photo_id uuid,show_public boolean)
language sql stable security definer set search_path='' as $$
  select source_photo_id, public_photo_id is not null
  from e34_private.garage_profile_photos
  where user_id=auth.uid() and coalesce(auth.jwt()->>'is_anonymous','false')='false'
$$;

create function e34_private.set_garage_profile_photo(photo uuid,share_public boolean)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); published_photo uuid;
begin
  if actor is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' then
    raise exception 'Sign in to edit your garage profile';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
  if photo is null then
    delete from e34_private.garage_profile_photos where user_id=actor;
    return;
  end if;
  if not exists (
    select 1 from public.owner_car_photos p
    where p.id=photo and p.user_id=actor and p.vehicle_id is not null and p.state='ready'
  ) then
    raise exception 'Choose a photo uploaded to one of your cars';
  end if;
  if share_public is true then
    perform e34_private.community_can_contribute(actor);
    select g.id into published_photo
    from e34_private.car_photo_publications b
    join public.garage_photos g on g.id=b.photo_id and g.user_id=actor
    join public.garage_showcases s on s.id=g.garage_id and s.user_id=actor
    where b.source_photo_id=photo and b.user_id=actor and g.state='approved' and s.published and not s.hidden
    for share of s,g;
    if published_photo is null then
      raise exception 'Choose a photo already visible in one of your shared car stories';
    end if;
  end if;
  insert into e34_private.garage_profile_photos(user_id,source_photo_id,public_photo_id)
  values(actor,photo,published_photo)
  on conflict(user_id) do update set
    source_photo_id=excluded.source_photo_id,public_photo_id=excluded.public_photo_id;
end
$$;

create function e34_private.clear_unpublished_garage_avatar()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  update e34_private.garage_profile_photos profile
  set public_photo_id=null
  where profile.user_id=new.user_id and profile.public_photo_id in (
    select g.id from public.garage_photos g where g.garage_id=new.id
  );
  return new;
end
$$;
revoke all on function e34_private.clear_unpublished_garage_avatar() from public,anon,authenticated;
create trigger clear_unpublished_garage_avatar
after update of published,hidden on public.garage_showcases for each row
when (old.published and not old.hidden and (not new.published or new.hidden))
execute function e34_private.clear_unpublished_garage_avatar();

create function e34_private.garage_profile_avatars(owners uuid[])
returns table(user_id uuid,object_path text)
language sql stable security definer set search_path='' as $$
  select profile.user_id,g.object_path
  from e34_private.garage_profile_photos profile
  join e34_private.car_photo_publications b on b.photo_id=profile.public_photo_id
    and b.source_photo_id=profile.source_photo_id and b.user_id=profile.user_id
  join public.owner_car_photos source on source.id=b.source_photo_id
    and source.user_id=profile.user_id and source.state='ready' and source.vehicle_id is not null
  join public.garage_photos g on g.id=b.photo_id and g.user_id=profile.user_id
  join public.garage_showcases s on s.id=g.garage_id and s.user_id=profile.user_id
  where cardinality(owners) between 1 and 32 and profile.user_id=any(owners)
    and g.state='approved' and s.published and not s.hidden
    and not e34_private.community_muted(profile.user_id)
$$;

create function public.my_garage_profile_photo()
returns table(photo_id uuid,show_public boolean)
language sql stable security invoker set search_path='' as $$
  select * from e34_private.my_garage_profile_photo()
$$;
create function public.set_garage_profile_photo(photo uuid,share_public boolean)
returns void language sql security invoker set search_path='' as $$
  select e34_private.set_garage_profile_photo(photo,share_public)
$$;
create function public.garage_profile_avatars(owners uuid[])
returns table(user_id uuid,object_path text)
language sql stable security invoker set search_path='' as $$
  select * from e34_private.garage_profile_avatars(owners)
$$;

revoke all on function e34_private.my_garage_profile_photo(),public.my_garage_profile_photo(),
  e34_private.set_garage_profile_photo(uuid,boolean),public.set_garage_profile_photo(uuid,boolean),
  e34_private.garage_profile_avatars(uuid[]),public.garage_profile_avatars(uuid[]) from public,anon,authenticated;
grant execute on function e34_private.my_garage_profile_photo(),public.my_garage_profile_photo(),
  e34_private.set_garage_profile_photo(uuid,boolean),public.set_garage_profile_photo(uuid,boolean) to authenticated;
grant execute on function e34_private.garage_profile_avatars(uuid[]),public.garage_profile_avatars(uuid[]) to anon,authenticated;

-- Keep the legacy three-argument API available. The profile editor submits
-- explicit public fields and the story is filtered within the same transaction.
create function e34_private.publish_garage_vehicle(vehicle uuid,entry_title text,entry_story text,shared_fields text[])
returns uuid language plpgsql security definer set search_path='' as $$
declare entry uuid;
begin
  if shared_fields is null or cardinality(shared_fields)>8 or exists(
    select 1 from unnest(shared_fields) field
    where field is null or field not in ('engine','year','month','market','body','transmission','steering','ownership_dates')
  ) then
    raise exception 'Choose which vehicle details to share';
  end if;
  if concat_ws(' ',entry_title,entry_story)~*'(^|[^a-z0-9])[a-hj-npr-z0-9]{17}([^a-z0-9]|$)' then
    raise exception 'Remove the full VIN before publishing your story';
  end if;
  entry:=e34_private.publish_garage_vehicle(vehicle,entry_title,entry_story);
  update public.garage_showcases g
  set configuration=(
      select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
      from jsonb_each(g.configuration)
      where key='model' or key=any(shared_fields)
    ),
    acquired_year=case when 'ownership_dates'=any(shared_fields) then g.acquired_year end,
    released_year=case when 'ownership_dates'=any(shared_fields) then g.released_year end
  where g.id=entry and g.user_id=auth.uid();
  return entry;
end
$$;
create function public.publish_garage_vehicle(vehicle uuid,entry_title text,entry_story text,shared_fields text[])
returns uuid language sql security invoker set search_path='' as $$
  select e34_private.publish_garage_vehicle(vehicle,entry_title,entry_story,shared_fields)
$$;
revoke all on function e34_private.publish_garage_vehicle(uuid,text,text,text[]),
  public.publish_garage_vehicle(uuid,text,text,text[]) from public,anon,authenticated;
grant execute on function e34_private.publish_garage_vehicle(uuid,text,text,text[]),
  public.publish_garage_vehicle(uuid,text,text,text[]) to authenticated;

commit;
