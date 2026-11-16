-- Preserve the existing bounded JSON-array observation contract.
create or replace function e34_private.submit_guest_contribution(payload jsonb,target_thread uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); row_data public.threads; created_id uuid; recent integer; previous_flag text;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and is_anonymous is true) then raise exception 'Start a guest session before submitting'; end if;
 if not exists(select 1 from auth.sessions where user_id=actor and id::text=auth.jwt()->>'session_id') then raise exception 'A current guest session is required'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or char_length(payload::text)>40000 then raise exception 'Invalid guest submission'; end if;
 if char_length(btrim(coalesce(payload->>'body',''))) not between 40 and 20000 then raise exception 'Write 40–20000 characters with the details of your question or reply'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select count(*) into recent from e34_private.guest_submissions where author_id=actor and created_at>now()-interval '24 hours' and ((target_thread is null and thread_id is not null) or (target_thread is not null and post_id is not null));
 if recent >= (case when target_thread is null then 2 else 10 end) then raise exception 'Guest posting limit reached. Please try again tomorrow or use a verified account'; end if;
 previous_flag:=current_setting('e34.guest_submission',true);
 perform set_config('e34.guest_submission',actor::text,true);
 perform e34_private.community_can_contribute(actor);
 insert into public.profiles(id,display_name) values(actor,'Guest '||left(replace(actor::text,'-',''),8)) on conflict(id) do nothing;
 if target_thread is not null then
   insert into public.posts(thread_id,author_id,body,hidden) values(target_thread,actor,payload->>'body',true) returning id into created_id;
 else
   if char_length(btrim(coalesce(payload->>'title',''))) not between 8 and 160 then raise exception 'Use a title of 8–160 characters'; end if;
   row_data:=jsonb_populate_record(null::public.threads,payload);
   insert into public.threads(author_id,title,body,category,template_id,starter_topic_id,tag_ids,model_id,engine,component_id,part_id,catalog_position_id,manual_chapter_id,guide_id,guide_revision,guide_step,journal_update_id,article_slug,diagnostic_slug,configuration_revision_id,node_id,garage_entry_id,vehicle_configuration,observations,hidden)
   values(actor,row_data.title,row_data.body,coalesce(row_data.category,'General E34 Community'),coalesce(row_data.template_id,'general'),row_data.starter_topic_id,coalesce(row_data.tag_ids,'{}'),row_data.model_id,row_data.engine,row_data.component_id,row_data.part_id,row_data.catalog_position_id,row_data.manual_chapter_id,row_data.guide_id,row_data.guide_revision,row_data.guide_step,row_data.journal_update_id,row_data.article_slug,row_data.diagnostic_slug,row_data.configuration_revision_id,row_data.node_id,row_data.garage_entry_id,coalesce(row_data.vehicle_configuration,'{}'),coalesce(row_data.observations,'[]'),true)
   returning id into created_id;
 end if;
 perform set_config('e34.guest_submission',coalesce(previous_flag,''),true);
 return created_id;
end $$;

-- Keep guest status consistent when staff use the existing discussion tools.
create function e34_private.sync_guest_publication() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.hidden is distinct from old.hidden then
  update e34_private.guest_submissions set
   status=case when new.hidden then 'rejected' else 'approved' end,
   reason='Publication status changed through discussion moderation.',
   reviewed_at=now(),reviewed_by=auth.uid()
  where (tg_table_name='threads' and thread_id=new.id) or (tg_table_name='posts' and post_id=new.id);
 end if;
 return new;
end $$;
revoke all on function e34_private.sync_guest_publication() from public,anon,authenticated;
create trigger sync_guest_publication after update of hidden on public.threads for each row execute function e34_private.sync_guest_publication();
create trigger sync_guest_publication after update of hidden on public.posts for each row execute function e34_private.sync_guest_publication();
