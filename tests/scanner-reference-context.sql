-- Synthetic source/owner fixtures only. No hosted or retained member records.
begin;
create function pg_temp.context_assert(ok boolean,label text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL scan context: %',label;end if;end$$;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('c3500000-0000-4000-8000-000000000001','context-one@example.invalid',now(),false),
 ('c3500000-0000-4000-8000-000000000002','context-two@example.invalid',now(),false);
insert into public.vehicle_catalog_contexts(id,name,model_id,model_year,source_index_url,expected_pages,scope)
 values('fixture-scan-context','Synthetic scan context','525i',1995,'https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/',1,'Isolated source-identity fixture only');
insert into public.part_assembly_positions(id,assembly_id,part_id,context_id,reference,source_name,source_url,source_sha256,record_sha256)
 values('fixture-scan-position','water-pump','coolant-pump','fixture-scan-context','01','Synthetic source occurrence','https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/',repeat('1',64),repeat('2',64));
select set_config('request.jwt.claims','{"sub":"c3500000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
insert into public.component_observations(id,mode,part_id,status,catalog_position_id,reference_id,model_revision,model_manifest_sha256,notes)
 values('c3500000-0000-4000-8000-000000000011','loose','coolant-pump','owner_confirmed','fixture-scan-position','e34-525i-sedan-automatic',23,repeat('3',64),'Synthetic workflow context fixture');
select pg_temp.context_assert((select catalog_position_id='fixture-scan-position' and model_revision=23 from public.component_observations where id='c3500000-0000-4000-8000-000000000011'),'exact source and reference revision preserved');
insert into public.component_observations(mode,status,notes)values('loose','candidate','Legacy record without reference context remains valid');
do $$begin
 begin insert into public.component_observations(mode,part_id,status,catalog_position_id)values('loose','pump-seal','owner_confirmed','fixture-scan-position');raise exception 'FAIL wrong-part source accepted';exception when foreign_key_violation then null;end;
 begin insert into public.component_observations(mode,status,catalog_position_id)values('loose','candidate','fixture-scan-position');raise exception 'FAIL source without part accepted';exception when check_violation then null;end;
 begin insert into public.component_observations(mode,status,reference_id)values('loose','candidate','e34-525i-sedan-automatic');raise exception 'FAIL incomplete model receipt accepted';exception when check_violation then null;end;
 begin insert into public.component_observations(mode,status,reference_id,model_revision,model_manifest_sha256)values('loose','candidate','https://example.invalid',23,repeat('3',64));raise exception 'FAIL URL used as model identity';exception when check_violation then null;end;
end$$;
select pg_temp.context_assert(not has_table_privilege('authenticated','public.component_observations','UPDATE'),'saved evidence remains append-only');
select set_config('request.jwt.claims','{"sub":"c3500000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.context_assert((select count(*)=0 from public.component_observations where id='c3500000-0000-4000-8000-000000000011'),'another owner cannot read the saved context');
reset role;
update public.part_assembly_positions set active=false where id='fixture-scan-position';
select pg_temp.context_assert((select catalog_position_id='fixture-scan-position' from public.component_observations where id='c3500000-0000-4000-8000-000000000011'),'archiving a source does not detach saved evidence');
do $$begin begin delete from public.part_assembly_positions where id='fixture-scan-position';raise exception 'FAIL source deletion detached saved evidence';exception when foreign_key_violation then null;end;end$$;
rollback;
