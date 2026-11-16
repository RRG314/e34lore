-- Preserve the deployed collector, grants and session rules; fix accepted-page identity integrity.
create or replace function public.analytics_ingest(browser_id uuid,batch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg e34_private.analytics_config; visitor_hash text; sess uuid; e jsonb; page_row e34_private.analytics_pages; n integer:=0; t timestamptz; present integer; day_count integer; v_count integer; today date:=(clock_timestamp() at time zone 'UTC')::date;
begin
 if jsonb_typeof(batch)<>'object' or jsonb_typeof(batch->'events')<>'array' or jsonb_array_length(batch->'events') not between 1 and 20 or (batch->>'revision')::integer<>2 or batch->'consent'->>'traffic' is distinct from 'true' then raise exception 'Invalid analytics envelope';end if;
 perform pg_advisory_xact_lock(73400234);
 select * into cfg from e34_private.analytics_config where singleton;
 if not cfg.enabled then return jsonb_build_object('accepted',0,'status','disabled');end if;
 visitor_hash:=encode(extensions.hmac(browser_id::text,cfg.hash_key,'sha256'),'hex');
 if exists(select 1 from e34_private.analytics_erased where id=visitor_hash and expires_at>clock_timestamp())then return jsonb_build_object('accepted',0,'status','erased');end if;
 select coalesce(accepted,0) into day_count from e34_private.analytics_quality where day=today;
 select count(*) into v_count from e34_private.analytics_events e join e34_private.analytics_pages p on p.id=e.page join e34_private.analytics_sessions s on s.id=p.session_id where s.visitor=visitor_hash and e.received_at>clock_timestamp()-interval '1 hour';
 if coalesce(day_count,0)+jsonb_array_length(batch->'events')>5000 or v_count+jsonb_array_length(batch->'events')>240 or (select count(*) from e34_private.analytics_erased)>=10000 or (select count(*) from e34_private.analytics_events)>=100000 or pg_database_size(current_database())>=471859200 then
  insert into e34_private.analytics_quality(day,dropped)values(today,jsonb_array_length(batch->'events'))on conflict(day)do update set dropped=least(1000000,analytics_quality.dropped+excluded.dropped);
  return jsonb_build_object('accepted',0,'status','limited');
 end if;
 insert into e34_private.analytics_visitors values(visitor_hash,clock_timestamp(),clock_timestamp())on conflict(id)do update set last_seen=excluded.last_seen;
 select id into sess from e34_private.analytics_sessions where visitor=visitor_hash and last_seen>clock_timestamp()-interval '30 minutes' and started_at>clock_timestamp()-interval '4 hours' order by last_seen desc limit 1;
 for e in select value from jsonb_array_elements(batch->'events')loop
  if (e->>'v')::integer<>1 or e->>'name' not in ('page_view','link_open','search','search_result','component_select','assembly_view','explode','isolate','guide_step','guide_save','diagnostic_step','diagnostic_complete','model_loaded','model_error','render_error','web_vital','js_error','asset_error','api_error','engagement') or (e->>'seq')::integer not between 0 and 10000 then raise exception 'Invalid event';end if;
  if exists(select 1 from jsonb_object_keys(e)k where k not in ('v','id','page','name','resource','target','at','seq','search_id','topic','results','value','metric','model','code')) then raise exception 'Unexpected event property';end if;
  if (e->>'name' in ('search','search_result') and batch->'consent'->>'search'<>'true') or (e->>'name' in ('web_vital','js_error','asset_error','api_error','model_error','render_error','model_loaded') and batch->'consent'->>'performance'<>'true') then raise exception 'Missing consent';end if;
  if not e34_private.analytics_resource_valid(e->>'resource') or not e34_private.analytics_resource_valid(e->>'target') then raise exception 'Unknown public reference';end if;
  if length(e->>'topic')>120 or (e->>'topic') ~ '[^a-z0-9 ]' or coalesce((e->>'results')::integer,0) not between 0 and 10000 or coalesce((e->>'value')::numeric,0) not between 0 and 300000 then raise exception 'Invalid measurement';end if;
  if e->>'name'='search_result' and not exists(select 1 from e34_private.analytics_events se join e34_private.analytics_pages sp on sp.id=se.page join e34_private.analytics_sessions ss on ss.id=sp.session_id where se.name='search' and se.search_id=(e->>'search_id')::uuid and ss.visitor=visitor_hash and ss.id=sess)then continue;end if;
  t:=to_timestamp((e->>'at')::numeric/1000);
  if t<clock_timestamp()-interval '5 minutes' or t>clock_timestamp()+interval '1 minute' then raise exception 'Stale event';end if;
  if exists(select 1 from e34_private.analytics_events where id=(e->>'id')::uuid) then continue;end if;
  select * into page_row from e34_private.analytics_pages where id=(e->>'page')::uuid;
  if found then
   if not exists(select 1 from e34_private.analytics_sessions where id=page_row.session_id and visitor=visitor_hash) then raise exception 'Page owner mismatch';end if;
   -- Expired pages cannot extend an old session indefinitely.
   if not exists(select 1 from e34_private.analytics_sessions where id=page_row.session_id and last_seen>clock_timestamp()-interval '30 minutes' and started_at>clock_timestamp()-interval '4 hours') then continue;end if;
   if e->>'name'='page_view' then continue;end if;
   if e->>'name' in ('search','search_result') and not page_row.search_enabled then raise exception 'Page lacks search consent';end if;
   if e->>'name' in ('web_vital','js_error','asset_error','api_error','model_error','render_error','model_loaded') and not page_row.performance_enabled then raise exception 'Page lacks performance consent';end if;
  else
   if e->>'name'<>'page_view' or not exists(select 1 from e34_private.analytics_resources where id=e->>'resource' and kind in ('page','guide','manual','model','article','quick')) then continue;end if;
   if sess is null then
    insert into e34_private.analytics_sessions(visitor,started_at,last_seen,device,browser,referrer,campaign)values(visitor_hash,t,clock_timestamp(),case when batch->>'device' in ('mobile','tablet','desktop')then batch->>'device' else 'other' end,case when batch->>'browser' in ('Chrome','Safari','Firefox','Edge')then batch->>'browser' else 'Other' end,
     case when batch->>'referrer' ~ '^([a-z0-9-]+\.)+[a-z]{2,63}$' and length(batch->>'referrer')<=253 then batch->>'referrer' end,
     (select code from e34_private.analytics_campaigns where code=batch->>'campaign' and active))returning id into sess;
   end if;
   insert into e34_private.analytics_pages values((e->>'page')::uuid,sess,e->>'resource',t,(batch->'consent'->>'search')::boolean,(batch->'consent'->>'performance')::boolean) returning * into page_row;
  end if;
  insert into e34_private.analytics_events(id,page,name,resource,target,occurred_at,seq,search_id,topic,results,value,metric,model,code)
   values((e->>'id')::uuid,page_row.id,e->>'name',e->>'resource',e->>'target',t,(e->>'seq')::integer,(e->>'search_id')::uuid,e->>'topic',(e->>'results')::integer,(e->>'value')::numeric,e->>'metric',e->>'model',e->>'code')on conflict do nothing;
  get diagnostics present = row_count;
  if present>0 then n:=n+1;update e34_private.analytics_sessions set last_seen=clock_timestamp() where id=page_row.session_id;end if;
 end loop;
 -- First observation belongs to the earliest accepted public page, not the flush time.
 update e34_private.analytics_visitors v set first_seen=(select min(p.viewed_at)from e34_private.analytics_pages p join e34_private.analytics_sessions s on s.id=p.session_id where s.visitor=v.id)
 where v.id=visitor_hash and exists(select 1 from e34_private.analytics_sessions s join e34_private.analytics_pages p on p.session_id=s.id where s.visitor=v.id);
 -- Missing/expired page events cannot allocate an unbounded orphan identity registry.
 delete from e34_private.analytics_visitors v where v.id=visitor_hash and not exists(select 1 from e34_private.analytics_sessions s join e34_private.analytics_pages p on p.session_id=s.id where s.visitor=v.id);
 insert into e34_private.analytics_quality(day,accepted)values(today,n)on conflict(day)do update set accepted=analytics_quality.accepted+excluded.accepted;
 return jsonb_build_object('accepted',n,'status','recorded');
end$$;
revoke all on function public.analytics_ingest(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.analytics_ingest(uuid,jsonb) to service_role;
