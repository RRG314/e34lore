-- Only run against the disposable review database.
begin;
create function pg_temp.vin_check(ok boolean) returns void language plpgsql
as $$begin if ok is distinct from true then raise exception 'VIN registry isolation failed'; end if; end$$;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('e34f0000-0000-4000-8000-000000000011','vin-test-owner@example.invalid',now(),false),
 ('e34f0000-0000-4000-8000-000000000012','vin-test-other@example.invalid',now(),false);
insert into auth.sessions(id,user_id,aal) values
 ('e34f0000-0000-4000-9000-000000000011','e34f0000-0000-4000-8000-000000000011','aal1'),
 ('e34f0000-0000-4000-9000-000000000012','e34f0000-0000-4000-8000-000000000012','aal1');
insert into public.owned_vehicles(id,user_id,nickname,model_id) values
 ('e34f0000-0000-4000-a000-000000000011','e34f0000-0000-4000-8000-000000000011','VIN test one','525i'),
 ('e34f0000-0000-4000-a000-000000000012','e34f0000-0000-4000-8000-000000000012','VIN test two','525i');

select set_config('request.jwt.claims','{"sub":"e34f0000-0000-4000-8000-000000000011","session_id":"e34f0000-0000-4000-9000-000000000011","role":"authenticated"}',true);
set local role authenticated;
insert into public.vehicle_vins(vehicle_id,vin) values
 ('e34f0000-0000-4000-a000-000000000011','WBAHD6321SG000001');
select pg_temp.vin_check((select count(*) from public.vehicle_vins)=1);
do $$begin
  begin
    insert into public.vehicle_vins(vehicle_id,vin) values
     ('e34f0000-0000-4000-a000-000000000012','WBAHD6321SG000002');
    raise exception 'Saved against another member’s car';
  exception when foreign_key_violation then null;
  end;
end$$;
reset role;

select set_config('request.jwt.claims','{"sub":"e34f0000-0000-4000-8000-000000000012","session_id":"e34f0000-0000-4000-9000-000000000012","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.vin_check(not exists(select 1 from public.vehicle_vins));
insert into public.vehicle_vins(vehicle_id,vin) values
 ('e34f0000-0000-4000-a000-000000000012','WBAHD6321SG000001');
select pg_temp.vin_check((select count(*) from public.vehicle_vins)=1);
reset role;
delete from auth.sessions where id='e34f0000-0000-4000-9000-000000000012';
set local role authenticated;
select pg_temp.vin_check(not exists(select 1 from public.vehicle_vins));
reset role;
select pg_temp.vin_check(not has_table_privilege('anon','public.vehicle_vins','SELECT'));
delete from public.owned_vehicles where id='e34f0000-0000-4000-a000-000000000011';
select pg_temp.vin_check(not exists(select 1 from public.vehicle_vins where vehicle_id='e34f0000-0000-4000-a000-000000000011'));
rollback;
select 'PASS: private VIN registry, owner and session isolation, and vehicle deletion';
