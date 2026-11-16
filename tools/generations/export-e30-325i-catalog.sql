-- Read-only factual source slice for the E30 325i Coupe Workshop manifest.
with chosen as (
  select * from public.catalog_inventory
  where series = 'e30' and name = '1991 325i Coupe'
), source_assemblies as (
  select a.*, a.source_locator as source_url
  from public.assemblies a join chosen c on a.catalog_context_id = c.id
  where a.source_locator like 'https://www.bmwpartsdeal.com/parts-list/%'
)
select jsonb_build_object(
  'catalog_inventory', (select jsonb_agg(to_jsonb(c)) from chosen c),
  'assemblies', (select jsonb_agg(to_jsonb(a) order by a.id) from source_assemblies a),
  'part_assembly_positions', (
    select jsonb_agg(to_jsonb(pos) || jsonb_build_object('parts',
      jsonb_build_object('id',p.id,'name',p.name,'number_normalized',p.number_normalized)) order by pos.id)
    from public.part_assembly_positions pos
    join public.parts p on p.id = pos.part_id
    join chosen c on pos.context_id = c.id
  )
);
