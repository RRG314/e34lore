-- Additive response for expired browser-page sessions; preserve roles and immutable history.
create or replace function public.analytics_ingest(browser_id uuid,batch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg e34_private.analytics_config; visitor_hash text; sess uuid; e jsonb; page_row e34_private.analytics_pages; n integer:=0; t timestamptz; present integer; expired boolean:=false; day_count integer; v_count integer; today date:=(clock_timestamp() at time zone 'UTC')::date;
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
   if not exists(select 1 from e34_private.analytics_sessions where id=page_row.session_id and last_seen>clock_timestamp()-interval '30 minutes' and started_at>clock_timestamp()-interval '4 hours') then expired:=true;continue;end if;
   if e->>'name'='page_view' then
    update e34_private.analytics_sessions set last_seen=clock_timestamp()where id=page_row.session_id;continue;end if;
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
 return jsonb_build_object('accepted',n,'status',case when expired and n=0 then 'page_expired' else 'recorded' end);
end$$;
revoke all on function public.analytics_ingest(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.analytics_ingest(uuid,jsonb) to service_role;

-- New permissions do not retroactively change the original page-view consent snapshot.
create or replace function e34_private.analytics_slice(from_time timestamptz,to_time timestamptz,section text default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare answer jsonb;begin
 with pages as materialized(select p.*,s.visitor,s.device,s.browser,s.referrer,s.campaign,v.first_seen from e34_private.analytics_pages p join e34_private.analytics_sessions s on s.id=p.session_id join e34_private.analytics_visitors v on v.id=s.visitor join e34_private.analytics_resources r on r.id=p.resource where p.viewed_at>=from_time and p.viewed_at<to_time and (section is null or r.kind=section)),
 events as materialized(select e.*,p.session_id,p.device,p.search_enabled,p.performance_enabled from e34_private.analytics_events e join pages p on p.id=e.page where e.occurred_at>=from_time and e.occurred_at<to_time),
 searches as materialized(select e.*,exists(select 1 from events c where c.name='search_result' and c.search_id=e.search_id and c.session_id=e.session_id and (c.occurred_at,c.seq)>(e.occurred_at,e.seq))as clicked,
 exists(select 1 from events c where c.name='search' and c.session_id=e.session_id and (c.occurred_at,c.seq)>(e.occurred_at,e.seq))as repeated,
 exists(select 1 from events c where c.session_id=e.session_id and c.name not in ('engagement','web_vital','model_loaded','js_error','asset_error','api_error','model_error','render_error') and (c.occurred_at,c.seq)>(e.occurred_at,e.seq))as continued,
 exists(select 1 from e34_private.analytics_sessions ss where ss.id=e.session_id and (ss.last_seen<statement_timestamp()-interval '30 minutes' or ss.started_at<statement_timestamp()-interval '4 hours'))as closed from events e where e.name='search'),
 engagement as (select p.id,least(300000,coalesce(sum(e.value),0))ms from pages p left join events e on e.page=p.id and e.name='engagement' group by p.id),
 journeys as(select p.session_id,min(p.viewed_at)as entered,
 min(e.occurred_at)filter(where e.name='search')as searched,
 min(e.occurred_at)filter(where e.name='component_select')as component,
 min(p.viewed_at)filter(where p.resource='/workshop')as workshop from pages p left join events e on e.page=p.id group by p.session_id)
 select jsonb_build_object(
 'available',exists(select 1 from e34_private.analytics_periods where started_at<to_time and coalesce(ended_at,statement_timestamp())>greatest(from_time,statement_timestamp()-interval '90 days')),
 'complete',coalesce((select sum(extract(epoch from least(coalesce(ended_at,statement_timestamp()),to_time)-greatest(started_at,from_time,statement_timestamp()-interval '90 days')))from e34_private.analytics_periods where started_at<to_time and coalesce(ended_at,statement_timestamp())>greatest(from_time,statement_timestamp()-interval '90 days')),0)>=extract(epoch from to_time-from_time)-1,
 'coverage_seconds',coalesce((select sum(extract(epoch from least(coalesce(ended_at,statement_timestamp()),to_time)-greatest(started_at,from_time,statement_timestamp()-interval '90 days')))from e34_private.analytics_periods where started_at<to_time and coalesce(ended_at,statement_timestamp())>greatest(from_time,statement_timestamp()-interval '90 days')),0),
 'views',(select count(*)from pages),'sessions',(select count(distinct session_id)from pages),'browsers',(select count(distinct visitor)from pages),
 'new_browsers',(select count(distinct visitor)from pages where first_seen>=from_time),'returning_browsers',(select count(distinct visitor)from pages where first_seen<from_time),
 'engaged_ms',(select coalesce(sum(ms),0)from engagement),'search_pages',(select count(*)from pages where search_enabled or exists(select 1 from events e where e.page=pages.id and e.name in ('search','search_result'))),'performance_pages',(select count(*)from pages where performance_enabled or exists(select 1 from events e where e.page=pages.id and e.name in ('web_vital','js_error','asset_error','api_error','model_error','render_error','model_loaded'))),
 'searches',(select count(*)from searches),'zero_results',(select count(*)from searches where results=0),'search_clicks',(select count(*)from searches where clicked),
 'search_repeated',(select count(*)from searches where repeated),'search_abandoned',(select count(*)from searches s where not clicked and not repeated and not continued and closed),
 'daily',coalesce((select jsonb_agg(to_jsonb(x)order by day)from(select (viewed_at at time zone 'UTC')::date as day,count(*)views,count(distinct session_id)sessions,count(distinct visitor)browsers from pages group by 1)x),'[]'::jsonb),
 'pages',coalesce((select jsonb_agg(to_jsonb(x)order by views desc,resource)from(select p.resource,r.title,r.path,r.kind,count(*)views,count(distinct p.session_id)sessions,round(avg(g.ms))engaged_ms from pages p join e34_private.analytics_resources r on r.id=p.resource join engagement g on g.id=p.id group by 1,2,3,4 order by views desc limit 100)x),'[]'::jsonb),
 'interactions',coalesce((select jsonb_agg(to_jsonb(x)order by events desc)from(select e.name,coalesce(r.title,e.resource,'Public page')title,e.resource,count(*)events,count(distinct e.session_id)sessions from events e left join e34_private.analytics_resources r on r.id=e.resource where e.name not in ('page_view','engagement','web_vital') group by 1,2,3 order by events desc limit 100)x),'[]'::jsonb),
 'topics',coalesce((select jsonb_agg(to_jsonb(x)order by searches desc,topic)from(select topic,model,count(*)searches,count(distinct session_id)sessions,count(*)filter(where results=0)zero_results,count(*)filter(where clicked)clicked,count(*)filter(where repeated)repeated,count(*)filter(where not clicked and not repeated and not continued and closed)abandoned from searches group by 1,2 order by searches desc limit 100)x),'[]'::jsonb),
 'requested_parts',coalesce((select jsonb_agg(to_jsonb(x))from(select r.title,r.path,r.id,pp.number_normalized,count(*)actions,count(distinct e.session_id)sessions from events e join e34_private.analytics_resources r on r.id=case when e.name='search_result' then e.target else e.resource end left join public.parts pp on pp.id=substring(r.id from 6) where r.kind='part' and e.name in ('search_result','component_select')group by r.id,r.title,r.path,pp.number_normalized order by actions desc limit 100)x),'[]'::jsonb),
 'acquisition',coalesce((select jsonb_agg(to_jsonb(x))from(select dimension,label,count(distinct session_id)sessions from (select session_id,'device' dimension,device label from pages union all select session_id,'browser',browser from pages union all select session_id,'referrer',coalesce(referrer,'Direct / unavailable')from pages union all select session_id,'campaign',coalesce(campaign,'Unattributed')from pages)q group by 1,2 order by 1,3 desc)x),'[]'::jsonb),
 'entries',coalesce((select jsonb_agg(to_jsonb(x))from(select resource,count(*)sessions from(select distinct on(session_id)session_id,resource from pages order by session_id,viewed_at,id)q group by 1 order by 2 desc limit 30)x),'[]'::jsonb),
 'exits',coalesce((select jsonb_agg(to_jsonb(x))from(select resource,count(*)sessions from(select distinct on(session_id)session_id,resource from pages order by session_id,viewed_at desc,id)q group by 1 order by 2 desc limit 30)x),'[]'::jsonb),
 'performance',coalesce((select jsonb_agg(to_jsonb(x))from(select e.metric,e.device,count(*)samples,percentile_cont(0.75)within group(order by e.value)p75 from (select distinct on(page,metric) * from events where name='web_vital' order by page,metric,occurred_at desc,seq desc)e group by 1,2)x),'[]'::jsonb),
 'errors',coalesce((select jsonb_agg(to_jsonb(x))from(select name,resource,device,count(*)events,count(distinct session_id)sessions from events where name in ('model_error','render_error','js_error','asset_error','api_error')group by 1,2,3 order by events desc limit 100)x),'[]'::jsonb),
 'model_load',coalesce((select jsonb_agg(to_jsonb(x))from(select device,count(*)samples,percentile_cont(0.75)within group(order by value)p75_ms from events where name='model_loaded' group by 1)x),'[]'::jsonb),
 'funnels',jsonb_build_array(
  jsonb_build_object('name','Search → catalog result → walkthrough','steps',jsonb_build_array(
   (select count(*)from journeys),
   (select count(*)from journeys where searched is not null),
   (select count(*)from journeys j where exists(select 1 from events e where e.session_id=j.session_id and e.name='search_result' and e.target like 'part:%' and e.occurred_at>=j.searched)),
   (select count(*)from journeys j where exists(select 1 from events c join events g on g.session_id=c.session_id and g.name='page_view' and g.resource like '/guides/%' and (g.occurred_at,g.seq)>(c.occurred_at,c.seq) where c.session_id=j.session_id and c.name='search_result' and c.target like 'part:%' and c.occurred_at>=j.searched)))),
  jsonb_build_object('name','Workshop → component → walkthrough','steps',jsonb_build_array(
   (select count(*)from journeys where workshop is not null),
   (select count(*)from journeys j where exists(select 1 from events c where c.session_id=j.session_id and c.name='component_select' and c.resource like 'node:%' and c.occurred_at>=j.workshop)),
   (select count(*)from journeys j where exists(select 1 from events c join events g on g.session_id=c.session_id and g.name='page_view' and g.resource like '/guides/%' and (g.occurred_at,g.seq)>(c.occurred_at,c.seq) where c.session_id=j.session_id and c.name='component_select' and c.resource like 'node:%' and c.occurred_at>=j.workshop)))))
 )into answer;
 return answer;
end$$;
revoke all on function e34_private.analytics_slice(timestamptz,timestamptz,text) from public,anon,authenticated;
