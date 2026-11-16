-- Synthetic rows in the disposable cluster only; retained IDs/hashes exercise
-- the complete migration set without manufacturing hosted catalog/member data.
begin;
create function pg_temp.quarantine_check(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL quarantine: %',message;end if;end $$;
select pg_temp.quarantine_check((select count(*)=2712 from e34_private.catalog_position_quarantine),'complete reviewed registry');
insert into public.sources(id,title,publisher,url,rights,coverage,review_status) values('quarantine-fixture','Local quarantine fixture','Disposable test','https://www.bmwpartsdeal.com/','Test fixture only','{}','catalog-observed');
insert into public.vehicle_catalog_contexts(id,name,model_id,model_year,source_index_url,expected_pages,scope)
select distinct context_id,'Local quarantine fixture','525i',1995,'https://www.bmwpartsdeal.com/',0,'Synthetic test scope' from e34_private.catalog_position_quarantine on conflict(id)do nothing;
insert into public.assemblies(id,title,source_id,source_locator,boundary,catalog_context_id,source_category,catalog_status)
select distinct regexp_replace(position_id,'-[a-f0-9]{24}$',''),'Local fixture','quarantine-fixture',source_url,'Synthetic test scope',context_id,'Fixture','source-listed' from e34_private.catalog_position_quarantine on conflict(id)do nothing;
alter table public.part_assembly_positions disable trigger guard_catalog_position_quarantine;
insert into public.part_assembly_positions(id,assembly_id,part_id,context_id,reference,source_name,required_quantity,conditions,source_url,source_sha256,record_sha256,active)
select position_id,regexp_replace(position_id,'-[a-f0-9]{24}$',''),'coolant-pump',context_id,'01','Synthetic applicability child',1,'[]',source_url,expected_source_sha256,expected_record_sha256,true from e34_private.catalog_position_quarantine;
alter table public.part_assembly_positions enable trigger guard_catalog_position_quarantine;
create temporary table before_quarantine as select p.id,to_jsonb(p) as snapshot from public.part_assembly_positions p join e34_private.catalog_position_quarantine q on q.position_id=p.id;
insert into public.part_supersessions(id,previous_part_id,replacement_part_id,position_id,source_id,conditions)
select 'quarantine-fixture-'||row_number()over(),'coolant-pump','pump-seal',position_id,'quarantine-fixture','[]' from e34_private.catalog_position_quarantine order by position_id limit 381;
select pg_temp.quarantine_check(e34_private.reconcile_catalog_position_quarantine(true)=2712,'deactivate exactly the reviewed rows');
select pg_temp.quarantine_check(not exists(select 1 from before_quarantine b join public.part_assembly_positions p on p.id=b.id where (b.snapshot-'active')<>(to_jsonb(p)-'active')),'all original fields/timestamps retained');
select pg_temp.quarantine_check(not exists(select 1 from before_quarantine b join e34_private.catalog_position_quarantine q on q.position_id=b.id where q.original_position<>b.snapshot),'exact original snapshots retained');
select pg_temp.quarantine_check((select count(*)=381 from public.part_supersessions where id like 'quarantine-fixture-%'),'supersession history retained');
select pg_temp.quarantine_check(e34_private.reconcile_catalog_position_quarantine(true)=0,'repeat reconciliation is idempotent');
update public.part_assembly_positions set active=true where id in(select position_id from e34_private.catalog_position_quarantine);
select pg_temp.quarantine_check(not exists(select 1 from public.part_assembly_positions p join e34_private.catalog_position_quarantine q on q.position_id=p.id where p.active),'upsert/update cannot reactivate reviewed children');
do $$begin
 begin update public.part_assembly_positions set source_sha256=repeat('a',64),active=true where id=(select min(position_id)from e34_private.catalog_position_quarantine);raise exception 'FAIL changed evidence accepted';exception when check_violation then null;end;
end $$;
-- Remove one fixture to verify the complete-set check aborts before mutation.
delete from public.part_supersessions where position_id=(select min(position_id)from e34_private.catalog_position_quarantine);
delete from e34_private.catalog_position_history where position_id=(select min(position_id)from e34_private.catalog_position_quarantine);
delete from public.part_assembly_positions where id=(select min(position_id)from e34_private.catalog_position_quarantine);
do $$begin
 begin perform e34_private.reconcile_catalog_position_quarantine(true);raise exception 'FAIL missing evidence accepted';exception when raise_exception then if sqlerrm='FAIL missing evidence accepted' then raise;end if;end;
end $$;
set local role anon;
do $$begin
 begin perform * from e34_private.catalog_position_quarantine;raise exception 'FAIL public quarantine access';exception when insufficient_privilege then null;end;
 begin perform e34_private.reconcile_catalog_position_quarantine(true);raise exception 'FAIL public reconciliation access';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS full quarantine rules, exact snapshots, idempotency, reactivation prevention, drift/missing failure and private access boundary' as result;
