-- Additive, initially disabled. Legacy section opens and commercial ledgers stay intact.
create table e34_private.analytics_config (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 approved_revision integer, approved_by uuid references auth.users on delete set null, approved_at timestamptz,
 hash_key text, created_at timestamptz not null default now(), check(not enabled or (approved_revision=2 and hash_key is not null))
);
insert into e34_private.analytics_config(singleton) values(true);
create table e34_private.analytics_periods(id bigint generated always as identity primary key,started_at timestamptz not null,ended_at timestamptz,check(ended_at>=started_at));
create unique index analytics_one_open_period on e34_private.analytics_periods((true)) where ended_at is null;
create table e34_private.analytics_resources(id text primary key,path text not null,title text not null,kind text not null);
-- Public static registry inserted below; canonical catalog parts are checked at ingest.
create table e34_private.analytics_visitors(id text primary key check(id ~ '^[0-9a-f]{64}$'),first_seen timestamptz not null,last_seen timestamptz not null);
create table e34_private.analytics_erased(id text primary key,expires_at timestamptz not null);
create table e34_private.analytics_sessions(
 id uuid primary key default gen_random_uuid(),visitor text not null references e34_private.analytics_visitors on delete cascade,
 started_at timestamptz not null,last_seen timestamptz not null,device text not null,browser text not null,referrer text,campaign text
);
create index analytics_sessions_visitor on e34_private.analytics_sessions(visitor,last_seen desc);
create table e34_private.analytics_pages(
 id uuid primary key,session_id uuid not null references e34_private.analytics_sessions on delete cascade,
 resource text not null references e34_private.analytics_resources,viewed_at timestamptz not null,
 search_enabled boolean not null,performance_enabled boolean not null
);
create index analytics_pages_session on e34_private.analytics_pages(session_id,viewed_at);
create index analytics_pages_time on e34_private.analytics_pages(viewed_at,resource);
create table e34_private.analytics_events(
 id uuid primary key,page uuid not null references e34_private.analytics_pages on delete cascade,
 name text not null,resource text references e34_private.analytics_resources,target text references e34_private.analytics_resources,
 occurred_at timestamptz not null,received_at timestamptz not null default clock_timestamp(),seq integer not null,
 search_id uuid,topic text,results integer,value numeric,metric text,model text,code text,
 schema_version integer not null default 1 check(schema_version=1),unique(page,seq)
);
create index analytics_events_time on e34_private.analytics_events(occurred_at,name);
create index analytics_events_page on e34_private.analytics_events(page,occurred_at,seq);
create unique index analytics_one_search on e34_private.analytics_events(search_id) where name='search';
create index analytics_events_search on e34_private.analytics_events(search_id) where search_id is not null;
create table e34_private.analytics_quality(day date primary key,accepted integer not null default 0,dropped integer not null default 0,check(accepted>=0 and dropped>=0));
create table e34_private.analytics_daily(day date not null,resource text not null,views integer not null,sessions integer not null,browsers integer not null,primary key(day,resource));
create table e34_private.analytics_campaigns(code text primary key check(code ~ '^[a-z0-9-]{1,48}$'),label text not null check(char_length(label) between 1 and 100),active boolean not null default true);
-- No permissive policies: only narrow guarded functions read or write analytics.
do $$declare t text;begin foreach t in array array['analytics_config','analytics_periods','analytics_resources','analytics_visitors','analytics_erased','analytics_sessions','analytics_pages','analytics_events','analytics_quality','analytics_daily','analytics_campaigns'] loop
 execute format('alter table e34_private.%I enable row level security',t);
 execute format('revoke all on e34_private.%I from public,anon,authenticated',t);
end loop;end$$;

create function public.analytics_is_staff(target_user uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from e34_private.staff_roles where user_id=target_user)$$;
revoke all on function public.analytics_is_staff(uuid) from public,anon,authenticated;
grant execute on function public.analytics_is_staff(uuid) to service_role;

create function public.analytics_public_config() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',enabled,'revision',2) from e34_private.analytics_config where singleton
$$;
revoke all on function public.analytics_public_config() from public;
grant execute on function public.analytics_public_config() to anon,authenticated,service_role;

create function public.analytics_configure(collect boolean,policy_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not e34_private.commercial_admin() then raise exception 'Administrator permission and verified authenticator session required' using errcode='42501';end if;
 if policy_revision<>2 or policy_revision is null then raise exception 'Review privacy revision 2 before changing collection';end if;
 perform pg_advisory_xact_lock(73400234);
 if collect then
  update e34_private.analytics_config set enabled=true,approved_revision=2,approved_by=auth.uid(),approved_at=clock_timestamp(),hash_key=coalesce(hash_key,encode(extensions.gen_random_bytes(32),'hex')) where singleton;
  insert into e34_private.analytics_periods(started_at) select clock_timestamp() where not exists(select 1 from e34_private.analytics_periods where ended_at is null);
 else
  update e34_private.analytics_config set enabled=false where singleton;
  update e34_private.analytics_periods set ended_at=clock_timestamp() where ended_at is null;
 end if;
 insert into e34_private.audit_events(actor_id,action,table_name)values(auth.uid(),case when collect then 'analytics_enabled_revision_2' else 'analytics_paused' end,'analytics_config');
 return public.analytics_public_config();
end$$;
revoke all on function public.analytics_configure(boolean,integer) from public,anon;
grant execute on function public.analytics_configure(boolean,integer) to authenticated;

create function e34_private.analytics_resource_valid(value text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if value is null then return true;end if;
 if exists(select 1 from e34_private.analytics_resources where id=value) then return true;end if;
 if value like 'drawing:%' and exists(select 1 from public.assemblies where id=substring(value from 9))then
  insert into e34_private.analytics_resources select value,'/parts/catalog',title,'drawing' from public.assemblies where id=substring(value from 9)on conflict do nothing;return true;
 end if;
 if value like 'part:%' and exists(select 1 from public.parts where id=substring(value from 6)) then
  insert into e34_private.analytics_resources(id,path,title,kind)select value,'/parts/catalog?part='||id,name,'part' from public.parts where id=substring(value from 6) on conflict do nothing;return true;
 end if;
 return false;
end$$;
revoke all on function e34_private.analytics_resource_valid(text) from public,anon,authenticated;

-- Service-only validated ingest. Client UUIDs are never persisted; hashes cannot join Auth.
create function public.analytics_ingest(browser_id uuid,batch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 insert into e34_private.analytics_quality(day,accepted)values(today,n)on conflict(day)do update set accepted=analytics_quality.accepted+excluded.accepted;
 return jsonb_build_object('accepted',n,'status','recorded');
end$$;
revoke all on function public.analytics_ingest(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.analytics_ingest(uuid,jsonb) to service_role;

create function public.analytics_forget(browser_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare h text;
begin
 perform pg_advisory_xact_lock(73400234);
 select encode(extensions.hmac(browser_id::text,hash_key,'sha256'),'hex')into h from e34_private.analytics_config where singleton;
 if h is null then return;end if;
 if (select count(*)from e34_private.analytics_erased)>=10000 then raise exception 'Deletion protection is busy. Please try again later.';end if;
 insert into e34_private.analytics_erased values(h,clock_timestamp()+interval '31 days')on conflict(id)do update set expires_at=excluded.expires_at;
 delete from e34_private.analytics_visitors where id=h;
 -- Rollups are a cache, not an independent source of deleted visitor history.
 delete from e34_private.analytics_daily;
end$$;
revoke all on function public.analytics_forget(uuid) from public,anon,authenticated;
grant execute on function public.analytics_forget(uuid) to service_role;

create function e34_private.analytics_maintain() returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(73400234);
 delete from e34_private.analytics_erased where expires_at<clock_timestamp();
 delete from e34_private.analytics_pages where viewed_at<clock_timestamp()-interval '90 days';
 delete from e34_private.analytics_sessions s where not exists(select 1 from e34_private.analytics_pages where session_id=s.id);
 delete from e34_private.analytics_visitors v where not exists(select 1 from e34_private.analytics_sessions where visitor=v.id);
 delete from e34_private.analytics_quality where day<(now() at time zone 'UTC')::date-90;
 delete from e34_private.analytics_gsc_daily where day<(clock_timestamp() at time zone 'UTC')::date-90;
 delete from e34_private.analytics_daily;
 insert into e34_private.analytics_daily select (p.viewed_at at time zone 'UTC')::date,p.resource,count(*),count(distinct s.id),count(distinct s.visitor)from e34_private.analytics_pages p join e34_private.analytics_sessions s on s.id=p.session_id group by 1,2;
end$$;
revoke all on function e34_private.analytics_maintain() from public,anon,authenticated;
select cron.schedule('e34-analytics-retention','17 * * * *','select e34_private.analytics_maintain()');

insert into e34_private.analytics_resources(id,path,title,kind)values
('/','/','Home','page'),
('/app','/app','Install app','page'),
('/articles/cooling-system','/articles/cooling-system','Cooling system: circulation and temperature control','article'),
('/articles/first-inspection','/articles/first-inspection','Vehicle intake inspection','article'),
('/articles/fitment-evidence','/articles/fitment-evidence','Part fitment and interchange criteria','article'),
('/articles/know-your-e34','/articles/know-your-e34','Vehicle identification and applicability','article'),
('/community','/community','Community','page'),
('/community/cars','/community/cars','Cars and projects','page'),
('/community/issues','/community/issues','Known issues','page'),
('/community/topics','/community/topics','Community topics','page'),
('/diagnostics','/diagnostics','Diagnostics','page'),
('/encyclopedia','/encyclopedia','Encyclopedia','page'),
('/garages','/garages','Public garages','page'),
('/guides/accessory-drive-belt-inspection','/guides/accessory-drive-belt-inspection','Inspect accessory drive belts for wear','guide'),
('/guides/battery-connections-first-check','/guides/battery-connections-first-check','Inspect battery cables and grounds before blaming the alternator','guide'),
('/guides/brake-fluid-level-inspection','/guides/brake-fluid-level-inspection','Check the brake and clutch fluid reservoir','guide'),
('/guides/brake-pad-and-rotor-inspection','/guides/brake-pad-and-rotor-inspection','Measure brake pad and rotor wear','guide'),
('/guides/cold-tire-pressure-check','/guides/cold-tire-pressure-check','Check and set cold tire pressures','guide'),
('/guides/cooling-fan-airflow-check','/guides/cooling-fan-airflow-check','Separate an airflow concern from a fan diagnosis','guide'),
('/guides/cooling-system-visual-check','/guides/cooling-system-visual-check','Start an overheating investigation with a cold inspection','guide'),
('/guides/diagnose-blown-fuse','/guides/diagnose-blown-fuse','Find and test a blown fuse','guide'),
('/guides/differential-fluid-service','/guides/differential-fluid-service','Service the rear differential oil','guide'),
('/guides/e34-525i-five-speed-swap','/guides/e34-525i-five-speed-swap','Plan an E34 525i five-speed manual swap','guide'),
('/guides/e34-525i-s52-engine-swap','/guides/e34-525i-s52-engine-swap','Plan an S52 swap into an M50 E34 525i','guide'),
('/guides/e34-540i-six-speed-conversion','/guides/e34-540i-six-speed-conversion','Plan an E34 540i six-speed conversion','guide'),
('/guides/e34-blower-speed-diagnosis','/guides/e34-blower-speed-diagnosis','Diagnose a blower that only works on high','guide'),
('/guides/e34-cabin-filter-replacement','/guides/e34-cabin-filter-replacement','Replace the HVAC cabin microfilter','guide'),
('/guides/e34-electric-fan-conversion','/guides/e34-electric-fan-conversion','Plan a mechanical fan delete with electric cooling','guide'),
('/guides/e34-m60b30-to-b40-swap','/guides/e34-m60b30-to-b40-swap','Plan an M60B30 to M60B40 engine swap','guide'),
('/guides/e34-self-leveling-suspension-conversion','/guides/e34-self-leveling-suspension-conversion','Plan a self-leveling suspension delete or repair','guide'),
('/guides/engine-air-filter-replacement','/guides/engine-air-filter-replacement','Replace the engine air filter','guide'),
('/guides/factory-halogen-headlight-bulb','/guides/factory-halogen-headlight-bulb','Replace a factory twist-lock halogen headlight bulb','guide'),
('/guides/factory-manual-clutch-installation','/guides/factory-manual-clutch-installation','Replace the clutch with the manual gearbox removed','guide'),
('/guides/factory-sliding-caliper-brake-pads','/guides/factory-sliding-caliper-brake-pads','Replace brake pads on factory sliding calipers','guide'),
('/guides/front-door-window-dropped-inspection','/guides/front-door-window-dropped-inspection','Check a front door window that dropped or sits crooked','guide'),
('/guides/front-strut-component-identification','/guides/front-strut-component-identification','Identify a front strut assembly and its production differences','guide'),
('/guides/hood-support-struts','/guides/hood-support-struts','Replace the hood support struts','guide'),
('/guides/identify-transmission-tag','/guides/identify-transmission-tag','Identify an E34 gearbox from its tag','guide'),
('/guides/identify-your-engine','/guides/identify-your-engine','Identify the engine before choosing a procedure','guide'),
('/guides/m20-timing-belt','/guides/m20-timing-belt','Replace the M20 timing belt and tensioner','guide'),
('/guides/m50-engine-oil-and-filter','/guides/m50-engine-oil-and-filter','Change the oil and cartridge filter on an M50 525i','guide'),
('/guides/m50-spark-plug-replacement','/guides/m50-spark-plug-replacement','Replace the M50 or M50TU spark plugs','guide'),
('/guides/m50-valve-cover-gasket','/guides/m50-valve-cover-gasket','Replace the M50 valve-cover gasket','guide'),
('/guides/m50-water-pump-job-planning','/guides/m50-water-pump-job-planning','Plan an M50 coolant-pump job','guide'),
('/guides/m50tu-single-vanos-service','/guides/m50tu-single-vanos-service','Remove and reinstall M50TU single VANOS','guide'),
('/guides/m50tu-vanos-delete-planning','/guides/m50tu-vanos-delete-planning','Evaluate a fixed-timing M50TU VANOS delete','guide'),
('/guides/m50tu-vanos-diagnosis','/guides/m50tu-vanos-diagnosis','Diagnose M50TU single VANOS travel','guide'),
('/guides/m50tu-vanos-piston-seals','/guides/m50tu-vanos-piston-seals','Renew the M50TU VANOS piston seals on the bench','guide'),
('/guides/manual-transmission-fluid','/guides/manual-transmission-fluid','Drain and refill a factory manual gearbox','guide'),
('/guides/power-steering-fluid-level-inspection','/guides/power-steering-fluid-level-inspection','Identify and check the power-steering fluid','guide'),
('/guides/sedan-tail-lamp-bulb','/guides/sedan-tail-lamp-bulb','Replace a body-mounted tail lamp bulb on an E34 Sedan','guide'),
('/guides/windshield-washer-pump','/guides/windshield-washer-pump','Replace the windshield washer pump','guide'),
('/guides/windshield-wiper-blade-replacement','/guides/windshield-wiper-blade-replacement','Replace the front windshield wiper blades','guide'),
('/manual','/manual','Service manual','page'),
('/manual/010','/manual/010','Fundamentals for the DIY owner','manual'),
('/manual/020','/manual/020','Maintenance program','manual'),
('/manual/100','/manual/100','Engine - general','manual'),
('/manual/110','/manual/110','Engine removal and installation','manual'),
('/manual/113','/manual/113','Cylinder head removal and installation','manual'),
('/manual/116','/manual/116','Cylinder head and valvetrain','manual'),
('/manual/117','/manual/117','Camshaft timing chain','manual'),
('/manual/118','/manual/118','Camshaft timing belt','manual'),
('/manual/119','/manual/119','Lubrication system','manual'),
('/manual/120','/manual/120','Ignition system and DME','manual'),
('/manual/121','/manual/121','Battery, starter and alternator','manual'),
('/manual/130','/manual/130','Fuel injection and DME','manual'),
('/manual/160','/manual/160','Fuel tank and fuel pump','manual'),
('/manual/170','/manual/170','Radiator and cooling system','manual'),
('/manual/180','/manual/180','Exhaust system','manual'),
('/manual/200','/manual/200','Transmission - general','manual'),
('/manual/210','/manual/210','Clutch','manual'),
('/manual/230','/manual/230','Manual transmission','manual'),
('/manual/240','/manual/240','Automatic transmission','manual'),
('/manual/250','/manual/250','Gearshift linkage','manual'),
('/manual/260','/manual/260','Driveshaft','manual'),
('/manual/300','/manual/300','Suspension, steering and brakes - general','manual'),
('/manual/310','/manual/310','Front suspension','manual'),
('/manual/320','/manual/320','Steering and wheel alignment','manual'),
('/manual/330','/manual/330','Rear suspension','manual'),
('/manual/331','/manual/331','Final drive','manual'),
('/manual/340','/manual/340','Brakes','manual'),
('/manual/400','/manual/400','Body - general','manual'),
('/manual/410','/manual/410','Fenders and engine hood','manual'),
('/manual/411','/manual/411','Doors','manual'),
('/manual/412','/manual/412','Trunk lid and tailgate','manual'),
('/manual/510','/manual/510','Exterior trim and bumpers','manual'),
('/manual/512','/manual/512','Door windows','manual'),
('/manual/513','/manual/513','Interior trim','manual'),
('/manual/515','/manual/515','Central locking','manual'),
('/manual/520','/manual/520','Seats','manual'),
('/manual/540','/manual/540','Sunroof','manual'),
('/manual/600','/manual/600','Electrical system - general','manual'),
('/manual/610','/manual/610','Fuses and relays','manual'),
('/manual/611','/manual/611','Wipers and washers','manual'),
('/manual/612','/manual/612','Switches and electrical accessories','manual'),
('/manual/620','/manual/620','Instruments','manual'),
('/manual/630','/manual/630','Exterior lighting','manual'),
('/manual/640','/manual/640','Heating and air conditioning','manual'),
('/manual/650','/manual/650','Radio','manual'),
('/manual/720','/manual/720','Seat belts','manual'),
('/manual/721','/manual/721','Airbag system (SRS)','manual'),
('/marketplace','/marketplace','Exchange','page'),
('/models/518g','/models/518g','518g','model'),
('/models/518i','/models/518i','518i','model'),
('/models/520i','/models/520i','520i','model'),
('/models/524td','/models/524td','524td','model'),
('/models/525i','/models/525i','525i','model'),
('/models/525iX','/models/525iX','525iX','model'),
('/models/525td','/models/525td','525td','model'),
('/models/525tds','/models/525tds','525tds','model'),
('/models/530i','/models/530i','530i','model'),
('/models/535i','/models/535i','535i','model'),
('/models/540i','/models/540i','540i','model'),
('/models/M5','/models/M5','M5','model'),
('/parts/catalog','/parts/catalog','OEM catalog','page'),
('/parts/interchange','/parts/interchange','Interchange','page'),
('/quick-reference','/quick-reference','Quick reference','page'),
('/quick-reference/fluids','/quick-reference/fluids','Fluids & capacities','quick'),
('/quick-reference/fuses','/quick-reference/fuses','Fuse diagrams','quick'),
('/quick-reference/locations','/quick-reference/locations','Component locations','quick'),
('/repairs','/repairs','Walkthroughs','page'),
('/resources','/resources','Resources','page'),
('/roadmap','/roadmap','Roadmap','page'),
('/search','/search','Site search','page'),
('/shop','/shop','Merchandise','page'),
('/workshop','/workshop','Workshop','page'),
('diagnostic:braking','/diagnostics','braking','diagnostic'),
('diagnostic:no-start','/diagnostics','no-start','diagnostic'),
('diagnostic:overheating','/diagnostics','overheating','diagnostic'),
('diagnostic:vibration','/diagnostics','vibration','diagnostic'),
('drawing:front-brake','/parts','Front caliper & brake pads','drawing'),
('drawing:front-brake-disc','/parts','Front disc & protection shield','drawing'),
('drawing:front-caliper-service','/parts','Front caliper — service figure','drawing'),
('drawing:front-strut','/parts','Front spring strut','drawing'),
('drawing:front-strut-damper','/parts','Front strut housing & damper','drawing'),
('drawing:front-strut-upper','/parts','Upper strut mount & spring pads','drawing'),
('drawing:master-cylinder-service','/parts','Brake master cylinder','drawing'),
('drawing:parking-brake-service','/parts','Parking brake mechanism','drawing'),
('drawing:radiator-service','/parts','Radiator & cooling layout','drawing'),
('drawing:rear-caliper-service','/parts','Rear caliper — service figure','drawing'),
('drawing:water-pump','/parts','Water pump & thermostat','drawing'),
('node:e34body:assembly','/workshop','Sedan exterior','component'),
('node:e34body:front-bumper','/workshop','Front bumper','component'),
('node:e34body:front-door-glass-left','/workshop','left side glass','component'),
('node:e34body:front-door-glass-right','/workshop','right side glass','component'),
('node:e34body:front-door-left','/workshop','left front door','component'),
('node:e34body:front-door-right','/workshop','right front door','component'),
('node:e34body:front-fender-left','/workshop','left front fender','component'),
('node:e34body:front-fender-right','/workshop','right front fender','component'),
('node:e34body:front-license-plate','/workshop','Front registration plate','component'),
('node:e34body:front-valance','/workshop','Front lower valance','component'),
('node:e34body:headlamp-left-inner','/workshop','left high-beam headlamp','component'),
('node:e34body:headlamp-left-outer','/workshop','left low-beam headlamp','component'),
('node:e34body:headlamp-right-inner','/workshop','right high-beam headlamp','component'),
('node:e34body:headlamp-right-outer','/workshop','right low-beam headlamp','component'),
('node:e34body:hood','/workshop','Hood','component'),
('node:e34body:mirror-left','/workshop','left exterior mirror','component'),
('node:e34body:mirror-right','/workshop','right exterior mirror','component'),
('node:e34body:rear-bumper','/workshop','Rear bumper','component'),
('node:e34body:rear-door-glass-left','/workshop','left side glass','component'),
('node:e34body:rear-door-glass-right','/workshop','right side glass','component'),
('node:e34body:rear-door-left','/workshop','left rear door','component'),
('node:e34body:rear-door-right','/workshop','right rear door','component'),
('node:e34body:rear-quarter-left','/workshop','left rear quarter','component'),
('node:e34body:rear-quarter-right','/workshop','right rear quarter','component'),
('node:e34body:rear-window','/workshop','Rear window','component'),
('node:e34body:rocker-left','/workshop','left rocker panel','component'),
('node:e34body:rocker-right','/workshop','right rocker panel','component'),
('node:e34body:roof','/workshop','Roof panel','component'),
('node:e34body:roundel-front','/workshop','Front BMW roundel','component'),
('node:e34body:roundel-rear','/workshop','Rear BMW roundel','component'),
('node:e34body:shell','/workshop','Body shell and pillars','component'),
('node:e34body:side-moulding-e34-body-14-left','/workshop','left protective side moulding','component'),
('node:e34body:side-moulding-e34-body-14-right','/workshop','right protective side moulding','component'),
('node:e34body:side-moulding-e34-body-15-left','/workshop','left protective side moulding','component'),
('node:e34body:side-moulding-e34-body-15-right','/workshop','right protective side moulding','component'),
('node:e34body:side-moulding-e34-body-16-left','/workshop','left protective side moulding','component'),
('node:e34body:side-moulding-e34-body-16-right','/workshop','right protective side moulding','component'),
('node:e34body:tail-light-left','/workshop','left rear combination lamp','component'),
('node:e34body:tail-light-right','/workshop','right rear combination lamp','component'),
('node:e34body:trunk','/workshop','Trunk lid','component'),
('node:e34body:trunk-lamp-left','/workshop','left trunk-mounted rear lamp','component'),
('node:e34body:trunk-lamp-right','/workshop','right trunk-mounted rear lamp','component'),
('node:e34body:windshield','/workshop','Windshield','component'),
('node:e34sys:abs-hydraulic-unit','/workshop','ABS hydraulic block, pump and hard-line connections','component'),
('node:e34sys:airbox','/workshop','Intake air cleaner housing, lid ribs and clips','component'),
('node:e34sys:bellhousing','/workshop','Clutch bellhousing and engine mating flange','component'),
('node:e34sys:blower-motor','/workshop','Cowl-mounted twin squirrel-cage blower','component'),
('node:e34sys:body','/workshop','Body · assembled layout','component'),
('node:e34sys:body-wiring-harness','/workshop','Clipped body wiring trunk and engine-bay harness branches','component'),
('node:e34sys:brake-booster-master','/workshop','Brake vacuum booster, master cylinder and fluid reservoir','component'),
('node:e34sys:brake-caliper-front--1','/workshop','Right front floating brake caliper and carrier','component'),
('node:e34sys:brake-caliper-front-1','/workshop','Left front floating brake caliper and carrier','component'),
('node:e34sys:brake-caliper-rear--1','/workshop','Right rear floating brake caliper and carrier','component'),
('node:e34sys:brake-caliper-rear-1','/workshop','Left rear floating brake caliper and carrier','component'),
('node:e34sys:brake-disc-front--1','/workshop','Right front brake disc and central hat','component'),
('node:e34sys:brake-disc-front-1','/workshop','Left front brake disc and central hat','component'),
('node:e34sys:brake-disc-rear--1','/workshop','Right rear brake disc and central hat','component'),
('node:e34sys:brake-disc-rear-1','/workshop','Left rear brake disc and central hat','component'),
('node:e34sys:brake-hose-front--1','/workshop','Right front flexible brake hose and ABS lead','component'),
('node:e34sys:brake-hose-front-1','/workshop','Left front flexible brake hose and ABS lead','component'),
('node:e34sys:brake-hose-rear--1','/workshop','Right rear flexible brake hose and ABS lead','component'),
('node:e34sys:brake-hose-rear-1','/workshop','Left rear flexible brake hose and ABS lead','component'),
('node:e34sys:brake-pad-front--1','/workshop','Right front inner and outer brake pads','component'),
('node:e34sys:brake-pad-front-1','/workshop','Left front inner and outer brake pads','component'),
('node:e34sys:brake-pad-rear--1','/workshop','Right rear inner and outer brake pads','component'),
('node:e34sys:brake-pad-rear-1','/workshop','Left rear inner and outer brake pads','component'),
('node:e34sys:brake-shield-front--1','/workshop','Right front brake backing shield','component'),
('node:e34sys:brake-shield-front-1','/workshop','Left front brake backing shield','component'),
('node:e34sys:brake-shield-rear--1','/workshop','Right rear brake backing shield','component'),
('node:e34sys:brake-shield-rear-1','/workshop','Left rear brake backing shield','component'),
('node:e34sys:braking','/workshop','Braking · assembled layout','component'),
('node:e34sys:cabin-carpet','/workshop','Cabin floor, pillars and inner body lining','component'),
('node:e34sys:catalyst-center-resonator','/workshop','Twin catalyst/center exhaust housings and heat shields','component'),
('node:e34sys:center-bearing','/workshop','Propeller-shaft center support bearing and bracket','component'),
('node:e34sys:center-drag-link','/workshop','Center steering tie rod / drag link','component'),
('node:e34sys:chassis-rail--1','/workshop','Right front chassis rail','component'),
('node:e34sys:chassis-rail-1','/workshop','Left front chassis rail','component'),
('node:e34sys:clutch-assembly','/workshop','Clutch friction disc and diaphragm pressure cover','component'),
('node:e34sys:clutch-slave-cylinder','/workshop','Clutch slave cylinder and hydraulic line','component'),
('node:e34sys:cooling','/workshop','Cooling · assembled layout','component'),
('node:e34sys:dash-vent-center','/workshop','center dashboard air vent','component'),
('node:e34sys:dash-vent-driver','/workshop','driver dashboard air vent','component'),
('node:e34sys:dash-vent-passenger','/workshop','passenger dashboard air vent','component'),
('node:e34sys:dashboard','/workshop','E34 dashboard, vents and center controls','component'),
('node:e34sys:differential','/workshop','Differential · assembled layout','component'),
('node:e34sys:differential-case','/workshop','Rear differential cast housing, cover and mounting ear','component'),
('node:e34sys:differential-input-flange','/workshop','Differential input flange and rear shaft CV coupling','component'),
('node:e34sys:door-card-front--1','/workshop','right front door trim','component'),
('node:e34sys:door-card-rear--1','/workshop','right rear door trim','component'),
('node:e34sys:door-card-rear-1','/workshop','left rear door trim','component'),
('node:e34sys:driveshaft','/workshop','Driveshaft · assembled layout','component'),
('node:e34sys:electrical','/workshop','Electrical · assembled layout','component'),
('node:e34sys:electronics-box','/workshop','Right cowl electronics enclosure and DME connector bank','component'),
('node:e34sys:engine-cooling-fan','/workshop','Eleven-blade engine cooling fan and viscous coupling','component'),
('node:e34sys:exhaust','/workshop','Exhaust · assembled layout','component'),
('node:e34sys:exhaust-downpipes','/workshop','Twin exhaust downpipes from engine exhaust side','component'),
('node:e34sys:expansion-tank','/workshop','Coolant expansion tank, level neck and pressure cap','component'),
('node:e34sys:fan-shroud','/workshop','Radiator fan shroud and circular throat','component'),
('node:e34sys:firewall','/workshop','Firewall and pedal bulkhead','component'),
('node:e34sys:flexible-drive-coupling','/workshop','Guibo flexible drive coupling and six fasteners','component'),
('node:e34sys:floor-pan','/workshop','Passenger floor pan and stamped ribs','component'),
('node:e34sys:fresh-air-snorkel','/workshop','Front fresh-air intake snorkel','component'),
('node:e34sys:front-antiroll-bar','/workshop','Front anti-roll bar and mounting bushes','component'),
('node:e34sys:front-control-arm--1','/workshop','Right front lower control arm and ball joint','component'),
('node:e34sys:front-control-arm-1','/workshop','Left front lower control arm and ball joint','component'),
('node:e34sys:front-damper--1','/workshop','Right front damper piston and dust boot','component'),
('node:e34sys:front-damper-1','/workshop','Left front damper piston and dust boot','component'),
('node:e34sys:front-drop-link--1','/workshop','Right front anti-roll link','component'),
('node:e34sys:front-drop-link-1','/workshop','Left front anti-roll link','component'),
('node:e34sys:front-fuse-relay-box','/workshop','Front fuse and relay distribution box','component'),
('node:e34sys:front-seat--1','/workshop','Passenger E34 front seat','component'),
('node:e34sys:front-seat-1','/workshop','Driver E34 front seat','component'),
('node:e34sys:front-spring--1','/workshop','Right front coil spring','component'),
('node:e34sys:front-spring-1','/workshop','Left front coil spring','component'),
('node:e34sys:front-spring-seat--1','/workshop','Right front spring seats and upper mount','component'),
('node:e34sys:front-spring-seat-1','/workshop','Left front spring seats and upper mount','component'),
('node:e34sys:front-strut--1','/workshop','Right front MacPherson strut housing','component'),
('node:e34sys:front-strut-1','/workshop','Left front MacPherson strut housing','component'),
('node:e34sys:front-subframe','/workshop','Front engine carrier and connecting crossmember','component'),
('node:e34sys:front-thrust-arm--1','/workshop','Right front thrust arm and hydraulic bushing','component'),
('node:e34sys:front-thrust-arm-1','/workshop','Left front thrust arm and hydraulic bushing','component'),
('node:e34sys:fuel','/workshop','Fuel · assembled layout','component'),
('node:e34sys:fuel-filler-neck','/workshop','Right rear fuel filler neck and vent line','component'),
('node:e34sys:fuel-filter','/workshop','Underfloor inline fuel filter, clamp and unions','component'),
('node:e34sys:fuel-pump-sender','/workshop','In-tank pump and sender access flanges','component'),
('node:e34sys:fuel-supply-return-lines','/workshop','Underfloor fuel supply, return and clipped vent lines','component'),
('node:e34sys:fuel-tank','/workshop','Rear under-luggage-compartment fuel tank and pressed seam','component'),
('node:e34sys:gear-lever','/workshop','Gear lever and gaiter','component'),
('node:e34sys:gearbox-crossmember','/workshop','Transmission crossmember, rubber mounts and shift linkage','component'),
('node:e34sys:halfshaft--1','/workshop','Right rear halfshaft, CV joints and bellows','component'),
('node:e34sys:halfshaft-1','/workshop','Left rear halfshaft, CV joints and bellows','component'),
('node:e34sys:handbrake-lever','/workshop','Parking brake lever','component'),
('node:e34sys:headliner','/workshop','Textured cabin headliner and upper lining','component'),
('node:e34sys:heater-hoses','/workshop','Heater supply and return hoses at firewall','component'),
('node:e34sys:hub-front--1','/workshop','Right front hub and five-bolt flange','component'),
('node:e34sys:hub-front-1','/workshop','Left front hub and five-bolt flange','component'),
('node:e34sys:hub-rear--1','/workshop','Right rear hub and five-bolt flange','component'),
('node:e34sys:hub-rear-1','/workshop','Left rear hub and five-bolt flange','component'),
('node:e34sys:hvac','/workshop','Hvac · assembled layout','component'),
('node:e34sys:hvac-ducts','/workshop','Defroster distribution, dashboard and rear footwell ducts','component'),
('node:e34sys:hvac-heater-box','/workshop','Heater/evaporator box and heater core casing','component'),
('node:e34sys:idler-arm','/workshop','Right-side steering idler arm and support','component'),
('node:e34sys:instrument-cluster','/workshop','E34 instrument cluster and binnacle','component'),
('node:e34sys:intake','/workshop','Intake · assembled layout','component'),
('node:e34sys:intake-boot-maf','/workshop','Air-flow meter and ribbed intake boot','component'),
('node:e34sys:interior','/workshop','Interior · assembled layout','component'),
('node:e34sys:lower-radiator-hose','/workshop','Lower radiator hose and return bend','component'),
('node:e34sys:luggage-floor','/workshop','Luggage floor and spare-wheel well','component'),
('node:e34sys:manual-gearbox','/workshop','Longitudinal manual gearbox case and ribs','component'),
('node:e34sys:parking-brake-shoes--1','/workshop','Right rear drum-in-disc parking brake shoes and expander','component'),
('node:e34sys:parking-brake-shoes-1','/workshop','Left rear drum-in-disc parking brake shoes and expander','component'),
('node:e34sys:pedal-box','/workshop','Driver pedal box','component'),
('node:e34sys:pitman-arm','/workshop','Steering pitman arm','component'),
('node:e34sys:propeller-shaft','/workshop','Two-piece propeller shaft and universal joint','component'),
('node:e34sys:radiator','/workshop','Radiator core, end tanks and upper mounts','component'),
('node:e34sys:rear-antiroll-bar','/workshop','Rear anti-roll bar and mounting bushes','component'),
('node:e34sys:rear-belt--1','/workshop','Right rear shoulder belt and latch','component'),
('node:e34sys:rear-belt-1','/workshop','Left rear shoulder belt and latch','component'),
('node:e34sys:rear-center-lap-belt','/workshop','Rear center lap belt and paired buckles','component'),
('node:e34sys:rear-coil-spring--1','/workshop','Right rear coil spring and retaining seats','component'),
('node:e34sys:rear-coil-spring-1','/workshop','Left rear coil spring and retaining seats','component'),
('node:e34sys:rear-damper--1','/workshop','Right rear spring-strut damper and mount','component'),
('node:e34sys:rear-damper-1','/workshop','Left rear spring-strut damper and mount','component'),
('node:e34sys:rear-drop-link--1','/workshop','Right rear anti-roll link','component'),
('node:e34sys:rear-drop-link-1','/workshop','Left rear anti-roll link','component'),
('node:e34sys:rear-exhaust-pipes','/workshop','Rear axle clearance exhaust bends','component'),
('node:e34sys:rear-muffler','/workshop','Left rear muffler and dual tailpipes','component'),
('node:e34sys:rear-seat-battery','/workshop','Rear-seat battery, hold-down and insulated terminals','component'),
('node:e34sys:rear-seat-cushion','/workshop','E34 rear bench and backrest','component'),
('node:e34sys:rear-subframe','/workshop','Rear axle carrier with four isolation mounts','component'),
('node:e34sys:rear-trailing-arm--1','/workshop','Right rear semi-trailing arm and pivot bushings','component'),
('node:e34sys:rear-trailing-arm-1','/workshop','Left rear semi-trailing arm and pivot bushings','component'),
('node:e34sys:safety','/workshop','Safety · assembled layout','component'),
('node:e34sys:seat-belt-front--1','/workshop','Passenger three-point belt, upper guide and buckle','component'),
('node:e34sys:seat-belt-front-1','/workshop','Driver three-point belt, upper guide and buckle','component'),
('node:e34sys:seatbelt-left','/workshop','left front seat belt','component'),
('node:e34sys:seatbelt-right','/workshop','right front seat belt','component'),
('node:e34sys:sill--1','/workshop','Right inner sill and seat crossmembers','component'),
('node:e34sys:sill-1','/workshop','Left inner sill and seat crossmembers','component'),
('node:e34sys:steering','/workshop','Steering · assembled layout','component'),
('node:e34sys:steering-column','/workshop','Cabin steering column shroud','component'),
('node:e34sys:steering-gearbox','/workshop','Power-assisted steering gearbox','component'),
('node:e34sys:steering-wheel','/workshop','E34 steering wheel','component'),
('node:e34sys:suspension','/workshop','Suspension · assembled layout','component'),
('node:e34sys:tie-rod--1','/workshop','Right adjustable outer tie rod','component'),
('node:e34sys:tie-rod-1','/workshop','Left adjustable outer tie rod','component'),
('node:e34sys:transmission','/workshop','Transmission · assembled layout','component'),
('node:e34sys:transmission-tunnel','/workshop','Raised transmission and propeller-shaft tunnel','component'),
('node:e34sys:upper-radiator-hose','/workshop','Upper radiator hose, elbows and clamps','component'),
('node:m50:ac-compressor','/workshop','Air-conditioning compressor / clutch reference','component'),
('node:m50:accessories','/workshop','Accessory drive and starting system','component'),
('node:m50:accessory-belt','/workshop','Multi-rib accessory belt reference','component'),
('node:m50:alternator','/workshop','Ventilated alternator housing','component'),
('node:m50:belt-tensioner','/workshop','Accessory-belt tensioner reference','component'),
('node:m50:block','/workshop','Cast-iron cylinder block with six integral bores','component'),
('node:m50:cam-cap:-1:1','/workshop','Exhaust cam bearing cap 1','component'),
('node:m50:cam-cap:-1:2','/workshop','Exhaust cam bearing cap 2','component'),
('node:m50:cam-cap:-1:3','/workshop','Exhaust cam bearing cap 3','component'),
('node:m50:cam-cap:-1:4','/workshop','Exhaust cam bearing cap 4','component'),
('node:m50:cam-cap:-1:5','/workshop','Exhaust cam bearing cap 5','component'),
('node:m50:cam-cap:-1:6','/workshop','Exhaust cam bearing cap 6','component'),
('node:m50:cam-cap:-1:7','/workshop','Exhaust cam bearing cap 7','component'),
('node:m50:cam-cap:1:1','/workshop','Intake cam bearing cap 1','component'),
('node:m50:cam-cap:1:2','/workshop','Intake cam bearing cap 2','component'),
('node:m50:cam-cap:1:3','/workshop','Intake cam bearing cap 3','component'),
('node:m50:cam-cap:1:4','/workshop','Intake cam bearing cap 4','component'),
('node:m50:cam-cap:1:5','/workshop','Intake cam bearing cap 5','component'),
('node:m50:cam-cap:1:6','/workshop','Intake cam bearing cap 6','component'),
('node:m50:cam-cap:1:7','/workshop','Intake cam bearing cap 7','component'),
('node:m50:cam-carrier:exhaust','/workshop','Exhaust cam carrier','component'),
('node:m50:cam-carrier:intake','/workshop','Intake cam carrier','component'),
('node:m50:cam-sprocket:exhaust','/workshop','Exhaust cam timing sprocket','component'),
('node:m50:cam-sprocket:intake','/workshop','Intake cam timing sprocket','component'),
('node:m50:camshaft:exhaust','/workshop','Exhaust camshaft with twelve lobes','component'),
('node:m50:camshaft:intake','/workshop','Intake camshaft with twelve lobes','component'),
('node:m50:chain-guide:-1','/workshop','Fixed timing-chain guide','component'),
('node:m50:chain-guide:1','/workshop','Tensioning timing-chain guide','component'),
('node:m50:coil-cover','/workshop','Central ignition-coil cover','component'),
('node:m50:cooling','/workshop','Coolant pump, thermostat and hoses','component'),
('node:m50:cover-bolt:0:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:0:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:1:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:1:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:2:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:2:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:3:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:3:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:4:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:4:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:5:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:5:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:6:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:6:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:7:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:cover-bolt:7:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:crank-sprocket','/workshop','Crankshaft timing sprocket','component'),
('node:m50:crankshaft','/workshop','Six-throw counterweighted crankshaft','component'),
('node:m50:cylinder-head','/workshop','Aluminium crossflow cylinder head','component'),
('node:m50:engine','/workshop','M50TU B25 inline-six reference','component'),
('node:m50:exhaust','/workshop','Exhaust manifolds / collectors','component'),
('node:m50:exhaust-manifold:1','/workshop','Three-cylinder exhaust manifold 1','component'),
('node:m50:exhaust-manifold:2','/workshop','Three-cylinder exhaust manifold 2','component'),
('node:m50:flywheel','/workshop','Flywheel / starter ring-gear reference','component'),
('node:m50:front-cover-bolt:0','/workshop','Hex fastener — envelope only','component'),
('node:m50:front-cover-bolt:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:front-cover-bolt:2','/workshop','Hex fastener — envelope only','component'),
('node:m50:front-cover-bolt:3','/workshop','Hex fastener — envelope only','component'),
('node:m50:front-cover-bolt:4','/workshop','Hex fastener — envelope only','component'),
('node:m50:front-cover-bolt:5','/workshop','Hex fastener — envelope only','component'),
('node:m50:fuel-rail','/workshop','Six-injector fuel rail','component'),
('node:m50:head-bolt:1:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:1:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:2:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:2:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:3:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:3:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:4:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:4:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:5:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:5:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:6:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:6:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:7:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-bolt:7:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:head-gasket','/workshop','Cylinder-head gasket reference','component'),
('node:m50:idle-control-valve','/workshop','Idle-air control valve and bypass hoses','component'),
('node:m50:ignition-coil:1','/workshop','Direct ignition coil 1','component'),
('node:m50:ignition-coil:2','/workshop','Direct ignition coil 2','component'),
('node:m50:ignition-coil:3','/workshop','Direct ignition coil 3','component'),
('node:m50:ignition-coil:4','/workshop','Direct ignition coil 4','component'),
('node:m50:ignition-coil:5','/workshop','Direct ignition coil 5','component'),
('node:m50:ignition-coil:6','/workshop','Direct ignition coil 6','component'),
('node:m50:injector:1','/workshop','Fuel injector 1','component'),
('node:m50:injector:2','/workshop','Fuel injector 2','component'),
('node:m50:injector:3','/workshop','Fuel injector 3','component'),
('node:m50:injector:4','/workshop','Fuel injector 4','component'),
('node:m50:injector:5','/workshop','Fuel injector 5','component'),
('node:m50:injector:6','/workshop','Fuel injector 6','component'),
('node:m50:intake','/workshop','Six-runner intake and fuel delivery','component'),
('node:m50:intake-boot','/workshop','Intake elbow / bellows reference','component'),
('node:m50:intake-plenum','/workshop','M50 long-runner intake plenum','component'),
('node:m50:intake-runner:1','/workshop','Curved intake runner 1','component'),
('node:m50:intake-runner:2','/workshop','Curved intake runner 2','component'),
('node:m50:intake-runner:3','/workshop','Curved intake runner 3','component'),
('node:m50:intake-runner:4','/workshop','Curved intake runner 4','component'),
('node:m50:intake-runner:5','/workshop','Curved intake runner 5','component'),
('node:m50:intake-runner:6','/workshop','Curved intake runner 6','component'),
('node:m50:lifter:exhaust:1:1','/workshop','Hydraulic lifter exhaust 1.1','component'),
('node:m50:lifter:exhaust:1:2','/workshop','Hydraulic lifter exhaust 1.2','component'),
('node:m50:lifter:exhaust:2:1','/workshop','Hydraulic lifter exhaust 2.1','component'),
('node:m50:lifter:exhaust:2:2','/workshop','Hydraulic lifter exhaust 2.2','component'),
('node:m50:lifter:exhaust:3:1','/workshop','Hydraulic lifter exhaust 3.1','component'),
('node:m50:lifter:exhaust:3:2','/workshop','Hydraulic lifter exhaust 3.2','component'),
('node:m50:lifter:exhaust:4:1','/workshop','Hydraulic lifter exhaust 4.1','component'),
('node:m50:lifter:exhaust:4:2','/workshop','Hydraulic lifter exhaust 4.2','component'),
('node:m50:lifter:exhaust:5:1','/workshop','Hydraulic lifter exhaust 5.1','component'),
('node:m50:lifter:exhaust:5:2','/workshop','Hydraulic lifter exhaust 5.2','component'),
('node:m50:lifter:exhaust:6:1','/workshop','Hydraulic lifter exhaust 6.1','component'),
('node:m50:lifter:exhaust:6:2','/workshop','Hydraulic lifter exhaust 6.2','component'),
('node:m50:lifter:intake:1:1','/workshop','Hydraulic lifter intake 1.1','component'),
('node:m50:lifter:intake:1:2','/workshop','Hydraulic lifter intake 1.2','component'),
('node:m50:lifter:intake:2:1','/workshop','Hydraulic lifter intake 2.1','component'),
('node:m50:lifter:intake:2:2','/workshop','Hydraulic lifter intake 2.2','component'),
('node:m50:lifter:intake:3:1','/workshop','Hydraulic lifter intake 3.1','component'),
('node:m50:lifter:intake:3:2','/workshop','Hydraulic lifter intake 3.2','component'),
('node:m50:lifter:intake:4:1','/workshop','Hydraulic lifter intake 4.1','component'),
('node:m50:lifter:intake:4:2','/workshop','Hydraulic lifter intake 4.2','component'),
('node:m50:lifter:intake:5:1','/workshop','Hydraulic lifter intake 5.1','component'),
('node:m50:lifter:intake:5:2','/workshop','Hydraulic lifter intake 5.2','component'),
('node:m50:lifter:intake:6:1','/workshop','Hydraulic lifter intake 6.1','component'),
('node:m50:lifter:intake:6:2','/workshop','Hydraulic lifter intake 6.2','component'),
('node:m50:lower-timing-cover','/workshop','Profiled lower front timing cover','component'),
('node:m50:lubrication','/workshop','Oil pan, pump, pickup and filter','component'),
('node:m50:main-bolt:1:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:1:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:2:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:2:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:3:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:3:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:4:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:4:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:5:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:5:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:6:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:6:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:7:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-bolt:7:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:main-cap:1','/workshop','Main bearing cap 1','component'),
('node:m50:main-cap:2','/workshop','Main bearing cap 2','component'),
('node:m50:main-cap:3','/workshop','Main bearing cap 3','component'),
('node:m50:main-cap:4','/workshop','Main bearing cap 4','component'),
('node:m50:main-cap:5','/workshop','Main bearing cap 5','component'),
('node:m50:main-cap:6','/workshop','Main bearing cap 6','component'),
('node:m50:main-cap:7','/workshop','Main bearing cap 7','component'),
('node:m50:oil-drain-plug','/workshop','Oil-pan drain plug','component'),
('node:m50:oil-filler-cap','/workshop','Oil-filler cap','component'),
('node:m50:oil-filter-element','/workshop','Pleated oil-filter cartridge — HU 926/3 x dimensional reference','component'),
('node:m50:oil-filter-housing','/workshop','Oil-filter housing and cartridge cap','component'),
('node:m50:oil-pan','/workshop','E34 front-sump oil-pan reference','component'),
('node:m50:oil-pickup','/workshop','Oil pickup tube and strainer','component'),
('node:m50:oil-pump','/workshop','Chain-driven oil pump','component'),
('node:m50:oil-pump-chain','/workshop','Oil-pump drive chain','component'),
('node:m50:piston-pin:1','/workshop','Full-floating piston pin 1','component'),
('node:m50:piston-pin:2','/workshop','Full-floating piston pin 2','component'),
('node:m50:piston-pin:3','/workshop','Full-floating piston pin 3','component'),
('node:m50:piston-pin:4','/workshop','Full-floating piston pin 4','component'),
('node:m50:piston-pin:5','/workshop','Full-floating piston pin 5','component'),
('node:m50:piston-pin:6','/workshop','Full-floating piston pin 6','component'),
('node:m50:piston-ring:1:1','/workshop','Compression ring 1.1','component'),
('node:m50:piston-ring:1:2','/workshop','Compression ring 1.2','component'),
('node:m50:piston-ring:1:3','/workshop','Oil scraper ring 1.3','component'),
('node:m50:piston-ring:2:1','/workshop','Compression ring 2.1','component'),
('node:m50:piston-ring:2:2','/workshop','Compression ring 2.2','component'),
('node:m50:piston-ring:2:3','/workshop','Oil scraper ring 2.3','component'),
('node:m50:piston-ring:3:1','/workshop','Compression ring 3.1','component'),
('node:m50:piston-ring:3:2','/workshop','Compression ring 3.2','component'),
('node:m50:piston-ring:3:3','/workshop','Oil scraper ring 3.3','component'),
('node:m50:piston-ring:4:1','/workshop','Compression ring 4.1','component'),
('node:m50:piston-ring:4:2','/workshop','Compression ring 4.2','component'),
('node:m50:piston-ring:4:3','/workshop','Oil scraper ring 4.3','component'),
('node:m50:piston-ring:5:1','/workshop','Compression ring 5.1','component'),
('node:m50:piston-ring:5:2','/workshop','Compression ring 5.2','component'),
('node:m50:piston-ring:5:3','/workshop','Oil scraper ring 5.3','component'),
('node:m50:piston-ring:6:1','/workshop','Compression ring 6.1','component'),
('node:m50:piston-ring:6:2','/workshop','Compression ring 6.2','component'),
('node:m50:piston-ring:6:3','/workshop','Oil scraper ring 6.3','component'),
('node:m50:piston-rod:1','/workshop','Cylinder 1 piston / rod assembly','component'),
('node:m50:piston-rod:2','/workshop','Cylinder 2 piston / rod assembly','component'),
('node:m50:piston-rod:3','/workshop','Cylinder 3 piston / rod assembly','component'),
('node:m50:piston-rod:4','/workshop','Cylinder 4 piston / rod assembly','component'),
('node:m50:piston-rod:5','/workshop','Cylinder 5 piston / rod assembly','component'),
('node:m50:piston-rod:6','/workshop','Cylinder 6 piston / rod assembly','component'),
('node:m50:piston:1','/workshop','Three-ring piston 1','component'),
('node:m50:piston:2','/workshop','Three-ring piston 2','component'),
('node:m50:piston:3','/workshop','Three-ring piston 3','component'),
('node:m50:piston:4','/workshop','Three-ring piston 4','component'),
('node:m50:piston:5','/workshop','Three-ring piston 5','component'),
('node:m50:piston:6','/workshop','Three-ring piston 6','component'),
('node:m50:power-steering-pump','/workshop','Power-steering pump','component'),
('node:m50:pulley:alternator','/workshop','Alternator pulley','component'),
('node:m50:pulley:crank','/workshop','Crank vibration damper / pulley','component'),
('node:m50:pulley:idler','/workshop','Accessory idler pulley','component'),
('node:m50:pulley:power-steering','/workshop','Power-steering pulley','component'),
('node:m50:pulley:water-pump','/workshop','Water-pump pulley','component'),
('node:m50:pump-nut:-1:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:pump-nut:-1:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:pump-nut:1:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:pump-nut:1:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:1:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:1:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:2:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:2:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:3:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:3:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:4:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:4:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:5:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:5:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:6:-1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-bolt:6:1','/workshop','Hex fastener — envelope only','component'),
('node:m50:rod-cap:1','/workshop','Connecting-rod big-end cap 1','component'),
('node:m50:rod-cap:2','/workshop','Connecting-rod big-end cap 2','component'),
('node:m50:rod-cap:3','/workshop','Connecting-rod big-end cap 3','component'),
('node:m50:rod-cap:4','/workshop','Connecting-rod big-end cap 4','component'),
('node:m50:rod-cap:5','/workshop','Connecting-rod big-end cap 5','component'),
('node:m50:rod-cap:6','/workshop','Connecting-rod big-end cap 6','component'),
('node:m50:rod:1','/workshop','Connecting rod 1','component'),
('node:m50:rod:2','/workshop','Connecting rod 2','component'),
('node:m50:rod:3','/workshop','Connecting rod 3','component'),
('node:m50:rod:4','/workshop','Connecting rod 4','component'),
('node:m50:rod:5','/workshop','Connecting rod 5','component'),
('node:m50:rod:6','/workshop','Connecting rod 6','component'),
('node:m50:short-block','/workshop','Short block / rotating assembly','component'),
('node:m50:spark-plug:1','/workshop','Spark plug 1','component'),
('node:m50:spark-plug:2','/workshop','Spark plug 2','component'),
('node:m50:spark-plug:3','/workshop','Spark plug 3','component'),
('node:m50:spark-plug:4','/workshop','Spark plug 4','component'),
('node:m50:spark-plug:5','/workshop','Spark plug 5','component'),
('node:m50:spark-plug:6','/workshop','Spark plug 6','component'),
('node:m50:starter','/workshop','Starter motor and solenoid','component'),
('node:m50:thermostat','/workshop','Thermostat valve reference','component'),
('node:m50:thermostat-housing','/workshop','Thermostat housing and hose outlets','component'),
('node:m50:throttle-body','/workshop','Throttle body and cable quadrant','component'),
('node:m50:timing','/workshop','Primary / secondary chain drive and covers','component'),
('node:m50:timing-chain:primary','/workshop','Primary timing chain','component'),
('node:m50:timing-chain:secondary','/workshop','Secondary camshaft timing chain','component'),
('node:m50:top-end','/workshop','Cylinder head and valvetrain','component'),
('node:m50:valve-cover','/workshop','Ribbed cam / valve cover with six coil wells','component'),
('node:m50:valve-spring:exhaust:1:1','/workshop','Valve spring exhaust 1.1','component'),
('node:m50:valve-spring:exhaust:1:2','/workshop','Valve spring exhaust 1.2','component'),
('node:m50:valve-spring:exhaust:2:1','/workshop','Valve spring exhaust 2.1','component'),
('node:m50:valve-spring:exhaust:2:2','/workshop','Valve spring exhaust 2.2','component'),
('node:m50:valve-spring:exhaust:3:1','/workshop','Valve spring exhaust 3.1','component'),
('node:m50:valve-spring:exhaust:3:2','/workshop','Valve spring exhaust 3.2','component'),
('node:m50:valve-spring:exhaust:4:1','/workshop','Valve spring exhaust 4.1','component'),
('node:m50:valve-spring:exhaust:4:2','/workshop','Valve spring exhaust 4.2','component'),
('node:m50:valve-spring:exhaust:5:1','/workshop','Valve spring exhaust 5.1','component'),
('node:m50:valve-spring:exhaust:5:2','/workshop','Valve spring exhaust 5.2','component'),
('node:m50:valve-spring:exhaust:6:1','/workshop','Valve spring exhaust 6.1','component'),
('node:m50:valve-spring:exhaust:6:2','/workshop','Valve spring exhaust 6.2','component'),
('node:m50:valve-spring:intake:1:1','/workshop','Valve spring intake 1.1','component'),
('node:m50:valve-spring:intake:1:2','/workshop','Valve spring intake 1.2','component'),
('node:m50:valve-spring:intake:2:1','/workshop','Valve spring intake 2.1','component'),
('node:m50:valve-spring:intake:2:2','/workshop','Valve spring intake 2.2','component'),
('node:m50:valve-spring:intake:3:1','/workshop','Valve spring intake 3.1','component'),
('node:m50:valve-spring:intake:3:2','/workshop','Valve spring intake 3.2','component'),
('node:m50:valve-spring:intake:4:1','/workshop','Valve spring intake 4.1','component'),
('node:m50:valve-spring:intake:4:2','/workshop','Valve spring intake 4.2','component'),
('node:m50:valve-spring:intake:5:1','/workshop','Valve spring intake 5.1','component'),
('node:m50:valve-spring:intake:5:2','/workshop','Valve spring intake 5.2','component'),
('node:m50:valve-spring:intake:6:1','/workshop','Valve spring intake 6.1','component'),
('node:m50:valve-spring:intake:6:2','/workshop','Valve spring intake 6.2','component'),
('node:m50:valve:exhaust:1:1','/workshop','Exhaust valve 1.1','component'),
('node:m50:valve:exhaust:1:2','/workshop','Exhaust valve 1.2','component'),
('node:m50:valve:exhaust:2:1','/workshop','Exhaust valve 2.1','component'),
('node:m50:valve:exhaust:2:2','/workshop','Exhaust valve 2.2','component'),
('node:m50:valve:exhaust:3:1','/workshop','Exhaust valve 3.1','component'),
('node:m50:valve:exhaust:3:2','/workshop','Exhaust valve 3.2','component'),
('node:m50:valve:exhaust:4:1','/workshop','Exhaust valve 4.1','component'),
('node:m50:valve:exhaust:4:2','/workshop','Exhaust valve 4.2','component'),
('node:m50:valve:exhaust:5:1','/workshop','Exhaust valve 5.1','component'),
('node:m50:valve:exhaust:5:2','/workshop','Exhaust valve 5.2','component'),
('node:m50:valve:exhaust:6:1','/workshop','Exhaust valve 6.1','component'),
('node:m50:valve:exhaust:6:2','/workshop','Exhaust valve 6.2','component'),
('node:m50:valve:intake:1:1','/workshop','Intake valve 1.1','component'),
('node:m50:valve:intake:1:2','/workshop','Intake valve 1.2','component'),
('node:m50:valve:intake:2:1','/workshop','Intake valve 2.1','component'),
('node:m50:valve:intake:2:2','/workshop','Intake valve 2.2','component'),
('node:m50:valve:intake:3:1','/workshop','Intake valve 3.1','component'),
('node:m50:valve:intake:3:2','/workshop','Intake valve 3.2','component'),
('node:m50:valve:intake:4:1','/workshop','Intake valve 4.1','component'),
('node:m50:valve:intake:4:2','/workshop','Intake valve 4.2','component'),
('node:m50:valve:intake:5:1','/workshop','Intake valve 5.1','component'),
('node:m50:valve:intake:5:2','/workshop','Intake valve 5.2','component'),
('node:m50:valve:intake:6:1','/workshop','Intake valve 6.1','component'),
('node:m50:valve:intake:6:2','/workshop','Intake valve 6.2','component'),
('node:m50:vanos','/workshop','Single VANOS intake-cam actuator housing','component'),
('node:m50:vanos-piston','/workshop','VANOS piston / gear-cup reference','component'),
('node:m50:vanos-solenoid','/workshop','VANOS oil-control solenoid','component'),
('node:m50:water-pump','/workshop','Coolant pump with four retaining ears','component'),
('node:m50:water-pump-impeller','/workshop','Coolant-pump impeller reference','component'),
('node:system:body','/workshop','Body & chassis','system'),
('node:system:braking','/workshop','Braking','system'),
('node:system:cooling','/workshop','Cooling','system'),
('node:system:differential','/workshop','Differential','system'),
('node:system:driveshaft','/workshop','Driveshaft','system'),
('node:system:electrical','/workshop','Electrical','system'),
('node:system:engine','/workshop','Engine','system'),
('node:system:exhaust','/workshop','Exhaust','system'),
('node:system:exterior','/workshop','Exterior','system'),
('node:system:fuel','/workshop','Fuel','system'),
('node:system:hvac','/workshop','HVAC','system'),
('node:system:intake','/workshop','Intake','system'),
('node:system:interior','/workshop','Interior','system'),
('node:system:lighting','/workshop','Lighting','system'),
('node:system:lubrication','/workshop','Lubrication','system'),
('node:system:safety','/workshop','Safety systems','system'),
('node:system:steering','/workshop','Steering','system'),
('node:system:suspension','/workshop','Suspension','system'),
('node:system:transmission','/workshop','Transmission','system'),
('node:vehicle','/workshop','1995 BMW 525i Sedan reference','component'),
('node:wheel:front-left','/workshop','front left · 205/65 R15','component'),
('node:wheel:front-right','/workshop','front right · 205/65 R15','component'),
('node:wheel:rear-left','/workshop','rear left · 205/65 R15','component'),
('node:wheel:rear-right','/workshop','rear right · 205/65 R15','component');

-- External provider facts are separate from consented website traffic.
create table e34_private.analytics_gsc_daily(day date not null,dimension text not null check(dimension in ('date','query','page')),key text not null check(length(key)<=160),clicks bigint not null check(clicks>=0),impressions bigint not null check(impressions>=0),position_sum numeric not null check(position_sum>=0),primary key(day,dimension,key));
create table e34_private.analytics_gsc_status(singleton boolean primary key default true check(singleton),property text not null,last_synced timestamptz not null,first_day date not null,last_day date not null,capped boolean not null);
alter table e34_private.analytics_gsc_daily enable row level security;
alter table e34_private.analytics_gsc_status enable row level security;
revoke all on e34_private.analytics_gsc_daily,e34_private.analytics_gsc_status from public,anon,authenticated;
create function public.analytics_authorized()returns boolean language sql stable security definer set search_path='' as $$select e34_private.commercial_admin()$$;
revoke all on function public.analytics_authorized()from public,anon;
grant execute on function public.analytics_authorized()to authenticated;
create function public.analytics_gsc_import(payload jsonb)returns void language plpgsql security definer set search_path='' as $$
declare r jsonb;begin
 if payload->>'property' not in ('sc-domain:e34lore.com','https://e34lore.com/','https://www.e34lore.com/')or jsonb_array_length(payload->'rows')>6000 then raise exception 'Invalid E34 property';end if;
 perform pg_advisory_xact_lock(73400235);
 if exists(select 1 from e34_private.analytics_gsc_status where last_synced>clock_timestamp()-interval '1 hour')then raise exception 'Search Console was synced within the past hour';end if;
 if (payload->>'end')::date-(payload->>'start')::date not between 0 and 89 then raise exception 'Invalid range';end if;
 delete from e34_private.analytics_gsc_daily where day between (payload->>'start')::date and (payload->>'end')::date;
 for r in select value from jsonb_array_elements(payload->'rows')loop
  if (r->>'day')::date not between (payload->>'start')::date and (payload->>'end')::date then raise exception 'Row outside import range';end if;
  if r->>'dimension'='page' and not exists(select 1 from e34_private.analytics_resources where id=r->>'key' and kind in ('page','guide','manual','model','article','quick'))then continue;end if;
  insert into e34_private.analytics_gsc_daily values((r->>'day')::date,r->>'dimension',r->>'key',(r->>'clicks')::bigint,(r->>'impressions')::bigint,(r->>'position_sum')::numeric);
 end loop;
 insert into e34_private.analytics_gsc_status values(true,payload->>'property',clock_timestamp(),(payload->>'start')::date,(payload->>'end')::date,(payload->>'capped')::boolean)on conflict(singleton)do update set property=excluded.property,last_synced=excluded.last_synced,first_day=excluded.first_day,last_day=excluded.last_day,capped=excluded.capped;
 delete from e34_private.analytics_gsc_daily where day<(clock_timestamp()at time zone 'UTC')::date-90;
end$$;
revoke all on function public.analytics_gsc_import(jsonb)from public,anon,authenticated;
grant execute on function public.analytics_gsc_import(jsonb)to service_role;

-- Report from retained facts, not sums of daily unique counts. UTC half-open ranges.
create function e34_private.analytics_slice(from_time timestamptz,to_time timestamptz,section text default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 'engaged_ms',(select coalesce(sum(ms),0)from engagement),'search_pages',(select count(*)from pages where search_enabled),'performance_pages',(select count(*)from pages where performance_enabled),
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

create function public.analytics_report(first_day date,last_day date,resource_kind text default null)returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a timestamptz; b timestamptz; duration interval; result jsonb;begin
 if not e34_private.commercial_admin() then raise exception 'Administrator permission and verified authenticator session required' using errcode='42501';end if;
 if first_day is null or last_day is null or last_day<first_day or last_day-first_day>89 or last_day>(statement_timestamp()at time zone 'UTC')::date or first_day<(statement_timestamp()at time zone 'UTC')::date-89 then raise exception 'Choose up to 90 retained UTC days ending today or earlier';end if;
 if resource_kind is not null and resource_kind not in ('page','guide','manual','model','article','quick')then raise exception 'Unknown content filter';end if;
 a:=first_day::timestamp at time zone 'UTC';b:=least((last_day+1)::timestamp at time zone 'UTC',statement_timestamp());duration:=b-a;
 select jsonb_build_object('revision',2,'enabled',enabled,'approved_at',approved_at,'retention_days',90,'generated_at',statement_timestamp(),'start',a,'end',b,'previous_start',a-(last_day-first_day+1)*interval '1 day','previous_end',a-(last_day-first_day+1)*interval '1 day'+duration,
 'current',e34_private.analytics_slice(a,b,resource_kind),'previous',e34_private.analytics_slice(a-(last_day-first_day+1)*interval '1 day',a-(last_day-first_day+1)*interval '1 day'+duration,resource_kind),
 'limited',coalesce((select sum(dropped)from e34_private.analytics_quality where day between first_day and last_day),0),
 'campaign_registry',coalesce((select jsonb_agg(to_jsonb(x))from(select code,label,active from e34_private.analytics_campaigns order by code)x),'[]'::jsonb),
 'legacy',coalesce((select jsonb_agg(to_jsonb(x))from(select day,area,opens from e34_private.usage_daily where day between first_day and last_day order by day,area)x),'[]'::jsonb),
 'community',jsonb_build_object('registrations',(select count(*)from auth.users where created_at>=a and created_at<b and not coalesce(is_anonymous,false)),
  'vehicles',(select count(*)from public.owned_vehicles where created_at>=a and created_at<b),
  'maintenance',(select count(*)from public.service_records where created_at>=a and created_at<b),
  'journals',(select count(*)from public.owner_journal_entries where created_at>=a and created_at<b),
  'public_garages',(select count(*)from public.garage_showcases where created_at>=a and created_at<b and published and not hidden),
  'discussions',(select count(*)from public.threads where created_at>=a and created_at<b and not hidden),
  'replies',(select count(*)from public.posts where created_at>=a and created_at<b and not hidden),
  'helpful',(select count(*)from public.community_feedback where created_at>=a and created_at<b and value='helpful'),
  'accepted_answers',(select count(*)from public.accepted_answers where created_at>=a and created_at<b),
  'unanswered',(select count(*)from public.threads t where t.created_at>=a and t.created_at<b and not t.hidden and t.category='Technical help' and not exists(select 1 from public.posts p where p.thread_id=t.id and not p.hidden))),
 'commercial',jsonb_build_object(
  'retailers',coalesce((select jsonb_agg(to_jsonb(x))from(select m.name,sum(c.clicks)clicks from e34_private.affiliate_clicks_daily c join e34_private.affiliate_links l on l.id=c.link_id join e34_private.affiliate_merchants m on m.id=l.merchant_id where c.day between first_day and last_day group by m.id,m.name order by clicks desc)x),'[]'::jsonb),
  'campaigns',coalesce((select jsonb_agg(to_jsonb(x))from(select c.title,sum(d.impressions)impressions,sum(d.clicks)clicks from e34_private.advertising_daily d join e34_private.advertising_campaigns c on c.id=d.campaign_id where d.day between first_day and last_day group by c.id,c.title)x),'[]'::jsonb),
  'revenue',coalesce((select jsonb_agg(to_jsonb(x))from(select date_trunc('month',occurred_on)::date as month,currency,channel,sum(case when kind='estimate' then amount_cents else 0 end)::text estimated_cents,sum(case when kind='earning' then amount_cents when kind='reversal' then -amount_cents else 0 end)::text confirmed_net_cents,sum(case when kind='receipt' then amount_cents else 0 end)::text received_cents from e34_private.revenue_records where occurred_on between first_day and last_day group by 1,2,3 order by 1,2,3)x),'[]'::jsonb)),
 'search_console',jsonb_build_object('status',(select to_jsonb(g) - 'singleton' from e34_private.analytics_gsc_status g where singleton),'rows',coalesce((select jsonb_agg(to_jsonb(x))from(select day,dimension,key,clicks,impressions,case when impressions>0 then position_sum/impressions end as position from e34_private.analytics_gsc_daily where day between first_day and last_day order by day,dimension,key limit 6000)x),'[]'::jsonb)),
 'integrations',jsonb_build_object('search_console',case when exists(select 1 from e34_private.analytics_gsc_status)then 'data_imported_check_last_sync' else 'authorization_required' end,'ga4','not_installed','scanner','not_available','email','disabled_sender_not_verified','geography','not_collected','database_latency','not_instrumented'))into result from e34_private.analytics_config where singleton;
 return result;
end$$;
revoke all on function public.analytics_report(date,date,text) from public,anon;
grant execute on function public.analytics_report(date,date,text) to authenticated;

create function public.analytics_campaign_save(campaign_code text,campaign_label text,is_active boolean)returns void language plpgsql security definer set search_path='' as $$
begin
 if not e34_private.commercial_admin()then raise exception 'Administrator permission and verified authenticator session required' using errcode='42501';end if;
 if campaign_code is null or campaign_code !~ '^[a-z][a-z0-9-]{2,31}$' or campaign_label is null or length(btrim(campaign_label))not between 1 and 100 or is_active is null then raise exception 'Use a public campaign code and label';end if;
 if (select count(*)from e34_private.analytics_campaigns)>=200 and not exists(select 1 from e34_private.analytics_campaigns where code=campaign_code)then raise exception 'Campaign registry limit reached';end if;
 insert into e34_private.analytics_campaigns values(campaign_code,btrim(campaign_label),is_active)on conflict(code)do update set label=excluded.label,active=excluded.active;
end$$;
revoke all on function public.analytics_campaign_save(text,text,boolean)from public,anon;
grant execute on function public.analytics_campaign_save(text,text,boolean)to authenticated;
