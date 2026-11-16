-- Source data integrity and client isolation; no fixtures survive this transaction.
begin;
insert into auth.users(id,email,aud,role,created_at,updated_at) values('ed340000-0000-4000-8000-000000000041','e34-catalog-test@example.invalid','authenticated','authenticated',now(),now());
update auth.users set email_confirmed_at=now(),created_at=now()-interval '2 days'
where id='ed340000-0000-4000-8000-000000000041';
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000041","role":"authenticated"}',true);
set local role authenticated;
do $$
declare p public.part_assembly_positions; mismatched text;
begin
 select * into strict p from public.part_assembly_positions where id='catalog-assembly-c6f5a6e8f6fa71b37edf3bd4-c88a586d245352d2651bb45a' and active;
 if not exists(select 1 from public.catalog_find_parts((select number_normalized from public.parts where id=p.part_id),p.context_id,3)) then raise exception 'Catalog lookup is unavailable to members'; end if;
 insert into public.bookmarks(kind,target_id,title) values('part',p.part_id,'Imported catalog part');
 insert into public.threads(title,body,category,part_id,catalog_position_id) values('Catalog relationship fixture','Ordering information retained with its exact source drawing position.','Parts & fitment',p.part_id,p.id);
 insert into public.owned_vehicles(id,nickname,model_id) values('ed340000-0000-4000-8000-000000000042','Catalog installation fixture','525i');
 insert into public.installed_parts(vehicle_id,part_id,description,number_raw) values('ed340000-0000-4000-8000-000000000042',p.part_id,p.source_name,(select number_normalized from public.parts where id=p.part_id));
 if (select count(*) <> count(distinct part_id) from public.catalog_search_parts('hex bolt',20)) then raise exception 'Identity search duplicates ordering positions';end if;
 select id into strict mismatched from public.parts where id<>p.part_id limit 1;
 begin
  insert into public.threads(title,body,category,part_id,catalog_position_id) values('Mismatched catalog fixture','This invalid relationship must be rejected by the database.','Parts & fitment',mismatched,p.id);
  raise exception 'Mismatched position/part pair accepted';
 exception when foreign_key_violation then null;end;
 begin
  update public.part_assembly_positions set source_name='Unauthorized change' where id=p.id;
  raise exception 'Member could change source ordering facts';
 exception when insufficient_privilege then null;end;
 begin
  update public.parts set name='Unauthorized identity change' where id=p.part_id;
  raise exception 'Member could change canonical identity';
 exception when insufficient_privilege then null;end;
 if exists(select number_normalized from public.parts where number_normalized is not null group by number_normalized having count(*)>1) then raise exception 'Canonical BMW numbers were duplicated';end if;
end $$;
reset role;
set local role anon;
do $$begin
 if not exists(select 1 from public.catalog_inventory where position_count>=10000) then raise exception 'Anonymous reference reading failed';end if;
 if not exists(select 1 from public.catalog_find_parts('31331139452',null,3)) then raise exception 'Anonymous OEM lookup failed';end if;
 if not exists(select 1 from public.part_interchanges where source_part_id='bmw-07129900681'
   and target_part_id='pump-nut' and relationship='conditional'
   and source_position_id='catalog-assembly-c6f5a6e8f6fa71b37edf3bd4-c88a586d245352d2651bb45a') then
   raise exception 'Source-scoped interchange is missing';
 end if;
 if exists(select 1 from public.part_interchanges where source_part_id='pump-nut' and target_part_id='bmw-07129900681') then
   raise exception 'Unexpected reverse interchange';
 end if;
 begin
  update public.part_interchanges set relationship='identical' where source_part_id='bmw-07129900681';
  raise exception 'Anonymous interchange alteration accepted';
 exception when insufficient_privilege then null; end;
 begin
  update public.technical_drawings set credit='Unauthorized';
  raise exception 'Anonymous drawing alteration accepted';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: owned catalog lookup, canonical uniqueness, source-part composite integrity, bookmarks, discussion linkage and client write isolation' as verification;
rollback;
