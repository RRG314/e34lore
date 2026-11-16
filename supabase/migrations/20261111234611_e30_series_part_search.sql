-- Search a series by canonical BMW number, even without a selected vehicle.
-- Prefer an applicable source row when the caller supplies a catalog context.
create or replace function public.catalog_find_series_parts(
  search_query text, series_filter text, context_preference text default null,
  max_results integer default 31, after_number text default null
)
returns table(
  position_id text, part_id text, number_normalized text, name text,
  assembly_id text, assembly_title text, context_id text, context_name text,
  reference text, required_quantity integer, conditions jsonb
)
language sql stable security invoker set search_path = ''
as $$
  with term as materialized (
    select websearch_to_tsquery('simple', search_query) as query,
      case when search_query ~* '^[[:space:]]*(bmw[[:space:]-]*)?[0-9[:space:].-]+$'
        and char_length(normalized.number) = 11 then normalized.number end as number
    from (select regexp_replace(search_query, '[^0-9]', '', 'g') as number) normalized
    where char_length(btrim(search_query)) between 2 and 200
  ), contexts as materialized (
    select c.id, c.name, c.model_year
    from public.vehicle_catalog_contexts c
    join public.vehicle_models m on m.id = c.model_id
    where m.series = series_filter
  ), matched as materialized (
    select p.id from public.parts p, term t
    where p.number_normalized = t.number
    union
    select p.id from public.parts p, term t
    where t.number is null
      and to_tsvector('simple', p.name || ' ' || coalesce(p.number_normalized, '')) @@ t.query
    union
    select pos.part_id from public.part_assembly_positions pos
    join contexts c on c.id = pos.context_id
    cross join term t
    where t.number is null and pos.active and to_tsvector('simple', pos.source_name) @@ t.query
  ), candidate as (
    select pos.id as position_id, p.id as part_id, p.number_normalized,
      pos.source_name as name, a.id as assembly_id, a.title as assembly_title,
      c.id as context_id, c.name as context_name, pos.reference,
      pos.required_quantity, pos.conditions
    from matched m
    join public.parts p on p.id = m.id
    join public.part_assembly_positions pos on pos.part_id = p.id and pos.active
    join contexts c on c.id = pos.context_id
    join public.assemblies a on a.id = pos.assembly_id
    where after_number is null or p.number_normalized > after_number
    union all
    select null::text, p.id, p.number_normalized, p.name, null::text,
      null::text, c.id, c.name, null::text, null::integer, '[]'::jsonb
    from matched m
    join public.parts p on p.id = m.id
    join public.part_supersessions s on s.replacement_part_id = p.id
    join public.part_assembly_positions pos on pos.id = s.position_id and pos.active
    join contexts c on c.id = pos.context_id
    where after_number is null or p.number_normalized > after_number
  ), preferred as (
    select distinct on (c.number_normalized) c.*
    from candidate c
    join contexts source on source.id = c.context_id
    order by c.number_normalized, (c.position_id is null),
      (c.context_id = context_preference) desc nulls last, source.model_year desc, c.context_id, c.position_id
  )
  select * from preferred order by preferred.number_normalized
  limit least(greatest(max_results, 1), 101)
$$;
revoke all on function public.catalog_find_series_parts(text,text,text,integer,text) from public;
grant execute on function public.catalog_find_series_parts(text,text,text,integer,text) to anon, authenticated;
notify pgrst, 'reload schema';
