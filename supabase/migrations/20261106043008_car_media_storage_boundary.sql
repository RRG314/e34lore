create function e34_private.can_read_car_photo(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select char_length(object_name)<100 and (
 exists(select 1 from public.owner_car_photos p where p.object_path=object_name and p.user_id=auth.uid() and p.state='ready') or
 exists(select 1 from public.garage_photos p join public.garage_showcases g on g.id=p.garage_id where p.object_path=object_name and ((p.state='approved' and g.published and not g.hidden) or e34_private.media_moderator())));
$$;
revoke all on function e34_private.can_read_car_photo(text) from public,anon,authenticated;
grant execute on function e34_private.can_read_car_photo(text) to anon,authenticated;
drop policy car_photo_read on storage.objects;
create policy car_photo_read on storage.objects for select to anon,authenticated using(bucket_id='e34-car-photos' and e34_private.can_read_car_photo(name));
