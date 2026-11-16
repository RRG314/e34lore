-- Disposable local fixtures only.
begin;
create function pg_temp.build_check(ok boolean,label text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
insert into e34_private.build_references values('e34-525i-sedan-automatic',900001,repeat('d',64));
select pg_temp.build_check((select count(*)=2 from e34_private.build_references where id='e34-525i-sedan-automatic' and revision in(23,900001)),'a new reference retains the accepted pin');
insert into auth.users(id,email,email_confirmed_at,created_at,is_anonymous)select('e34b0000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'build-test-'||n||'@example.invalid',now(),now()-interval '3 days',false from generate_series(1,3)n;
insert into auth.sessions(id,user_id,aal)select('e34b0000-0000-4000-9000-'||lpad(n::text,12,'0'))::uuid,('e34b0000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,case when n=3 then 'aal2'else 'aal1'end from generate_series(1,3)n;
insert into public.profiles(id,display_name)values('e34b0000-0000-4000-8000-000000000001','Build Test Owner')on conflict(id)do update set display_name=excluded.display_name;
insert into auth.mfa_factors(user_id,status)values('e34b0000-0000-4000-8000-000000000003','verified');
insert into e34_private.staff_roles(user_id,role)values('e34b0000-0000-4000-8000-000000000003','moderator');
insert into public.owned_vehicles(id,user_id,nickname,model_id)values('e34b0000-0000-4000-a000-000000000001','e34b0000-0000-4000-8000-000000000001','Actual build fixture','525i');
select set_config('request.jwt.claims','{"sub":"e34b0000-0000-4000-8000-000000000001","session_id":"e34b0000-0000-4000-9000-000000000001","role":"authenticated","aal":"aal1"}',true);set local role authenticated;
select public.claim_username('build_policy_owner');
\set build_state '{"schemaVersion":1,"title":"My E34 build","description":"","publicDescription":"","style":"street","lifecycle":"draft","reference":{"id":"e34-525i-sedan-automatic","revision":23,"sha256":"07d858ddc5abb25b43a823e5082cf9d17b55e018df6317cf8f4c1c343569bd2d"},"baseConfiguration":{"model":"525i","engine":"M50TU","year":"1995","month":"","market":"","body":"Sedan","transmission":"Automatic","steering":""},"targetConfiguration":{"model":"525i","engine":"M50TU","year":"1995","month":"","market":"","body":"Sedan","transmission":"Automatic","steering":""},"appearance":{"paint":{"enabled":false,"color":"#f4f4ef","finish":"gloss","factoryCode":null},"upholstery":{"enabled":false,"color":"#846754","finish":"fabric"},"trim":{"enabled":false,"color":"#2b2a28"},"wheels":{"packageId":"reference","color":"#aeb1b3","scale":1,"widthScale":1},"rideHeight":0,"engineAccent":{"enabled":false,"color":"#a33225"},"quality":"balanced"},"components":[],"tasks":[],"milestones":[],"photoIds":[],"currency":"USD","privateNotes":""}'
select id as project from public.create_build(:'build_state'::jsonb,'e34b0000-0000-4000-a000-000000000001')\gset
select pg_temp.build_check((select version=1 from public.build_projects where id=:'project'),'create and owner read');
select id as archive_project from public.create_build(jsonb_set(:'build_state'::jsonb,'{reference}','{"id":"e34-525i-sedan-automatic","revision":900001,"sha256":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"}'),null)\gset
select pg_temp.build_check((select(state->'reference'->>'revision')::integer=900001 from public.build_projects where id=:'archive_project'),'new reference can create a build');
do $$begin begin update public.build_projects set state='{}';raise exception 'FAIL: direct state update';exception when insufficient_privilege then null;end;begin update public.build_project_revisions set summary='spoof';raise exception 'FAIL: revision update';exception when insufficient_privilege then null;end;end$$;
select state||'{"privateNotes":"PRIVATE_SECRET_38","description":"PRIVATE_DESCRIPTION","publicDescription":"Public restoration plan"}'::jsonb as next_state from public.build_projects where id=:'project'\gset
select pg_temp.build_check((public.save_build(:'project',1,:'next_state'::jsonb,'e34b0000-0000-4000-b000-000000000001')).version=2,'save appends revision');
select pg_temp.build_check((public.save_build(:'project',1,:'next_state'::jsonb,'e34b0000-0000-4000-b000-000000000001')).version=2,'interrupted save retry is idempotent');
-- Dynamic checks keep parameter values in a temp settings scope, never a public helper.
select set_config('build.test.project',:'project',true);
do $$declare p uuid:=current_setting('build.test.project')::uuid;s jsonb;begin
 select state into s from public.build_projects where id=p;
 begin perform public.create_build(jsonb_set(s,'{reference,sha256}',to_jsonb(repeat('e',64))),null);raise exception 'FAIL: incorrect archived hash accepted';exception when others then if sqlerrm not like 'Unsupported model release%'then raise;end if;end;
 begin perform public.save_build(p,1,s||'{"title":"Conflict"}',gen_random_uuid());raise exception 'FAIL: concurrent overwrite';exception when serialization_failure then null;end;
 begin perform public.save_build(p,null,s||'{"title":"Null version bypass"}',gen_random_uuid());raise exception 'FAIL: null version bypass';exception when serialization_failure then null;end;
 begin perform public.save_build(p,2,s||'{"inventedSecret":"bad"}',gen_random_uuid());raise exception 'FAIL: unknown field';exception when others then if sqlerrm like 'FAIL:%'then raise;end if;end;
 begin perform public.save_build(p,2,jsonb_set(s,'{appearance,wheels,packageId}','"https://evil.invalid/x.glb"'),gen_random_uuid());raise exception 'FAIL: unapproved asset';exception when others then if sqlerrm like 'FAIL:%'then raise;end if;end;
 begin perform public.save_build(p,2,jsonb_set(s,'{tasks}','[{"id":"bad"}]'),gen_random_uuid());raise exception 'FAIL: malformed task';exception when others then if sqlerrm like 'FAIL:%'then raise;end if;end;
 begin perform public.create_build(s,'e34b0000-0000-4000-a000-000000000002');raise exception 'FAIL: foreign car';exception when others then if sqlerrm like 'FAIL:%'then raise;end if;end;
end$$;
select id as photo from public.reserve_build_photo(:'project','Private test photo','Synthetic part on a workbench',true)\gset
reset role;set local role service_role;
select public.complete_car_photo('e34b0000-0000-4000-8000-000000000001',:'photo',300,200,5000,repeat('b',64));
reset role;set local role authenticated;
reset role;update auth.sessions set not_after=now()-interval '1 second'where id='e34b0000-0000-4000-9000-000000000001';set local role authenticated;
select pg_temp.build_check(not exists(select 1 from public.build_projects),'revoked session cannot read private plans');
select pg_temp.build_check(not exists(select 1 from public.owner_car_photos where build_project_id=:'project'),'revoked session cannot read build photo metadata');
reset role;update auth.sessions set not_after=null where id='e34b0000-0000-4000-9000-000000000001';set local role authenticated;
select public.share_build_photo(:'photo',true);
select pg_temp.build_check((public.save_build(:'project',2,jsonb_set(:'next_state'::jsonb,'{photoIds}',jsonb_build_array(:'photo'::text)),gen_random_uuid())).version=3,'ready project media saved');
select public.publish_build(:'project',3,true)as publication\gset
select pg_temp.build_check((select not(snapshot::text like '%PRIVATE_SECRET%'or snapshot::text like '%PRIVATE_DESCRIPTION%'or snapshot::text like '%'||:'project'||'%'or snapshot::text like '%e34b0000-0000-4000-a000-000000000001%')and jsonb_array_length(snapshot->'photos')=0 from public.build_publications where id=:'publication'),'whitelisted public projection omits private content and pending photos');
select pg_temp.build_check((public.save_build(:'project',3,jsonb_set((select state from public.build_projects where id=:'project'),'{publicDescription}','"Private edit awaiting approval"'),gen_random_uuid())).version=4,'private save after publish');
select pg_temp.build_check((select snapshot->>'description'='Public restoration plan'and version=1 from public.build_publications where id=:'publication'),'private edit never updates public snapshot');
reset role;
select set_config('request.jwt.claims','{"sub":"e34b0000-0000-4000-8000-000000000002","session_id":"e34b0000-0000-4000-9000-000000000002","role":"authenticated","aal":"aal1"}',true);set local role authenticated;
select pg_temp.build_check(not exists(select 1 from public.build_projects),'cross account project isolation');
select pg_temp.build_check(not exists(select 1 from public.build_project_revisions),'cross account history isolation');
select pg_temp.build_check(not exists(select 1 from public.owner_car_photos where build_project_id=:'project'),'cross account media isolation');
select public.follow_build(:'publication',true);
select set_config('build.test.project',:'project',true);
do $$begin begin perform public.delete_build(current_setting('build.test.project')::uuid,1,true);raise exception 'FAIL: cross account delete';exception when others then if sqlerrm like 'FAIL:%'then raise;end if;end;end$$;
reset role;select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
select pg_temp.build_check((select count(*)=1 from public.build_publications where id=:'publication'),'anonymous public view');
select pg_temp.build_check(not e34_private.can_read_car_photo('e34b0000-0000-4000-8000-000000000001/'||:'photo'||'.jpg'),'pending photo bytes private');
reset role;select set_config('request.jwt.claims','{"sub":"e34b0000-0000-4000-8000-000000000003","session_id":"e34b0000-0000-4000-9000-000000000003","role":"authenticated","aal":"aal2"}',true);set local role authenticated;
select public.review_build_photo(:'photo','approved','Synthetic moderation approval for local policy verification');
reset role;select set_config('request.jwt.claims','{"sub":"e34b0000-0000-4000-8000-000000000001","session_id":"e34b0000-0000-4000-9000-000000000001","role":"authenticated","aal":"aal1"}',true);set local role authenticated;
reset role;update public.owner_car_photos set caption='VIN WBAHD6310PBJ00001'where id=:'photo';set local role authenticated;
select set_config('build.test.photo',:'photo',true);
do $$begin begin perform public.publish_build(current_setting('build.test.project')::uuid,4,true,array[current_setting('build.test.photo')::uuid]);raise exception 'FAIL: full VIN in public photo caption';exception when others then if sqlerrm not like 'Remove full VINs%'then raise;end if;end;end$$;
reset role;update public.owner_car_photos set caption='Private test photo'where id=:'photo';set local role authenticated;
select pg_temp.build_check(public.publish_build(:'project',4,true,array[:'photo'::uuid])=:'publication','republish preserves stable URL');
select pg_temp.build_check((select version=2 and snapshot->>'description'='Private edit awaiting approval'and jsonb_array_length(snapshot->'photos')=1 from public.build_publications where id=:'publication'),'republish advances public revision with approved media');
select pg_temp.build_check((select count(*)=2 from public.build_publication_revisions where build_id=:'publication'),'public revision history');
reset role;
select pg_temp.build_check((select count(*)=1 from public.notifications where target_url='/builds/'||:'publication'),'only explicit follower notified');
set local role authenticated;
select public.share_build_photo(:'photo',false);
reset role;select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
select pg_temp.build_check(not exists(select 1 from public.build_photos where build_id=:'publication'),'withdrawal revokes photo metadata from existing snapshot');
select pg_temp.build_check(not e34_private.can_read_car_photo('e34b0000-0000-4000-8000-000000000001/'||:'photo'||'.jpg'),'withdrawal revokes image bytes');
reset role;select set_config('request.jwt.claims','{"sub":"e34b0000-0000-4000-8000-000000000001","session_id":"e34b0000-0000-4000-9000-000000000001","role":"authenticated","aal":"aal1"}',true);set local role authenticated;
select public.unpublish_build(:'project');
select pg_temp.build_check((public.restore_build(:'project',4,1)).version=5,'restore creates new private revision');
select state as transfer_base from public.build_projects where id=:'project'\gset
select jsonb_set(jsonb_set(:'transfer_base'::jsonb,'{components}','[{"id":"component-check","system":"brakes","kind":"custom","partId":null,"number":null,"name":"Owner brake project","manufacturer":"","productCode":"","quantity":1,"stage":"installed","estimate":null,"actual":null,"publicCost":false,"privateNotes":"Private actual-car work note","publicNotes":"","guideIds":[],"wheelFitment":null,"fabrication":"unknown"}]'::jsonb),'{tasks}','[{"id":"prior-check","title":"Prerequisite check","componentId":"component-check","system":"brakes","status":"verified","dependencies":[],"guideId":null,"dueOn":null,"completedOn":null,"notes":"Owner completed and checked the recorded work.","public":false,"transferred":false},{"id":"install-check","title":"Installed brake component","componentId":"component-check","system":"brakes","status":"verified","dependencies":["prior-check"],"guideId":null,"dueOn":null,"completedOn":null,"notes":"Owner completed and checked the recorded work.","public":false,"transferred":false}]'::jsonb)as transfer_state\gset
select pg_temp.build_check((public.save_build(:'project',5,:'transfer_state'::jsonb,gen_random_uuid())).version=6,'save structured installed component and checks');
select pg_temp.build_check((public.transfer_build_work(:'project',6,array['install-check'],true,current_date)).version=7,'explicit completed-work transfer creates revision');
select pg_temp.build_check((public.transfer_build_work(:'project',7,array['install-check'],true,current_date)).version=7,'repeated transfer is idempotent');
select pg_temp.build_check((select count(*)=1 from public.service_records where vehicle_id='e34b0000-0000-4000-a000-000000000001'),'selected work creates one service record');
select pg_temp.build_check((select count(*)=1 from public.vehicle_modifications where vehicle_id='e34b0000-0000-4000-a000-000000000001'),'selected work creates actual modification record');
select pg_temp.build_check((select count(*)=1 from public.installed_parts where vehicle_id='e34b0000-0000-4000-a000-000000000001'),'actual installed component recorded only after transfer');
select pg_temp.build_check((select count(*)=1 from public.owner_journal_entries where vehicle_id='e34b0000-0000-4000-a000-000000000001'),'existing journal receives completed work');
select pg_temp.build_check((select configuration='{}'::jsonb from public.owned_vehicles where id='e34b0000-0000-4000-a000-000000000001'),'planning and transfer preserve actual factory configuration');
select state as reminder_state from public.build_projects where id=:'project'\gset
select jsonb_set(:'reminder_state'::jsonb,'{tasks}',(:'reminder_state'::jsonb->'tasks')||jsonb_build_array(jsonb_set(jsonb_set(jsonb_set(:'reminder_state'::jsonb->'tasks'->0,'{id}','"reminder-one"'),'{status}','"planned"'),'{dueOn}',to_jsonb(current_date::text)),jsonb_set(jsonb_set(jsonb_set(:'reminder_state'::jsonb->'tasks'->0,'{id}','"reminder-two"'),'{status}','"planned"'),'{dueOn}',to_jsonb(current_date::text))))as reminder_content\gset
select public.save_build(:'project',7,:'reminder_content'::jsonb,gen_random_uuid());
insert into public.build_notification_preferences(user_id,reminders)values('e34b0000-0000-4000-8000-000000000001',true);
reset role;set local role service_role;
select pg_temp.build_check(public.deliver_build_reminders()=1,'multiple due tasks produce one daily reminder');
select pg_temp.build_check(public.deliver_build_reminders()=0,'reminder dispatch is idempotent');
reset role;set local role authenticated;


reset role;select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
select pg_temp.build_check(not exists(select 1 from public.build_publications where id=:'publication'),'unpublish revokes public snapshot');
select pg_temp.build_check(not exists(select 1 from public.build_publication_revisions where build_id=:'publication'),'unpublish revokes earlier public revisions');
reset role;select set_config('request.jwt.claims','{"sub":"e34b0000-0000-4000-8000-000000000001","session_id":"e34b0000-0000-4000-9000-000000000001","role":"authenticated","aal":"aal1"}',true);set local role authenticated;
select set_config('build.test.project',:'project',true);
do $$begin begin perform public.link_build_car(current_setting('build.test.project')::uuid,8,null);raise exception 'FAIL: relink transferred work';exception when others then if sqlerrm not like 'Work was already recorded%'then raise;end if;end;end$$;
delete from public.owned_vehicles where id='e34b0000-0000-4000-a000-000000000001';
select pg_temp.build_check((select vehicle_id is null from public.build_projects where id=:'project'),'actual-car removal preserves independent build');
select pg_temp.build_check((select vehicle_id is null from public.build_task_transfers where project_id=:'project'and task_id='install-check'),'historical transfer receipt survives actual-car removal');
select pg_temp.build_check((public.save_build(:'project',8,(select state||'{"privateNotes":"Plan retained after the actual car was removed"}'from public.build_projects where id=:'project'),gen_random_uuid())).version=9,'orphaned conceptual plan remains editable after actual-car removal');
select id as removed_project from public.create_build(:'build_state'::jsonb,null)\gset
select id as removed_photo from public.reserve_build_photo(:'removed_project','Project deletion test','Synthetic second workshop photo',true)\gset
select public.delete_build(:'removed_project',1,true);
reset role;
select pg_temp.build_check(exists(select 1 from e34_private.media_cleanup_queue where object_path='e34b0000-0000-4000-8000-000000000001/'||:'removed_photo'||'.jpg'),'project deletion queues shared private-media cleanup');
-- Delete-account removes every Storage object under this owner's prefix before Auth deletion.
-- Delete the auth identity to test FK cascade, public revocation and shared cleanup queue.
delete from auth.users where id='e34b0000-0000-4000-8000-000000000001';
select pg_temp.build_check(not exists(select 1 from public.build_projects where id=:'project')and not exists(select 1 from public.build_publications where id=:'publication'),'account deletion removes private and public builds');
select pg_temp.build_check(not exists(select 1 from public.owner_car_photos where user_id='e34b0000-0000-4000-8000-000000000001'),'account deletion removes all build media metadata; existing prefix cleanup runs before Auth deletion');
reset role;
update e34_private.analytics_config set enabled=true,approved_revision=2,hash_key=repeat('a',64)where singleton;
set local role service_role;
select pg_temp.build_check((public.analytics_ingest('e34b0000-0000-4000-b000-000000000099',jsonb_build_object('revision',2,'consent',jsonb_build_object('traffic',true,'search',false,'performance',false),'events',jsonb_build_array(jsonb_build_object('v',1,'id',gen_random_uuid(),'page','e34b0000-0000-4000-b000-000000000098','name','page_view','resource','/workshop','at',extract(epoch from clock_timestamp())*1000,'seq',0),jsonb_build_object('v',1,'id',gen_random_uuid(),'page','e34b0000-0000-4000-b000-000000000098','name','build_customize','resource','/workshop','topic','appearance','at',extract(epoch from clock_timestamp())*1000,'seq',1))))->>'accepted')::integer=2,'aggregate build events accepted by real collector contract');
reset role;
select 'PASS Build Studio persistence, CAS, revision integrity, publication isolation, media approval/revocation, follows and deletion' as result;
rollback;
