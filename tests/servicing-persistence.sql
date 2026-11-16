-- Isolated fixtures only: same private journal table and existing RLS, no new schema.
begin;
create function pg_temp.servicing_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
insert into auth.users(id,email,email_confirmed_at,created_at) values
 ('e3490000-0000-4000-8000-000000000001','servicing-fixture-1@example.invalid',now(),now()-interval '3 days'),
 ('e3490000-0000-4000-8000-000000000002','servicing-fixture-2@example.invalid',now(),now()-interval '3 days');
insert into public.owned_vehicles(id,user_id,nickname,model_id) values
 ('e3490000-0000-4000-9000-000000000001','e3490000-0000-4000-8000-000000000001','Disposable SQL fixture','525i'),
 ('e3490000-0000-4000-9000-000000000002','e3490000-0000-4000-8000-000000000002','Other disposable SQL fixture','525i');
select set_config('request.jwt.claims','{"sub":"e3490000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
insert into public.owner_journal_entries(id,user_id,vehicle_id,title,body,stage,cost,currency,guide_id,guide_revision,guide_step) values
 ('e3490000-0000-4000-a000-000000000001','e3490000-0000-4000-8000-000000000001','e3490000-0000-4000-9000-000000000001','Plan: coolant pump','Budget values are my estimates. Guide revision and entered values are retained, not a completed repair.','planned',120.01,'USD','m50-water-pump-job-planning','5c458d5b100cc7b4c5c2b469',1);
select pg_temp.servicing_assert((select cost=120.01 and stage='planned' and guide_revision='5c458d5b100cc7b4c5c2b469' from public.owner_journal_entries where id='e3490000-0000-4000-a000-000000000001'),'owner can save the exact-revision planning snapshot');
select pg_temp.servicing_assert(not exists(select 1 from public.garage_journal_entries where user_id='e3490000-0000-4000-8000-000000000001'),'private plan is not auto-published');
select set_config('request.jwt.claims','{"sub":"e3490000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
select pg_temp.servicing_assert(not exists(select 1 from public.owner_journal_entries where id='e3490000-0000-4000-a000-000000000001'),'second account cannot read the private snapshot');
do $$begin
 begin insert into public.owner_journal_entries(user_id,vehicle_id,title,body,stage)values('e3490000-0000-4000-8000-000000000001','e3490000-0000-4000-9000-000000000001','Forged plan','This must not be written into another owner journal.','planned');raise exception 'FAIL: impersonated journal write';exception when insufficient_privilege then null;end;
 begin insert into public.owner_journal_entries(user_id,vehicle_id,title,body,stage)values('e3490000-0000-4000-8000-000000000002','e3490000-0000-4000-9000-000000000001','Wrong car','This must not be written for a car belonging to another owner.','planned');raise exception 'FAIL: cross-car journal write';exception when foreign_key_violation or insufficient_privilege then null;end;
end$$;
reset role;
delete from auth.users where id='e3490000-0000-4000-8000-000000000001';
select pg_temp.servicing_assert(not exists(select 1 from public.owner_journal_entries where id='e3490000-0000-4000-a000-000000000001'),'account deletion removes private planning snapshots');
rollback;
