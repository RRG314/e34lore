-- Run only inside the disposable local database. No real member content is inserted.
begin;
create function pg_temp.photo_check(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
insert into auth.users(id,email,email_confirmed_at,created_at,is_anonymous) values
 ('e34f0000-0000-4000-8000-000000000001','scan-photo-owner@example.invalid',now(),now()-interval '3 days',false),
 ('e34f0000-0000-4000-8000-000000000002','scan-photo-other@example.invalid',now(),now()-interval '3 days',false),
 ('e34f0000-0000-4000-8000-000000000003','scan-photo-staff@example.invalid',now(),now()-interval '3 days',false),
 ('e34f0000-0000-4000-8000-000000000004',null,null,now(),true);
insert into auth.sessions(id,user_id,aal) select ('e34f0000-0000-4000-9000-'||lpad(n::text,12,'0'))::uuid,('e34f0000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,case when n=3 then 'aal2'else 'aal1'end from generate_series(1,4)n;
insert into auth.mfa_factors(user_id,status) values('e34f0000-0000-4000-8000-000000000003','verified');
insert into e34_private.staff_roles(user_id,role)values('e34f0000-0000-4000-8000-000000000003','moderator');
select set_config('request.jwt.claims','{"sub":"e34f0000-0000-4000-8000-000000000001","session_id":"e34f0000-0000-4000-9000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
insert into public.component_observations(id,part_id,status,mode)values('e34f0000-0000-4000-a000-000000000001','coolant-pump','owner_confirmed','loose');
select id as private_photo from public.reserve_observation_photo('e34f0000-0000-4000-a000-000000000001','private-view',false,'','front') \gset
select id as shared_photo from public.reserve_observation_photo('e34f0000-0000-4000-a000-000000000001','shared-view',true,'part-reference-v1','side') \gset
select pg_temp.photo_check((select part_id='coolant-pump'and not reuse_opt_in and review_status='private'from public.observation_photos where id=:'private_photo'),'private by default, canonical part copied from saved observation');
do $$begin begin update public.observation_photos set review_status='approved';raise exception 'FAIL: client changed approval';exception when insufficient_privilege then null;end;end$$;
do $$begin begin perform public.reserve_observation_photo('e34f0000-0000-4000-a000-000000000001','bad-consent',true,'invented','front');raise exception 'FAIL: bad consent accepted';exception when others then if sqlerrm like 'FAIL:%'then raise;end if;end;end$$;
savepoint stale_retry;
select id as stale_photo from public.reserve_observation_photo('e34f0000-0000-4000-a000-000000000001','stale-view',true,'part-reference-v1','front') \gset
select public.withdraw_observation_photo(:'stale_photo');
reset role;
update public.observation_photos set created_at=now()-interval '6 minutes'where id=:'stale_photo';
set local role authenticated;
select id as replacement_photo from public.reserve_observation_photo('e34f0000-0000-4000-a000-000000000001','stale-view',true,'part-reference-v1','front') \gset
select pg_temp.photo_check(:'replacement_photo'<>:'stale_photo','expired upload gets a new safe object path');
select pg_temp.photo_check((select not reuse_opt_in from public.observation_photos where id=:'replacement_photo'),'expired withdrawn upload never restores sharing permission');
rollback to savepoint stale_retry;
reset role;
set local role service_role;
select public.complete_observation_photo('e34f0000-0000-4000-8000-000000000001',:'private_photo',300,300,5000,repeat('a',64));
select public.complete_observation_photo('e34f0000-0000-4000-8000-000000000001',:'shared_photo',300,300,5000,repeat('b',64));
reset role;
select set_config('request.jwt.claims','{"sub":"e34f0000-0000-4000-8000-000000000002","session_id":"e34f0000-0000-4000-9000-000000000002","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select pg_temp.photo_check(not exists(select 1 from public.observation_photos),'another owner cannot read private or pending photos');
select pg_temp.photo_check(not e34_private.can_read_car_photo('e34f0000-0000-4000-8000-000000000001/'||:'shared_photo'||'.jpg'),'pending bytes inaccessible to another owner');
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
select pg_temp.photo_check(not exists(select 1 from public.approved_part_photos('11517527799')),'pending and private photos excluded from public references');
reset role;
select set_config('request.jwt.claims','{"sub":"e34f0000-0000-4000-8000-000000000003","session_id":"e34f0000-0000-4000-9000-000000000003","role":"authenticated","aal":"aal2"}',true);set local role authenticated;
select pg_temp.photo_check(not exists(select 1 from public.observation_photos where id=:'private_photo'),'moderator cannot read unshared owner photos');
select pg_temp.photo_check(not e34_private.can_read_car_photo('e34f0000-0000-4000-8000-000000000001/'||:'private_photo'||'.jpg'),'moderator cannot download unshared photo bytes');
select pg_temp.photo_check(exists(select 1 from public.scanner_photo_review_queue()where id=:'shared_photo'),'MFA moderator can review pending contributed photos');
select public.review_observation_photo(:'shared_photo','approved','Disposable test: correct source number and clear photo without personal information.');
select pg_temp.photo_check(exists(select 1 from public.scanner_photo_dataset()where id=:'shared_photo'),'only approved opted-in photo enters future reference dataset');
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
select pg_temp.photo_check(e34_private.can_read_car_photo('e34f0000-0000-4000-8000-000000000001/'||:'shared_photo'||'.jpg'),'approved opted-in bytes can be read publicly');
select pg_temp.photo_check(not e34_private.can_read_car_photo('e34f0000-0000-4000-8000-000000000001/'||:'private_photo'||'.jpg'),'unshared photo remains private');
reset role;
select set_config('request.jwt.claims','{"sub":"e34f0000-0000-4000-8000-000000000001","session_id":"e34f0000-0000-4000-9000-000000000001","role":"authenticated","aal":"aal1"}',true);set local role authenticated;
select public.withdraw_observation_photo(:'shared_photo');
select pg_temp.photo_check((select id=:'shared_photo'from public.reserve_observation_photo('e34f0000-0000-4000-a000-000000000001','shared-view',true,'part-reference-v1','side')),'withdrawn ready photo remains retryable without republishing');
select pg_temp.photo_check((select not reuse_opt_in and review_status='withdrawn'from public.observation_photos where id=:'shared_photo'),'owner can withdraw reuse permission');
reset role;
select set_config('request.jwt.claims','{"sub":"e34f0000-0000-4000-8000-000000000003","session_id":"e34f0000-0000-4000-9000-000000000003","role":"authenticated","aal":"aal2"}',true);set local role authenticated;
select pg_temp.photo_check(not exists(select 1 from public.observation_photos where id=:'shared_photo'),'moderator cannot read withdrawn reference');
select pg_temp.photo_check(not exists(select 1 from public.scanner_photo_dataset()where id=:'shared_photo'),'withdrawn photo leaves the future dataset');
reset role;
select set_config('request.jwt.claims','{"sub":"e34f0000-0000-4000-8000-000000000001","session_id":"e34f0000-0000-4000-9000-000000000001","role":"authenticated","aal":"aal1"}',true);
delete from auth.sessions where user_id='e34f0000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.photo_check(not exists(select 1 from public.observation_photos),'revoked session cannot read owner photos');
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
select pg_temp.photo_check(not e34_private.can_read_car_photo('e34f0000-0000-4000-8000-000000000001/'||:'shared_photo'||'.jpg'),'withdrawal immediately removes public byte access');
reset role;
set local role service_role;
select public.queue_observation_photo_cleanup('e34f0000-0000-4000-8000-000000000002','e34f0000-0000-4000-b000-000000000099');
reset role;
select pg_temp.photo_check(exists(select 1 from e34_private.media_cleanup_queue where user_id='e34f0000-0000-4000-8000-000000000002'),'service role can queue cleanup after metadata disappeared');
delete from public.component_observations where id='e34f0000-0000-4000-a000-000000000001';
select pg_temp.photo_check(not exists(select 1 from public.observation_photos where user_id='e34f0000-0000-4000-8000-000000000001'),'observation deletion cascades photo metadata');
select pg_temp.photo_check((select count(*)=2 from e34_private.media_cleanup_queue where user_id='e34f0000-0000-4000-8000-000000000001'),'deletion queues both private files for cleanup');
rollback;
select 'PASS: scanner photo consent, ownership, active sessions, MFA review, approved dataset, withdrawal and deletion cleanup' as verification;
