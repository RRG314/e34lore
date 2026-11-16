-- Synthetic fixtures for cross-series ownership, references and source scope.
begin;
create function pg_temp.series_assert(ok boolean, message text) returns void
language plpgsql as $$begin if ok is distinct from true then raise exception '%', message; end if; end$$;

insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
  ('b3040000-0000-4000-8000-000000000001','series-owner@example.invalid',now(),false),
  ('b3040000-0000-4000-8000-000000000002','series-other@example.invalid',now(),false);
select set_config('request.jwt.claims','{"sub":"b3040000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
insert into public.owned_vehicles(id,nickname,model_id,configuration,acquired_year) values
  ('b3040000-0000-4000-a000-000000000001','E34 fixture','525i','{"model":"525i","year":"1995"}',1995),
  ('b3040000-0000-4000-a000-000000000002','E30 fixture','e30-325i','{"model":"325i","year":"1989"}',1989);
select pg_temp.series_assert((select count(*)=2 from public.owned_vehicles where nickname like 'E% fixture'),'Both cars should be in the same garage');
select pg_temp.series_assert((select configuration->>'model'='325i' from public.save_vehicle_configuration(
  'b3040000-0000-4000-a000-000000000002',0,'{}')),'The E30 configuration must keep its own model and year');

insert into public.component_observations(id,vehicle_id,mode,status,series) values
  ('b3040000-0000-4000-9000-000000000001','b3040000-0000-4000-a000-000000000002','loose','candidate','e30');
do $$
begin
  begin
    insert into public.component_observations(vehicle_id,mode,status,series)
    values('b3040000-0000-4000-a000-000000000002','loose','candidate','e34');
    raise exception 'A scan crossed series';
  exception when raise_exception then
    if sqlerrm <> 'Choose a garage car from the same series' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claims','{"sub":"b3040000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.series_assert((select count(*)=0 from public.owned_vehicles where nickname like 'E% fixture'),'Another member cannot see either car');
select pg_temp.series_assert((select count(*)=0 from public.component_observations where id='b3040000-0000-4000-9000-000000000001'),'Another member cannot see the saved scan');


reset role;
insert into public.vehicle_catalog_contexts(id,name,model_id,model_year,source_index_url,expected_pages,scope) values
  ('series-test-coupe','Fixture 325i Coupe','e30-325i',1990,'https://www.bmwpartsdeal.com/test-coupe',1,'Test fixture'),
  ('series-test-m3','Fixture M3 Coupe','e30-m3',1991,'https://www.bmwpartsdeal.com/test-m3',1,'Test fixture'),
  ('series-test-e34','Fixture 525i Sedan','525i',1995,'https://www.bmwpartsdeal.com/test-e34',1,'Test fixture');
insert into public.sources(id,title,rights) values ('series-test-source','Fixture catalog','Synthetic');
insert into public.assemblies(id,title,boundary,catalog_context_id) values
  ('series-test-coupe','Coupe drawing','Fixture','series-test-coupe'),
  ('series-test-m3','M3 drawing','Fixture','series-test-m3'),
  ('series-test-e34','525i drawing','Fixture','series-test-e34');
insert into public.parts(id,assembly_id,name,number_normalized,review_status) values
  ('series-test-shared','series-test-coupe','Fixture bracket','99000000001','catalog-listed'),
  ('series-test-m3','series-test-m3','Fixture steering spacer','99000000002','catalog-listed'),
  ('series-test-e34','series-test-e34','Fixture bracket','99000000003','catalog-listed'),
  ('series-test-replacement','series-test-m3','Fixture replacement bracket','99000000004','catalog-listed');
insert into public.part_assembly_positions(
  id,assembly_id,part_id,context_id,reference,source_name,source_url,source_sha256,record_sha256,active
)
select id,context,part,context,'1',name,'https://www.bmwpartsdeal.com/parts-list/test.html',repeat('a',64),repeat('b',64),active
from (values
  ('series-test-pos-1','series-test-coupe','series-test-shared','Fixture bracket',true),
  ('series-test-pos-2','series-test-m3','series-test-shared','Fixture bracket',true),
  ('series-test-pos-3','series-test-m3','series-test-m3','Fixture steering spacer',true),
  ('series-test-pos-4','series-test-e34','series-test-e34','Fixture bracket',true),
  ('series-test-pos-5','series-test-m3','series-test-replacement','Fixture replacement bracket',false)
) fixtures(id,context,part,name,active);
insert into public.part_supersessions(id,previous_part_id,replacement_part_id,position_id,source_id)
values ('series-test-replace','series-test-m3','series-test-replacement','series-test-pos-3','series-test-source');
set local role anon;
select pg_temp.series_assert((select count(*)=1 and min(position_id)='series-test-pos-2'
  from public.catalog_find_series_parts('99 00 0 000 001','e30','series-test-m3')),
  'Formatted BMW number should find one result and prefer the selected catalog');
select pg_temp.series_assert((select count(*)=1 and min(position_id)='series-test-pos-1'
  from public.catalog_find_series_parts('99000000001','e30','series-test-coupe')),
  'An older selected catalog should take precedence over the latest source');
select pg_temp.series_assert((select count(*)=1 and min(position_id)='series-test-pos-2'
  from public.catalog_find_series_parts('99000000001','e30')),
  'Without a preferred catalog, select the latest indexed source');
select pg_temp.series_assert((select count(*)=1 and min(context_id)='series-test-m3'
  from public.catalog_find_series_parts('fixture steering spacer','e30','series-test-coupe')),
  'Name lookup should find a part in another E30 catalog');
select pg_temp.series_assert((select count(*)=0 from public.catalog_find_series_parts('99000000003','e30')),
  'E34-only numbers must stay out of E30 search');
select pg_temp.series_assert((select count(*)=1 and count(position_id)=0
  from public.catalog_find_series_parts('99000000004','e30')),
  'A replacement number should be searchable without presenting an inactive position as fitment evidence');
select pg_temp.series_assert((select count(*)=1 and min(number_normalized)='99000000004'
  from public.catalog_find_series_parts('fixture bracket','e30',null,1,'99000000001')),
  'Pagination should advance by deduplicated BMW number');

rollback;
