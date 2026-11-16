-- Search canonical identities before applying the result limit, preserving replacement-only records.
create function public.catalog_search_parts(search_query text,max_results integer default 40)
returns table(position_id text,part_id text,number_normalized text,name text,assembly_id text,assembly_title text,context_id text,context_name text,reference text)
language sql stable security invoker set search_path='' as $$
 with term as materialized (
  select websearch_to_tsquery('simple',search_query) as query,regexp_replace(search_query,'[^0-9]','','g') as number
  where char_length(btrim(search_query)) between 2 and 200
 ), matched as (
  select p.id from public.parts p,term t where p.number_normalized=t.number or to_tsvector('simple',p.name||' '||coalesce(p.number_normalized,'')) @@ t.query
  union
  select x.part_id from public.part_assembly_positions x,term t where x.active and to_tsvector('simple',x.source_name) @@ t.query
 ), candidates as materialized (
  select p.*,p.number_normalized=t.number as exact_number,ts_rank_cd(to_tsvector('simple',p.name),t.query) as rank
  from matched m join public.parts p on p.id=m.id cross join term t
  where p.number_normalized is not null
  order by exact_number desc,rank desc,p.number_normalized
  limit least(greatest(max_results,1),60)
 )
 select x.id,p.id,p.number_normalized,coalesce(x.source_name,p.name),x.assembly_id,a.title,x.context_id,c.name,x.reference
 from candidates p
 left join lateral(select pos.* from public.part_assembly_positions pos where pos.part_id=p.id and pos.active order by pos.context_id,pos.assembly_id,pos.reference,pos.id limit 1) x on true
 left join public.assemblies a on a.id=x.assembly_id
 left join public.vehicle_catalog_contexts c on c.id=x.context_id
 order by p.exact_number desc,p.rank desc,p.number_normalized;
$$;
revoke all on function public.catalog_search_parts(text,integer) from public,anon,authenticated;
grant execute on function public.catalog_search_parts(text,integer) to anon,authenticated;
