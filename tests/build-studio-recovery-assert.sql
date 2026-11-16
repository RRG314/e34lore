-- Run against the restored disposable database, not the source cluster.
create function pg_temp.build_restore_check(ok boolean,label text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL build restore: %',label;end if;end$$;
select set_config('request.jwt.claims','{"sub":"e34c0000-0000-4000-8000-000000000001","session_id":"e34c0000-0000-4000-9000-000000000001","aal":"aal1","role":"authenticated"}',false);
set role authenticated;
select id as recovery_project from public.build_projects where user_id='e34c0000-0000-4000-8000-000000000001'\gset
select pg_temp.build_restore_check((select version=2 and state->>'privateNotes'='RECOVERY_PRIVATE_BUILD_NOTE'and state->'appearance'->'paint'->>'color'='#885544'and state->'reference'->>'id'='e34-525i-sedan-automatic'from public.build_projects where id=:'recovery_project'),'private configuration and immutable reference survived restore');
select pg_temp.build_restore_check((select count(*)=2 from public.build_project_revisions where project_id=:'recovery_project'),'all private revisions restored');
select pg_temp.build_restore_check((select count(*)=1 from public.owner_car_photos where build_project_id=:'recovery_project'),'private image ownership restored');
select pg_temp.build_restore_check((select snapshot->'appearance'->'paint'->>'color'='#234536'and snapshot::text not like '%RECOVERY_PRIVATE%'from public.build_publications where owner_id='e34c0000-0000-4000-8000-000000000001'),'public snapshot remains distinct from later private edit after restore');
select public.unpublish_build(:'recovery_project');
reset role;select set_config('request.jwt.claims','{"role":"anon"}',false);set role anon;
select pg_temp.build_restore_check(not exists(select 1 from public.build_publications where owner_id='e34c0000-0000-4000-8000-000000000001'),'restored publication revokes normally');
reset role;
select 'PASS restored build state, private revisions, public snapshot isolation, model pins, image ownership and revocation' as result;
