-- Only the disposable cluster from scripts/test-security-db.py may run this.
-- No auth bypass is installed: staff tests require real synthetic session rows.
begin;
create function pg_temp.assert_true(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
insert into auth.users(id,email,email_confirmed_at,created_at,is_anonymous) select
 ('e3400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'fixture-'||n||'@example.invalid',case when n=6 then null else now() end,now()-interval '3 days',n=6 from generate_series(1,6)n;
insert into e34_private.staff_roles values
 ('e3400000-0000-4000-8000-000000000003','moderator'),
 ('e3400000-0000-4000-8000-000000000004','admin'),
 ('e3400000-0000-4000-8000-000000000005','reviewer');
insert into auth.mfa_factors(user_id,status) select ('e3400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'verified' from generate_series(3,5)n;
insert into auth.sessions(id,user_id,aal) select ('e3400000-0000-4000-9000-'||lpad(n::text,12,'0'))::uuid,('e3400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'aal2' from generate_series(1,6)n;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000004","session_id":"e3400000-0000-4000-9000-000000000004","aal":"aal1","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true(not e34_private.has_role('admin'),'admin requires MFA even with an active session');
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000001","session_id":"e3400000-0000-4000-9000-000000000001","aal":"aal2","role":"authenticated","user_metadata":{"role":"admin"}}',true);
select pg_temp.assert_true(not e34_private.has_role('admin'),'member cannot forge a role in editable metadata');
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000004","session_id":"e3400000-0000-4000-9000-000000000001","aal":"aal2","role":"authenticated"}',true);
select pg_temp.assert_true(not e34_private.has_role('admin'),'session must belong to the token subject');
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000004","session_id":"e3400000-0000-4000-9000-000000000004","aal":"aal2","role":"authenticated"}',true);
select pg_temp.assert_true(e34_private.has_role('admin'),'active MFA administrator accepted');
select pg_temp.assert_true((public.security_status()->>'tables_without_rls')::int=0,'all application tables have RLS');
select pg_temp.assert_true((public.security_status()->>'definers_without_fixed_search_path')::int=0,'fixed definer search paths');
reset role;
update auth.sessions set not_after=now()-interval '1 second' where user_id='e3400000-0000-4000-8000-000000000004';
set local role authenticated;
select pg_temp.assert_true(not e34_private.has_role('admin'),'expired session rejected with otherwise valid MFA JWT');
reset role;
delete from auth.sessions where user_id='e3400000-0000-4000-8000-000000000004';
set local role authenticated;
select pg_temp.assert_true(not e34_private.has_role('admin'),'revoked staff session rejected before JWT expiry');
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000003","session_id":"e3400000-0000-4000-9000-000000000003","aal":"aal2","role":"authenticated"}',true);
select pg_temp.assert_true(e34_private.has_role('moderator') and not e34_private.has_role('admin'),'moderator has no admin escalation');
do $$begin begin perform public.security_status();raise exception 'FAIL: moderator obtained security inventory';exception when insufficient_privilege then null;end;end$$;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000005","session_id":"e3400000-0000-4000-9000-000000000005","aal":"aal2","role":"authenticated"}',true);
select pg_temp.assert_true(e34_private.has_role('reviewer') and not e34_private.has_role('moderator'),'reviewer cannot moderate');
reset role;
update auth.mfa_factors set status='unverified' where user_id='e3400000-0000-4000-8000-000000000005';
set local role authenticated;
select pg_temp.assert_true(not e34_private.has_role('reviewer'),'removing the verified factor revokes staff privilege');
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000005","aal":"aal2","role":"authenticated"}',true);
select pg_temp.assert_true(not e34_private.has_role('reviewer'),'reviewer cannot omit a session identifier');
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000001","session_id":"e3400000-0000-4000-9000-000000000001","aal":"aal1","role":"authenticated"}',true);
insert into public.owned_vehicles(id,nickname,model_id) values('e3400000-0000-4000-8000-000000000010','Security private car','525i');
insert into public.service_records(vehicle_id,title,performed_on) values('e3400000-0000-4000-8000-000000000010','Private maintenance',current_date);
insert into public.owner_journal_entries(id,vehicle_id,title,body,private_notes,cost) values('e3400000-0000-4000-8000-000000000020','e3400000-0000-4000-8000-000000000010','Synthetic private journal','An isolated journal entry with sufficient context for the validation checks.','PRIVATE-FIXTURE-NOTE',98765);
select set_config('test.photo',(public.reserve_car_photo('e3400000-0000-4000-8000-000000000010','Fixture','A synthetic JPEG photo',true)).id::text,true);
select set_config('test.garage',public.publish_garage_vehicle('e3400000-0000-4000-8000-000000000010','A synthetic public car','A deliberate public story that contains no private maintenance information.')::text,true);
select public.publish_journal_entry('e3400000-0000-4000-8000-000000000020',1);
select pg_temp.assert_true(not exists(select 1 from public.garage_journal_entries where to_jsonb(garage_journal_entries)::text like '%PRIVATE-FIXTURE%' or to_jsonb(garage_journal_entries)::text like '%98765%'),'journal snapshot excludes private notes and cost');
reset role;
select public.complete_car_photo('e3400000-0000-4000-8000-000000000001',current_setting('test.photo')::uuid,4,3,631,repeat('a',64));
insert into storage.objects(bucket_id,name) select 'e34-car-photos',object_path from public.owner_car_photos where id=current_setting('test.photo')::uuid;
set local role authenticated;
select set_config('test.public_photo',public.publish_car_photo(current_setting('test.photo')::uuid,current_setting('test.garage')::uuid)::text,true);
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',true);
select pg_temp.assert_true(not exists(select 1 from public.owned_vehicles),'cross-owner garage privacy');
select pg_temp.assert_true(not exists(select 1 from public.service_records),'cross-owner maintenance privacy');
select pg_temp.assert_true(not exists(select 1 from public.owner_journal_entries),'cross-owner private journal privacy');
select pg_temp.assert_true(not exists(select 1 from storage.objects),'unapproved photo cannot be fetched by another member');
do $$begin
 begin perform public.reserve_car_photo('e3400000-0000-4000-8000-000000000010','','A foreign car photo',true);raise exception 'FAIL: foreign car reservation';exception when raise_exception then if sqlerrm='FAIL: foreign car reservation' then raise;end if;end;
 begin perform public.security_session_active('e3400000-0000-4000-8000-000000000001','e3400000-0000-4000-9000-000000000001');raise exception 'FAIL: member session oracle';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.assert_true(not exists(select 1 from storage.objects),'pending public photo denied to anonymous visitor');
do $$begin begin perform public.security_status();raise exception 'FAIL: anonymous security inventory';exception when insufficient_privilege then null;end;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000003","session_id":"e3400000-0000-4000-9000-000000000003","aal":"aal2","role":"authenticated"}',true);
set local role authenticated;
select public.review_car_photo(current_setting('test.public_photo')::uuid,'approved','Synthetic photo approval for isolated access testing.');
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.assert_true((select count(*) from storage.objects)=1,'approved photo readable through Storage RLS');
reset role;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
set local role authenticated;
select public.withdraw_car_photo(current_setting('test.public_photo')::uuid);
select public.withdraw_journal_entry('e3400000-0000-4000-8000-000000000020');
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.assert_true(not exists(select 1 from storage.objects),'withdrawal revokes underlying photo reads');
select pg_temp.assert_true(not exists(select 1 from public.garage_journal_entries),'journal withdrawal removes public snapshot');
reset role;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
-- Mimic invalid-image cleanup as the processor while preserving rate-attempt rows.
do $$declare p uuid; n int;begin
 for n in 1..23 loop p:=(public.reserve_car_photo('e3400000-0000-4000-8000-000000000010','','A bounded JPEG attempt',true)).id;delete from public.owner_car_photos where id=p;end loop;
 begin perform public.reserve_car_photo('e3400000-0000-4000-8000-000000000010','','One over the limit',true);raise exception 'FAIL: image quota bypass';exception when raise_exception then if sqlerrm not like 'Upload limit reached%' then raise;end if;end;
end$$;
-- Minimal clearly synthetic graph/job: no claim of technical catalog accuracy.
insert into public.digital_twin_vehicles(id,model_id,name) values('security-fixture','525i','Synthetic security graph');
insert into public.digital_twin_configurations(id,vehicle_id,name,engine_family) values('security-fixture','security-fixture','Synthetic security graph','M50');
insert into public.digital_twin_configuration_revisions(id,configuration_id,revision,graph_id,graph) values('security-fixture','security-fixture','fixture','security-fixture','{}');
insert into public.reconstruction_jobs(id,user_id,configuration_revision_id,method,notes,part_id) values('e3400000-0000-4000-8000-000000000030','e3400000-0000-4000-8000-000000000001','security-fixture','multiview','Synthetic upload quota fixture','coolant-pump');
set local role authenticated;
do $$declare path text; n int;begin
 begin insert into storage.objects(bucket_id,name) values('e34-twin-submissions','e3400000-0000-4000-8000-000000000001/no-owned-job/file.glb');raise exception 'FAIL: orphan upload accepted';exception when insufficient_privilege then null;end;
 for n in 1..5 loop
  path:='e3400000-0000-4000-8000-000000000001/e3400000-0000-4000-8000-000000000030/'||gen_random_uuid()::text||'.glb';
  insert into storage.objects(bucket_id,name) values('e34-twin-submissions',path);
  delete from storage.objects where bucket_id='e34-twin-submissions' and name=path;
 end loop;
 begin insert into storage.objects(bucket_id,name) values('e34-twin-submissions','e3400000-0000-4000-8000-000000000001/e3400000-0000-4000-8000-000000000030/'||gen_random_uuid()::text||'.glb');raise exception 'FAIL: deleting files resets upload rate';exception when insufficient_privilege then null;end;
end$$;
reset role;
insert into storage.objects(bucket_id,name) select 'e34-twin-submissions','e3400000-0000-4000-8000-000000000001/e3400000-0000-4000-8000-000000000030/'||gen_random_uuid()::text||'.glb' from generate_series(1,10);
update e34_private.twin_upload_attempts set created_at=now()-interval '2 hours';
set local role authenticated;
do $$begin begin insert into storage.objects(bucket_id,name) values('e34-twin-submissions','e3400000-0000-4000-8000-000000000001/e3400000-0000-4000-8000-000000000030/'||gen_random_uuid()::text||'.glb');raise exception 'FAIL: retained storage quota bypass';exception when insufficient_privilege then null;end;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000006","is_anonymous":true,"role":"authenticated"}',true);
set local role authenticated;
do $$begin begin insert into storage.objects(bucket_id,name) values('e34-twin-submissions','e3400000-0000-4000-8000-000000000006/e3400000-0000-4000-8000-000000000030/'||gen_random_uuid()::text||'.glb');raise exception 'FAIL: guest upload';exception when insufficient_privilege then null;end;end$$;
reset role;
-- Source metadata cannot evade limits by deleting each accepted job.
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$declare job uuid; n int;begin
 begin insert into public.reconstruction_jobs(user_id,part_id,method,required_views) values(auth.uid(),'coolant-pump','multiview','{}');raise exception 'FAIL: malformed model metadata';exception when check_violation then null;end;
 for n in 1..10 loop
  insert into public.reconstruction_jobs(user_id,part_id,method,notes) values(auth.uid(),'coolant-pump','multiview','Synthetic metadata rate fixture') returning id into job;
  delete from public.reconstruction_jobs where id=job;
 end loop;
 begin insert into public.reconstruction_jobs(user_id,part_id,method) values(auth.uid(),'coolant-pump','multiview');raise exception 'FAIL: job rate reset by deletion';exception when program_limit_exceeded then null;end;
end$$;
do $$declare evidence uuid; n int;begin
 for n in 1..30 loop
  insert into public.reconstruction_evidence(job_id,user_id,source_url,description,rights_evidence) values('e3400000-0000-4000-8000-000000000030',auth.uid(),'https://example.invalid/security-fixture','Synthetic source evidence','Permission text for a synthetic test fixture') returning id into evidence;
  delete from public.reconstruction_evidence where id=evidence;
 end loop;
 begin insert into public.reconstruction_evidence(job_id,user_id,source_url,description,rights_evidence) values('e3400000-0000-4000-8000-000000000030',auth.uid(),'https://example.invalid/security-fixture','Synthetic source evidence','Permission text for a synthetic test fixture');raise exception 'FAIL: evidence rate reset by deletion';exception when program_limit_exceeded then null;end;
end$$;
reset role;
-- No arbitrary analytics rows or counter overflow; anonymous callers see no reports.
select set_config('request.jwt.claims','{}',true);
set local role anon;
select public.record_usage('private?email=fixture@example.invalid');
select public.record_usage(null);
do $$begin begin perform 1 from e34_private.usage_daily;raise exception 'FAIL: public analytics reports';exception when insufficient_privilege then null;end;end$$;
reset role;
select pg_temp.assert_true(not exists(select 1 from e34_private.usage_daily),'invalid analytics event did not create rows');
set local role anon;
select public.record_usage('e30:scanner_result');
select public.record_usage('e34:explode');
select public.record_usage('e34:scan-photo-id');
reset role;
select pg_temp.assert_true((select count(*)=2 and sum(opens)=2 from e34_private.usage_daily),'only supported series and public action categories are counted');
insert into e34_private.usage_daily values((statement_timestamp() at time zone 'UTC')::date,'home',1000000);
select public.record_usage('home');
select pg_temp.assert_true((select opens from e34_private.usage_daily where area='home')=1000000,'daily analytics saturates without growth');
select 'PASS: staff MFA/live session, role boundaries, private garages/journals, photo publication/withdrawal, upload rate/quota, analytics grants and bounds' as verification;
rollback;
