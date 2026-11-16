create function e34_private.media_moderator() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from e34_private.staff_roles where user_id=auth.uid() and role in ('moderator','admin'));$$;
revoke all on function e34_private.media_moderator() from public,anon,authenticated;
grant execute on function e34_private.media_moderator() to anon,authenticated;
drop policy shared_photo_read on public.garage_photos;
create policy shared_photo_read on public.garage_photos for select to anon,authenticated using(
 (state='approved' and exists(select 1 from public.garage_showcases g where g.id=garage_id and g.published and not g.hidden)) or user_id=(select auth.uid()) or (select e34_private.media_moderator()));
drop policy car_photo_read on storage.objects;
create policy car_photo_read on storage.objects for select to anon,authenticated using(bucket_id='e34-car-photos' and (
 exists(select 1 from public.owner_car_photos p where p.object_path=name and p.user_id=(select auth.uid()) and p.state='ready') or exists(select 1 from public.garage_photos p where p.object_path=name and (
 (p.state='approved' and exists(select 1 from public.garage_showcases g where g.id=p.garage_id and g.published and not g.hidden)) or (select e34_private.media_moderator())))));
