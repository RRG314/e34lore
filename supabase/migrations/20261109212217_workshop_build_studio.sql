-- Additive Build Studio. No existing car, catalog, model bytes or publication is rewritten.
create table e34_private.build_contract (version integer primary key, contract jsonb not null);
alter table e34_private.build_contract enable row level security;
revoke all on e34_private.build_contract from public,anon,authenticated;
insert into e34_private.build_contract values(1,'{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"schemaVersion":{"type":"number","const":1},"title":{"type":"string","minLength":1,"maxLength":120},"description":{"type":"string","maxLength":5000},"publicDescription":{"type":"string","maxLength":3000},"style":{"type":"string","enum":["factory","restoration","period","alpina-inspired","schnitzer-inspired","hartge-inspired","bbs-inspired","street","track","engine-swap","custom-interior","experimental"]},"lifecycle":{"type":"string","enum":["draft","active","completed","archived"]},"reference":{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-zA-Z0-9:_-]{1,100}$"},"revision":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"}},"required":["id","revision","sha256"],"additionalProperties":false},"baseConfiguration":{"type":"object","properties":{"model":{"type":"string","maxLength":80},"engine":{"type":"string","maxLength":80},"year":{"type":"string","maxLength":4},"month":{"type":"string","maxLength":2},"market":{"type":"string","maxLength":40},"body":{"type":"string","maxLength":40},"transmission":{"type":"string","maxLength":40},"steering":{"type":"string","maxLength":40}},"required":["model","engine","year","month","market","body","transmission","steering"],"additionalProperties":false},"targetConfiguration":{"type":"object","properties":{"model":{"type":"string","maxLength":80},"engine":{"type":"string","maxLength":80},"year":{"type":"string","maxLength":4},"month":{"type":"string","maxLength":2},"market":{"type":"string","maxLength":40},"body":{"type":"string","maxLength":40},"transmission":{"type":"string","maxLength":40},"steering":{"type":"string","maxLength":40}},"required":["model","engine","year","month","market","body","transmission","steering"],"additionalProperties":false},"appearance":{"type":"object","properties":{"paint":{"type":"object","properties":{"enabled":{"type":"boolean"},"color":{"type":"string","pattern":"^#[a-fA-F0-9]{6}$"},"finish":{"type":"string","enum":["gloss","satin","matte","metallic"]},"factoryCode":{"anyOf":[{"type":"string","pattern":"^\\d{3}$"},{"type":"null"}]}},"required":["enabled","color","finish","factoryCode"],"additionalProperties":false},"upholstery":{"type":"object","properties":{"enabled":{"type":"boolean"},"color":{"type":"string","pattern":"^#[a-fA-F0-9]{6}$"},"finish":{"type":"string","enum":["fabric","leather"]}},"required":["enabled","color","finish"],"additionalProperties":false},"trim":{"type":"object","properties":{"enabled":{"type":"boolean"},"color":{"type":"string","pattern":"^#[a-fA-F0-9]{6}$"}},"required":["enabled","color"],"additionalProperties":false},"wheels":{"type":"object","properties":{"finishEnabled":{"type":"boolean"},"packageId":{"type":"string","enum":["reference","e34-original-ten-spoke-v1","e34-artist-wheel-v1"]},"color":{"type":"string","pattern":"^#[a-fA-F0-9]{6}$"},"scale":{"type":"number","minimum":0.9,"maximum":1.12},"widthScale":{"type":"number","minimum":0.85,"maximum":1.15}},"required":["packageId","color","scale","widthScale"],"additionalProperties":false},"rideHeight":{"type":"number","minimum":-1,"maximum":1},"engineAccent":{"type":"object","properties":{"enabled":{"type":"boolean"},"color":{"type":"string","pattern":"^#[a-fA-F0-9]{6}$"}},"required":["enabled","color"],"additionalProperties":false},"quality":{"type":"string","enum":["low","balanced","high"]}},"required":["paint","upholstery","trim","wheels","rideHeight","engineAccent","quality"],"additionalProperties":false},"components":{"maxItems":150,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-zA-Z0-9:_-]{1,100}$"},"system":{"type":"string","enum":["engine","transmission","differential","driveshaft","suspension","steering","brakes","wheels","cooling","exhaust","intake","electrical","ecu","fuel","body","interior","accessories"]},"kind":{"type":"string","enum":["oem","aftermarket","custom"]},"partId":{"anyOf":[{"type":"string","pattern":"^[a-zA-Z0-9:_-]{1,100}$"},{"type":"null"}]},"number":{"anyOf":[{"type":"string","pattern":"^\\d{11}$"},{"type":"null"}]},"name":{"type":"string","minLength":1,"maxLength":160},"manufacturer":{"type":"string","maxLength":100},"productCode":{"type":"string","maxLength":100},"quantity":{"type":"integer","minimum":1,"maximum":1000},"stage":{"type":"string","enum":["planned","researched","purchased","received","working","installed","tested","verified","deferred"]},"estimate":{"anyOf":[{"type":"integer","minimum":0,"maximum":100000000000},{"type":"null"}]},"actual":{"anyOf":[{"type":"integer","minimum":0,"maximum":100000000000},{"type":"null"}]},"publicCost":{"type":"boolean"},"privateNotes":{"type":"string","maxLength":4000},"publicNotes":{"type":"string","maxLength":1000},"guideIds":{"maxItems":12,"type":"array","items":{"type":"string","pattern":"^[a-zA-Z0-9:_-]{1,100}$"}},"wheelFitment":{"anyOf":[{"type":"object","properties":{"diameterIn":{"anyOf":[{"type":"number","minimum":10,"maximum":24},{"type":"null"}]},"widthIn":{"anyOf":[{"type":"number","minimum":3,"maximum":15},{"type":"null"}]},"offsetMm":{"anyOf":[{"type":"number","minimum":-100,"maximum":100},{"type":"null"}]},"boltPattern":{"type":"string","maxLength":30},"centerBoreMm":{"anyOf":[{"type":"number","minimum":30,"maximum":150},{"type":"null"}]},"brakeClearanceConfirmed":{"type":"boolean"}},"required":["diameterIn","widthIn","offsetMm","boltPattern","centerBoreMm","brakeClearanceConfirmed"],"additionalProperties":false},{"type":"null"}]},"fabrication":{"type":"string","enum":["unknown","required","none-documented"]}},"required":["id","system","kind","partId","number","name","manufacturer","productCode","quantity","stage","estimate","actual","publicCost","privateNotes","publicNotes","guideIds","wheelFitment","fabrication"],"additionalProperties":false}},"tasks":{"maxItems":300,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-zA-Z0-9:_-]{1,100}$"},"title":{"type":"string","minLength":1,"maxLength":160},"componentId":{"anyOf":[{"type":"string","pattern":"^[a-zA-Z0-9:_-]{1,100}$"},{"type":"null"}]},"system":{"type":"string","enum":["engine","transmission","differential","driveshaft","suspension","steering","brakes","wheels","cooling","exhaust","intake","electrical","ecu","fuel","body","interior","accessories"]},"status":{"type":"string","enum":["planned","researched","purchased","received","working","installed","tested","verified","deferred"]},"dependencies":{"maxItems":30,"type":"array","items":{"type":"string","pattern":"^[a-zA-Z0-9:_-]{1,100}$"}},"guideId":{"anyOf":[{"type":"string","pattern":"^[a-zA-Z0-9:_-]{1,100}$"},{"type":"null"}]},"dueOn":{"anyOf":[{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},{"type":"null"}]},"completedOn":{"anyOf":[{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},{"type":"null"}]},"notes":{"type":"string","maxLength":4000},"public":{"type":"boolean"},"transferred":{"type":"boolean"}},"required":["id","title","componentId","system","status","dependencies","guideId","dueOn","completedOn","notes","public","transferred"],"additionalProperties":false}},"milestones":{"maxItems":50,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-zA-Z0-9:_-]{1,100}$"},"title":{"type":"string","minLength":1,"maxLength":160},"date":{"anyOf":[{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},{"type":"null"}]},"notes":{"type":"string","maxLength":2000},"public":{"type":"boolean"}},"required":["id","title","date","notes","public"],"additionalProperties":false}},"photoIds":{"maxItems":24,"type":"array","items":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"}},"currency":{"type":"string","enum":["USD","EUR","GBP","CAD","AUD"]},"privateNotes":{"type":"string","maxLength":12000}},"required":["schemaVersion","title","description","publicDescription","style","lifecycle","reference","baseConfiguration","targetConfiguration","appearance","components","tasks","milestones","photoIds","currency","privateNotes"],"additionalProperties":false}'::jsonb);
-- Deliberately bounded subset emitted by Zod; unknown schema constructs fail closed in the generator check.
create function e34_private.build_json_valid(v jsonb,s jsonb,depth integer default 0) returns boolean language plpgsql immutable set search_path='' as $$
declare k text;item jsonb;kind text:=jsonb_typeof(v);t text:=s->>'type';begin
 if depth>16 or v is null then return false;end if;
 if s?'anyOf' then for item in select value from jsonb_array_elements(s->'anyOf') loop if e34_private.build_json_valid(v,item,depth+1) then return true;end if;end loop;return false;end if;
 if jsonb_typeof(s->'type')='array' then if not(s->'type'?kind or(kind='number' and s->'type'?'integer'))then return false;end if;
 elsif t='integer' then if kind<>'number' or(v#>>'{}')::numeric<>trunc((v#>>'{}')::numeric)then return false;end if;
 elsif t is not null and t<>kind then return false;end if;
 if s?'const' and v<>s->'const' then return false;end if;
 if s?'enum' and not exists(select 1 from jsonb_array_elements(s->'enum')e where e.value=v)then return false;end if;
 if kind='object' then
  if exists(select 1 from jsonb_array_elements_text(coalesce(s->'required','[]'))r where not(v?r.value))then return false;end if;
  for k,item in select * from jsonb_each(v)loop
   if not(s->'properties'?k)then return false;end if;
   if not e34_private.build_json_valid(item,s->'properties'->k,depth+1)then return false;end if;
  end loop;
 elsif kind='array' then
  if jsonb_array_length(v)>coalesce((s->>'maxItems')::integer,1000)or jsonb_array_length(v)<coalesce((s->>'minItems')::integer,0)then return false;end if;
  for item in select value from jsonb_array_elements(v)loop if not e34_private.build_json_valid(item,s->'items',depth+1)then return false;end if;end loop;
 elsif kind='string' then
  if char_length(v#>>'{}')>coalesce((s->>'maxLength')::integer,12000)or char_length(v#>>'{}')<coalesce((s->>'minLength')::integer,0)then return false;end if;
  if s?'pattern' and not((v#>>'{}')~(s->>'pattern'))then return false;end if;
  if s->>'format'='uuid' and not((v#>>'{}')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')then return false;end if;
 elsif kind='number' then
  if(s?'exclusiveMinimum'and(v#>>'{}')::numeric<=(s->>'exclusiveMinimum')::numeric)or(s?'exclusiveMaximum'and(v#>>'{}')::numeric>=(s->>'exclusiveMaximum')::numeric)then return false;end if;
  if(s?'minimum' and(v#>>'{}')::numeric<(s->>'minimum')::numeric)or(s?'maximum' and(v#>>'{}')::numeric>(s->>'maximum')::numeric)then return false;end if;
 end if;return true;end$$;
create table e34_private.build_references(id text primary key,revision integer not null,sha256 text not null check(sha256~'^[a-f0-9]{64}$'));
alter table e34_private.build_references enable row level security;
revoke all on e34_private.build_references from public,anon,authenticated;
insert into e34_private.build_references values
('e34-525i-sedan-automatic',23,'07d858ddc5abb25b43a823e5082cf9d17b55e018df6317cf8f4c1c343569bd2d'),
('e34-reconstruction-reference',14,'b038c2887269437d9c685cee958681da1f28d5fa8609acfc4f182c71881f7d1d'),
('e34-530i-sedan-manual',15,'c7617e45f04750e005c9c99718fb5bd63325747b7309de21b3e7e40f568d8a37'),
('e34-530i-sedan-automatic',16,'2918569729ce4801e20eb4c027c270242f9ba7195123c0a94309b563b6ab4bac'),
('e34-535i-sedan-manual',17,'5fb1d0b112dcac6233149c93327f28dd5a4d6921019d429b8b00cba1fea428e8'),
('e34-535i-sedan-automatic',18,'eff931ab79c1fa6b47008b0dbca1af599525b05092191ebcb0f9fc7dcdc555fe'),
('e34-540i-sedan-manual',19,'e0e549a62618c9ec4d545eb92969070644220384da21f8109d0bd050168f68ab'),
('e34-540i-sedan-automatic',20,'8e1e137a4896bafb8903d9be52478d81f861d37e2e5d75a64e97b894566bf6f6'),
('e34-530i-touring-manual',21,'c44bc4e0cc677ad0c9f9c814b58a7e01a9db10a5413173e8656ed08d196b5fb6'),
('e34-530i-touring-automatic',22,'cbad244729286f4d560defa551e911ae159814034b6cbf36c5285b0c70697594');
create table public.build_projects(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 vehicle_id uuid,version integer not null default 1 check(version>0),state jsonb not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,user_id),
 foreign key(vehicle_id,user_id)references public.owned_vehicles(id,user_id)on delete set null(vehicle_id)
);
create index build_projects_owner on public.build_projects(user_id,updated_at desc,id);
create index build_projects_vehicle on public.build_projects(vehicle_id,user_id);
create table public.build_project_revisions(
 project_id uuid not null,user_id uuid not null,version integer not null,state jsonb not null,vehicle_id uuid,
 intent uuid not null,summary text not null check(char_length(summary)<=500),created_at timestamptz not null default now(),
 primary key(project_id,version),unique(project_id,intent),foreign key(project_id,user_id)references public.build_projects(id,user_id)on delete cascade
);
create index build_revisions_owner on public.build_project_revisions(user_id,created_at desc);
create table public.build_task_transfers(
 project_id uuid not null,user_id uuid not null,task_id text not null,component_id text,vehicle_id uuid,installed_id uuid references public.installed_parts on delete set null,
 service_id uuid references public.service_records on delete set null,modification_id uuid references public.vehicle_modifications on delete set null,
 journal_id uuid references public.owner_journal_entries on delete set null,created_at timestamptz not null default now(),
 primary key(project_id,task_id),foreign key(project_id,user_id)references public.build_projects(id,user_id)on delete cascade,
 foreign key(vehicle_id,user_id)references public.owned_vehicles(id,user_id)on delete set null(vehicle_id)
);
create index build_transfers_owner on public.build_task_transfers(user_id);
create index build_transfers_installed on public.build_task_transfers(installed_id);
create index build_transfers_component on public.build_task_transfers(project_id,component_id);
create index build_transfers_service on public.build_task_transfers(service_id);
create index build_transfers_modification on public.build_task_transfers(modification_id);
create index build_transfers_journal on public.build_task_transfers(journal_id);
create index build_transfers_vehicle on public.build_task_transfers(vehicle_id,user_id);
-- Private reads require the existing verified, nonanonymous, still-live session check.
do $$declare t text;begin foreach t in array array['build_projects','build_project_revisions','build_task_transfers']loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy build_owner_read on public.%I for select to authenticated using(user_id=(select auth.uid())and(select e34_private.scan_photo_session()))',t);
end loop;end$$;
create function e34_private.build_actor()returns uuid language plpgsql stable security definer set search_path='' as $$begin
 if not e34_private.scan_photo_session()then raise exception 'Sign in with a confirmed account to save builds' using errcode='42501';end if;return auth.uid();end$$;
create function e34_private.build_rate(actor uuid,kind text,maximum integer)returns void language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,3834));
 if(select count(*)from e34_private.community_actions a where a.actor=build_rate.actor and a.action='build:'||kind and created_at>now()-interval '1 hour')>=maximum then raise exception 'Build limit reached. Please try later.';end if;
 insert into e34_private.community_actions(actor,action)values(actor,'build:'||kind);
end$$;
create function e34_private.validate_build(s jsonb,pid uuid default null)returns void language plpgsql stable security definer set search_path='' as $$
declare c jsonb;t jsonb;v jsonb;begin
 if octet_length(s::text)>300000 or not e34_private.build_json_valid(s,(select contract from e34_private.build_contract where version=1))then raise exception 'Invalid build state';end if;
 if not exists(select 1 from e34_private.build_references r where r.id=s->'reference'->>'id'and r.revision=(s->'reference'->>'revision')::int and r.sha256=s->'reference'->>'sha256')then raise exception 'Unsupported model release';end if;
 for c in select value from jsonb_array_elements(s->'components')loop
  if c->>'kind'='oem' then
   if not exists(select 1 from public.parts p where p.id=c->>'partId'and p.number_normalized=c->>'number')then raise exception 'Choose an existing BMW catalog identity';end if;
  elsif c->'partId'<>'null'::jsonb or c->'number'<>'null'::jsonb or(c->>'kind'='aftermarket'and btrim(c->>'manufacturer')='')then raise exception 'Record the manufacturer identity separately';end if;
  for v in select value from jsonb_array_elements(c->'guideIds')loop if not exists(select 1 from public.guide_revision_archive where (guide_id||'::'||revision)=(v#>>'{}'))then raise exception 'Choose a saved walkthrough revision';end if;end loop;
 end loop;
 for t in select value from jsonb_array_elements(s->'tasks')loop
  if t->'componentId'<>'null'::jsonb and not exists(select 1 from jsonb_array_elements(s->'components')component_row where component_row->>'id'=t->>'componentId')then raise exception 'Unknown task component';end if;
  if t->'guideId'<>'null'::jsonb and not exists(select 1 from public.guide_revision_archive where (guide_id||'::'||revision)=(t->>'guideId'))then raise exception 'Choose a saved walkthrough revision';end if;
  if t->>'status'='verified'and exists(select 1 from jsonb_array_elements_text(t->'dependencies')dep where not exists(select 1 from jsonb_array_elements(s->'tasks')prerequisite where prerequisite->>'id'=dep.value and prerequisite->>'status'='verified'))then raise exception 'Verify prerequisite tasks first';end if;
  for v in select value from jsonb_array_elements(t->'dependencies')loop if v#>>'{}'=t->>'id'or not exists(select 1 from jsonb_array_elements(s->'tasks')d where d->>'id'=v#>>'{}')then raise exception 'Unknown task dependency';end if;end loop;
  if(t->>'transferred')::boolean is distinct from exists(select 1 from public.build_task_transfers x where x.project_id=pid and x.task_id=t->>'id')then raise exception 'Transfer receipts cannot be changed';end if;
  if t->'dueOn'<>'null'::jsonb then perform(t->>'dueOn')::date;end if;if t->'completedOn'<>'null'::jsonb then perform(t->>'completedOn')::date;end if;
 end loop;
 if exists(with recursive edges as(select graph_task->>'id'a,d.value b from jsonb_array_elements(s->'tasks')graph_task cross join lateral jsonb_array_elements_text(graph_task->'dependencies')d),reach(a,b)as(select a,b from edges union select r.a,e.b from reach r join edges e on e.a=r.b)select 1 from reach where a=b)then raise exception 'Task dependency cycle';end if;
 for v in select value from jsonb_array_elements(s->'milestones')loop if v->'date'<>'null'::jsonb then perform(v->>'date')::date;end if;end loop;
 foreach c in array array[s->'components',s->'tasks',s->'milestones']loop
  if(select count(*)from jsonb_array_elements(c))<>(select count(distinct x->>'id')from jsonb_array_elements(c)x)then raise exception 'Duplicate identifiers';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements_text(s->'photoIds')p where not exists(select 1 from public.owner_car_photos o where o.id=p.value::uuid and o.user_id=auth.uid()and o.build_project_id=pid and o.state='ready'))then raise exception 'Select this project’s ready photographs';end if;
end$$;
-- Conceptual projects use the same JPEG processing/storage/quotas and account-deletion cleanup.
alter table public.owner_car_photos alter column vehicle_id drop not null,
 add column build_project_id uuid,
 add column build_share_status text not null default 'private'check(build_share_status in('private','pending','approved','rejected','withdrawn')),
 add column build_share_consent_at timestamptz,
 add column build_review_reason text not null default ''check(char_length(build_review_reason)<=2000),
 add constraint photo_build_owner foreign key(build_project_id,user_id)references public.build_projects(id,user_id)on delete cascade,
 add constraint photo_one_parent check(num_nonnulls(vehicle_id,build_project_id)=1);
create index build_photos_project on public.owner_car_photos(build_project_id,user_id);
create policy build_photo_live_session on public.owner_car_photos as restrictive for select to authenticated using(build_project_id is null or(user_id=(select auth.uid())and(select e34_private.scan_photo_session())));
-- validate_build references the new column only at execution, after this additive ALTER.
create function e34_private.create_build(content jsonb,vehicle uuid default null)returns public.build_projects language plpgsql security definer set search_path='' as $$
declare actor uuid:=e34_private.build_actor();r public.build_projects;begin
 perform e34_private.build_rate(actor,'create',30);
 if(select count(*)from public.build_projects where user_id=actor)>=100 then raise exception 'Archive or remove an old project before creating another';end if;
 perform e34_private.validate_build(content);
 if vehicle is not null and not exists(select 1 from public.owned_vehicles where id=vehicle and user_id=actor)then raise exception 'Choose your own garage car';end if;
 insert into public.build_projects(user_id,vehicle_id,state)values(actor,vehicle,content)returning * into r;
 insert into public.build_project_revisions(project_id,user_id,version,state,vehicle_id,intent,summary)values(r.id,actor,1,content,vehicle,gen_random_uuid(),'Project created');return r;
end$$;
create function e34_private.save_build(project uuid,expected_version integer,content jsonb,request_id uuid)returns public.build_projects language plpgsql security definer set search_path='' as $$
declare actor uuid:=e34_private.build_actor();r public.build_projects;summary text;begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,3834));
 select * into r from public.build_projects where id=project and user_id=actor for update;
 if r.id is null then raise exception 'Project unavailable'using errcode='42501';end if;
 if exists(select 1 from public.build_project_revisions where project_id=project and intent=request_id)then
  if not exists(select 1 from public.build_project_revisions where project_id=project and intent=request_id and state=content)then raise exception 'Save request was reused with different content';end if;return r;end if;
 if r.version is distinct from expected_version then raise exception 'This build changed in another tab. Reload or save a separate copy.'using errcode='40001';end if;
 perform e34_private.validate_build(content,project);
 if content=r.state then return r;end if;
 perform e34_private.build_rate(actor,'save',360);
 if(select coalesce(sum(octet_length(state::text)),0)from public.build_project_revisions where user_id=actor)>100000000 then raise exception 'Revision storage limit reached. Export and remove an old project first.';end if;
 select string_agg(case k when 'privateNotes'then 'Private notes'when 'publicDescription'then 'Public description'when 'baseConfiguration'then 'Starting configuration'when 'targetConfiguration'then 'Planned configuration'when 'components'then 'Parts and modifications'when 'tasks'then 'Work plan'when 'photoIds'then 'Photo selection'else initcap(k)end,', 'order by k)into summary from jsonb_object_keys(content)k where content->k is distinct from r.state->k;
 update public.build_projects set state=content,version=version+1,updated_at=now()where id=project returning * into r;
 insert into public.build_project_revisions(project_id,user_id,version,state,vehicle_id,intent,summary)values(project,actor,r.version,content,r.vehicle_id,request_id,left(summary,500));
 return r;
end$$;
create function e34_private.link_build_car(project uuid,expected_version integer,vehicle uuid)returns public.build_projects language plpgsql security definer set search_path='' as $$
declare actor uuid:=e34_private.build_actor();r public.build_projects;begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,3834));
 select * into r from public.build_projects where id=project and user_id=actor for update;
 if r.id is null then raise exception 'Project unavailable';end if;
 if r.version is distinct from expected_version then raise exception 'This build changed in another tab'using errcode='40001';end if;
 if vehicle is distinct from r.vehicle_id and exists(select 1 from public.build_task_transfers where project_id=project)then raise exception 'Work was already recorded for this car. Duplicate the plan to use another car.';end if;
 if vehicle is not null and not exists(select 1 from public.owned_vehicles where id=vehicle and user_id=actor)then raise exception 'Choose your own garage car';end if;
 perform e34_private.build_rate(actor,'save',360);
 if(select coalesce(sum(octet_length(state::text)),0)from public.build_project_revisions where user_id=actor)>100000000 then raise exception 'Revision storage limit reached. Export and remove an old project first.';end if;
 update public.build_projects set vehicle_id=vehicle,version=version+1,updated_at=now()where id=project returning * into r;
 insert into public.build_project_revisions(project_id,user_id,version,state,vehicle_id,intent,summary)values(project,actor,r.version,r.state,vehicle,gen_random_uuid(),'Garage association changed');return r;
end$$;
create function e34_private.restore_build(project uuid,expected_version integer,restore_version integer)returns public.build_projects language plpgsql security definer set search_path='' as $$
declare actor uuid:=e34_private.build_actor();s jsonb;begin
 select state into s from public.build_project_revisions where project_id=project and user_id=actor and version=restore_version;
 if s is null then raise exception 'Revision unavailable';end if;
 -- Restoring never undoes an actual-car transfer receipt; completed work remains recorded.
 select jsonb_set(s,'{tasks}',coalesce(jsonb_agg(jsonb_set(t,'{transferred}',to_jsonb(exists(select 1 from public.build_task_transfers x where x.project_id=project and x.task_id=t->>'id')))),'[]'))into s from jsonb_array_elements(s->'tasks')t;
 -- A removed photo is not resurrected by restore.
 select jsonb_set(s,'{photoIds}',coalesce(jsonb_agg(p.value),'[]'))into s from jsonb_array_elements_text(s->'photoIds')p where exists(select 1 from public.owner_car_photos o where o.id=p.value::uuid and o.build_project_id=project and o.user_id=actor and o.state='ready');
 return e34_private.save_build(project,expected_version,s,gen_random_uuid());end$$;
create function e34_private.delete_build(project uuid,expected_version integer,confirmed boolean)returns void language plpgsql security definer set search_path='' as $$begin
 if confirmed is distinct from true then raise exception 'Confirm project deletion';end if;
 perform 1 from public.build_projects where id=project and user_id=e34_private.build_actor()and version=expected_version for update;if not found then raise exception 'Project changed or is unavailable. Reload before deleting.'using errcode='40001';end if;
 delete from public.build_projects where id=project and user_id=e34_private.build_actor();if not found then raise exception 'Project unavailable';end if;end$$;
create function e34_private.transfer_build_work(project uuid,expected_version integer,task_ids text[],confirmed boolean,performed_on date)returns public.build_projects language plpgsql security definer set search_path='' as $$
declare actor uuid:=e34_private.build_actor();r public.build_projects;t jsonb;c jsonb;service uuid;modification uuid;installed uuid;journal uuid;s jsonb;target_car uuid;begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,3834));
 if confirmed is distinct from true or coalesce(cardinality(task_ids),0)not between 1 and 30 or performed_on is null or performed_on>current_date or performed_on<'1987-01-01'then raise exception 'Confirm completed work and its date';end if;
 select vehicle_id into target_car from public.build_projects where id=project and user_id=actor;
 perform 1 from public.owned_vehicles where id=target_car and user_id=actor for key share;if not found then raise exception 'Link your own garage car first';end if;
 select * into r from public.build_projects where id=project and user_id=actor for update;
 if r.vehicle_id is distinct from target_car then raise exception 'The linked car changed. Reload before recording work.'using errcode='40001';end if;
 if r.id is null or r.vehicle_id is null then raise exception 'Link your own garage car first';end if;
 if r.version is distinct from expected_version then raise exception 'This build changed in another tab'using errcode='40001';end if;
 perform e34_private.build_rate(actor,'transfer',30);
 
 for t in select value from jsonb_array_elements(r.state->'tasks')where value->>'id'=any(task_ids)loop
  if exists(select 1 from public.build_task_transfers where project_id=project and task_id=t->>'id')then continue;end if;
  if t->>'status'<>'verified' or exists(select 1 from jsonb_array_elements_text(t->'dependencies')d where not exists(select 1 from jsonb_array_elements(r.state->'tasks')x where x->>'id'=d.value and x->>'status'='verified'))then raise exception 'Verify the selected tasks and their dependencies first';end if;
  if char_length(btrim(t->>'title'))<2 then raise exception 'Give completed tasks a title of at least two characters';end if;
  c:=null;select value into c from jsonb_array_elements(r.state->'components')where value->>'id'=t->>'componentId';
  insert into public.service_records(user_id,vehicle_id,title,performed_on,notes)values(actor,r.vehicle_id,left(t->>'title',160),performed_on,'Recorded from Build Studio. Owner verification, not an independent safety approval.'||E'\n'||(t->>'notes'))returning id into service;
  modification:=null;installed:=null;
  if c is not null and c->>'stage'in('installed','tested','verified')then
   if char_length(btrim(c->>'name'))<2 then raise exception 'Give installed components a name of at least two characters';end if;
   select x.modification_id,x.installed_id into modification,installed from public.build_task_transfers x where x.project_id=project and x.component_id=c->>'id'order by x.created_at limit 1;
   if modification is null then
    insert into public.vehicle_modifications(user_id,vehicle_id,title,notes)values(actor,r.vehicle_id,left(c->>'name',160),c->>'privateNotes')returning id into modification;
    insert into public.installed_parts(user_id,vehicle_id,part_id,description,number_raw,notes)values(actor,r.vehicle_id,nullif(c->>'partId',''),left(c->>'name',160),coalesce(c->>'number',c->>'productCode',''),c->>'privateNotes')returning id into installed;
   end if;
  end if;
  insert into public.owner_journal_entries(user_id,vehicle_id,entry_date,title,body,stage,currency,private_notes,guide_id,part_id)values(actor,r.vehicle_id,performed_on,left(t->>'title',160),'Completed work transferred from a private build. Owner-reported installation and checks.'||E'\n'||(t->>'notes'),'completed',r.state->>'currency','Build project: '||project::text,nullif(split_part(t->>'guideId','::',1),''),nullif(c->>'partId',''))returning id into journal;
  insert into public.build_task_transfers(project_id,user_id,task_id,component_id,vehicle_id,installed_id,service_id,modification_id,journal_id)values(project,actor,t->>'id',c->>'id',r.vehicle_id,installed,service,modification,journal);
 end loop;
 if exists(select 1 from unnest(task_ids)id where not exists(select 1 from jsonb_array_elements(r.state->'tasks')task_match where task_match->>'id'=id))then raise exception 'Unknown selected task';end if;
 select jsonb_set(r.state,'{tasks}',coalesce(jsonb_agg(jsonb_set(task_row,'{transferred}',to_jsonb(exists(select 1 from public.build_task_transfers x where x.project_id=project and x.task_id=task_row->>'id')))),'[]'))into s from jsonb_array_elements(r.state->'tasks')task_row;
 return e34_private.save_build(project,expected_version,s,gen_random_uuid());end$$;
create table public.build_publications(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id)on delete cascade,
 version integer not null default 1,snapshot jsonb not null check(octet_length(snapshot::text)<=200000),
 published boolean not null default true,hidden boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index build_publications_recent on public.build_publications(updated_at desc,id desc);
create index build_publications_owner on public.build_publications(owner_id);
create index build_publications_search on public.build_publications using gin(to_tsvector('simple',(snapshot->>'title')||' '||(snapshot->>'description')));
create table public.build_publication_revisions(
 build_id uuid not null references public.build_publications on delete cascade,version integer not null,snapshot jsonb not null,
 created_at timestamptz not null default now(),primary key(build_id,version)
);
create table e34_private.build_publication_bindings(
 build_id uuid primary key references public.build_publications on delete cascade,project_id uuid not null unique,
 user_id uuid not null,foreign key(project_id,user_id)references public.build_projects(id,user_id)on delete cascade
);
alter table e34_private.build_publication_bindings enable row level security;
revoke all on e34_private.build_publication_bindings from public,anon,authenticated;
create function e34_private.remove_build_snapshot()returns trigger language plpgsql security definer set search_path=''as $$begin delete from public.build_publications where id=old.build_id;return old;end$$;
create trigger build_source_removed after delete on e34_private.build_publication_bindings for each row execute function e34_private.remove_build_snapshot();
alter table public.build_publications enable row level security;
alter table public.build_publication_revisions enable row level security;
revoke all on public.build_publications,public.build_publication_revisions from public,anon,authenticated;
grant select on public.build_publications,public.build_publication_revisions to anon,authenticated;
create policy build_public_read on public.build_publications for select to anon,authenticated using(published and not hidden and not e34_private.community_muted(owner_id));
create policy build_public_revision_read on public.build_publication_revisions for select to anon,authenticated using(exists(select 1 from public.build_publications where id=build_id and published and not hidden));
create table public.build_photos(
 id uuid primary key default gen_random_uuid(),build_id uuid not null references public.build_publications on delete cascade,
 object_path text not null,width integer not null,height integer not null,caption text not null,alt_text text not null,created_at timestamptz not null default now()
);
create index build_photos_publication on public.build_photos(build_id,id);
create table e34_private.build_photo_bindings(
 photo_id uuid primary key references public.build_photos on delete cascade,source_id uuid not null references public.owner_car_photos on delete cascade,
 unique(source_id,photo_id)
);
create index build_photo_source on e34_private.build_photo_bindings(source_id);
alter table e34_private.build_photo_bindings enable row level security;
revoke all on e34_private.build_photo_bindings from public,anon,authenticated;
create function e34_private.remove_build_photo()returns trigger language plpgsql security definer set search_path=''as $$begin delete from public.build_photos where id=old.photo_id;return old;end$$;
create trigger build_photo_source_removed after delete on e34_private.build_photo_bindings for each row execute function e34_private.remove_build_photo();
alter table public.build_photos enable row level security;
revoke all on public.build_photos from public,anon,authenticated;grant select on public.build_photos to anon,authenticated;
create policy build_photo_read on public.build_photos for select to anon,authenticated using(
 exists(select 1 from public.build_publications b where b.id=build_id and b.published and not b.hidden and b.snapshot->'photos'?id::text)
 and exists(select 1 from e34_private.build_photo_bindings x join public.owner_car_photos o on o.id=x.source_id where x.photo_id=build_photos.id and o.state='ready'and o.build_share_status='approved')
);
-- RLS cannot directly inspect private binding tables. Definer predicate keeps all private IDs out of the API.
create function e34_private.build_photo_visible(photo uuid)returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from public.build_photos p join public.build_publications b on b.id=p.build_id join e34_private.build_photo_bindings x on x.photo_id=p.id join public.owner_car_photos o on o.id=x.source_id where p.id=photo and b.published and not b.hidden and not e34_private.community_muted(b.owner_id)and b.snapshot->'photos'?p.id::text and o.state='ready'and o.build_share_status='approved');$$;
drop policy build_photo_read on public.build_photos;
create policy build_photo_read on public.build_photos for select to anon,authenticated using(e34_private.build_photo_visible(id));
create function e34_private.build_projection(s jsonb,photos jsonb default '[]')returns jsonb language plpgsql immutable set search_path=''as $$
declare result jsonb;components jsonb;tasks jsonb;milestones jsonb;begin
 select coalesce(jsonb_agg(jsonb_build_object('system',c->'system','kind',c->'kind','partId',c->'partId','number',c->'number','name',c->'name','manufacturer',c->'manufacturer','productCode',c->'productCode','quantity',c->'quantity','stage',c->'stage','publicNotes',c->'publicNotes','guideIds',c->'guideIds','fabrication',c->'fabrication','wheelFitment',c->'wheelFitment')||case when(c->>'publicCost')::boolean then jsonb_build_object('estimate',c->'estimate','actual',c->'actual')else '{}'end),'[]')into components from jsonb_array_elements(s->'components')c;
 select coalesce(jsonb_agg(jsonb_build_object('title',t->'title','system',t->'system','status',t->'status','guideId',t->'guideId','dueOn',t->'dueOn','completedOn',t->'completedOn','notes',t->'notes')),'[]')into tasks from jsonb_array_elements(s->'tasks')t where(t->>'public')::boolean;
 select coalesce(jsonb_agg(jsonb_build_object('title',t->'title','date',t->'date','notes',t->'notes')),'[]')into milestones from jsonb_array_elements(s->'milestones')t where(t->>'public')::boolean;
 result:=jsonb_build_object('schemaVersion',1,'title',s->'title','description',s->'publicDescription','style',s->'style','lifecycle',s->'lifecycle','reference',s->'reference','configuration',s->'targetConfiguration','appearance',s->'appearance','components',components,'tasks',tasks,'milestones',milestones,'currency',s->'currency','photos',photos);
 if result::text~*'(^|[^a-z0-9])[a-hj-npr-z0-9]{17}([^a-z0-9]|$)'then raise exception 'Remove the full VIN from public text';end if;
 return result;end$$;
create table public.build_follows(user_id uuid not null default auth.uid()references auth.users on delete cascade,build_id uuid not null references public.build_publications on delete cascade,created_at timestamptz not null default now(),primary key(user_id,build_id));
create index build_follow_parent on public.build_follows(build_id);
alter table public.build_follows enable row level security;
revoke all on public.build_follows from public,anon,authenticated;grant select,delete on public.build_follows to authenticated;
create policy build_follows_owner on public.build_follows for all to authenticated using(user_id=(select auth.uid())and(select e34_private.scan_photo_session()))with check(user_id=(select auth.uid())and(select e34_private.scan_photo_session()));
create function e34_private.follow_build(build uuid,enabled boolean)returns void language plpgsql security definer set search_path=''as $$
declare actor uuid:=e34_private.build_actor();begin
 if enabled is distinct from true then delete from public.build_follows where user_id=actor and build_id=build;return;end if;
 if not exists(select 1 from public.build_publications where id=build and published and not hidden and not e34_private.community_muted(owner_id))then raise exception 'Build unavailable';end if;
 if(select count(*)from public.build_follows where user_id=actor)>=200 then raise exception 'Follow limit reached';end if;
 insert into public.build_follows(user_id,build_id)values(actor,build)on conflict do nothing;end$$;
create function e34_private.publish_build(project uuid,expected_version integer,confirmed boolean,approved_photos uuid[] default null)returns uuid language plpgsql security definer set search_path=''as $$
declare actor uuid:=e34_private.build_actor();r public.build_projects;pub public.build_publications;p public.owner_car_photos;photo uuid;photos jsonb:='[]';projection jsonb;begin
 if confirmed is distinct from true then raise exception 'Preview and confirm this publication';end if;
 if coalesce(cardinality(approved_photos),0)>24 then raise exception 'Too many publication photos';end if;
 perform e34_private.community_can_contribute(actor);perform e34_private.build_rate(actor,'publish',12);
 if(select count(*)from public.build_publication_revisions rev join public.build_publications b on b.id=rev.build_id where b.owner_id=actor)>=2000 then raise exception 'Publication history limit reached. Remove an older published project first.';end if;
 select * into r from public.build_projects where id=project and user_id=actor for update;
 if r.id is null then raise exception 'Project unavailable';end if;
 if r.version is distinct from expected_version then raise exception 'Save and preview the latest build first'using errcode='40001';end if;
 perform e34_private.validate_build(r.state,project);
 if not exists(select 1 from public.profiles where id=actor and username is not null)then raise exception 'Choose your public username in Account before publishing';end if;
 select b.* into pub from public.build_publications b join e34_private.build_publication_bindings x on x.build_id=b.id where x.project_id=project and x.user_id=actor;
 if pub.hidden then raise exception 'This publication is held for review. Contact moderation.';end if;
 if pub.id is null then
  insert into public.build_publications(owner_id,snapshot,published)values(actor,'{}',false)returning * into pub;
  insert into e34_private.build_publication_bindings(build_id,project_id,user_id)values(pub.id,project,actor);
 else pub.version:=pub.version+1;end if;
 if exists(select 1 from unnest(approved_photos)requested where not exists(select 1 from public.owner_car_photos o where o.id=requested and o.user_id=actor and o.build_project_id=project and o.state='ready'and o.build_share_status='approved'and r.state->'photoIds'?o.id::text))then raise exception 'Photo permission changed. Reopen the publication preview.';end if;
 for p in select o.*from public.owner_car_photos o where o.id=any(approved_photos)and o.user_id=actor and o.build_project_id=project and o.state='ready'and o.build_share_status='approved'order by o.created_at,o.id loop
  if(p.caption||' '||p.alt_text)~*'(^|[^a-z0-9])[a-hj-npr-z0-9]{17}([^a-z0-9]|$)'or position(project::text in lower(p.caption||' '||p.alt_text))>0 or(r.vehicle_id is not null and position(r.vehicle_id::text in lower(p.caption||' '||p.alt_text))>0)then raise exception 'Remove full VINs and private identifiers from photo captions before publishing';end if;
  select x.photo_id into photo from e34_private.build_photo_bindings x join public.build_photos b on b.id=x.photo_id where x.source_id=p.id and b.build_id=pub.id;
  if photo is null then
   insert into public.build_photos(build_id,object_path,width,height,caption,alt_text)values(pub.id,p.object_path,p.width,p.height,p.caption,p.alt_text)returning id into photo;
   insert into e34_private.build_photo_bindings(photo_id,source_id)values(photo,p.id);
  end if;photos:=photos||jsonb_build_array(photo::text);
 end loop;
 projection:=e34_private.build_projection(r.state,photos);
 if position(project::text in lower(projection::text))>0 or(r.vehicle_id is not null and position(r.vehicle_id::text in lower(projection::text))>0)then raise exception 'Remove private project or garage identifiers from public text';end if;
 update public.build_publications set version=pub.version,snapshot=projection,published=true,updated_at=now()where id=pub.id;
 insert into public.build_publication_revisions(build_id,version,snapshot)values(pub.id,pub.version,projection);
 -- Followers opt in deliberately. One notification per explicit publication; no fabricated activity.
 insert into public.notifications(user_id,message,target_url)select f.user_id,'A build you follow has a new published update.','/builds/'||pub.id::text from public.build_follows f where f.build_id=pub.id and f.user_id<>actor and not e34_private.community_blocked(f.user_id,actor);
 return pub.id;end$$;
create function e34_private.my_build_publication(project uuid)returns table(id uuid,version integer,published boolean,hidden boolean,updated_at timestamptz)language sql stable security definer set search_path=''as $$
 select b.id,b.version,b.published,b.hidden,b.updated_at from public.build_publications b join e34_private.build_publication_bindings x on x.build_id=b.id where x.project_id=project and x.user_id=auth.uid()and e34_private.scan_photo_session();$$;
create function e34_private.unpublish_build(project uuid)returns void language plpgsql security definer set search_path=''as $$begin
 update public.build_publications b set published=false,updated_at=now()from e34_private.build_publication_bindings x where x.project_id=project and x.build_id=b.id and x.user_id=e34_private.build_actor();if not found then raise exception 'Publication unavailable';end if;
 delete from public.notifications where target_url in(select '/builds/'||x.build_id::text from e34_private.build_publication_bindings x where x.project_id=project and x.user_id=auth.uid());end$$;
create function e34_private.moderate_build(build uuid,hide boolean,reason text)returns void language plpgsql security definer set search_path=''as $$begin
 if not e34_private.media_moderator()then raise exception 'Moderator permission and active MFA required';end if;
 if char_length(btrim(reason))not between 10 and 2000 then raise exception 'Record a moderation reason';end if;
 update public.build_publications set hidden=hide,updated_at=now()where id=build;if not found then raise exception 'Build unavailable';end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata)values(auth.uid(),'build:moderate','build_publications',build::text,jsonb_build_object('hidden',hide,'reason',reason));end$$;
create function e34_private.build_review_queue()returns jsonb language plpgsql stable security definer set search_path=''as $$begin
 if not e34_private.media_moderator()then raise exception 'Moderator permission and active MFA required';end if;
 return jsonb_build_object('builds',coalesce((select jsonb_agg(to_jsonb(b))from(select id,snapshot,hidden from public.build_publications where published or hidden order by updated_at desc limit 50)b),'[]'),'photos',coalesce((select jsonb_agg(to_jsonb(p))from(select id,object_path,alt_text,caption,build_share_status,build_review_reason from public.owner_car_photos where build_project_id is not null and state='ready'and build_share_consent_at is not null and build_share_status in('pending','rejected')order by created_at limit 50)p),'[]'));
end$$;
create function public.browse_builds(search_query text default '',model_filter text default '',style_filter text default '',system_filter text default '',page_size integer default 21,cursor_updated timestamptz default null,cursor_id uuid default null)returns setof public.build_publications language sql stable security invoker set search_path=''as $$
 select b.*from public.build_publications b where b.published and not b.hidden and char_length(search_query)<=300
 and(model_filter=''or b.snapshot->'configuration'->>'model'=model_filter)and(style_filter=''or b.snapshot->>'style'=style_filter)
 and(system_filter=''or exists(select 1 from jsonb_array_elements(b.snapshot->'components')c where c->>'system'=system_filter))
 and(btrim(search_query)=''or to_tsvector('simple',(b.snapshot->>'title')||' '||(b.snapshot->>'description'))@@websearch_to_tsquery('simple',search_query))
 and((cursor_updated is null and cursor_id is null)or(b.updated_at,b.id)<(cursor_updated,cursor_id))
 order by b.updated_at desc,b.id desc limit least(greatest(page_size,1),51);$$;
create function e34_private.build_media_session()returns boolean language sql stable security definer set search_path=''as $$select e34_private.scan_photo_session()$$;
create function e34_private.reserve_build_photo(project uuid,caption_text text,alternative_text text,rights_confirmed boolean)returns public.owner_car_photos language plpgsql security definer set search_path=''as $$
declare actor uuid:=e34_private.build_actor();photo uuid:=gen_random_uuid();result public.owner_car_photos;begin
 if rights_confirmed is distinct from true then raise exception 'Confirm photo permission';end if;
 if not exists(select 1 from public.build_projects where id=project and user_id=actor)then raise exception 'Project unavailable';end if;
 perform e34_private.build_rate(actor,'photo',24);
 if(select count(*)from public.owner_car_photos where user_id=actor)>=100 or(select count(*)from public.owner_car_photos where build_project_id=project)>=24 then raise exception 'Photo limit reached: 24 per build, 100 per account';end if;
 insert into public.owner_car_photos(id,user_id,build_project_id,object_path,caption,alt_text)values(photo,actor,project,actor::text||'/'||photo::text||'.jpg',caption_text,alternative_text)returning *into result;return result;end$$;
create function e34_private.share_build_photo(photo uuid,enabled boolean)returns void language plpgsql security definer set search_path=''as $$
declare actor uuid:=e34_private.build_actor();p public.owner_car_photos;begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,3834));
 select *into p from public.owner_car_photos where id=photo and user_id=actor and build_project_id is not null and state='ready'for update;
 if p.id is null then raise exception 'Photo unavailable';end if;
 if enabled then
  perform e34_private.community_can_contribute(actor);perform e34_private.build_rate(actor,'photo-share',24);
  if p.build_share_status in('rejected','approved')then raise exception 'Photo has already been reviewed';end if;
 end if;
 update public.owner_car_photos set build_share_status=case when enabled then 'pending'when build_share_status='rejected'then 'rejected'else 'withdrawn'end,build_share_consent_at=case when enabled then now()else null end where id=photo;
 -- Existing snapshots may retain a reference, but both metadata and bytes are revoked immediately.
end$$;
create function e34_private.review_build_photo(photo uuid,decision text,reason text)returns void language plpgsql security definer set search_path=''as $$begin
 if not e34_private.media_moderator()then raise exception 'Moderator permission and active MFA required';end if;
 if decision not in('approved','rejected')or char_length(btrim(reason))not between 10 and 2000 then raise exception 'Choose a decision and record a reason';end if;
 update public.owner_car_photos set build_share_status=decision,build_review_reason=reason where id=photo and build_project_id is not null and build_share_consent_at is not null and build_share_status in('pending','approved','rejected');if not found then raise exception 'Submitted photo unavailable';end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata)values(auth.uid(),'build-photo:'||decision,'owner_car_photos',photo::text,jsonb_build_object('reason',reason));end$$;
-- Preserve all existing car/scanner paths and add approved build media through the same private bucket policy.
create or replace function e34_private.can_read_car_photo(object_name text)returns boolean language sql stable security definer set search_path=''as $$
 select char_length(object_name)<100 and(
 exists(select 1 from public.owner_car_photos p where p.object_path=object_name and p.state='ready'and((p.user_id=auth.uid()and(p.build_project_id is null or e34_private.scan_photo_session()))or(p.build_project_id is not null and p.build_share_status in('pending','approved','rejected')and p.build_share_consent_at is not null and e34_private.media_moderator())))or
 exists(select 1 from public.garage_photos p join public.garage_showcases g on g.id=p.garage_id where p.object_path=object_name and((p.state='approved'and g.published and not g.hidden)or e34_private.media_moderator()))or
 exists(select 1 from public.observation_photos p where p.object_path=object_name and p.state='ready'and((p.user_id=auth.uid()and e34_private.scan_photo_session())or(p.reuse_opt_in and p.withdrawn_at is null and e34_private.media_moderator())or(p.reuse_opt_in and p.review_status='approved'and p.withdrawn_at is null)))or
 exists(select 1 from public.build_photos p where p.object_path=object_name and e34_private.build_photo_visible(p.id)));
$$;
alter table public.threads add column build_id uuid references public.build_publications on delete set null;
create index threads_build on public.threads(build_id,created_at desc,id desc);
create function e34_private.guard_thread_build()returns trigger language plpgsql security definer set search_path=''as $$begin
 if new.build_id is not null and(tg_op='INSERT'or new.build_id is distinct from old.build_id)and not exists(select 1 from public.build_publications b where b.id=new.build_id and b.published and not b.hidden and not e34_private.community_muted(b.owner_id))then raise exception 'Link a published build';end if;return new;end$$;
create trigger a_thread_build before insert or update on public.threads for each row execute function e34_private.guard_thread_build();
-- Extend only the existing FK-cleanup exception; authorship/restriction checks otherwise stay intact.
do $migration$declare def text;pos integer;begin
 select pg_get_functiondef('e34_private.guard_community()'::regprocedure)into def;pos:=position(E'begin\n'in def);
 if pos=0 then raise exception 'Community guard shape changed; inspect before migration';end if;
 def:=overlay(def placing E'begin\n if tg_table_name=''threads''and tg_op=''UPDATE''and to_jsonb(old)->>''build_id''is not null and to_jsonb(new)->>''build_id''is null and(to_jsonb(new)-''build_id'')=(to_jsonb(old)-''build_id'')and not exists(select 1 from public.build_publications where id=(to_jsonb(old)->>''build_id'')::uuid)then return new;end if;\n'from pos for 6);execute def;
end$migration$;
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check(target_type in('thread','post','guide','part','garage','journal','photo','build'));
create table public.build_notification_preferences(user_id uuid primary key default auth.uid()references auth.users on delete cascade,reminders boolean not null default false);
alter table public.build_notification_preferences enable row level security;
revoke all on public.build_notification_preferences from public,anon,authenticated;grant select,insert,update,delete on public.build_notification_preferences to authenticated;
create policy build_notice_owner on public.build_notification_preferences for all to authenticated using(user_id=(select auth.uid())and(select e34_private.scan_photo_session()))with check(user_id=(select auth.uid())and(select e34_private.scan_photo_session()));
create table e34_private.build_reminder_receipts(project_id uuid not null references public.build_projects on delete cascade,task_id text not null,due_on date not null,primary key(project_id,task_id,due_on));
alter table e34_private.build_reminder_receipts enable row level security;revoke all on e34_private.build_reminder_receipts from public,anon,authenticated;
create function public.deliver_build_reminders()returns integer language plpgsql security definer set search_path=''as $$declare r record;n integer:=0;begin
 for r in select p.id,p.user_id,t->>'id'task,(t->>'dueOn')::date due from public.build_projects p join public.build_notification_preferences pref on pref.user_id=p.user_id and pref.reminders cross join lateral jsonb_array_elements(p.state->'tasks')t where p.state->>'lifecycle'in('draft','active')and t->>'dueOn'is not null and(t->>'dueOn')::date<=current_date and t->>'status'not in('verified','deferred')and not exists(select 1 from e34_private.build_reminder_receipts x where x.project_id=p.id and x.task_id=t->>'id'and x.due_on=(t->>'dueOn')::date)order by p.updated_at limit 200 loop
  insert into e34_private.build_reminder_receipts values(r.id,r.task,r.due)on conflict do nothing;if found then
   if not exists(select 1 from public.notifications notice where notice.user_id=r.user_id and notice.target_url='/garage#builds'and notice.message='Build tasks are due. Open your builds to review them.'and notice.created_at>=current_date)then insert into public.notifications(user_id,message,target_url)values(r.user_id,'Build tasks are due. Open your builds to review them.','/garage#builds');n:=n+1;end if;end if;
 end loop;return n;end$$;
revoke all on function public.deliver_build_reminders()from public,anon,authenticated;grant execute on function public.deliver_build_reminders()to service_role;
-- Provider cron is already present. One bounded daily dispatch, not a new paid service.
select cron.schedule('e34-build-reminders','15 8 * * *','select public.deliver_build_reminders()');
revoke all on function e34_private.build_json_valid(jsonb,jsonb,integer)from public,anon,authenticated;
revoke all on function e34_private.build_actor()from public,anon,authenticated;
revoke all on function e34_private.build_rate(uuid,text,integer)from public,anon,authenticated;
revoke all on function e34_private.validate_build(jsonb,uuid)from public,anon,authenticated;
revoke all on function e34_private.create_build(jsonb,uuid)from public,anon,authenticated;
revoke all on function e34_private.save_build(uuid,integer,jsonb,uuid)from public,anon,authenticated;
revoke all on function e34_private.link_build_car(uuid,integer,uuid)from public,anon,authenticated;
revoke all on function e34_private.restore_build(uuid,integer,integer)from public,anon,authenticated;
revoke all on function e34_private.delete_build(uuid,integer,boolean)from public,anon,authenticated;
revoke all on function e34_private.transfer_build_work(uuid,integer,text[],boolean,date)from public,anon,authenticated;
revoke all on function e34_private.remove_build_snapshot()from public,anon,authenticated;
revoke all on function e34_private.remove_build_photo()from public,anon,authenticated;
revoke all on function e34_private.build_photo_visible(uuid)from public,anon,authenticated;
revoke all on function e34_private.build_projection(jsonb,jsonb)from public,anon,authenticated;
revoke all on function e34_private.follow_build(uuid,boolean)from public,anon,authenticated;
revoke all on function e34_private.publish_build(uuid,integer,boolean,uuid[])from public,anon,authenticated;
revoke all on function e34_private.my_build_publication(uuid)from public,anon,authenticated;
revoke all on function e34_private.unpublish_build(uuid)from public,anon,authenticated;
revoke all on function e34_private.moderate_build(uuid,boolean,text)from public,anon,authenticated;
revoke all on function e34_private.build_review_queue()from public,anon,authenticated;
revoke all on function public.browse_builds(text,text,text,text,integer,timestamptz,uuid)from public,anon,authenticated;
revoke all on function e34_private.build_media_session()from public,anon,authenticated;
revoke all on function e34_private.reserve_build_photo(uuid,text,text,boolean)from public,anon,authenticated;
revoke all on function e34_private.share_build_photo(uuid,boolean)from public,anon,authenticated;
revoke all on function e34_private.review_build_photo(uuid,text,text)from public,anon,authenticated;
revoke all on function e34_private.guard_thread_build()from public,anon,authenticated;
create function public.build_review_queue()returns jsonb language sql security invoker set search_path=''as $$select e34_private.build_review_queue();$$;
revoke all on function public.build_review_queue()from public,anon,authenticated;
grant execute on function public.build_review_queue()to authenticated;
grant execute on function e34_private.build_review_queue()to authenticated;
create function public.build_media_session()returns boolean language sql security invoker set search_path=''as $$select e34_private.build_media_session();$$;
revoke all on function public.build_media_session()from public,anon,authenticated;
grant execute on function public.build_media_session()to authenticated;
grant execute on function e34_private.build_media_session()to authenticated;
create function public.create_build(content jsonb,vehicle uuid default null)returns public.build_projects language sql security invoker set search_path=''as $$select e34_private.create_build(content,vehicle);$$;
revoke all on function public.create_build(jsonb,uuid)from public,anon,authenticated;
grant execute on function public.create_build(jsonb,uuid)to authenticated;
grant execute on function e34_private.create_build(jsonb,uuid)to authenticated;
create function public.save_build(project uuid,expected_version integer,content jsonb,request_id uuid)returns public.build_projects language sql security invoker set search_path=''as $$select e34_private.save_build(project,expected_version,content,request_id);$$;
revoke all on function public.save_build(uuid,integer,jsonb,uuid)from public,anon,authenticated;
grant execute on function public.save_build(uuid,integer,jsonb,uuid)to authenticated;
grant execute on function e34_private.save_build(uuid,integer,jsonb,uuid)to authenticated;
create function public.link_build_car(project uuid,expected_version integer,vehicle uuid)returns public.build_projects language sql security invoker set search_path=''as $$select e34_private.link_build_car(project,expected_version,vehicle);$$;
revoke all on function public.link_build_car(uuid,integer,uuid)from public,anon,authenticated;
grant execute on function public.link_build_car(uuid,integer,uuid)to authenticated;
grant execute on function e34_private.link_build_car(uuid,integer,uuid)to authenticated;
create function public.restore_build(project uuid,expected_version integer,restore_version integer)returns public.build_projects language sql security invoker set search_path=''as $$select e34_private.restore_build(project,expected_version,restore_version);$$;
revoke all on function public.restore_build(uuid,integer,integer)from public,anon,authenticated;
grant execute on function public.restore_build(uuid,integer,integer)to authenticated;
grant execute on function e34_private.restore_build(uuid,integer,integer)to authenticated;
create function public.delete_build(project uuid,expected_version integer,confirmed boolean)returns void language sql security invoker set search_path=''as $$select e34_private.delete_build(project,expected_version,confirmed);$$;
revoke all on function public.delete_build(uuid,integer,boolean)from public,anon,authenticated;
grant execute on function public.delete_build(uuid,integer,boolean)to authenticated;
grant execute on function e34_private.delete_build(uuid,integer,boolean)to authenticated;
create function public.transfer_build_work(project uuid,expected_version integer,task_ids text[],confirmed boolean,performed_on date)returns public.build_projects language sql security invoker set search_path=''as $$select e34_private.transfer_build_work(project,expected_version,task_ids,confirmed,performed_on);$$;
revoke all on function public.transfer_build_work(uuid,integer,text[],boolean,date)from public,anon,authenticated;
grant execute on function public.transfer_build_work(uuid,integer,text[],boolean,date)to authenticated;
grant execute on function e34_private.transfer_build_work(uuid,integer,text[],boolean,date)to authenticated;
create function public.follow_build(build uuid,enabled boolean)returns void language sql security invoker set search_path=''as $$select e34_private.follow_build(build,enabled);$$;
revoke all on function public.follow_build(uuid,boolean)from public,anon,authenticated;
grant execute on function public.follow_build(uuid,boolean)to authenticated;
grant execute on function e34_private.follow_build(uuid,boolean)to authenticated;
create function public.publish_build(project uuid,expected_version integer,confirmed boolean,approved_photos uuid[] default null)returns uuid language sql security invoker set search_path=''as $$select e34_private.publish_build(project,expected_version,confirmed,approved_photos);$$;
revoke all on function public.publish_build(uuid,integer,boolean,uuid[])from public,anon,authenticated;
grant execute on function public.publish_build(uuid,integer,boolean,uuid[])to authenticated;
grant execute on function e34_private.publish_build(uuid,integer,boolean,uuid[])to authenticated;
create function public.my_build_publication(project uuid)returns table(id uuid,version integer,published boolean,hidden boolean,updated_at timestamptz)language sql security invoker set search_path=''as $$select *from e34_private.my_build_publication(project);$$;
revoke all on function public.my_build_publication(uuid)from public,anon,authenticated;
grant execute on function public.my_build_publication(uuid)to authenticated;
grant execute on function e34_private.my_build_publication(uuid)to authenticated;
create function public.unpublish_build(project uuid)returns void language sql security invoker set search_path=''as $$select e34_private.unpublish_build(project);$$;
revoke all on function public.unpublish_build(uuid)from public,anon,authenticated;
grant execute on function public.unpublish_build(uuid)to authenticated;
grant execute on function e34_private.unpublish_build(uuid)to authenticated;
create function public.moderate_build(build uuid,hide boolean,reason text)returns void language sql security invoker set search_path=''as $$select e34_private.moderate_build(build,hide,reason);$$;
revoke all on function public.moderate_build(uuid,boolean,text)from public,anon,authenticated;
grant execute on function public.moderate_build(uuid,boolean,text)to authenticated;
grant execute on function e34_private.moderate_build(uuid,boolean,text)to authenticated;
create function public.reserve_build_photo(project uuid,caption_text text,alternative_text text,rights_confirmed boolean)returns public.owner_car_photos language sql security invoker set search_path=''as $$select e34_private.reserve_build_photo(project,caption_text,alternative_text,rights_confirmed);$$;
revoke all on function public.reserve_build_photo(uuid,text,text,boolean)from public,anon,authenticated;
grant execute on function public.reserve_build_photo(uuid,text,text,boolean)to authenticated;
grant execute on function e34_private.reserve_build_photo(uuid,text,text,boolean)to authenticated;
create function public.share_build_photo(photo uuid,enabled boolean)returns void language sql security invoker set search_path=''as $$select e34_private.share_build_photo(photo,enabled);$$;
revoke all on function public.share_build_photo(uuid,boolean)from public,anon,authenticated;
grant execute on function public.share_build_photo(uuid,boolean)to authenticated;
grant execute on function e34_private.share_build_photo(uuid,boolean)to authenticated;
create function public.review_build_photo(photo uuid,decision text,reason text)returns void language sql security invoker set search_path=''as $$select e34_private.review_build_photo(photo,decision,reason);$$;
revoke all on function public.review_build_photo(uuid,text,text)from public,anon,authenticated;
grant execute on function public.review_build_photo(uuid,text,text)to authenticated;
grant execute on function e34_private.review_build_photo(uuid,text,text)to authenticated;
-- Public predicates needed by RLS, not arbitrary private-state helpers.
grant execute on function e34_private.build_photo_visible(uuid)to anon,authenticated;
grant execute on function public.browse_builds(text,text,text,text,integer,timestamptz,uuid)to anon,authenticated;

-- Only predefined aggregate Build Studio actions; never private configuration payloads.
do $migration$declare def text;begin
 select pg_get_functiondef('public.analytics_ingest(uuid,jsonb)'::regprocedure)into def;
 def:=replace(def,'''scanner_followup'')','''scanner_followup'',''build_open'',''build_create'',''build_save'',''build_customize'',''build_compatibility'',''build_progress'',''build_publish_preview'',''build_publish'',''build_view'')');
 def:=replace(def,'if exists(select 1 from jsonb_object_keys(e)k',E'if e->>''name''like ''build_%''and(coalesce(e->>''resource'','''')not in(''/workshop'',''/builds'')or exists(select 1 from jsonb_object_keys(e)k where k not in(''v'',''id'',''page'',''name'',''resource'',''at'',''seq'',''topic''))or(e?''topic''and(e->>''name''<>''build_customize''or e->>''topic''not in(''appearance'',''paint'',''interior'',''wheels'',''stance'',''engine''))))then raise exception ''Invalid build aggregate'';end if;\n  if exists(select 1 from jsonb_object_keys(e)k');
 execute def;
end$migration$;
insert into e34_private.analytics_resources(id,path,title,kind)values('/builds','/builds','Public builds','page')on conflict(id)do nothing;
