create or replace function e34_private.publish_journal_entry(source uuid,expected_version integer) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();j public.owner_journal_entries;shared uuid;publication uuid;
begin
 perform e34_private.community_can_contribute(v_actor);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text,0));
 select * into j from public.owner_journal_entries where id=source and user_id=v_actor for update;
 if j.id is null then raise exception 'Journal entry unavailable';end if;
 if j.content_version<>expected_version then raise exception 'Journal changed. Reload and review before publishing.';end if;
 select g.id into shared from e34_private.garage_publications b join public.garage_showcases g on g.id=b.entry_id where b.vehicle_id=j.vehicle_id and b.user_id=v_actor and g.published and not g.hidden;
 if shared is null then raise exception 'Share this car’s garage story before publishing journal updates';end if;
 if(select count(*) from e34_private.community_actions where community_actions.actor=v_actor and action='journal' and created_at>now()-interval '1 hour')>=20 then raise exception 'Journal publishing limit reached. Please try later.';end if;
 select public_id into publication from e34_private.journal_publications where source_id=source and user_id=v_actor;
 if publication is null then
  insert into public.garage_journal_entries(garage_entry_id,user_id,entry_date,title,body,stage,guide_id,guide_revision,guide_step,part_id,source_version)
  values(shared,v_actor,j.entry_date,j.title,j.body,j.stage,j.guide_id,j.guide_revision,j.guide_step,j.part_id,j.content_version) returning id into publication;
  insert into e34_private.journal_publications values(source,publication,v_actor);
 else
  update public.garage_journal_entries set entry_date=j.entry_date,title=j.title,body=j.body,stage=j.stage,guide_id=j.guide_id,guide_revision=j.guide_revision,guide_step=j.guide_step,part_id=j.part_id,source_version=j.content_version,published=true,updated_at=now() where id=publication and user_id=v_actor;
 end if;
 insert into e34_private.community_actions(actor,action) values(v_actor,'journal');
 return publication;
end$$;
