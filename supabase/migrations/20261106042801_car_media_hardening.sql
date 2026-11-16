create or replace function e34_private.reserve_car_photo(vehicle uuid,caption_text text,alternative_text text,rights_confirmed boolean) returns public.owner_car_photos
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); photo uuid:=gen_random_uuid(); result public.owner_car_photos;
begin
 perform e34_private.community_can_contribute(v_actor);
 if rights_confirmed is distinct from true then raise exception 'Confirm that you own the photo or have permission to share it'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_actor::text,0));
 if not exists(select 1 from public.owned_vehicles where id=vehicle and user_id=v_actor) then raise exception 'Choose your own car'; end if;
 if (select count(*) from public.owner_car_photos p where p.user_id=v_actor)>=100 or (select count(*) from public.owner_car_photos p where p.vehicle_id=vehicle)>=12 then raise exception 'Photo limit reached: 12 per car and 100 per account'; end if;
 if (select count(*) from e34_private.community_actions a where a.actor=v_actor and a.action='photo' and a.created_at>now()-interval '1 hour')>=24 then raise exception 'Upload limit reached. Try again later'; end if;
 insert into public.owner_car_photos(id,user_id,vehicle_id,object_path,caption,alt_text) values(photo,v_actor,vehicle,v_actor::text||'/'||photo::text||'.jpg',caption_text,alternative_text) returning * into result;
 insert into e34_private.community_actions(actor,action) values(v_actor,'photo');
 return result;
end$$;

create policy photo_bindings_private on e34_private.car_photo_publications for all to anon,authenticated using(false) with check(false);
create policy photo_cleanup_private on e34_private.media_cleanup_queue for all to anon,authenticated using(false) with check(false);
create policy usage_aggregate_private on e34_private.usage_daily for all to anon,authenticated using(false) with check(false);
alter function public.car_media_cleanup_paths(uuid) set schema e34_private;
alter function public.finish_car_media_cleanup(uuid,text[]) set schema e34_private;
create function public.car_media_cleanup_paths(target_user_id uuid) returns table(path text) language sql security invoker set search_path='' as $$select * from e34_private.car_media_cleanup_paths(target_user_id);$$;
create function public.finish_car_media_cleanup(target_user_id uuid,paths text[]) returns void language sql security invoker set search_path='' as $$select e34_private.finish_car_media_cleanup(target_user_id,paths);$$;
revoke all on function public.car_media_cleanup_paths(uuid),public.finish_car_media_cleanup(uuid,text[]) from public,anon,authenticated;
grant execute on function public.car_media_cleanup_paths(uuid),public.finish_car_media_cleanup(uuid,text[]) to service_role;
create function e34_private.resolve_content_report(report uuid,disposition text,reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if not e34_private.has_role('moderator') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Moderator permission and MFA required';end if;
 if disposition not in ('resolved','reviewing','dismissed') or char_length(btrim(reason)) not between 10 and 2000 then raise exception 'Record a disposition and reason';end if;
 update public.reports set status=disposition where id=report;
 if not found then raise exception 'Report unavailable';end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata) values(auth.uid(),'report:'||disposition,'reports',report::text,jsonb_build_object('reason',reason));
end$$;
revoke all on function e34_private.resolve_content_report(uuid,text,text) from public,anon,authenticated;
grant execute on function e34_private.resolve_content_report(uuid,text,text) to authenticated;
create function public.resolve_content_report(report uuid,disposition text,reason text) returns void language sql security invoker set search_path='' as $$select e34_private.resolve_content_report(report,disposition,reason);$$;
revoke all on function public.resolve_content_report(uuid,text,text) from public,anon,authenticated;
grant execute on function public.resolve_content_report(uuid,text,text) to authenticated;
create or replace function e34_private.queue_car_photo_cleanup() returns trigger language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from auth.users where id=old.user_id) then insert into e34_private.media_cleanup_queue(object_path,user_id) values(old.object_path,old.user_id) on conflict do nothing;end if;return old;end$$;
create function e34_private.purge_account_media_queue() returns trigger language plpgsql security definer set search_path='' as $$begin delete from e34_private.media_cleanup_queue where user_id=old.id;return old;end$$;
revoke all on function e34_private.purge_account_media_queue() from public,anon,authenticated;
create trigger purge_deleted_account_media_queue after delete on auth.users for each row execute function e34_private.purge_account_media_queue();
